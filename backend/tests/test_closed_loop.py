"""Tests for the interview weak-topic -> roadmap/challenge closed loop
(PRD §6.4 — the platform differentiator).

The loop is triggered from generate_feedback: weak topics persist to
interview_weak_topics AND dock as roadmap milestones whose action is a coding
challenge. Challenge generation is mocked (we test the wiring, not the LLM).
Covers: milestone creation with a challenge, dedupe against existing roadmap,
no-roadmap fallback (recommendations only), and that a failing challenge
generation never breaks feedback persistence.
"""

import json

import pytest
from pytest_asyncio import fixture as asyncio_fixture
from unittest.mock import AsyncMock, patch
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base
from backend.models import (  # noqa: F401 (register tables)
    User,
    InterviewSession,
    InterviewTurn,
    LLMUsageLog,
    InterviewFeedback,
)
from backend.models.gap import GapReport
from backend.models.roadmap import Roadmap, RoadmapMilestone
from backend.ai.orchestrator import LLMResponse
from backend.services.interviews import (
    start_session,
    submit_answer,
    get_turns,
    end_session,
    generate_feedback,
    _link_weak_topics_to_roadmap,
)


def _resp(content: str) -> LLMResponse:
    return LLMResponse(content=content, model="openai/gpt-4o-mini", tokens_in=50, tokens_out=40, cost_usd=0.0004)


@asyncio_fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as session:
        yield session
    await engine.dispose()


async def _ended_session(db, session_type="technical", target_role_id=None):
    with patch("backend.services.interviews.orchestrator") as orch:
        orch.call_llm = AsyncMock(return_value=_resp("Opener?"))
        session = await start_session(
            db, "user-1", session_type,
            target_role_id=target_role_id,
            target_role_name="Software Engineer" if target_role_id else "the user's target role",
        )
    student_ids = []
    for ans in [
        "I would use a balanced tree to keep it log-n.",
        "That's roughly how I approached it.",
    ]:
        with patch("backend.services.interviews.orchestrator") as orch:
            orch.call_llm = AsyncMock(return_value=_resp("Next?"))
            await submit_answer(db, session.id, "user-1", ans)
        turns = await get_turns(db, session)
        student_ids.append([t for t in turns if t.role == "student"][-1].id)
    await end_session(db, session.id, "user-1")
    return session, student_ids


def _feedback_payload(student_ids, weak_topics=(("binary search trees", 4), ("SQL joins", 3))):
    return json.dumps({
        "clarity_score": 3,
        "overall_score": 3,
        "strengths": ["Answered directly."],
        "weaknesses": ["Depth on trees."],
        "question_scores": [
            {"turn_id": student_ids[0], "score": 3, "justification": "Mixed depth."},
        ],
        "weak_topics": [
            {"topic": t, "confidence": c, "evidence": "Vague on specifics."}
            for t, c in weak_topics
        ],
        "structure_notes": "Answered directly.",
        "conciseness_notes": "Mostly tight.",
        "feedback_items": [
            {"turn_id": student_ids[0], "category": "clarity",
             "quote": "I would use a balanced tree to keep it log-n.",
             "comment": "Good but brief."},
        ],
    })


async def _make_roadmap(db, user_id="user-1"):
    report = GapReport(snapshot_id="snap-1", target_role_id="role-1", gaps=[])
    db.add(report)
    await db.flush()
    roadmap = Roadmap(user_id=user_id, gap_report_id=report.id, version="v1.0")
    db.add(roadmap)
    await db.flush()
    return roadmap.id


class FakeChallenge:
    def __init__(self, _id="chal-1"):
        self.id = _id
        self.skill = "binary search trees"
        self.difficulty = "beginner"
        self.title = "Tree depth"
        self.prompt = "p"
        self.function_signature = "f"
        self.starter_code = "s"
        self.expected_time_complexity = "O(log n)"


# ---------------------------------------------------------------------------
# helper behaviour
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_link_with_no_roadmap_returns_recommendations(db):
    session, _ = await _ended_session(db, target_role_id="role-1")
    with patch("backend.services.interviews.generate_challenge", new=AsyncMock(return_value=FakeChallenge())):
        actions = await _link_weak_topics_to_roadmap(
            db, "user-1", session,
            [{"topic": "binary search trees", "confidence": 4, "evidence": "vague"}],
        )
    assert actions == [{"topic": "binary search trees", "created": False, "challenge_id": "chal-1", "status": None}]
    rows = (await db.execute(select(RoadmapMilestone))).scalars().all()
    assert rows == []


