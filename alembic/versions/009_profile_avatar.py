"""Add avatar_key to profile_snapshots.

Revision ID: 009_profile_avatar
Revises: 008_profile_personal_fields
Create Date: 2026-11-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.exc import NoInspectionAvailable

revision: str = "009_profile_avatar"
down_revision: Union[str, None] = "008_profile_personal_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns(table: str) -> set[str] | None:
    bind = op.get_bind()
    try:
        return {c["name"] for c in inspect(bind).get_columns(table)}
    except NoInspectionAvailable:
        return None


def upgrade() -> None:
    existing = _existing_columns("profile_snapshots")
    if existing is None or "avatar_key" not in existing:
        op.add_column("profile_snapshots", sa.Column("avatar_key", sa.Text(), nullable=True))


def downgrade() -> None:
    existing = _existing_columns("profile_snapshots")
    if existing is None or "avatar_key" in existing:
        op.drop_column("profile_snapshots", "avatar_key")
