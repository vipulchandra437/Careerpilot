"""Widen roadmap milestone action ids to TEXT.

Revision ID: 013_roadmap_action_id_text
Revises: 012_challenge_language
Create Date: 2026-11-25
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.exc import NoInspectionAvailable

revision: str = "013_roadmap_action_id_text"
down_revision: Union[str, None] = "012_challenge_language"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table: str) -> set[str] | None:
    try:
        return {c["name"] for c in inspect(op.get_bind()).get_columns(table)}
    except NoInspectionAvailable:
        return None


def upgrade() -> None:
    if context.is_offline_mode():
        return  # 001 baseline already emits the current schema in offline SQL.
    # SQLite ignores VARCHAR lengths, so only real DDL databases need this.
    if op.get_bind().dialect.name == "sqlite":
        return
    cols = _columns("roadmap_milestones")
    if cols is not None and "linked_action_id" in cols:
        op.alter_column(
            "roadmap_milestones",
            "linked_action_id",
            existing_type=sa.String(length=36),
            type_=sa.Text(),
            existing_nullable=True,
        )


def downgrade() -> None:
    if context.is_offline_mode():
        return
    if op.get_bind().dialect.name == "sqlite":
        return
    cols = _columns("roadmap_milestones")
    if cols is not None and "linked_action_id" in cols:
        op.alter_column(
            "roadmap_milestones",
            "linked_action_id",
            existing_type=sa.Text(),
            type_=sa.String(length=36),
            existing_nullable=True,
        )