@pytest.mark.asyncio
async def test_link_creates_milestone_and_challenge(db):
    rid = await _make_roadmap(db)
    session, _ = await _ended_session(db, target_role_id="role-1")
    with patch("backend.services.interviews.generate_challenge", new=AsyncMock(return_value=FakeChallenge())):
        actions = await _link_weak_topics_to_roadmap(
            db, "user-1", session,
            [{"topic": "binary search trees", "confidence": 4, "evidence": "vague"}],
        )
    assert actions[0]["topic"] == "binary search trees"
    assert actions[0]["created"] is True
    assert actions[0]["challenge_id"] == "chal-1"

    milestones = (await db.execute(
        select(RoadmapMilestone).where(RoadmapMilestone.roadmap_id == rid)
    )).scalars().all()
    assert len(milestones) == 1
    m = milestones[0]
    assert m.linked_gap_skill == "binary search trees"
    assert m.linked_action_type == "challenge"
    assert m.linked_action_id == "chal-1"
    assert "from mock interview" in m.title


@pytest.mark.asyncio
async def test_link_dedupes_topics_already_on_roadmap(db):
    rid = await _make_roadmap(db)
    db.add(RoadmapMilestone(
        roadmap_id=rid, title="Practice SQL joins", linked_gap_skill="SQL joins",
        status="not_started", linked_action_type="challenge",
        linked_action_id="existing", order_index=0,
    ))
    await db.commit()
    session, _ = await _ended_session(db, target_role_id="role-1")
    with patch("backend.services.interviews.generate_challenge", new=AsyncMock(return_value=FakeChallenge())):
        actions = await _link_weak_topics_to_roadmap(
            db, "user-1", session,
            [
                {"topic": "binary search trees", "confidence": 4, "evidence": "x"},
                {"topic": "SQL joins", "confidence": 3, "evidence": "y"},
                {"topic": "binary search trees", "confidence": 4, "evidence": "again"},
            ],
        )
    by_topic = {a["topic"]: a for a in actions}
    assert by_topic["binary search trees"]["created"] is True
    assert by_topic["SQL joins"]["created"] is False  # already there
    rows = (await db.execute(
        select(RoadmapMilestone).where(RoadmapMilestone.roadmap_id == rid)
    )).scalars().all()
    assert len(rows) == 2  # pre-existing SQL + new bst


@pytest.mark.asyncio
async def test_link_skips_challenge_when_no_target_role(db):
    rid = await _make_roadmap(db)
    session, _ = await _ended_session(db, target_role_id=None)
    with patch("backend.services.interviews.generate_challenge") as genc:
        actions = await _link_weak_topics_to_roadmap(
            db, "user-1", session,
            [{"topic": "networking", "confidence": 4, "evidence": "x"}],
        )
    genc.assert_not_awaited()
    assert actions[0]["challenge_id"] is None
    rows = (await db.execute(
        select(RoadmapMilestone).where(RoadmapMilestone.roadmap_id == rid)
    )).scalars().all()
    assert rows[0].linked_action_type == "challenge"
    assert rows[0].linked_action_id == "practice:networking"


@pytest.mark.asyncio
async def test_challenge_failure_never_breaks_feedback(db):
    session, student_ids = await _ended_session(db, target_role_id="role-1")
    payload = _feedback_payload(student_ids)
    with patch("backend.services.interviews.orchestrator") as orch:
        orch.call_llm = AsyncMock(return_value=_resp(payload))
        with patch("backend.services.interviews.generate_challenge", new=AsyncMock(side_effect=RuntimeError("LLM down"))):
            fb = await generate_feedback(db, session.id, "user-1")
    assert fb is not None
    assert fb.weak_topics[0]["topic"] == "binary search trees"
    assert fb.remedial_actions[0]["created"] is False


@pytest.mark.asyncio
async def test_closed_loop_full_run_defensive_without_roadmap(db):
    """End-to-end: feedback with weak topics, no roadmap -> no crash, no rows."""
    session, student_ids = await _ended_session(db, target_role_id=None)
    payload = _feedback_payload(student_ids, weak_topics=(("recursion", 3),))
    with patch("backend.services.interviews.orchestrator") as orch:
        orch.call_llm = AsyncMock(return_value=_resp(payload))
        with patch("backend.services.interviews.generate_challenge", new=AsyncMock(side_effect=RuntimeError("no llm"))):
            fb = await generate_feedback(db, session.id, "user-1")
    assert fb is not None
    assert len(fb.remedial_actions) == 1
    assert fb.remedial_actions[0]["created"] is False
    rows = (await db.execute(select(RoadmapMilestone))).scalars().all()
    assert rows == []