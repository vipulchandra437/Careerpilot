"""Backfill users.is_active for databases predating the model column.

``001_initial`` builds the current schema with ``create_all(checkfirst=True)``,
so older stamped databases never gained this column. Login and every
authenticated request read ``User.is_active`` and fail with a missing-column
error until this revision runs.
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa

revision: str = "016_users_is_active"
down_revision: Union[str, None] = "015_roadmap_status_columns"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(bind, table: str, column: str) -> bool:
    return column in {c["name"] for c in sa.inspect(bind).get_columns(table)}


def upgrade() -> None:
    if context.is_offline_mode():
        # Offline mode cannot inspect the table, so assume the column is missing.
        op.add_column(
            "users",
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        )
        return
    bind = op.get_bind()
    if not _has_column(bind, "users", "is_active"):
        # sa.true() compiles to TRUE on PostgreSQL and 1 on SQLite.
        op.add_column(
            "users",
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        )


def downgrade() -> None:
    # No-op: fresh databases get this column from 001/create_all, so it may not
    # belong to this revision. Dropping it would break auth on those databases.
    return
