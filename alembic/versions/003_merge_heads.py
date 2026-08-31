"""merge profile_analysis and profile_snapshots heads

This is a pure metadata/branch merge. It declares both prior heads
(002_profile_analysis and 002_profile_snapshots) as ancestors of a single
new head so Alembic has one linear chain going forward.

It runs NO schema DDL — upgrade()/downgrade() are both no-ops. It cannot
create, alter, or drop any table, and specifically cannot affect
gap_reports, roadmap_milestones, interview_sessions, users, or
llm_usage_log. (The live database schema is produced by
Base.metadata.create_all, not by migrations; this file only linearizes
the migration history.)

Revision ID: 003_merge_heads
Revises: 002_profile_analysis, 002_profile_snapshots
Create Date: 2026-08-31
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "003_merge_heads"
down_revision: Union[str, Sequence[str], None] = ("002_profile_analysis", "002_profile_snapshots")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
