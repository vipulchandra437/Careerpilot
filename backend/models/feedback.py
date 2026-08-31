"""Communication-feedback model (architecture.md §3.7, PRD §6.5).

Generated post-session from the interview transcript. feedback_items carry
per-turn references (turn_id + a verbatim quote) so the DESIGN.md §2.7 feedback
view can link each comment to the exact transcript line it is about.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class InterviewFeedback(Base):
    __tablename__ = "interview_feedback"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("interview_sessions.id"), nullable=False, unique=True, index=True
    )
    clarity_score: Mapped[int] = mapped_column(Integer, nullable=False)
    structure_notes: Mapped[str] = mapped_column(Text, nullable=False)
    conciseness_notes: Mapped[str] = mapped_column(Text, nullable=False)
    # Union of turn ids referenced by feedback_items (overview + DESIGN §2.7 nav).
    referenced_turn_ids: Mapped[list | None] = mapped_column(JSON, nullable=False, default=list)
    # [{turn_id, category, quote, comment}] — quote is always verbatim text from
    # that turn's content.
    feedback_items: Mapped[list | None] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )