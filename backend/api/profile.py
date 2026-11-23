import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.user import User
from backend.models.profile import ProfileSnapshot
from backend.models.target_role import TargetRoleProfile
from backend.api.dependencies import get_current_user
from backend.services.resume_ai import parse_resume_with_ai
from backend.services.resume_analysis import analyze_resume
from backend.services.resume_builder import build_resume_pdf, normalize_resume, render_resume_html
from backend.services.github import get_github_auth_url, connect_github_account, get_github_data
from backend.services.linkedin import parse_linkedin_import, parse_linkedin_paste
from backend.services.profile_merge import compute_merge

router = APIRouter(prefix="/profile", tags=["profile"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


async def _read_upload_with_limit(file: UploadFile) -> bytes:
    """Read an upload in bounded chunks so oversized bodies do not exhaust memory."""
    chunks = []
    total = 0
    while chunk := await file.read(1024 * 1024):
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size must be under 10MB",
            )
        chunks.append(chunk)
    return b"".join(chunks)


class UserProfile(BaseModel):
    email: str
    role: str
    is_active: bool
    created_at: datetime


class PersonalInfo(BaseModel):
    full_name: str | None = None
    headline: str | None = None
    bio: str | None = None
    location: str | None = None
    phone: str | None = None
    website: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None


class PersonalInfoUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    headline: str | None = Field(default=None, max_length=200)
    bio: str | None = Field(default=None, max_length=1000)
    location: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    website: str | None = Field(default=None, max_length=300)
    linkedin_url: str | None = Field(default=None, max_length=300)
    github_url: str | None = Field(default=None, max_length=300)


class SnapshotResponse(BaseModel):
    id: uuid.UUID | None = None
    user: UserProfile
    personal: PersonalInfo
    resume_data: dict | None
    github_data: dict | None
    linkedin_data: dict | None
    merged: dict | None
    computed_at: datetime | None = None


class LinkedInPasteRequest(BaseModel):
    content: str


class ResumeAnalyzeRequest(BaseModel):
    target_role_id: str | None = None
    job_description: str | None = Field(default=None, max_length=8000)


class ResumeBuildRequest(BaseModel):
    resume: dict


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

    content = await _read_upload_with_limit(file)

    try:
        parsed = await parse_resume_with_ai(
            file.filename or "resume.pdf", content, str(user.id), db
        )
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
    content = await _read_upload_with_limit(file)

    try:
        text = content.decode("utf-8")
        parsed = parse_linkedin_import(text, file.filename or "linkedin.txt")
    except (UnicodeDecodeError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="LinkedIn export must be valid UTF-8 text: " + str(e),
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


def _personal(snapshot: ProfileSnapshot | None) -> PersonalInfo:
    if not snapshot:
        return PersonalInfo()
    return PersonalInfo(
        full_name=snapshot.full_name,
        headline=snapshot.headline,
        bio=snapshot.bio,
        location=snapshot.location,
        phone=snapshot.phone,
        website=snapshot.website,
        linkedin_url=snapshot.linkedin_url,
        github_url=snapshot.github_url,
    )


def _user_profile(user: User) -> UserProfile:
    return UserProfile(email=user.email, role=user.role.value, is_active=user.is_active, created_at=user.created_at)


@router.get("/snapshot", response_model=SnapshotResponse)
async def get_snapshot_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the user's profile, personal info, and merged snapshot."""
    result = await db.execute(select(ProfileSnapshot).where(ProfileSnapshot.user_id == user.id))
    snapshot = result.scalar_one_or_none()

    merged = None
    if snapshot and (snapshot.resume_data or snapshot.github_data or snapshot.linkedin_data):
        m = compute_merge(snapshot.github_data, snapshot.resume_data, snapshot.linkedin_data)
        merged = {
            "skills": [{"name": s.name, "source": s.source, "confidence": s.confidence} for s in m.skills],
            "experience": m.experience,
            "education": m.education,
            "projects": m.projects,
            "languages_used": m.languages_used,
            "conflicts": [
                {
                    "skill": c.skill,
                    "github_signal": c.github_signal,
                    "resume_signal": c.resume_signal,
                    "linkedin_signal": c.linkedin_signal,
                    "resolution": c.resolution,
                }
                for c in m.conflicts
            ],
        }

    return SnapshotResponse(
        id=snapshot.id if snapshot else None,
        user=_user_profile(user),
        personal=_personal(snapshot),
        resume_data=snapshot.resume_data if snapshot else None,
        github_data=snapshot.github_data if snapshot else None,
        linkedin_data=snapshot.linkedin_data if snapshot else None,
        merged=merged,
        computed_at=snapshot.computed_at if snapshot else None,
    )


@router.put("/personal", response_model=SnapshotResponse)
async def update_personal_info(
    req: PersonalInfoUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ProfileSnapshot).where(ProfileSnapshot.user_id == user.id))
    snapshot = result.scalar_one_or_none()
    data = req.model_dump(exclude_unset=True)
    for k, v in data.items():
        if isinstance(v, str):
            data[k] = v.strip() or None

    if snapshot:
        for k, v in data.items():
            setattr(snapshot, k, v)
        snapshot.computed_at = datetime.now(timezone.utc)
    else:
        snapshot = ProfileSnapshot(user_id=user.id, **data)
        db.add(snapshot)

    await db.commit()
    await db.refresh(snapshot)
    return await get_snapshot_endpoint(user=user, db=db)


@router.post("/resume/analyze", response_model=dict)
async def analyze_resume_endpoint(
    req: ResumeAnalyzeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ProfileSnapshot).where(ProfileSnapshot.user_id == user.id))
    snapshot = result.scalar_one_or_none()
    if not snapshot or not snapshot.resume_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No resume found. Upload a resume first.")

    target_role = None
    if req.target_role_id:
        role_result = await db.execute(select(TargetRoleProfile).where(TargetRoleProfile.id == req.target_role_id))
        target_role = role_result.scalar_one_or_none()
        if not target_role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target role not found")

    analysis = await analyze_resume(
        db,
        user_id=str(user.id),
        resume_data=snapshot.resume_data,
        target_role=target_role,
        job_description=req.job_description,
    )
    return {"status": "ok", "analysis": analysis, "target_role": target_role.name if target_role else None}


@router.post("/resume/build/preview", response_model=dict)
async def resume_build_preview(
    req: ResumeBuildRequest,
    user: User = Depends(get_current_user),
):
    normalized = normalize_resume(req.resume)
    return {"status": "ok", "html": render_resume_html(normalized), "resume": normalized}


@router.post("/resume/build/export")
async def resume_build_export(
    req: ResumeBuildRequest,
    user: User = Depends(get_current_user),
):
    pdf = build_resume_pdf(req.resume)
    name = normalize_resume(req.resume).get("name") or "resume"
    safe = "".join(c for c in name if c.isalnum() or c in (" ", "-", "_")).strip().replace(" ", "_") or "resume"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe}.pdf"'},
    )
