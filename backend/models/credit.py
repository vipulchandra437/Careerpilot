"""Credit ledger model (Phase 6, PROMPT.md hybrid pricing).

`credit_transactions` is an append-only ledger driving the user's running
`credit_balance`. Every balance-affecting event (free-tier grant, feature use,
refund, purchase) writes a row here so the balance is auditable end-to-end
(PRD §7, RULES §2 — payment correctness must be provable, not assumed).

A transaction with delta == 0 still means something: `free_use` rows don't
change the balance but DO count against a user's per-feature free allowance
(P6-2), so the ledger is the single source of truth for "have they used their
free x yet" — no client-resettable counter.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Text, Integer, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    # Positive = grant, negative = spend, zero = free-use marker.
    delta: Mapped[int] = mapped_column(Integer, nullable=False)
    # "free_use" | "feature_use" | "refund" | "purchase" | "admin_grant"
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    # Which feature this relates to (gap_analysis | practice_challenge |
    # mock_interview | roadmap). None for account-level events (purchase/admin_grant).
    feature: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
