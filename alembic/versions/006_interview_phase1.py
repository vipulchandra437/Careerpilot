"""Add Phase 1 role-aware interview evaluation and weak-topic signals."""

from alembic import op
import sqlalchemy as sa

revision = "006_interview_phase1"
down_revision = "005_credit_orders"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("interview_sessions", sa.Column("target_role_id", sa.String(36), nullable=True))
    op.add_column("interview_sessions", sa.Column("target_role_name", sa.String(120), nullable=True))
    op.add_column("interview_sessions", sa.Column("domain", sa.String(30), nullable=True))
    op.add_column("interview_feedback", sa.Column("overall_score", sa.Integer(), nullable=False, server_default="3"))
    op.add_column("interview_feedback", sa.Column("strengths", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("interview_feedback", sa.Column("weaknesses", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("interview_feedback", sa.Column("question_scores", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("interview_feedback", sa.Column("weak_topics", sa.JSON(), nullable=False, server_default="[]"))
    op.create_table(
        "interview_weak_topics",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=False, index=True),
        sa.Column("session_id", sa.String(36), sa.ForeignKey("interview_sessions.id"), nullable=False, index=True),
        sa.Column("topic", sa.String(120), nullable=False, index=True),
        sa.Column("confidence", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("evidence", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("interview_weak_topics")
    for column in ("weak_topics", "question_scores", "weaknesses", "strengths", "overall_score"):
        op.drop_column("interview_feedback", column)
    op.drop_column("interview_sessions", "domain")
    op.drop_column("interview_sessions", "target_role_name")
    op.drop_column("interview_sessions", "target_role_id")