import uuid
from datetime import datetime, timezone

from sqlalchemy import Text, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class GitHubToken(Base):
    __tablename__ = "github_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    encrypted_token: Mapped[str] = mapped_column(Text, nullable=False)
    github_username: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
