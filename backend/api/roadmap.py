"""Roadmap API endpoints."""

import logging
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.database import get_db
from backend.models.gap import GapReport
from backend.models.profile import ProfileSnapshot
from backend.models.roadmap import Roadmap, RoadmapMilestone
from backend.models.target_role import TargetRoleProfile
from backend.services.profile_merge import MergedProfile
from backend.services.roadmap import get_roadmap_with_milestones, get_roadmap_by_id_with_milestones, run_roadmap_generation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


@router.post("/generate")
async def generate_roadmap(
    gap_report_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Trigger roadmap generation as a background job.

    Returns immediately with a 'generating' status. Frontend should poll
    GET /api/roadmap/{gap_report_id} until roadmap is ready.
    """
    # Verify gap report exists and belongs to user
    result = await db.execute(
        select(GapReport)
        .join(ProfileSnapshot, ProfileSnapshot.id == GapReport.snapshot_id)
        .where(GapReport.id == gap_report_id)
        .where(ProfileSnapshot.user_id == current_user.id)
    )
    gap_report = result.scalar_one_or_none()
    if not gap_report:
        raise HTTPException(status_code=404, detail="Gap report not found")

    # Get target role for role name
    role_result = await db.execute(
        select(TargetRoleProfile).where(TargetRoleProfile.id == gap_report.target_role_id)
    )
    target_role = role_result.scalar_one_or_none()
    if not target_role:
        raise HTTPException(status_code=404, detail="Target role not found")

    # Check if roadmap already exists and is complete
    roadmap, milestones = await get_roadmap_with_milestones(db, gap_report_id)
    if roadmap and milestones:
        return {
            "status": "ready",
            "roadmap_id": roadmap.id,
            "version": roadmap.version,
            "message": "Roadmap already exists. Use regenerate to create a new version.",
        }

    # Get the user's merged profile (need to reconstruct from snapshot)
    # For now, we'll need to pass the merged profile. This is a limitation -
    # we should store the merged profile or reconstruct it.
    # Let's fetch the profile snapshot and reconstruct.
    snapshot_result = await db.execute(
        select(ProfileSnapshot).where(ProfileSnapshot.id == gap_report.snapshot_id)
    )
    snapshot = snapshot_result.scalar_one_or_none()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Profile snapshot not found")

    # Reconstruct merged profile from snapshot data
    merged = MergedProfile()
    if snapshot.github_data:
        merged.languages_used = snapshot.github_data.get("languages", {})
    # This is simplified - in production we'd store the full merged profile

    # Run in background
    background_tasks.add_task(
        _generate_roadmap_background,
        gap_report_id=gap_report_id,
        user_id=current_user.id,
        target_role_name=target_role.name,
        merged=merged,
    )

    return {
        "status": "generating",
        "message": "Roadmap generation started. Poll GET /api/roadmap/{gap_report_id} for completion.",
    }


async def _generate_roadmap_background(
    gap_report_id: str,
    user_id: str,
    target_role_name: str,
    merged: MergedProfile,
):
    """Background task to generate a roadmap."""
    from backend.database import async_session
    async with async_session() as db:
        try:
            result = await db.execute(
                select(GapReport).where(GapReport.id == gap_report_id)
            )
            gap_report = result.scalar_one_or_none()
            if not gap_report:
                return

            await run_roadmap_generation(
                db=db,
                user_id=user_id,
                gap_report=gap_report,
                merged=merged,
                target_role_name=target_role_name,
            )
        except Exception as exc:
            # Log error but don't crash background task; refund if this was paid.
            logger.exception("Roadmap background generation failed for gap_report=%s: %s", gap_report_id, exc)
            pass


@router.get("/{gap_report_id}")
async def get_roadmap(
    gap_report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get the roadmap and milestones for a gap report."""
    report_result = await db.execute(
        select(GapReport)
        .join(ProfileSnapshot, ProfileSnapshot.id == GapReport.snapshot_id)
        .where(GapReport.id == gap_report_id)
        .where(ProfileSnapshot.user_id == current_user.id)
    )
    if not report_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Roadmap not found")

    result = await get_roadmap_with_milestones(db, gap_report_id)
    if not result:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    roadmap, milestones = result

    return {
        "roadmap": {
            "id": roadmap.id,
            "user_id": roadmap.user_id,
            "gap_report_id": roadmap.gap_report_id,
            "version": roadmap.version,
            "created_at": roadmap.created_at.isoformat() if roadmap.created_at else None,
        },
        "milestones": [
            {
                "id": m.id,
                "title": m.title,
                "linked_gap_skill": m.linked_gap_skill,
                "status": m.status,
                "linked_action_type": m.linked_action_type,
                "linked_action_id": m.linked_action_id,
                "order_index": m.order_index,
                "estimated_hours": m.estimated_hours,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in milestones
        ],
    }


@router.post("/{gap_report_id}/regenerate")
async def regenerate_roadmap(
    gap_report_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Force regenerate roadmap (creates new version)."""
    # Verify gap report exists
    result = await db.execute(
        select(GapReport)
        .join(ProfileSnapshot, ProfileSnapshot.id == GapReport.snapshot_id)
        .where(GapReport.id == gap_report_id)
        .where(ProfileSnapshot.user_id == current_user.id)
    )
    gap_report = result.scalar_one_or_none()
    if not gap_report:
        raise HTTPException(status_code=404, detail="Gap report not found")

    role_result = await db.execute(
        select(TargetRoleProfile).where(TargetRoleProfile.id == gap_report.target_role_id)
    )
    target_role = role_result.scalar_one_or_none()
    if not target_role:
        raise HTTPException(status_code=404, detail="Target role not found")

    snapshot_result = await db.execute(
        select(ProfileSnapshot).where(ProfileSnapshot.id == gap_report.snapshot_id)
    )
    snapshot = snapshot_result.scalar_one_or_none()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Profile snapshot not found")

    merged = MergedProfile()
    if snapshot.github_data:
        merged.languages_used = snapshot.github_data.get("languages", {})

    background_tasks.add_task(
        _generate_roadmap_background,
        gap_report_id=gap_report_id,
        user_id=current_user.id,
        target_role_name=target_role.name,
        merged=merged,
    )

    return {
        "status": "generating",
        "message": "Roadmap regeneration started.",
    }


@router.patch("/milestones/{milestone_id}")
async def update_milestone(
    milestone_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update a milestone's status and re-order the roadmap.

    Body: {"status": "not_started" | "in_progress" | "done"}
    Returns the updated milestone with new order_index and the full re-ordered milestone list.
    """
    from backend.services.roadmap import update_milestone_status, get_roadmap_with_milestones

    status = body.get("status")
    if status not in ("not_started", "in_progress", "done"):
        raise HTTPException(status_code=400, detail="Invalid status")

    # Verify milestone exists and user owns the roadmap
    result = await db.execute(
        select(RoadmapMilestone)
        .join(Roadmap, RoadmapMilestone.roadmap_id == Roadmap.id)
        .where(RoadmapMilestone.id == milestone_id)
        .where(Roadmap.user_id == current_user.id)
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    updated = await update_milestone_status(db, milestone_id, status)
    if not updated:
        raise HTTPException(status_code=404, detail="Milestone not found")

    # Return updated roadmap
    roadmap, milestones = await get_roadmap_by_id_with_milestones(db, updated.roadmap_id)
    return {
        "milestone": {
            "id": updated.id,
            "title": updated.title,
            "linked_gap_skill": updated.linked_gap_skill,
            "status": updated.status,
            "linked_action_type": updated.linked_action_type,
            "linked_action_id": updated.linked_action_id,
            "order_index": updated.order_index,
            "estimated_hours": updated.estimated_hours,
        },
        "milestones": [
            {
                "id": m.id,
                "title": m.title,
                "linked_gap_skill": m.linked_gap_skill,
                "status": m.status,
                "linked_action_type": m.linked_action_type,
                "linked_action_id": m.linked_action_id,
                "order_index": m.order_index,
                "estimated_hours": m.estimated_hours,
            }
            for m in milestones
        ],
    }