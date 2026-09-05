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
from backend.models.gap import GapReport
from backend.models.interview import (
    InterviewSession,
    InterviewTurn,
    SESSION_TYPES,
)
from backend.models.llm_usage import LLMUsageLog
from backend.models.roadmap import Roadmap, RoadmapMilestone
from backend.models.weak_topic import InterviewWeakTopic
from backend.services.coding_challenges import generate_challenge

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


async def _next_question(
    db: AsyncSession,
    session: InterviewSession,
    turns: list[InterviewTurn],
    target_role_name: str = "the user's target role",
    weak_topics: list[str] | None = None,
) -> str:
    """Call the LLM with the full running transcript and return ONE question.

    Prompt template version (the file name) is recorded in llm_usage_log so any
    "why did it say that" can be traced back to the exact prompt (RULES §1).
    """
    prompt = (
        _PROMPT_PATH.read_text(encoding="utf-8")
        .replace("{type}", session.type)
        .replace("{target_role}", target_role_name)
        .replace("{domain}", session.domain or "the selected CS domain")
        .replace("{weak_topics}", ", ".join(weak_topics or []) or "none recorded")
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
    target_role_id: str | None = None,
    domain: str | None = None,
    target_role_name: str = "the user's target role",
    weak_topics: list[str] | None = None,
) -> InterviewSession:
    """Create a session and write turn 0 = the LLM opening question."""
    if session_type not in SESSION_TYPES:
        raise ValueError(f"unsupported interview type: {session_type}")
    session = InterviewSession(
        user_id=user_id,
        type=session_type,
        status="in_progress",
        target_role_id=target_role_id,
        target_role_name=target_role_name,
        domain=domain,
    )
    db.add(session)
    await db.flush()

    talking = await _next_question(db, session, [], target_role_name, weak_topics)
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
        follow_up = await _next_question(
            db,
            session,
            await get_turns(db, session),
            session.target_role_name or "the user's target role",
        )
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
    question_scores = []
    weak_topics = []
    for t in students:
        n = len(t.content)
        score = 2 if n < 60 else (3 if n < 250 else 4)
        question_scores.append({
            "turn_id": t.id,
            "score": score,
            "justification": "The answer was evaluated conservatively from its specific length and detail: " + _snapshot_quote(t.content, 90),
        })
        if n < 60:
            weak_topics.append({"topic": "answer depth", "confidence": 4, "evidence": _snapshot_quote(t.content)})
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
        "overall_score": round(sum(x["score"] for x in question_scores) / len(question_scores)) if question_scores else 1,
        "strengths": ["Completed the interview transcript and provided answer evidence."],
        "weaknesses": [x["topic"] for x in weak_topics],
        "question_scores": question_scores,
        "weak_topics": weak_topics,
        "structure_notes": structure_notes,
        "conciseness_notes": conciseness_notes,
        "items": items,
    }


