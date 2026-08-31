"""Admin-managed coding-challenge topic bank (PRD §6.7, DESIGN.md §2.9).

A curated list of skill topics admins can maintain without a deploy. When a
topic in the bank is disabled, admins signal it should not be offered for
practice; otherwise it is available as a practice `skill`.

Deliberately a plain list (no required-skill weights) — that lives on
`TargetRoleProfile`. This exists so practice topics can be governed/accepted by
a human before being offered, rather than being purely free-form.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Text, Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class ChallengeTopic(Base):
    __tablename__ = "challenge_topics"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    updated_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )