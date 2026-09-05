"""Admin user management (PRD §6.7, DESIGN §2.9).

Server-side role-gated (RULES §2): every route depends on `require_admin`.
- GET /admin/users         -> list accounts with role, active flag, signup date
- PATCH /admin/users/{id}  -> enable/disable an account (body: {active: bool})
- GET /admin/users/{id}/usage -> per-user LLM usage row counts + tokens

Disabling is enforced at the seam: login and get_current_user both reject an
inactive account (see api/auth.py and api/dependencies.py), so a disabled user
cannot log back in or mint a usable session.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.user import User, UserRole
from backend.models.llm_usage import LLMUsageLog
from backend.api.dependencies import require_admin

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    is_active: bool
    github_connected: bool
    created_at: datetime


class UserPatchRequest(BaseModel):
    active: bool


class UserUsageResponse(BaseModel):
    user_id: str
    feature_usage: list[dict]
    total_calls: int
    total_tokens_in: int
    total_tokens_out: int


def _to_user_response(u: User) -> UserResponse:
    return UserResponse(
        id=u.id,
        email=u.email,
        role=u.role.value,
        is_active=u.is_active,
        github_connected=bool(u.github_id),
        created_at=u.created_at,
    )


@router.get("", response_model=list[UserResponse])
async def list_users(
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return [_to_user_response(u) for u in result.scalars().all()]


@router.patch("/{user_id}", response_model=UserResponse)
async def set_user_active(
    user_id: str,
    req: UserPatchRequest,
    current_admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Guard: an admin must not lock themselves (or any admin) out, and must not
    # be able to disable their own account — otherwise the console could
    # brick itself. Admins can only disable students here.
    if target.role == UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin accounts cannot be disabled through the console",
        )

    target.is_active = req.active
    await db.commit()
    await db.refresh(target)
    return _to_user_response(target)


@router.get("/{user_id}/usage", response_model=UserUsageResponse)
async def user_usage(
    user_id: str,
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    rows = (await db.execute(select(LLMUsageLog).where(LLMUsageLog.user_id == user_id))).scalars().all()

    by_feature: dict[str, dict] = {}
    for r in rows:
        f = by_feature.setdefault(
            r.feature,
            {"feature": r.feature, "calls": 0, "tokens_in": 0, "tokens_out": 0, "cost_usd": 0.0},
        )
        f["calls"] += 1
        f["tokens_in"] += r.tokens_in
        f["tokens_out"] += r.tokens_out
        f["cost_usd"] += float(r.cost_usd or 0.0)

    return UserUsageResponse(
        user_id=user_id,
        feature_usage=sorted(by_feature.values(), key=lambda x: x["calls"], reverse=True),
        total_calls=len(rows),
        total_tokens_in=sum(r.tokens_in for r in rows),
        total_tokens_out=sum(r.tokens_out for r in rows),
    )
