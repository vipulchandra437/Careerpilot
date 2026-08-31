import uuid
from datetime import datetime, timezone

from sqlalchemy import Text, DateTime, String, JSON
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class GapReport(Base):
    """Result of a skill-gap analysis (architecture.md §3.4).

    Upsert semantics: one row per (snapshot_id, target_role_id). Re-running the
    analysis updates this row in place — it never duplicates (PRD §6.1).
    """

    __tablename__ = "gap_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    snapshot_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    target_role_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    # [{skill, severity, reason, suggested_resource, matched}]
    gaps: Mapped[list | None] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
