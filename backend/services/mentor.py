"""Mentor chat service (user-requested MVP).

All LLM calls go through orchestrator (RULES §1). Messages are persisted per user.
"""

import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.ai.orchestrator import orchestrator
from backend.models.gap import GapReport
from backend.models.llm_usage import LLMUsageLog
from backend.models.mentor import MentorMessage
from backend.models.profile import ProfileSnapshot
from backend.models.roadmap import Roadmap, RoadmapMilestone
from backend.models.target_role import TargetRoleProfile
from backend.services.profile_merge import compute_merge

_PROMPT_PATH = Path(__file__).resolve().parent.parent / "ai" / "prompts" / "mentor_chat.txt"
_FEATURE = "mentor_chat"
_MAX_HISTORY = 20
_MAX_CONTEXT_CHARS = 3500


def _clip(text: str, limit: int = 220) -> str:
    text = " ".join((text or "").split())
    return text if len(text) <= limit else text[: limit - 3] + "..."


async def _build_context(db: AsyncSession, user_id: str) -> str:
    parts: list[str] = []
    snapshot = (await db.execute(select(ProfileSnapshot).where(ProfileSnapshot.user_id == user_id))).scalar_one_or_none()
    if snapshot:
        merged = compute_merge(snapshot.github_data, snapshot.resume_data, snapshot.linkedin_data)
        if snapshot.headline:
            parts.append(f"Headline: {_clip(snapshot.headline, 120)}")
        if merged.skills:
            parts.append("Skills: " + ", ".join(s.name for s in merged.skills[:20]))
        if snapshot.resume_data and snapshot.resume_data.get("experience"):
            roles = [e.get("title") or e.get("company") for e in snapshot.resume_data.get("experience", [])[:3]]
            roles = [r for r in roles if r]
            if roles:
                parts.append("Experience: " + ", ".join(_clip(str(r), 60) for r in roles))
    else:
        parts.append("Profile: no snapshot yet.")

    gap = (await db.execute(
        select(GapReport, TargetRoleProfile.name)
        .outerjoin(TargetRoleProfile, TargetRoleProfile.id == GapReport.target_role_id)
        .join(ProfileSnapshot, ProfileSnapshot.id == GapReport.snapshot_id)
        .where(ProfileSnapshot.user_id == user_id)
        .order_by(GapReport.created_at.desc())
        .limit(1)
    )).first()
    if gap:
        report, role_name = gap
        gaps = report.gaps or []
        top = [g.get("skill") for g in gaps if g.get("severity") in ("critical", "important")][:5]
        parts.append(f"Latest gap target: {role_name or 'Unknown'}")
        if top:
            parts.append("Top gaps: " + ", ".join(str(s) for s in top))

    roadmap = (await db.execute(
        select(Roadmap).where(Roadmap.user_id == user_id).order_by(Roadmap.created_at.desc()).limit(1)
    )).scalar_one_or_none()
    if roadmap:
        milestones = (await db.execute(
            select(RoadmapMilestone).where(RoadmapMilestone.roadmap_id == roadmap.id).order_by(RoadmapMilestone.order_index)
        )).scalars().all()
        done = sum(1 for m in milestones if m.status == "done")
        next_ms = next((m for m in milestones if m.status != "done"), None)
        parts.append(f"Roadmap: {done}/{len(milestones)} milestones done")
        if next_ms:
            parts.append(f"Next milestone: {_clip(next_ms.title, 100)}")

    context = "\n".join(f"- {p}" for p in parts) if parts else "- No student context available yet."
    return context[:_MAX_CONTEXT_CHARS]


def _render_transcript(messages: list[MentorMessage]) -> str:
    lines = []
    for m in messages:
        label = "Student" if m.role == "user" else "Mentor"
        lines.append(f"{label}: {m.content}")
    return "\n".join(lines)


async def get_messages(db: AsyncSession, user_id: str, limit: int = 50) -> list[MentorMessage]:
    result = await db.execute(
        select(MentorMessage).where(MentorMessage.user_id == user_id).order_by(MentorMessage.created_at.desc()).limit(limit)
    )
    return list(reversed(result.scalars().all()))


async def clear_messages(db: AsyncSession, user_id: str) -> None:
    rows = (await db.execute(select(MentorMessage).where(MentorMessage.user_id == user_id))).scalars().all()
    for r in rows:
        await db.delete(r)
    await db.commit()


async def send_message(db: AsyncSession, user_id: str, content: str) -> MentorMessage:
    content = (content or "").strip()
    if not content:
        raise ValueError("Message cannot be empty")
    if len(content) > 4000:
        raise ValueError("Message is too long")

    history = await get_messages(db, user_id, limit=_MAX_HISTORY)
    user_msg = MentorMessage(user_id=user_id, role="user", content=content)
    db.add(user_msg)
    await db.flush()

    context = await _build_context(db, user_id)
    transcript = _render_transcript([*history, user_msg])
    prompt = _PROMPT_PATH.read_text(encoding="utf-8").replace("{context}", context).replace("{transcript}", transcript)

    resp = await orchestrator.call_llm(feature=_FEATURE, prompt=prompt, user_id=uuid.UUID(user_id))
    db.add(LLMUsageLog(
        user_id=user_id, feature=_FEATURE, model=resp.model,
        tokens_in=resp.tokens_in, tokens_out=resp.tokens_out, cost_usd=resp.cost_usd,
    ))
    answer = (resp.content or "").strip() or "I couldn't generate a response right now. Please try again."
    assistant_msg = MentorMessage(user_id=user_id, role="assistant", content=answer)
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)
    return assistant_msg
