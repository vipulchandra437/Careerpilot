import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.user import User
from backend.models.profile import ProfileSnapshot
from backend.api.dependencies import get_current_user
from backend.services.resume_parser import parse_resume
from backend.services.github import get_github_auth_url, connect_github_account, get_github_data
from backend.services.linkedin import parse_linkedin_import, parse_linkedin_paste
from backend.services.profile_merge import compute_merge

router = APIRouter(prefix="/profile", tags=["profile"])


class SnapshotResponse(BaseModel):
    id: uuid.UUID
    resume_data: dict | None
    github_data: dict | None
    linkedin_data: dict | None
    merged: dict | None
    computed_at: datetime


class LinkedInPasteRequest(BaseModel):
    content: str


@router.post("/resume", response_model=dict)
async def upload_resume(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload and parse a resume (PDF/DOCX)."""
    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain",
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, DOCX, and TXT files are supported",
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be under 10MB",
        )

    try:
        parsed = parse_resume(file.filename or "resume.pdf", content)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    # Store parsed data
    resume_data = {
        "skills": parsed.skills,
        "experience": parsed.experience,
        "education": parsed.education,
        "projects": parsed.projects,
        "filename": file.filename,
    }

    # Get or create snapshot
    result = await db.execute(
        select(ProfileSnapshot).where(ProfileSnapshot.user_id == user.id)
    )
    snapshot = result.scalar_one_or_none()

    if snapshot:
        snapshot.resume_data = resume_data
        snapshot.computed_at = datetime.now(timezone.utc)
    else:
        snapshot = ProfileSnapshot(user_id=user.id, resume_data=resume_data)
        db.add(snapshot)

    await db.commit()
    await db.refresh(snapshot)

    return {"status": "ok", "data": resume_data}


@router.get("/github/auth-url")
async def get_github_auth_url_endpoint(
    user: User = Depends(get_current_user),
):
    """Get GitHub OAuth authorization URL."""
    import secrets
    state = secrets.token_urlsafe(32)
    url = get_github_auth_url(state)
    return {"url": url, "state": state}


@router.post("/github/connect", response_model=dict)
async def connect_github_endpoint(
    code: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Connect GitHub account via OAuth code."""
    try:
        result = await connect_github_account(db, user.id, code)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    return {"status": "ok", "data": result}


@router.get("/github/data", response_model=dict)
async def get_github_data_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get GitHub data for the current user."""
    try:
        data = await get_github_data(db, user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    return {"status": "ok", "data": data}


@router.post("/linkedin/import", response_model=dict)
async def import_linkedin_endpoint(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import LinkedIn data from file upload (JSON/CSV export)."""
    content = await file.read()
    text = content.decode("utf-8")

    try:
        parsed = parse_linkedin_import(text, file.filename or "linkedin.txt")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    linkedin_data = {
        "name": parsed.name,
        "headline": parsed.headline,
        "summary": parsed.summary,
        "skills": parsed.skills,
        "experience": parsed.experience,
        "education": parsed.education,
        "filename": file.filename,
    }

    # Get or create snapshot
    result = await db.execute(
        select(ProfileSnapshot).where(ProfileSnapshot.user_id == user.id)
    )
    snapshot = result.scalar_one_or_none()

    if snapshot:
        snapshot.linkedin_data = linkedin_data
        snapshot.computed_at = datetime.now(timezone.utc)
    else:
        snapshot = ProfileSnapshot(user_id=user.id, linkedin_data=linkedin_data)
        db.add(snapshot)

    await db.commit()
    await db.refresh(snapshot)

    return {"status": "ok", "data": linkedin_data}


@router.post("/linkedin/paste", response_model=dict)
async def import_linkedin_paste_endpoint(
    req: LinkedInPasteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import LinkedIn data from pasted text."""
    try:
        parsed = parse_linkedin_paste(req.content)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    linkedin_data = {
        "name": parsed.name,
        "headline": parsed.headline,
        "summary": parsed.summary,
        "skills": parsed.skills,
        "experience": parsed.experience,
        "education": parsed.education,
    }

    result = await db.execute(
        select(ProfileSnapshot).where(ProfileSnapshot.user_id == user.id)
    )
    snapshot = result.scalar_one_or_none()

    if snapshot:
        snapshot.linkedin_data = linkedin_data
        snapshot.computed_at = datetime.now(timezone.utc)
    else:
        snapshot = ProfileSnapshot(user_id=user.id, linkedin_data=linkedin_data)
        db.add(snapshot)

    await db.commit()
    await db.refresh(snapshot)

    return {"status": "ok", "data": linkedin_data}


@router.get("/snapshot", response_model=SnapshotResponse)
async def get_snapshot_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the user's profile snapshot with merged data."""
    result = await db.execute(
        select(ProfileSnapshot).where(ProfileSnapshot.user_id == user.id)
    )
    snapshot = result.scalar_one_or_none()

    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile snapshot found. Upload a resume or connect GitHub to get started.",
        )

    merged = compute_merge(
        snapshot.github_data,
        snapshot.resume_data,
        snapshot.linkedin_data,
    )

    return SnapshotResponse(
        id=snapshot.id,
        resume_data=snapshot.resume_data,
        github_data=snapshot.github_data,
        linkedin_data=snapshot.linkedin_data,
        merged={
            "skills": [{"name": s.name, "source": s.source, "confidence": s.confidence} for s in merged.skills],
            "experience": merged.experience,
            "education": merged.education,
            "projects": merged.projects,
            "languages_used": merged.languages_used,
            "conflicts": [
                {
                    "skill": c.skill,
                    "github_signal": c.github_signal,
                    "resume_signal": c.resume_signal,
                    "linkedin_signal": c.linkedin_signal,
                    "resolution": c.resolution,
                }
                for c in merged.conflicts
            ],
        },
        computed_at=snapshot.computed_at,
    )