async def _link_weak_topics_to_roadmap(
    db: AsyncSession,
    user_id: str,
    session: InterviewSession,
    weak_topics: list,
) -> list[dict]:
    """Closed-loop wiring (PRD §6.4): turn evolved weak topics into roadmap
    actions the student can actually do.

    For each DISTINCT weak topic, find the user's latest roadmap and append a
    RoadmapMilestone whose action is a coding challenge for that topic. The
    challenge is pre-generated best-effort (never propagates an LLM failure —
    a failed generation just yields a plain 'practice this skill' action that
    the practice module regenerates on demand). If the user has no roadmap yet
    (no gap analysis), nothing is persisted and the topics are returned as
    un-docked recommendations, so the report still surfaces them.

    Returns the list of created/derived actions for the feedback payload.
    """
    if not weak_topics:
        return []

    seen: set[str] = set()
    distinct = []
    for item in weak_topics:
        if not isinstance(item, dict):
            continue
        topic = str(item.get("topic") or "").strip()[:120]
        if not topic or topic in seen:
            continue
        seen.add(topic)
        distinct.append(topic)
    if not distinct:
        return []

    # Latest roadmap owned by this user (across their gap reports).
    latest = (
        await db.execute(
            select(Roadmap)
            .join(GapReport, Roadmap.gap_report_id == GapReport.id)
            .where(Roadmap.user_id == user_id)
            .order_by(Roadmap.created_at.desc())
            .limit(1)
        )
    ).scalars().first()

    # Already-covered topics on that roadmap -> don't stack duplicates.
    existing: set[str] = set()
    if latest is not None:
        rows = (
            await db.execute(
                select(RoadmapMilestone).where(
                    RoadmapMilestone.roadmap_id == latest.id
                )
            )
        ).scalars().all()
        existing = {
            (m.linked_gap_skill or "").strip().lower()
            for m in rows
            if m.linked_gap_skill
        }

    actions: list[dict] = []
    target_role_id = session.target_role_id or None

    for topic in distinct:
        if topic.lower() in existing:
            actions.append({"topic": topic, "created": False, "reason": "already on roadmap"})
            continue

        challenge_id: str | None = None
        if target_role_id:
            try:
                challenge = await generate_challenge(
                    db,
                    user_id=user_id,
                    skill=topic,
                    difficulty="beginner",
                    target_role_id=target_role_id,
                    role_name=session.target_role_name or "the target role",
                    use_llm=True,
                )
                if challenge is not None:
                    challenge_id = challenge.id
            except Exception:
                challenge_id = None  # never block feedback on challenge gen

        if latest is not None:
            db.add(
                RoadmapMilestone(
                    roadmap_id=latest.id,
                    title=f"Practice {topic} (from mock interview)",
                    linked_gap_skill=topic,
                    status="not_started",
                    linked_action_type="challenge",
                    linked_action_id=challenge_id or f"practice:{topic}",
                    order_index=900 + len(existing) + len(actions),
                    estimated_hours=3,
                )
            )
            existing.add(topic.lower())

        actions.append(
            {
                "topic": topic,
                "created": latest is not None,
                "challenge_id": challenge_id,
                "status": None,
            }
        )

    await db.commit()
    return actions


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
                    "overall_score": max(1, min(5, int(parsed.get("overall_score", score)))),
                    "strengths": [str(x) for x in parsed.get("strengths", []) if str(x).strip()][:5],
                    "weaknesses": [str(x) for x in parsed.get("weaknesses", []) if str(x).strip()][:5],
                    "question_scores": parsed.get("question_scores", []) if isinstance(parsed.get("question_scores"), list) else [],
                    "weak_topics": parsed.get("weak_topics", []) if isinstance(parsed.get("weak_topics"), list) else [],
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
        overall_score=data.get("overall_score", data["clarity_score"]),
        strengths=data.get("strengths", []),
        weaknesses=data.get("weaknesses", []),
        question_scores=data.get("question_scores", []),
        weak_topics=data.get("weak_topics", []),
        structure_notes=data["structure_notes"],
        conciseness_notes=data["conciseness_notes"],
        referenced_turn_ids=sorted({i["turn_id"] for i in data["items"]}),
        feedback_items=data["items"],
    )
    db.add(feedback)
    weak_topics = data.get("weak_topics", [])
    for item in weak_topics:
        if not isinstance(item, dict) or not str(item.get("topic", "")).strip():
            continue
        db.add(
            InterviewWeakTopic(
                user_id=user_id,
                session_id=session.id,
                topic=str(item["topic"])[:120],
                confidence=max(1, min(5, int(item.get("confidence", 3)))),
                evidence=str(item.get("evidence", "No specific evidence provided."))[:1000],
            )
        )
    await db.commit()

    # Closed-loop (PRD §6.4): after persisting, dock weak topics into the
    # roadmap as actions. Runs after commit so feedback is saved even if this
    # extra work fails; the helper itself never raises.
    remedial_actions = []
    try:
        remedial_actions = await _link_weak_topics_to_roadmap(
            db, user_id, session, weak_topics
        )
        if remedial_actions:
            feedback.remedial_actions = remedial_actions
            await db.commit()
    except Exception:
        # Never fail feedback generation on the closed-loop side-step.
        remedial_actions = []

    feedback.remedial_actions = remedial_actions
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
        "overall_score": fb.overall_score,
        "strengths": fb.strengths,
        "weaknesses": fb.weaknesses,
        "question_scores": fb.question_scores,
        "weak_topics": fb.weak_topics,
        "structure_notes": fb.structure_notes,
        "conciseness_notes": fb.conciseness_notes,
        "referenced_turn_ids": fb.referenced_turn_ids,
        "feedback_items": fb.feedback_items,
        "remedial_actions": fb.remedial_actions or [],
        "created_at": fb.created_at.isoformat(),
    }