"""Mock-interview models (architecture.md section 3.7).

- InterviewSession: one mock interview (technical or behavioral).
- InterviewTurn: a single exchange line (interviewer or student), persisted
  in order so the adaptive follow-up prompt and the later Communication
  Feedback module (PRD section 6.5) both read the full transcript.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base

SESSION_TYPES = ("technical", "behavioral", "hr")
INTERVIEW_DOMAINS = ("sde", "web", "ml_ai", "mobile", "data", "systems")
SESSION_STATUSES = ("in_progress", "ended")


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    target_role_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    target_role_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    domain: Mapped[str | None] = mapped_column(String(30), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="in_progress")
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    turns = relationship(
        "InterviewTurn",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="InterviewTurn.order_index",
    )


class InterviewTurn(Base):
    __tablename__ = "interview_turns"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("interview_sessions.id"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # interviewer | student
    content: Mapped[str] = mapped_column("content", nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    session = relationship("InterviewSession", back_populates="turns")