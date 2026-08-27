import uuid
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.profile_snapshot import ProfileSnapshot
from backend.services import resume_parser, github, linkedin

logger = logging.getLogger(__name__)


async def upload_resume(user_id: uuid.UUID, file_content: bytes, filename: str, db: AsyncSession) -> dict:
    """Upload and parse a resume. Returns parsed data."""
    parsed = resume_parser.parse_resume(file_content, filename)
    await _update_snapshot(user_id, "resume_data", parsed, db)
    return parsed


async def connect_github_account(user_id: uuid.UUID, code: str, db: AsyncSession) -> dict:
    """Connect GitHub account via OAuth."""
    result = await github.connect_github(user_id, code, db)
    gh_data = await github.get_github_data(user_id, db)
    await _update_snapshot(user_id, "github_data", gh_data, db)
    return result


async def import_linkedin_data(user_id: uuid.UUID, file_content: bytes, filename: str, db: AsyncSession) -> dict:
    """Import LinkedIn data (manual upload only)."""
    parsed = linkedin.parse_linkedin_import(file_content, filename)
    await _update_snapshot(user_id, "linkedin_data", parsed, db)
    return parsed


async def import_linkedin_paste(user_id: uuid.UUID, text: str, db: AsyncSession) -> dict:
    """Import LinkedIn data from text paste."""
    parsed = linkedin.parse_linkedin_paste(text)
    await _update_snapshot(user_id, "linkedin_data", parsed, db)
    return parsed


async def get_profile_snapshot(user_id: uuid.UUID, db: AsyncSession) -> dict | None:
    """Get the user's profile snapshot with merged data."""
    result = await db.execute(
        select(ProfileSnapshot).where(ProfileSnapshot.user_id == user_id)
    )
    snapshot = result.scalar_one_or_none()
    if not snapshot:
        return None

    merged = compute_merge(
        resume_data=snapshot.resume_data,
        github_data=snapshot.github_data,
        linkedin_data=snapshot.linkedin_data,
    )

    return {
        "id": str(snapshot.id),
        "resume_data": snapshot.resume_data,
        "github_data": snapshot.github_data,
        "linkedin_data": snapshot.linkedin_data,
        "merged": merged,
        "computed_at": snapshot.computed_at.isoformat(),
    }


async def _update_snapshot(user_id: uuid.UUID, field: str, data: dict, db: AsyncSession) -> None:
    """Update or create a profile snapshot with new data from one source."""
    result = await db.execute(
        select(ProfileSnapshot).where(ProfileSnapshot.user_id == user_id)
    )
    snapshot = result.scalar_one_or_none()

    if not snapshot:
        snapshot = ProfileSnapshot(user_id=user_id)
        db.add(snapshot)
        await db.flush()

    setattr(snapshot, field, data)
    snapshot.computed_at = datetime.now(timezone.utc)

    # Recompute merged view
    merged = compute_merge(
        resume_data=snapshot.resume_data,
        github_data=snapshot.github_data,
        linkedin_data=snapshot.linkedin_data,
    )
    snapshot.merged_skills = merged

    await db.commit()


def compute_merge(resume_data: dict | None, github_data: dict | None, linkedin_data: dict | None) -> dict:
    """Merge skill data from all sources.

    Priority: GitHub activity > resume > LinkedIn tags (architecture.md §4).
    All raw payloads are preserved in the snapshot; this produces the derived view.
    """
    skill_scores = {}  # skill -> {source, confidence, details}

    # LinkedIn has lowest priority (manual tags, easy to fake)
    if linkedin_data:
        for skill in linkedin_data.get("skills", []):
            skill_lower = skill.lower()
            skill_scores[skill_lower] = {
                "skill": skill,
                "source": "linkedin",
                "confidence": 0.3,
                "details": "Listed on LinkedIn profile",
            }

    # Resume has medium priority
    if resume_data:
        for skill in resume_data.get("skills", []):
            skill_lower = skill.lower()
            existing = skill_scores.get(skill_lower)
            skill_scores[skill_lower] = {
                "skill": skill,
                "source": "resume",
                "confidence": 0.6,
                "details": "Mentioned in resume",
            }

    # GitHub has highest priority (actual code activity)
    if github_data:
        for lang, bytes_val in github_data.get("all_languages", {}).items():
            skill_lower = lang.lower()
            confidence = min(0.9, 0.7 + (bytes_val / 100000))  # Scale with usage
            skill_scores[skill_lower] = {
                "skill": lang,
                "source": "github",
                "confidence": confidence,
                "details": f"Active coding: {bytes_val} bytes written",
            }

    # Merge experiences
    experiences = []
    for source in [linkedin_data, resume_data]:
        if source:
            experiences.extend(source.get("experience", []))

    # Merge education
    education = []
    for source in [linkedin_data, resume_data]:
        if source:
            education.extend(source.get("education", []))

    # Detect conflicts
    conflicts = _detect_conflicts(resume_data, github_data, linkedin_data)

    return {
        "skills": list(skill_scores.values()),
        "experience": experiences,
        "education": education,
        "conflicts": conflicts,
        "sources_available": [
            s for s, d in [("resume", resume_data), ("github", github_data), ("linkedin", linkedin_data)] if d
        ],
    }


def _detect_conflicts(resume_data: dict | None, github_data: dict | None, linkedin_data: dict | None) -> list[dict]:
    """Detect conflicts between data sources."""
    conflicts = []

    if resume_data and github_data:
        resume_skills = {s.lower() for s in resume_data.get("skills", [])}
        github_langs = {s.lower() for s in github_data.get("all_languages", {}).keys()}

        # Skills in GitHub but not in resume
        github_only = github_langs - resume_skills
        for skill in github_only:
            conflicts.append({
                "type": "skill_mismatch",
                "source_a": "github",
                "source_b": "resume",
                "skill": skill,
                "message": f"GitHub shows active {skill} use, but your resume doesn't mention it",
                "suggestion": "Consider adding this skill to your resume",
            })

        # Skills in resume but no GitHub activity
        resume_only = resume_skills - github_langs
        for skill in resume_only:
            if skill in {"python", "java", "javascript", "typescript", "c++", "go", "rust"}:
                conflicts.append({
                    "type": "skill_mismatch",
                    "source_a": "resume",
                    "source_b": "github",
                    "skill": skill,
                    "message": f"Resume lists {skill}, but no GitHub activity found for it",
                    "suggestion": "Consider adding a GitHub project demonstrating this skill",
                })

    return conflicts
