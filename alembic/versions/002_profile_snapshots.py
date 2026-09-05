"""Compatibility branch for the historical profile migration.

Revision ID: 002_profile_snapshots
Revises: 001_initial
Create Date: 2026-08-26
The parallel ``002_profile_analysis`` branch already creates these tables with
the superset schema. This branch is intentionally a no-op so a clean database
can traverse the historical merge without duplicate CREATE TABLE calls.
"""
from typing import Sequence, Union
from alembic import op

revision: str = "002_profile_snapshots"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
