"""Mock-interview API endpoints (PRD §6.4-6.5, DESIGN.md §2.6-2.7).

Thin router — logic lives in backend/services/interviews.py. Exposes the
session lifecycle (start/answer/transcript/end) and the post-session
communication feedback (generate + read back).
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.database import get_db
from backend.models.interview import InterviewSession, InterviewTurn, SESSION_TYPES, INTERVIEW_DOMAINS
from backend.models.target_role import TargetRoleProfile
from backend.models.weak_topic import InterviewWeakTopic
from backend.services.interviews import (
    start_session,
    submit_answer,
    get_session,
    get_turns,
    conclude_session,
    generate_feedback,
    get_feedback,
    feedback_out,
)

router = APIRouter(prefix="/interviews", tags=["mock-interviews"])


class StartRequest(BaseModel):
    type: str
    target_role_id: str | None = None
    domain: str | None = None


class AnswerRequest(BaseModel):
    content: str


def transcript_out(session: InterviewSession, turns: list[InterviewTurn]) -> dict:
    return {
        "session": {
            "id": session.id,
            "type": session.type,
            "status": session.status,
            "target_role_id": session.target_role_id,
            "started_at": (
                session.started_at.isoformat() if session.started_at else None
            ),
            "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        },
        "transcript": [
            {
                "role": t.role,
                "content": t.content,
                "order_index": t.order_index,
                "id": t.id,
            }
            for t in sorted(turns, key=lambda x: x.order_index)
        ],
    }


@router.post("/sessions")
async def create_session(
    req: StartRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a mock interview of the given type; returns the opening question."""
    if req.type not in SESSION_TYPES:
        raise HTTPException(status_code=400, detail="type must be 'technical', 'behavioral', or 'hr'")
    if req.domain and req.domain not in INTERVIEW_DOMAINS:
        raise HTTPException(status_code=400, detail="Unsupported interview domain")
    role_name = "the user's target role"
    if req.target_role_id:
        role = (await db.execute(select(TargetRoleProfile).where(TargetRoleProfile.id == req.target_role_id))).scalar_one_or_none()
        if not role:
            raise HTTPException(status_code=404, detail="Target role not found")
        role_name = role.name
    history = (await db.execute(
        select(InterviewWeakTopic.topic)
        .where(InterviewWeakTopic.user_id == user.id)
        .order_by(InterviewWeakTopic.created_at.desc())
        .limit(8)
    )).scalars().all()
    try:
        session = await start_session(db, user.id, req.type, req.target_role_id, req.domain, role_name, list(dict.fromkeys(history)))
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Could not start the interview (LLM unavailable).",
        )
    turns = await get_turns(db, session)
    return transcript_out(session, turns)


@router.post("/{session_id}/answer")
async def answer_question(
    session_id: str,
    req: AnswerRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Append the student's answer and generate the adaptive follow-up question."""
    if not req.content.strip():
        raise HTTPException(status_code=422, detail="Answer cannot be empty")
    try:
        session, _follow_up = await submit_answer(db, session_id, user.id, req.content)
    except KeyError:
        raise HTTPException(status_code=404, detail="Interview session not found")
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Follow-up generation failed (LLM unavailable).",
        )
    turns = await get_turns(db, session)
    return transcript_out(session, turns)


@router.get("/weak-topics")
async def weak_topics(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clean integration surface for gap analysis, roadmap, and challenges."""
    rows = (await db.execute(
        select(InterviewWeakTopic)
        .where(InterviewWeakTopic.user_id == user.id)
        .order_by(InterviewWeakTopic.created_at.desc())
    )).scalars().all()
    return {
        "weak_topics": [
            {"topic": row.topic, "confidence": row.confidence, "evidence": row.evidence, "session_id": row.session_id}
            for row in rows
        ]
    }


@router.get("/{session_id}")
async def read_session(
    session_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Full persisted transcript (session + all turns, oldest first)."""
    try:
        session = await get_session(db, session_id, user.id)
        turns = await get_turns(db, session)
    except KeyError:
        raise HTTPException(status_code=404, detail="Interview session not found")
    return transcript_out(session, turns)


@router.post("/{session_id}/end")
async def end_interview(
    session_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Naturally close the session: the interviewer appends a specific closing
    message, status flips to ended, and communication feedback can then run.
    Ending is idempotent and never blocked by the LLM (deterministic closer)."""
    try:
        session = await conclude_session(db, session_id, user.id)
        turns = await get_turns(db, session)
    except KeyError:
        raise HTTPException(status_code=404, detail="Interview session not found")
    return transcript_out(session, turns)


@router.post("/{session_id}/feedback")
async def create_feedback(
    session_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate post-session communication feedback from the transcript.

    Each feedback_item references a specific transcript turn (id + verbatim
    quote). Never 500s on LLM failure — a deterministic fallback runs instead.
    """
    try:
        feedback = await generate_feedback(db, session_id, user.id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Interview session not found")
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Could not generate feedback.",
        )
    return {"feedback": feedback_out(feedback)}




@router.get("/{session_id}/feedback")
async def read_feedback(
    session_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stored communication feedback for an owned, ended session."""
    try:
        feedback = await get_feedback(db, session_id, user.id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if feedback is None:
        raise HTTPException(
            status_code=404, detail="Feedback not generated for this session yet"
        )
    return {"feedback": feedback_out(feedback)}