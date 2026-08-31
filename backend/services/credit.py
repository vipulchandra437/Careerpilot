"""Credit engine (Phase 6, PROMPT.md hybrid pricing model).

Policy (locked in MEMORY.md):
  - P6-1: fixed credit per feature use (NOT token-proportional, NOT subscription).
  - P6-2: per-feature free allowance per NEW user before credits are required:
        1 gap analysis + 3 practice challenges + 1 mock interview + 1 roadmap.
        Resume parsing is NOT metered (no gate).
  - Free uses are counted in the ledger (delta=0 `free_use` rows) so a user
    cannot bypass the allowance by reloading — the ledger is the source of truth.
  - Paid uses deduct a fixed cost and are recorded as `feature_use` rows.
  - Balance is maintained on User.credit_balance and mirrored one row at a time
    in credit_transactions (auditable end to end).

Every function is a transaction: it commits the deduction + ledger row together,
so a deduct can never be recorded without a ledger entry (or vice versa).
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.credit import CreditTransaction
from backend.models.user import User

# Fixed credit cost per feature use (P6-1).
FEATURE_COST: dict[str, int] = {
    "gap_analysis": 5,
    "practice_challenge": 2,
    "mock_interview": 3,
    "roadmap": 5,
}

# Free-tier allowance per NEW user (LOCKED by user, 2026-08-31):
#   1 gap analysis + 3 practice challenges + 1 mock interview + 1 roadmap.
# Enough to genuinely experience the product before paying. The first roadmap
# generate is free onboarding; this "1 roadmap" allowance is 1 free regenerate.
# Choose generously — LLM cost is not the binding constraint (MEMORY.md P6-9/11/13).
FREE_ALLOWANCE: dict[str, int] = {
    "gap_analysis": 1,
    "practice_challenge": 3,
    "mock_interview": 1,
    "roadmap": 1,
}

CREDIT_REASONS = {"free_use", "feature_use", "refund", "purchase", "admin_grant"}


class InsufficientCredits(Exception):
    """Raised when a paid use is attempted without enough credit balance."""


async def record_transaction(
    db: AsyncSession,
    user_id: str,
    delta: int,
    reason: str,
    feature: str | None = None,
    description: str | None = None,
) -> CreditTransaction:
    """Append a ledger row AND update the user's running balance atomically.

    Commits the session. Raises ValueError on an unrecognized reason.
    """
    if reason not in CREDIT_REASONS:
        raise ValueError(f"Unknown credit reason: {reason}")

    user = await db.get(User, user_id)
    if user is None:
        raise ValueError("User not found")

    tx = CreditTransaction(
        user_id=user_id,
        delta=delta,
        reason=reason,
        feature=feature,
        description=description,
    )
    db.add(tx)
    user.credit_balance = user.credit_balance + delta
    await db.commit()
    await db.refresh(user)
    return tx


async def free_uses_so_far(db: AsyncSession, user_id: str, feature: str) -> int:
    """Count free uses already consumed for a feature (from the ledger)."""
    r = await db.execute(
        select(func.count())
        .select_from(CreditTransaction)
        .where(
            CreditTransaction.user_id == user_id,
            CreditTransaction.feature == feature,
            CreditTransaction.reason == "free_use",
        )
    )
    return int(r.scalar() or 0)


async def authorize_use(db: AsyncSession, user_id: str, feature: str) -> CreditTransaction | None:
    """Gate a feature use under the free-tier + credit model.

    Returns the ledger row written (which may be a delta=0 free-use marker or a
    costed feature-use deduction), or raises InsufficientCredits when the user is
    out of free uses and has an insufficient balance.

    This MUST be called before performing the (LLM) work for the feature. On any
    later failure of that work, call `refund_last` to reverse the deduction so the
    ledger never records a charge for work that didn't happen.
    """
    if feature not in FEATURE_COST:
        raise ValueError(f"Feature is not credit-metered: {feature}")

    # Always reload the user within THIS session so the balance check sees the
    # current, committed value (never a stale object passed in by the caller).
    user = await db.get(User, user_id)
    if user is None:
        raise ValueError("User not found")

    used = await free_uses_so_far(db, user.id, feature)
    allowance = FREE_ALLOWANCE.get(feature, 0)

    if used < allowance:
        # Within the free allowance: record the use (delta 0), no charge.
        return await record_transaction(
            db,
            user.id,
            0,
            "free_use",
            feature=feature,
            description=f"Free-tier {feature} ({(used + 1)}/{allowance})",
        )

    # Past the free allowance: charge the fixed cost.
    cost = FEATURE_COST[feature]
    if user.credit_balance < cost:
        raise InsufficientCredits(
            f"Not enough credits for {feature}: need {cost}, have {user.credit_balance}. "
            "Purchase credits to continue."
        )

    return await record_transaction(
        db,
        user.id,
        -cost,
        "feature_use",
        feature=feature,
        description=f"Paid {feature} use ({cost} credits)",
    )


async def refund_last(db: AsyncSession, user_id: str, feature: str) -> None:
    """Reverse the most recent ledger row for a paid feature use (rollback).

    Used when the LLM work fails AFTER a deduction, so users are never charged
    for work that didn't happen. Free-use (delta 0) rows are left untouched.
    """
    r = await db.execute(
        select(CreditTransaction)
        .where(
            CreditTransaction.user_id == user_id,
            CreditTransaction.feature == feature,
            CreditTransaction.reason.in_(["feature_use", "free_use"]),
        )
        .order_by(CreditTransaction.created_at.desc(), CreditTransaction.id.desc())
        .limit(1)
    )
    last = r.scalar_one_or_none()
    if last is None or last.delta >= 0:
        return  # nothing to refund (free use or no row)
    # Attribute the refund to this specific deduction so it's auditable.
    await record_transaction(
        db,
        user_id,
        -last.delta,
        "refund",
        feature=feature,
        description=f"Refund for failed {feature} use",
    )


async def get_balance(db: AsyncSession, user: User) -> int:
    return user.credit_balance
