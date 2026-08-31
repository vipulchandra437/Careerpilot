"""Mock-interview service (architecture.md §3.7, PRD §6.4-6.5).

Session flow:

  - start_session: create a session and open with an LLM question.
  - submit_answer: append the student's answer, then generate an adaptive
    follow-up question from the LLM that has seen the ENTIRE running transcript,
    and append it. Nothing is scripted: each question is a fresh LLM call.
  - end_session / get_session.
  - generate_feedback / get_feedback: post-session communication feedback
    (PRD §6.5). Every feedback item references a real transcript turn by id and
    quotes it verbatim; if the LLM path fails, a deterministic fallback still
    produces per-turn, quote-grounded feedback — never generic filler.

All LLM calls go through backend.ai.orchestrator (RULES §1) with feature
"mock_interview" / "communication_feedback" and are logged to llm_usage_log.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.ai.orchestrator import orchestrator
from backend.models.feedback import InterviewFeedback
from backend.models.interview import (
    InterviewSession,
    InterviewTurn,
    SESSION_TYPES,
)
from backend.models.llm_usage import LLMUsageLog

_PROMPT_PATH = Path(__file__).resolve().parent.parent / "ai" / "prompts" / "interview.txt"
_CLOSE_PROMPT_PATH = Path(__file__).resolve().parent.parent / "ai" / "prompts" / "interview_close.txt"
_FEATURE = "mock_interview"
_FEEDBACK_PROMPT_PATH = Path(__file__).resolve().parent.parent / "ai" / "prompts" / "feedback.txt"
_FEEDBACK_FEATURE = "communication_feedback"
_FEEDBACK_CATEGORIES = ("clarity", "structure", "conciseness")

_CLOSE_FALLBACK = (
    "That's a good place to wrap up — thanks for the session. Go ahead and "
    "generate the communication feedback; it quotes your actual answers so you "
    "can see exactly which parts to keep and which to tighten."
)


def build_transcript(turns: list[InterviewTurn]) -> str:
    """Render turns as an ordered, labelled transcript for the LLM prompt."""
    lines = []
    for t in sorted(turns, key=lambda x: x.order_index):
        label = "Interviewer" if t.role == "interviewer" else "Candidate"
        lines.append(f"{label}: {t.content}")
    return "\n".join(lines)


def clean_question(raw: str) -> str:
    """Strip wrapper noise the LLM may leave around the single question."""
    text = raw.strip()
    if not text:
        raise ValueError("interviewer produced an empty question")
    # Strip a single level of surrounding quotes or a markdown quote block.
    if text.startswith("```") and text.endswith("```"):
        text = text[3:-3].strip()
    if len(text) >= 2 and text[0] in "\"'" and text[-1] == text[0]:
        text = text[1:-1].strip()
    return text


async def _next_question(db: AsyncSession, session: InterviewSession, turns: list[InterviewTurn]) -> str:
    """Call the LLM with the full running transcript and return ONE question.

    Prompt template version (the file name) is recorded in llm_usage_log so any
    "why did it say that" can be traced back to the exact prompt (RULES §1).
    """
    prompt = (
        _PROMPT_PATH.read_text(encoding="utf-8")
        .replace("{type}", session.type)
        .replace("{transcript}", build_transcript(turns) or "(empty transcript)")
    )
    resp = await orchestrator.call_llm(
        feature=_FEATURE,
        prompt=prompt,
        user_id=session.user_id,
    )
    db.add(
        LLMUsageLog(
            user_id=session.user_id,
            feature=_FEATURE,
            model=resp.model,
            tokens_in=resp.tokens_in,
            tokens_out=resp.tokens_out,
            cost_usd=resp.cost_usd,
        )
    )
    return clean_question(resp.content)


def _next_order(turns: list[InterviewTurn]) -> int:
    return max((t.order_index for t in turns), default=-1) + 1


async def start_session(
    db: AsyncSession,
    user_id: str,
    session_type: str,
) -> InterviewSession:
    """Create a session and write turn 0 = the LLM opening question."""
    if session_type not in SESSION_TYPES:
        raise ValueError(f"unsupported interview type: {session_type}")
    session = InterviewSession(user_id=user_id, type=session_type, status="in_progress")
    db.add(session)
    await db.flush()

    talking = await _next_question(db, session, [])  # empty transcript -> opener
    db.add(
        InterviewTurn(
            session_id=session.id,
            role="interviewer",
            content=talking,
            order_index=0,
        )
    )
    await db.commit()
    await db.refresh(session)
    return session


async def get_session(
    db: AsyncSession,
    session_id: str,
    user_id: str,
) -> InterviewSession:
    """Fetch a session owned by user_id, or raise KeyError if absent."""
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.id == session_id,
            InterviewSession.user_id == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise KeyError("Interview session not found")
    return session


async def get_turns(db: AsyncSession, session: InterviewSession) -> list[InterviewTurn]:
    result = await db.execute(
        select(InterviewTurn).where(InterviewTurn.session_id == session.id)
    )
    return list(result.scalars().all())


async def submit_answer(
    db: AsyncSession,
    session_id: str,
    user_id: str,
    content: str,
) -> tuple[InterviewSession, InterviewTurn | None]:
    """Persist the student answer and produce the adaptive follow-up question.

    Returns (session, latest_interviewer_turn). The follow-up is None only if
    generation failed after the answer was saved — the transcript still records
    the student turn so nothing is lost.
    """
    if not content or not content.strip():
        raise ValueError("answer cannot be empty")

    session = await get_session(db, session_id, user_id)
    if session.status != "in_progress":
        raise ValueError("interview already ended")

    turns = await get_turns(db, session)
    db.add(
        InterviewTurn(
            session_id=session.id,
            role="student",
            content=content.strip(),
            order_index=_next_order(turns),
        )
    )
    await db.flush()

    try:
        follow_up = await _next_question(db, session, await get_turns(db, session))
    except Exception:
        # Never lose the student's answer: persist what exists, surface the error.
        await db.commit()
        raise

    db.add(
        InterviewTurn(
            session_id=session.id,
            role="interviewer",
            content=follow_up,
            order_index=_next_order(await get_turns(db, session)),
        )
    )
    await db.commit()
    return session, follow_up


async def end_session(
    db: AsyncSession,
    session_id: str,
    user_id: str,
) -> InterviewSession:
    session = await get_session(db, session_id, user_id)
    if session.status != "in_progress":
        return session
    session.status = "ended"
    session.ended_at = datetime.now(timezone.utc)
    await db.commit()
    return session


def clean_closing(raw: str) -> str | None:
    """Tolerate the usual wrapper noise; None if nothing usable remains."""
    text = raw.strip()
    if not text:
        return None
    if text.startswith("```") and text.endswith("```"):
        text = text[3:-3].strip()
    if len(text) >= 2 and text[0] in "\"'" and text[-1] == text[0]:
        text = text[1:-1].strip()
    return text or None


async def conclude_session(
    db: AsyncSession,
    session_id: str,
    user_id: str,
) -> InterviewSession:
    """Naturally end an interview: append a specific closing message, then close.

    The closing is a real LLM turn that cites one honest observation from the
    candidate's answers (never a generic goodbye); on LLM failure a
    deterministic closing is used so ending NEVER depends on the model. Closing
    is idempotent — an already-ended session returns unchanged.
    """
    session = await get_session(db, session_id, user_id)
    if session.status != "in_progress":
        return session

    turns = await get_turns(db, session)
    students = [t.content for t in turns if t.role == "student"]
    closing = None
    try:
        prompt = (
            _CLOSE_PROMPT_PATH.read_text(encoding="utf-8")
            .replace("{type}", session.type)
            .replace("{count}", str(len(students)))
            .replace("{transcript}", build_transcript(turns) or "(no answers)")
        )
        resp = await orchestrator.call_llm(
            feature=_FEATURE,
            prompt=prompt,
            user_id=session.user_id,
        )
        db.add(
            LLMUsageLog(
                user_id=session.user_id,
                feature=_FEATURE,
                model=resp.model,
                tokens_in=resp.tokens_in,
                tokens_out=resp.tokens_out,
                cost_usd=resp.cost_usd,
            )
        )
        closing = clean_closing(resp.content)
    except Exception:
        closing = None

    db.add(
        InterviewTurn(
            session_id=session.id,
            role="interviewer",
            content=closing or _CLOSE_FALLBACK,
            order_index=_next_order(turns),
        )
    )
    session.status = "ended"
    session.ended_at = datetime.now(timezone.utc)
    await db.commit()
    return session


# ---------------------------------------------------------------------------
# Communication Feedback (PRD §6.5)
# ---------------------------------------------------------------------------

def _normalize_ws(text: str) -> str:
    """Collapse whitespace so verbatim-quote matching survives line breaks."""
    return " ".join(text.split())


def _snapshot_quote(turn_content: str, limit: int = 120) -> str:
    """Guaranteed verbatim excerpt of a turn (used when the LLM quote is bad)."""
    text = turn_content.strip()
    return text[:limit]


def _render_turns_for_feedback(turns: list[InterviewTurn]) -> str:
    lines = []
    for t in sorted(turns, key=lambda x: x.order_index):
        label = "interviewer" if t.role == "interviewer" else "student"
        lines.append(f"[{t.id}] {label}: {t.content}")
    return "\n".join(lines)


def _parse_feedback_json(text: str) -> dict | None:
    """Extract the JSON object from the LLM reply (tolerates code fences/prose)."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = text.removesuffix("```").strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        data = json.loads(text[start : end + 1])
    except (json.JSONDecodeError, TypeError):
        return None
    return data if isinstance(data, dict) else None


def _validate_feedback_items(
    items: object,
    student_by_id: dict[str, str],
) -> list[dict]:
    """Keep only items anchored to a real student turn with a verbatim quote.

    The turn id is a hard requirement; a quote that does not match the turn's
    content is replaced with a guaranteed-verbatim excerpt so every persisted
    item always points at actual transcript text (DESIGN §2.7).
    """
    if not isinstance(items, list):
        return []
    cleaned = []
    for item in items:
        if not isinstance(item, dict):
            continue
        turn_id = item.get("turn_id")
        content = student_by_id.get(turn_id)
        if not content:
            continue  # fabricated/unknown turn -> drop
        category = item.get("category")
        if category not in _FEEDBACK_CATEGORIES:
            category = "clarity"
        comment = str(item.get("comment") or "").strip()
        quote = str(item.get("quote") or "").strip()
        if not quote or _normalize_ws(quote) not in _normalize_ws(content):
            quote = _snapshot_quote(content)
        cleaned.append(
            {
                "turn_id": turn_id,
                "category": category,
                "quote": quote,
                "comment": comment or f"Feedback on this {category} aspect of the answer.",
            }
        )
    return cleaned


def _deterministic_feedback(
    turns: list[InterviewTurn],
    session_type: str,
) -> dict:
    """LLM-free per-turn feedback, so a failure never yields generic filler."""
    students = [t for t in turns if t.role == "student"]
    items = []
    for t in students:
        n = len(t.content)
        if n < 60:
            items.append(
                {
                    "turn_id": t.id,
                    "category": "clarity",
                    "quote": _snapshot_quote(t.content),
                    "comment": "This answer is very brief — expand with a concrete example so the interviewer can assess depth.",
                }
            )
        elif n > 700:
            items.append(
                {
                    "turn_id": t.id,
                    "category": "conciseness",
                    "quote": _snapshot_quote(t.content),
                    "comment": "This answer is long — lead with the direct answer and cut repetition.",
                }
            )
        elif session_type == "behavioral":
            items.append(
                {
                    "turn_id": t.id,
                    "category": "structure",
                    "quote": _snapshot_quote(t.content),
                    "comment": "Behavioral answer should follow STAR — state Situation, Task, Action, and Result explicitly.",
                }
            )
        else:
            items.append(
                {
                    "turn_id": t.id,
                    "category": "clarity",
                    "quote": _snapshot_quote(t.content),
                    "comment": "Solid answer — strengthen it by naming the specific mechanism or trade-off you chose.",
                }
            )
    total = len(students)
    structure_notes = (
        f"{len(students)} student turns analyzed. "
        + (
            "Use the STAR framework (Situation-Task-Action-Result) explicitly for behavioral answers."
            if session_type == "behavioral"
            else "Answer the question asked first, then add depth with a concrete mechanism or trade-off."
        )
    )
    conciseness_notes = f"{len([t for t in students if len(t.content) > 700])} answers were long; {len([t for t in students if len(t.content) < 60])} were too brief to judge."
    return {
        "clarity_score": 3,
        "structure_notes": structure_notes,
        "conciseness_notes": conciseness_notes,
        "items": items,
    }


async def generate_feedback(
    db: AsyncSession,
    session_id: str,
    user_id: str,
) -> InterviewFeedback:
    """Analyze an ended session's transcript and persist communication feedback.

    LLM path failure never propagates: a deterministic fallback produces the
    feedback so the endpoint cannot 500 on the language model.
    """
    session = await get_session(db, session_id, user_id)
    if session.status != "ended":
        raise ValueError("interview must be ended before feedback is generated")

    turns = await get_turns(db, session)
    student_by_id = {t.id: t.content for t in turns if t.role == "student"}

    data = None
    try:
        prompt = (
            _FEEDBACK_PROMPT_PATH.read_text(encoding="utf-8")
            .replace("{type}", session.type)
            .replace("{turns}", _render_turns_for_feedback(turns))
        )
        resp = await orchestrator.call_llm(
            feature=_FEEDBACK_FEATURE,
            prompt=prompt,
            user_id=session.user_id,
        )
        db.add(
            LLMUsageLog(
                user_id=session.user_id,
                feature=_FEEDBACK_FEATURE,
                model=resp.model,
                tokens_in=resp.tokens_in,
                tokens_out=resp.tokens_out,
                cost_usd=resp.cost_usd,
            )
        )
        parsed = _parse_feedback_json(resp.content)
        if parsed:
            items = _validate_feedback_items(parsed.get("feedback_items"), student_by_id)
            if items:
                try:
                    score = int(parsed.get("clarity_score", 3))
                except (TypeError, ValueError):
                    score = 3
                data = {
                    "clarity_score": max(1, min(5, score)),
                    "structure_notes": str(parsed.get("structure_notes") or "").strip(),
                    "conciseness_notes": str(parsed.get("conciseness_notes") or "").strip(),
                    "items": items,
                }
    except Exception:
        data = None  # deterministic fallback below; the answer data is never lost

    if not data or not data["items"]:
        data = _deterministic_feedback(turns, session.type)

    await db.execute(
        delete(InterviewFeedback).where(InterviewFeedback.session_id == session.id)
    )
    feedback = InterviewFeedback(
        session_id=session.id,
        clarity_score=data["clarity_score"],
        structure_notes=data["structure_notes"],
        conciseness_notes=data["conciseness_notes"],
        referenced_turn_ids=sorted({i["turn_id"] for i in data["items"]}),
        feedback_items=data["items"],
    )
    db.add(feedback)
    await db.commit()
    return feedback


async def get_feedback(
    db: AsyncSession,
    session_id: str,
    user_id: str,
) -> InterviewFeedback | None:
    """Return stored feedback for an owned session, or None if not generated."""
    session = await get_session(db, session_id, user_id)
    result = await db.execute(
        select(InterviewFeedback).where(InterviewFeedback.session_id == session.id)
    )
    return result.scalar_one_or_none()


def feedback_out(fb: InterviewFeedback) -> dict:
    return {
        "session_id": fb.session_id,
        "clarity_score": fb.clarity_score,
        "structure_notes": fb.structure_notes,
        "conciseness_notes": fb.conciseness_notes,
        "referenced_turn_ids": fb.referenced_turn_ids,
        "feedback_items": fb.feedback_items,
        "created_at": fb.created_at.isoformat(),
    }