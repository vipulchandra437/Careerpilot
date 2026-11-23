"""Add mentor conversations and conversation_id to mentor messages.

Revision ID: 011_mentor_conversations
Revises: 010_mentor_messages
Create Date: 2026-11-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.exc import NoInspectionAvailable

revision: str = "011_mentor_conversations"
down_revision: Union[str, None] = "010_mentor_messages"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table: str) -> bool:
    bind = op.get_bind()
    try:
        return table in inspect(bind).get_table_names()
    except NoInspectionAvailable:
        return False


def _columns(table: str) -> set[str] | None:
    bind = op.get_bind()
    try:
        return {c["name"] for c in inspect(bind).get_columns(table)}
    except NoInspectionAvailable:
        return None


def upgrade() -> None:
    if not _has_table("mentor_conversations"):
        op.create_table(
            "mentor_conversations",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("title", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_mentor_conversations_user_id", "mentor_conversations", ["user_id"])
        op.create_index("ix_mentor_conversations_updated_at", "mentor_conversations", ["updated_at"])

    cols = _columns("mentor_messages")
    if cols is None or "conversation_id" not in cols:
        op.add_column("mentor_messages", sa.Column("conversation_id", sa.String(length=36), nullable=True))
        op.create_index("ix_mentor_messages_conversation_id", "mentor_messages", ["conversation_id"])


def downgrade() -> None:
    cols = _columns("mentor_messages")
    if cols is None or "conversation_id" in cols:
        try:
            op.drop_index("ix_mentor_messages_conversation_id", table_name="mentor_messages")
        except Exception:
            pass
        op.drop_column("mentor_messages", "conversation_id")
    if _has_table("mentor_conversations"):
        op.drop_index("ix_mentor_conversations_updated_at", table_name="mentor_conversations")
        op.drop_index("ix_mentor_conversations_user_id", table_name="mentor_conversations")
        op.drop_table("mentor_conversations")
