import uuid
from datetime import datetime, timezone

from sqlalchemy import Text, DateTime, String, JSON
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class TargetRoleProfile(Base):
    """Admin-managed target role definition (architecture.md §3.2).

    Like ProfileSnapshot, uses portable SQLAlchemy JSON so it works on both
    the SQLite dev DB and Postgres in production.
    """

    __tablename__ = "target_role_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    # [{skill, weight, min_depth}]
    required_skills: Mapped[list | None] = mapped_column(JSON, nullable=False, default=list)
    updated_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
