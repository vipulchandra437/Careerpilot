"""Add remedial_actions (closed loop) to interview_feedback."""

from alembic import op
import sqlalchemy as sa

revision = "007_remedial_actions"
down_revision = "006_interview_phase1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "interview_feedback",
        sa.Column("remedial_actions", sa.JSON(), nullable=False, server_default="[]"),
    )


def downgrade() -> None:
    op.drop_column("interview_feedback", "remedial_actions")