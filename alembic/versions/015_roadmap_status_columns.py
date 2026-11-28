"""Backfill roadmap status/error columns on pre-baseline databases.

``001_initial`` builds the current schema with ``create_all(checkfirst=True)``,
so databases stamped from the older chain never gained the status/error columns
the Roadmap model and API read. Every roadmap read or generation then fails
with ``no such column: roadmaps.status``.
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "015_roadmap_status_columns"
down_revision: Union[str, None] = "014_unique_aggregate_rows"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_COLUMNS = (
    ("status", sa.String(20), False, "ready"),
    ("error", sa.Text(), True, None),
)


def _has_column(bind, table: str, column: str) -> bool:
    return column in {c["name"] for c in inspect(bind).get_columns(table)}


def upgrade() -> None:
    if context.is_offline_mode():
        return  # 001 baseline already emits the current schema in offline SQL.
    bind = op.get_bind()
    for name, column_type, nullable, server_default in _COLUMNS:
        if not _has_column(bind, "roadmaps", name):
            op.add_column(
                "roadmaps",
                sa.Column(name, column_type, nullable=nullable, server_default=server_default),
            )


def downgrade() -> None:
    if context.is_offline_mode():
        return
    bind = op.get_bind()
    for name, _, _, _ in reversed(_COLUMNS):
        if _has_column(bind, "roadmaps", name):
            op.drop_column("roadmaps", name)
