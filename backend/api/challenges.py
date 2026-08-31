"""Coding challenge API endpoints (PRD §6.3, DESIGN.md §2.5).

Thin router only — all logic lives in backend/services/coding_challenges.py.
Submission routes code through the sandbox (backend/sandbox); if the sandbox is
unavailable the endpoint returns 503 cleanly and NEVER executes the code here.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.database import get_db
from backend.models.challenge import Challenge
from backend.models.target_role import TargetRoleProfile
from backend.models.roadmap import RoadmapMilestone, Roadmap
from backend.sandbox.executor import SandboxRunError
from backend.services.credit import authorize_use, refund_last, InsufficientCredits
from backend.services.coding_challenges import (
    generate_challenge,
    submit_solution,
    get_challenge,
    check_solution,
    get_progress_for_skill,
    DIFFICULTIES,
)

router = APIRouter(prefix="/challenges", tags=["coding-challenges"])


class GenerateRequest(BaseModel):
    skill: str
    difficulty: str = "adaptive"
    target_role_id: str
    roadmap_milestone_id: str | None = None


class SubmitRequest(BaseModel):
    code: str
    roadmap_milestone_id: str | None = None


class ChallengeOut(BaseModel):
    id: str
    skill: str
    difficulty: str
    title: str
    prompt: str
    function_signature: str
    starter_code: str
    expected_time_complexity: str | None = None


@router.get("/difficulties")
async def list_difficulties(user=Depends(get_current_user)):
    """Adapter-friendly list of supported difficulties."""
    return {"difficulties": list(DIFFICULTIES)}


@router.post("/generate", response_model=ChallengeOut)
async def create_challenge(
    req: GenerateRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate (and persist) a challenge for {skill, difficulty, target_role}.

    `difficulty` may be one of the fixed levels OR "adaptive": in the adaptive
    case the level is resolved from the user's ChallengeProgress for this skill
    (2 correct -> step up, 2 incorrect -> step down, PRD §6.3), defaulting to
    "beginner" when no progress exists yet. Optionally ties the challenge to a
    roadmap milestone owned by the user so a passed submission marks that
    milestone's action complete.
    """
    if req.difficulty != "adaptive" and req.difficulty not in DIFFICULTIES:
        raise HTTPException(status_code=400, detail="Invalid difficulty")

    if req.difficulty == "adaptive":
        progress = await get_progress_for_skill(db, user.id, req.skill)
        difficulty = progress.current_difficulty if progress else "beginner"
    else:
        difficulty = req.difficulty

    role_result = await db.execute(
        select(TargetRoleProfile).where(TargetRoleProfile.id == req.target_role_id)
    )
    role = role_result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Target role not found")

    if req.roadmap_milestone_id:
        owner = await db.execute(
            select(RoadmapMilestone)
            .join(Roadmap, RoadmapMilestone.roadmap_id == Roadmap.id)
            .where(RoadmapMilestone.id == req.roadmap_milestone_id)
            .where(Roadmap.user_id == user.id)
        )
        if owner.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Milestone not found")

    # Metered feature: free allowance (3) then paid (2 credits) — gate BEFORE the LLM work.
    try:
        await authorize_use(db, user.id, "practice_challenge")
    except InsufficientCredits as e:
        raise HTTPException(status_code=402, detail=str(e))

    challenge = await generate_challenge(
        db,
        user_id=user.id,
        skill=req.skill,
        difficulty=difficulty,
        target_role_id=role.id,
        role_name=role.name,
        use_llm=True,
    )
    if challenge is None:
        # LLM failed to produce a challenge — the (credits) deduction must be reversed.
        await refund_last(db, user.id, "practice_challenge")
        raise HTTPException(
            status_code=502,
            detail="Challenge generation failed (LLM unavailable or invalid output).",
        )

    return ChallengeOut(
        id=challenge.id,
        skill=challenge.skill,
        difficulty=challenge.difficulty,
        title=challenge.title,
        prompt=challenge.prompt,
        function_signature=challenge.function_signature,
        starter_code=challenge.starter_code,
        expected_time_complexity=challenge.expected_time_complexity,
    )


@router.get("/{challenge_id}", response_model=ChallengeOut)
async def read_challenge(
    challenge_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch a challenge's prompt/starter (test-case answers are never exposed)."""
    challenge = await get_challenge(db, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return ChallengeOut(
        id=challenge.id,
        skill=challenge.skill,
        difficulty=challenge.difficulty,
        title=challenge.title,
        prompt=challenge.prompt,
        function_signature=challenge.function_signature,
        starter_code=challenge.starter_code,
        expected_time_complexity=challenge.expected_time_complexity,
    )


@router.post("/{challenge_id}/run")
async def run_without_submit(
    challenge_id: str,
    req: SubmitRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run code in the sandbox and return results WITHOUT recording a submission.

    Used by the "Run" action (DESIGN.md §2.5) so a student can test against the
    fixed test cases before formally submitting. No attempt is persisted and no
    roadmap milestone is touched. Returns 503 if the sandbox is unavailable.
    """
    challenge = await get_challenge(db, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    try:
        result = check_solution(challenge, req.code)
    except SandboxRunError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Sandbox unavailable: {e}. Code was not executed.",
        )
    tests = result.tests
    return {
        "passed": result.all_passed,
        "tests": tests,
        "error": result.error,
    }


@router.post("/{challenge_id}/submit")
async def submit(
    challenge_id: str,
    req: SubmitRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run a submission through the sandbox and return graded results.

    Returns 503 if the sandbox is unavailable. It NEVER executes the submitted
    code in the API process (RULES.md §2).
    """
    challenge = await get_challenge(db, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    if req.roadmap_milestone_id:
        owner = await db.execute(
            select(RoadmapMilestone)
            .join(Roadmap, RoadmapMilestone.roadmap_id == Roadmap.id)
            .where(RoadmapMilestone.id == req.roadmap_milestone_id)
            .where(Roadmap.user_id == user.id)
        )
        if owner.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Milestone not found")

    try:
        attempt = await submit_solution(
            db,
            user_id=user.id,
            challenge=challenge,
            code=req.code,
            roadmap_milestone_id=req.roadmap_milestone_id,
        )
    except SandboxRunError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Sandbox unavailable: {e}. Code was not executed.",
        )

    # Return the graded result WITHOUT the student's stored code (not needed).
    passed = attempt.status == "passed"
    return {
        "attempt_id": attempt.id,
        "status": attempt.status,
        "passed": passed,
        "tests": attempt.results,
        "difficulty": attempt.difficulty_at_submission,
        "consecutive_correct": attempt.consecutive_correct,
        "consecutive_wrong": attempt.consecutive_wrong,
        "milestone_marked_done": passed and req.roadmap_milestone_id is not None,
    }
