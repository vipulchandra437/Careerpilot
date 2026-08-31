"""Admin credit grant endpoint (Phase 6).

Lets an administrator grant credits to a student (e.g. free-trial extensions,
manual corrections, Stripe-manual-fulfillment fallbacks). Server-side guarded
by require_admin (RULES §2) — never exposed to students.

The grant is recorded through the SAME ledger as everything else (reason
'admin_grant'), so the audit invariant (balance == sum of deltas) holds and the
full history is visible.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user, require_admin
from backend.database import get_db
from backend.models.user import User
from backend.services.credit import record_transaction

router = APIRouter(prefix="/admin/credits", tags=["admin-credits"])


class GrantRequest(BaseModel):
    amount: int
    note: str | None = None


@router.post("/{user_id}")
async def grant_credits(
    user_id: str,
    req: GrantRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Grant (or, with negative amount, revoke) credits for a student."""
    if req.amount == 0:
        raise HTTPException(status_code=400, detail="Amount must be non-zero")
    if abs(req.amount) > 100_000:
        raise HTTPException(status_code=400, detail="Amount too large")

    target = await db.get(User, user_id)
    if target is None or target.role.value == "admin":
        raise HTTPException(status_code=404, detail="User not found")

    tx = await record_transaction(
        db,
        target.id,
        req.amount,
        "admin_grant",
        description=req.note or f"admin grant by {admin.email}",
    )
    await db.refresh(target)
    return {"user_id": target.id, "balance": target.credit_balance, "tx_id": tx.id}
