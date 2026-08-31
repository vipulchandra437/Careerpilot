"""Stripe Checkout integration for credit purchases (Phase 6 Task 3).

Design (locked P6-3): Stripe Checkout behind `.env` keys; tests run the FULL
flow with a mocked Stripe client — no live keys required to land Phase 6. A
single real paid call happens once in Phase 7 (P7-0) for cost reconciliation.

Flow:
  1. Student POSTs a pack_id -> create_checkout_session persists a `CreditOrder`
     (status=pending), calls Stripe to get a hosted Checkout URL, returns it.
  2. Browser completes payment on Stripe's hosted page.
  3. Stripe POSTs checkout.session.completed to our webhook.
  4. handle_webhook verifies the signature, looks up the order by
     stripe_session_id, credits the ledger once (idempotent), links the
     ledger_tx_id, marks the order succeeded.

Fulfillment is idempotent: an order only transitions pending -> succeeded once,
so Stripe webhook retries cannot double-credit a buyer.

Pricing: prices come from settings.credit_packs (PLACEHOLDER values per
MEMORY.md — re-price from real cost data before Phase 6 sign-off).
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import get_settings
from backend.models.credit_order import CreditOrder
from backend.models.user import User
from backend.services.credit import record_transaction


class StripeNotConfigured(Exception):
    """Raised when checkout is attempted but Stripe is not enabled."""


class UnknownPack(Exception):
    """Raised when a requested pack_id is not in the catalog."""


class StripeWebhookError(Exception):
    """Raised when a webhook signature fails verification."""


def is_stripe_enabled() -> bool:
    return get_settings().stripe_enabled


def get_pack(pack_id: str) -> dict:
    packs = get_settings().credit_packs
    if pack_id not in packs:
        raise UnknownPack(pack_id)
    return dict(packs[pack_id], id=pack_id)


def list_packs() -> list[dict]:
    return [
        dict(p, id=pid, price_usd=round(p["price_usd_cents"] / 100, 2))
        for pid, p in get_settings().credit_packs.items()
    ]


async def create_checkout_session(db: AsyncSession, user: User, pack_id: str, stripe=None):
    """Record a pending order and create a Stripe Checkout Session.

    `stripe` is the stripe client/module to call (injected for tests). Live
    code passes nothing (real stripe module). Returns (order, url).
    """
    if not is_stripe_enabled():
        raise StripeNotConfigured("Stripe is not configured for this environment")

    if stripe is None:
        import stripe as _stripe
        stripe = _stripe

    pack = get_pack(pack_id)
    settings = get_settings()
    stripe.api_key = settings.stripe_secret_key

    order = CreditOrder(
        user_id=user.id,
        pack_id=pack["id"],
        pack_name=pack["name"],
        credits=pack["credits"],
        price_usd_cents=pack["price_usd_cents"],
        status="pending",
    )
    db.add(order)
    await db.flush()

    # Attach the internal order id as the client_reference_id so the webhook can
    # locate the order even if the session metadata is stripped.
    session = stripe.checkout.Session.create(
        mode="payment",
        client_reference_id=order.id,
        customer_email=user.email,
        line_items=[
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": f"{pack['credits']} {pack['name']} credits"},
                    "unit_amount": pack["price_usd_cents"],
                },
                "quantity": 1,
            }
        ],
        metadata={"pack_id": pack["id"], "credits": pack["credits"], "order_id": order.id},
        success_url=settings.stripe_success_url,
        cancel_url=settings.stripe_cancel_url,
        expires_at=3600,
    )

    order.stripe_session_id = session.id
    order.stripe_checkout_status = session.status
    await db.commit()
    return order, session.url


async def fulfill_order(
    db: AsyncSession,
    order_id: str | None = None,
    stripe_session_id: str | None = None,
) -> CreditOrder:
    """Credit credits for a succeeded order, exactly once (idempotent).

    Locates the order by id or stripe session id, and if it is still pending,
    writes the purchase ledger transaction and flips it to succeeded. A repeated
    call finds it already succeeded and does nothing.
    """
    if order_id:
        order = await db.get(CreditOrder, order_id)
    elif stripe_session_id:
        r = await db.execute(
            select(CreditOrder).where(CreditOrder.stripe_session_id == stripe_session_id)
        )
        order = r.scalar_one_or_none()
    else:
        raise ValueError("fulfill_order requires order_id or stripe_session_id")

    if order is None:
        raise ValueError("Order not found")

    if order.status == "succeeded":
        return order  # already fulfilled (webhook retry) -> idempotent no-op

    if order.status != "pending":
        raise ValueError(f"Order is not fulfillable (status={order.status})")

    tx = await record_transaction(
        db,
        order.user_id,
        order.credits,
        "purchase",
        description=f"Purchased {order.pack_name or 'credit'} pack "
                    f"({order.credits} credits)",
    )
    order.status = "succeeded"
    order.ledger_tx_id = tx.id
    order.fulfilled_at = datetime.now(timezone.utc)
    order.stripe_checkout_status = "complete"
    await db.commit()

    user = await db.get(User, order.user_id)
    if user is not None:
        await db.refresh(user)
    return order


def verify_webhook(payload: bytes, sig_header: str, stripe=None) -> object:
    """Verify a Stripe webhook signature and return the event object.

    Raises StripeWebhookError on invalid signature.
    """
    if stripe is None:
        import stripe as _stripe
        stripe = _stripe
    settings = get_settings()
    try:
        return stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except Exception as e:  # stripe.SignatureVerificationError and ValueError
        raise StripeWebhookError(str(e))


def event_session_id(event) -> str:
    return event["data"]["object"]["id"]


async def handle_checkout_completed(
    db: AsyncSession, event, stripe_session_id: str | None = None
) -> CreditOrder:
    """Fulfill the order for a checkout.session.completed event (idempotent)."""
    sid = stripe_session_id or event_session_id(event)
    order = await fulfill_order(db, stripe_session_id=sid)
    return order
