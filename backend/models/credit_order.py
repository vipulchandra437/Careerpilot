"""Credit order / purchase-fulfillment audit table (Phase 6 Task 3).

Records every credit purchase from Checkout through fulfillment. Its job is
PROVENANCE + IDEMPOTENCY:

  * provenance — for any balance change recorded as reason='purchase' in the
    credit ledger, there is exactly one order row tying it back to a Stripe
    Checkout session, the pack, the buyer, the USD price, and the ledger
    transaction id that actually moved the balance.
  * idempotency — Stripe retries webhooks; a repeated checkout.session.completed
    for the same stripe_session_id must NOT credit the user twice. The unique
    constraint on stripe_session_id + the status transition
    (pending -> succeeded, guarded) guarantee single fulfillment.

An order with stripe_session_id NULL is a manual/offline purchase (e.g. admin
or a future ACH path); it is still recorded for audit, then fulfilled the same
way.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Text, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class CreditOrder(Base):
    __tablename__ = "credit_orders"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    pack_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    pack_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    credits: Mapped[int] = mapped_column(Integer, nullable=False)
    price_usd_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    # Stripe Checkout session id. Unique non-null once a session exists, so a
    # webhook retry for the same session cannot double-credit.
    stripe_session_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, unique=True, index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # pending | succeeded | failed | refunded
    stripe_checkout_status: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Set to the CreditTransaction.id created on fulfillment (reason='purchase').
    ledger_tx_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_mock: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    fulfilled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:  # pragma: no cover - debug aid
        return f"<CreditOrder {self.id} user={self.user_id} {self.status} credits={self.credits}>"
