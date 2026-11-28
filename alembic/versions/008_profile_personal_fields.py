"""Add personal profile fields to profile_snapshots.

Revision ID: 008_profile_personal_fields
Revises: 007_remedial_actions
Create Date: 2026-11-23
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.exc import NoInspectionAvailable


# revision identifiers, used by Alembic.
revision: str = "008_profile_personal_fields"
down_revision: Union[str, None] = "007_remedial_actions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_COLUMNS = [
    "full_name",
    "headline",
    "bio",
    "location",
    "phone",
    "website",
    "linkedin_url",
    "github_url",
]


def _existing_columns(table: str) -> set[str] | None:
    bind = op.get_bind()
    try:
        return {c["name"] for c in inspect(bind).get_columns(table)}
    except NoInspectionAvailable:
        # Offline SQL generation uses a mock connection; emit idempotent DDL.
        return None


def upgrade() -> None:
    if context.is_offline_mode():
        return  # 001 baseline already emits the current schema in offline SQL.
    existing = _existing_columns("profile_snapshots")
    for col in _COLUMNS:
        if existing is None or col not in existing:
            op.add_column("profile_snapshots", sa.Column(col, sa.Text(), nullable=True))


def downgrade() -> None:
    if context.is_offline_mode():
        return
    existing = _existing_columns("profile_snapshots")
    for col in reversed(_COLUMNS):
        if existing is None or col in existing:
            op.drop_column("profile_snapshots", col)
