import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.user import User
from backend.models.profile import ProfileSnapshot
from backend.models.target_role import TargetRoleProfile
from backend.models.gap import GapReport
from backend.api.dependencies import get_current_user
from backend.services.profile_merge import compute_merge
from backend.services.gap_engine import run_gap_analysis
from backend.services.credit import authorize_use, refund_last, InsufficientCredits

router = APIRouter(prefix="/gap", tags=["gap-analysis"])


class RoleOption(BaseModel):
    id: uuid.UUID
    name: str


class AnalyzeRequest(BaseModel):
    target_role_id: str


class GapResponse(BaseModel):
    id: uuid.UUID
    snapshot_id: str
    target_role_id: uuid.UUID
    target_role_name: str
    gaps: list
    created_at: object


@router.get("/roles", response_model=list[RoleOption])
async def list_target_roles(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Public (student) list of target roles available for analysis."""
    result = await db.execute(select(TargetRoleProfile).order_by(TargetRoleProfile.name))
    return [RoleOption(id=uuid.UUID(r.id), name=r.name) for r in result.scalars().all()]


@router.post("/analyze", response_model=GapResponse)
async def analyze(
    req: AnalyzeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run (or re-run, updating) the skill gap analysis for the user's snapshot."""
    snapshot_result = await db.execute(
        select(ProfileSnapshot).where(ProfileSnapshot.user_id == user.id)
    )
    snapshot = snapshot_result.scalar_one_or_none()
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile snapshot found. Upload a resume or connect GitHub first.",
        )

    role_result = await db.execute(
        select(TargetRoleProfile).where(TargetRoleProfile.id == req.target_role_id)
    )
    role = role_result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target role not found")

    merged = compute_merge(snapshot.github_data, snapshot.resume_data, snapshot.linkedin_data)

    # Metered feature: free allowance (1) then paid (5 credits) — gate BEFORE work.
    try:
        await authorize_use(db, user.id, "gap_analysis")
    except InsufficientCredits as e:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(e))

    report = await run_gap_analysis(db, snapshot.id, role, merged, str(user.id))

    return GapResponse(
        id=uuid.UUID(report.id),
        snapshot_id=report.snapshot_id,
        target_role_id=uuid.UUID(report.target_role_id),
        target_role_name=role.name,
        gaps=report.gaps,
        created_at=report.created_at,
    )


@router.get("/report", response_model=GapResponse)
async def get_report(
    target_role_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch the latest gap report for the user + target role (404 if none yet)."""
    snapshot_result = await db.execute(
        select(ProfileSnapshot).where(ProfileSnapshot.user_id == user.id)
    )
    snapshot = snapshot_result.scalar_one_or_none()
    if not snapshot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No profile snapshot found")

    result = await db.execute(
        select(GapReport).where(
            GapReport.snapshot_id == snapshot.id,
            GapReport.target_role_id == target_role_id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No gap report yet. Run POST /api/gap/analyze first.",
        )

    role_result = await db.execute(
        select(TargetRoleProfile).where(TargetRoleProfile.id == report.target_role_id)
    )
    role = role_result.scalar_one_or_none()
    role_name = role.name if role else "Unknown"

    return GapResponse(
        id=uuid.UUID(report.id),
        snapshot_id=report.snapshot_id,
        target_role_id=uuid.UUID(report.target_role_id),
        target_role_name=role_name,
        gaps=report.gaps,
        created_at=report.created_at,
    )
