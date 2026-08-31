"""Stripe webhook receiver (Phase 6 Task 3).

This endpoint has NO auth header — Stripe authenticates it via the
Stripe-Signature header (HMAC with our webhook secret). It only ever credits
the ledger for a verified, idempotent order. Signature verification failure is
a 400 (Stripe will retry), never a credit.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.services import payments

router = APIRouter(prefix="/credits/webhook", tags=["payments-webhook"])


@router.post("")
async def webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    if not payments.is_stripe_enabled():
        raise HTTPException(status_code=503, detail="Payments are not configured")

    try:
        event = payments.verify_webhook(payload, sig_header)
    except payments.StripeWebhookError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    etype = event["type"]
    if etype == "checkout.session.completed":
        session = event["data"]["object"]
        order = await payments.handle_checkout_completed(db, event, session["id"])
        return {"received": True, "order_id": order.id, "status": order.status}

    # Acknowledge other event types (payment_intent.succeeded, etc.) without acting.
    return {"received": True, "type": etype}
