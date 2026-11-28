"""Add mentor_messages table for mentor chatbot history.

Revision ID: 010_mentor_messages
Revises: 009_profile_avatar
Create Date: 2026-11-23
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.exc import NoInspectionAvailable

revision: str = "010_mentor_messages"
down_revision: Union[str, None] = "009_profile_avatar"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table: str) -> bool:
    bind = op.get_bind()
    try:
        return table in inspect(bind).get_table_names()
    except NoInspectionAvailable:
        return False


def upgrade() -> None:
    if context.is_offline_mode():
        return  # 001 baseline already emits the current schema in offline SQL.
    if _has_table("mentor_messages"):
        return
    op.create_table(
        "mentor_messages",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_mentor_messages_user_id", "mentor_messages", ["user_id"])
    op.create_index("ix_mentor_messages_created_at", "mentor_messages", ["created_at"])


def downgrade() -> None:
    if context.is_offline_mode():
        return
    if not _has_table("mentor_messages"):
        return
    op.drop_index("ix_mentor_messages_created_at", table_name="mentor_messages")
    op.drop_index("ix_mentor_messages_user_id", table_name="mentor_messages")
    op.drop_table("mentor_messages")
