"""Credit balance + ledger endpoints (Phase 6).

Students read their own running balance and transaction history. Write paths
(purchase credits) arrive in Task 3 (Stripe); grants arrive via the admin tool
or seed/ops. Read-only here — no endpoint lets a user self-grant credits.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.database import get_db
from backend.models.credit import CreditTransaction
from backend.models.user import User
from backend.services.credit import FEATURE_COST, FREE_ALLOWANCE
from backend.services import payments

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("/packs")
async def list_packs():
    """Available credit packs (PLACEHOLDER pricing — re-priced before sign-off)."""
    return {"packs": payments.list_packs()}


@router.get("/balance")
async def my_balance(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """The current user's credit balance, plus the cost/allowance policy.

    Lets the frontend tell the user how many credits each feature costs and how
    many free uses remain, without them guessing.
    """
    return {
        "balance": user.credit_balance,
        "pricing": FEATURE_COST,
        "free_allowance": FREE_ALLOWANCE,
    }


@router.get("/ledger")
async def my_ledger(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """The current user's full credit transaction history (newest first)."""
    result = await db.execute(
        select(CreditTransaction)
        .where(CreditTransaction.user_id == user.id)
        .order_by(CreditTransaction.created_at.desc())
    )
    return {
        "transactions": [
            {
                "id": t.id,
                "delta": t.delta,
                "reason": t.reason,
                "feature": t.feature,
                "description": t.description,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in result.scalars().all()
        ]
    }


from pydantic import BaseModel  # noqa: E402


class CheckoutRequest(BaseModel):
    pack_id: str


@router.post("/checkout")
async def checkout(
    req: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout Session for a credit pack.

    Returns the hosted Checkout URL for the browser to redirect to. Returns 503
    when Stripe is not configured (no .env keys / not enabled), so the feature
    degrades cleanly in local dev and in tests.
    """
    try:
        order, url = await payments.create_checkout_session(db, user, req.pack_id)
    except payments.StripeNotConfigured:
        raise HTTPException(status_code=503, detail="Payments are not configured")
    except payments.UnknownPack:
        raise HTTPException(status_code=400, detail="Unknown credit pack")
    return {"checkout_url": url, "order_id": order.id, "credits": order.credits}
