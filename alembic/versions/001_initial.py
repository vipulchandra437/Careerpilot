"""Baseline schema for the current models.

Alembic history was never authoritative here — the application builds its
schema with ``Base.metadata.create_all`` at startup. This revision makes the
migration chain match that schema so a fresh database can be built with
``alembic upgrade head``. Later historical revisions are retained (so existing
stamped databases still upgrade) but are schema no-ops.
"""

from alembic import op
from sqlalchemy import inspect

import backend.models  # noqa: F401 - register all tables on Base.metadata
from backend.database import Base

revision: str = "001_initial"
down_revision: str | None = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    Base.metadata.create_all(op.get_bind(), checkfirst=True)


def downgrade() -> None:
    existing = set(inspect(op.get_bind()).get_table_names())
    for table in reversed(Base.metadata.sorted_tables):
        if table.name in existing:
            op.drop_table(table.name)
