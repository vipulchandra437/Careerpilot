import uuid
from datetime import datetime, timezone

from sqlalchemy import Text, DateTime, String, JSON
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class ProfileSnapshot(Base):
    __tablename__ = "profile_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    resume_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    github_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    linkedin_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
