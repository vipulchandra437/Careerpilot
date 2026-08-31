"""add credit_orders table

Revision ID: 005_credit_orders
Revises: 004_credit_transactions
Create Date: 2026-08-31
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "005_credit_orders"
down_revision: Union[str, Sequence[str], None] = "004_credit_transactions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "credit_orders",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False, index=True),
        sa.Column("pack_id", sa.Text(), nullable=True),
        sa.Column("pack_name", sa.Text(), nullable=True),
        sa.Column("credits", sa.Integer(), nullable=False),
        sa.Column("price_usd_cents", sa.Integer(), nullable=False),
        sa.Column("stripe_session_id", sa.String(length=255), nullable=True, unique=True, index=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("stripe_checkout_status", sa.Text(), nullable=True),
        sa.Column("ledger_tx_id", sa.Text(), nullable=True),
        sa.Column("is_mock", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("fulfilled_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("credit_orders")
