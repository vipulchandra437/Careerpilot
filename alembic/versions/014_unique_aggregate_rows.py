"""Add token_version and unique aggregate-row constraints.

Existing databases can hold duplicate snapshots/reports/roadmaps from before the
models gained unique constraints. Keep the newest row, repoint its children, then
add the constraints so the next analyze/generate run cannot duplicate again.
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa
from sqlalchemy import inspect, text

revision: str = "014_unique_aggregate_rows"
down_revision: Union[str, None] = "013_roadmap_action_id_text"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_UNIQUES = (
    ("uq_profile_snapshots_user_id", "profile_snapshots", ("user_id",)),
    ("uq_gap_reports_snapshot_role", "gap_reports", ("snapshot_id", "target_role_id")),
    ("uq_roadmaps_gap_report_id", "roadmaps", ("gap_report_id",)),
)


def _has_column(bind, table: str, column: str) -> bool:
    return column in {c["name"] for c in inspect(bind).get_columns(table)}


def _has_unique(bind, table: str, columns: tuple[str, ...]) -> bool:
    inspector = inspect(bind)
    for constraint in inspector.get_unique_constraints(table):
        if set(constraint.get("column_names") or ()) == set(columns):
            return True
    for index in inspector.get_indexes(table):
        if index.get("unique") and set(index.get("column_names") or ()) == set(columns):
            return True
    return False


def dedupe(bind) -> None:
    """Repoint children to the newest duplicate, then delete the older rows."""
    # One snapshot per user: move its gap reports to the newest snapshot.
    bind.execute(text("""
        UPDATE gap_reports
        SET snapshot_id = (
            SELECT k.id FROM profile_snapshots k
            WHERE k.user_id = (SELECT o.user_id FROM profile_snapshots o WHERE o.id = gap_reports.snapshot_id)
            ORDER BY k.computed_at DESC, k.id DESC LIMIT 1
        )
        WHERE EXISTS (SELECT 1 FROM profile_snapshots o WHERE o.id = gap_reports.snapshot_id)
    """))
    bind.execute(text("""
        DELETE FROM profile_snapshots
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY user_id ORDER BY computed_at DESC, id DESC
                ) AS rn FROM profile_snapshots
            ) WHERE rn > 1
        )
    """))

    # One report per (snapshot, role): move roadmaps to the newest report.
    bind.execute(text("""
        UPDATE roadmaps
        SET gap_report_id = (
            SELECT k.id FROM gap_reports k
            WHERE k.snapshot_id = (SELECT o.snapshot_id FROM gap_reports o WHERE o.id = roadmaps.gap_report_id)
              AND k.target_role_id = (SELECT o.target_role_id FROM gap_reports o WHERE o.id = roadmaps.gap_report_id)
            ORDER BY k.created_at DESC, k.id DESC LIMIT 1
        )
        WHERE EXISTS (SELECT 1 FROM gap_reports o WHERE o.id = roadmaps.gap_report_id)
    """))
    bind.execute(text("""
        DELETE FROM gap_reports
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY snapshot_id, target_role_id ORDER BY created_at DESC, id DESC
                ) AS rn FROM gap_reports
            ) WHERE rn > 1
        )
    """))

    # One roadmap per report.
    bind.execute(text("""
        DELETE FROM roadmaps
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY gap_report_id ORDER BY created_at DESC, id DESC
                ) AS rn FROM roadmaps
            ) WHERE rn > 1
        )
    """))


def upgrade() -> None:
    if context.is_offline_mode():
        return  # 001 baseline already emits the current schema in offline SQL.
    bind = op.get_bind()
    dedupe(bind)

    if not _has_column(bind, "users", "token_version"):
        op.add_column(
            "users",
            sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
        )

    for name, table, columns in _UNIQUES:
        if _has_unique(bind, table, columns):
            continue
        if bind.dialect.name == "sqlite":
            # SQLite cannot ALTER a constraint in place; batch mode copies the table.
            with op.batch_alter_table(table) as batch:
                batch.create_unique_constraint(name, list(columns))
        else:
            op.create_unique_constraint(name, table, list(columns))


def downgrade() -> None:
    if context.is_offline_mode():
        return
    bind = op.get_bind()
    for name, table, columns in reversed(_UNIQUES):
        if _has_unique(bind, table, columns):
            try:
                op.drop_constraint(name, table, type_="unique")
            except Exception:
                # SQLite cannot drop unnamed constraints; downgrade is best-effort.
                pass
    if _has_column(bind, "users", "token_version"):
        op.drop_column("users", "token_version")
