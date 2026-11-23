"""Mentor chat service.

All LLM calls go through orchestrator (RULES §1). Conversations/messages are persisted per user.
"""

import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError, ProgrammingError, OperationalError

from backend.ai.orchestrator import orchestrator
from backend.models.gap import GapReport
from backend.models.llm_usage import LLMUsageLog
from backend.models.mentor import MentorConversation, MentorMessage
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


def _title_from(content: str) -> str:
    text = " ".join((content or "").split())
    return (text[:60] + "...") if len(text) > 60 else (text or "New chat")


async def _get_conversation(db: AsyncSession, user_id: str, conversation_id: str) -> MentorConversation | None:
    return (await db.execute(
        select(MentorConversation).where(MentorConversation.id == conversation_id, MentorConversation.user_id == user_id)
    )).scalar_one_or_none()


async def _ensure_tables(db: AsyncSession) -> None:
    # Run in autocommit connection so a failed/rolled-back request transaction
    # cannot prevent schema repair from taking effect in prod.
    async with db.bind.begin() as conn:
        await conn.run_sync(lambda sync: MentorConversation.__table__.create(sync, checkfirst=True))
        await conn.run_sync(lambda sync: MentorMessage.__table__.create(sync, checkfirst=True))
        try:
            await conn.execute(text("ALTER TABLE mentor_messages ADD COLUMN conversation_id VARCHAR(36)"))
        except Exception:
            pass


async def _legacy_messages(db: AsyncSession, user_id: str) -> list[MentorMessage]:
    try:
        return list((await db.execute(
            select(MentorMessage).where(MentorMessage.user_id == user_id, MentorMessage.conversation_id.is_(None))
            .order_by(MentorMessage.created_at.asc())
        )).scalars().all())
    except SQLAlchemyError:
        await _ensure_tables(db)
        return []


async def ensure_legacy_conversation(db: AsyncSession, user_id: str) -> MentorConversation | None:
    legacy = await _legacy_messages(db, user_id)
    if not legacy:
        return None
    title = _title_from(next((m.content for m in legacy if m.role == "user"), "Previous chat"))
    conv = MentorConversation(user_id=user_id, title=title, created_at=legacy[0].created_at, updated_at=legacy[-1].created_at)
    db.add(conv)
    await db.flush()
    for m in legacy:
        m.conversation_id = conv.id
    await db.commit()
    await db.refresh(conv)
    return conv


async def list_conversations(db: AsyncSession, user_id: str) -> list[dict]:
    try:
        await _ensure_tables(db)
        await ensure_legacy_conversation(db, user_id)
        rows = (await db.execute(
            select(MentorConversation).where(MentorConversation.user_id == user_id).order_by(MentorConversation.updated_at.desc())
        )).scalars().all()
        return [{"id": c.id, "title": c.title, "created_at": c.created_at.isoformat(), "updated_at": c.updated_at.isoformat()} for c in rows]
    except SQLAlchemyError:
        await db.rollback()
        await _ensure_tables(db)
        return []


async def create_conversation(db: AsyncSession, user_id: str) -> MentorConversation:
    await _ensure_tables(db)
    conv = MentorConversation(user_id=user_id, title="New chat")
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


async def get_messages(db: AsyncSession, user_id: str, conversation_id: str, limit: int = 200) -> list[MentorMessage]:
    conv = await _get_conversation(db, user_id, conversation_id)
    if not conv:
        raise KeyError("Conversation not found")
    result = await db.execute(
        select(MentorMessage).where(MentorMessage.user_id == user_id, MentorMessage.conversation_id == conversation_id)
        .order_by(MentorMessage.created_at.asc()).limit(limit)
    )
    return list(result.scalars().all())


async def delete_conversation(db: AsyncSession, user_id: str, conversation_id: str) -> None:
    conv = await _get_conversation(db, user_id, conversation_id)
    if not conv:
        raise KeyError("Conversation not found")
    msgs = (await db.execute(select(MentorMessage).where(MentorMessage.conversation_id == conversation_id, MentorMessage.user_id == user_id))).scalars().all()
    for m in msgs:
        await db.delete(m)
    await db.delete(conv)
    await db.commit()


async def send_message(db: AsyncSession, user_id: str, content: str, conversation_id: str | None = None) -> tuple[MentorConversation, MentorMessage, MentorMessage]:
    content = (content or "").strip()
    if not content:
        raise ValueError("Message cannot be empty")
    if len(content) > 4000:
        raise ValueError("Message is too long")

    try:
        await _ensure_tables(db)
        conv = await _get_conversation(db, user_id, conversation_id) if conversation_id else None
    except (ProgrammingError, OperationalError, SQLAlchemyError):
        await db.rollback()
        await _ensure_tables(db)
        conv = await _get_conversation(db, user_id, conversation_id) if conversation_id else None

    if conversation_id and not conv:
        raise KeyError("Conversation not found")
    if not conv:
        conv = MentorConversation(user_id=user_id, title=_title_from(content))
        db.add(conv)
        await db.flush()

    try:
        history = (await db.execute(
            select(MentorMessage).where(MentorMessage.conversation_id == conv.id, MentorMessage.user_id == user_id)
            .order_by(MentorMessage.created_at.desc()).limit(_MAX_HISTORY)
        )).scalars().all()
    except (ProgrammingError, OperationalError):
        await db.rollback()
        await _ensure_tables(db)
        history = []
    history = list(reversed(history))

    user_msg = MentorMessage(user_id=user_id, conversation_id=conv.id, role="user", content=content)
    db.add(user_msg)
    if conv.title == "New chat":
        conv.title = _title_from(content)
    conv.updated_at = datetime.now(timezone.utc)
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
    assistant_msg = MentorMessage(user_id=user_id, conversation_id=conv.id, role="assistant", content=answer)
    db.add(assistant_msg)
    conv.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(conv)
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)
    return conv, user_msg, assistant_msg
