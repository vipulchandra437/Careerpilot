"""Add language column to challenges.

Revision ID: 012_challenge_language
Revises: 011_mentor_conversations
Create Date: 2026-11-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.exc import NoInspectionAvailable

revision: str = "012_challenge_language"
down_revision: Union[str, None] = "011_mentor_conversations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table: str) -> set[str] | None:
    try:
        return {c["name"] for c in inspect(op.get_bind()).get_columns(table)}
    except NoInspectionAvailable:
        return None


def upgrade() -> None:
    cols = _columns("challenges")
    if cols is None or "language" not in cols:
        op.add_column(
            "challenges",
            sa.Column("language", sa.String(length=32), nullable=False, server_default="python"),
        )


def downgrade() -> None:
    cols = _columns("challenges")
    if cols is None or "language" in cols:
        op.drop_column("challenges", "language")
