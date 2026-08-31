"""Tests for communication-feedback generation (PRD §6.5, RULES.md §4).

LLM output is mocked. These cover: session-end requirement, ownership, the
turn-anchored / verbatim-quote guarantee, usage logging, deterministic fallback
when the LLM fails, upsert-not-duplicate regeneration, and the prompt guard
that pins the feedback.txt rules.
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
from backend.ai.orchestrator import LLMResponse
from backend.services.interviews import (
    start_session,
    submit_answer,
    get_turns,
    end_session,
    generate_feedback,
    get_feedback,
    _parse_feedback_json,
    _validate_feedback_items,
    _deterministic_feedback,
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


async def _build_ended_session(db, answers, session_type="technical"):
    """Run a full (mocked) interview and end it; returns (session, student_ids)."""
    with patch("backend.services.interviews.orchestrator") as orch:
        orch.call_llm = AsyncMock(return_value=_resp("Opener Q?"))
        session = await start_session(db, "user-1", session_type)
    ids = {}
    for i, answer in enumerate(answers):
        with patch("backend.services.interviews.orchestrator") as orch:
            orch.call_llm = AsyncMock(return_value=_resp(f"Follow-up {i}?"))
            await submit_answer(db, session.id, "user-1", answer)
        turns = await get_turns(db, session)
        ids[f"a{i}"] = [t for t in turns if t.role == "student"][-1].id
    await end_session(db, session.id, "user-1")
    return session, ids


# ---------------------------------------------------------------------------
# pure helpers
# ---------------------------------------------------------------------------

def test_parse_feedback_json_tolerates_wrapping():
    data = _parse_feedback_json('Here is the analysis:\n{"clarity_score": 4, "feedback_items": []}')
    assert data["clarity_score"] == 4
    fenced = _parse_feedback_json('```json\n{"clarity_score": 5, "feedback_items": []}\n```')
    assert fenced["clarity_score"] == 5
    assert _parse_feedback_json("the model refused") is None
    assert _parse_feedback_json("{not json") is None


def test_validate_items_drops_unknown_turn_and_fixes_quote():
    content = "We used microservices with Redis pub/sub for events between services."
    student_by_id = {"t1": content}
    items = [
        {"turn_id": "t1", "category": "conciseness", "quote": "We used microservices", "comment": "long"},
        {"turn_id": "fabricated", "category": "clarity", "quote": "anything", "comment": "nope"},
        {"turn_id": "t1", "category": "junk", "quote": "totally made up sentence not in the turn", "comment": "fixed"},
    ]
    cleaned = _validate_feedback_items(items, student_by_id)
    assert len(cleaned) == 2
    assert all(i["turn_id"] == "t1" for i in cleaned)
    assert cleaned[0]["quote"] == "We used microservices"
    # bad quote / bad category both repaired, never fabricated.
    assert cleaned[1]["quote"] == content
    assert cleaned[1]["category"] == "clarity"
    assert _validate_feedback_items("not a list", student_by_id) == []


def test_deterministic_feedback_anchors_every_item():
    turns = [
        InterviewTurn(session_id="s", role="student", id="t-short", content="Ok.", order_index=1),
        InterviewTurn(session_id="s", role="student", id="t-long", content="word " * 200, order_index=2),
    ]
    data = _deterministic_feedback(turns, "technical")
    assert len(data["items"]) == 2
    assert {i["turn_id"] for i in data["items"]} == {"t-short", "t-long"}
    assert data["items"][0]["quote"] == "Ok."
    assert data["clarity_score"] == 3


def test_feedback_prompt_requires_turn_anchored_quotes():
    """Prompt guard: feedback must always reference real turns verbatim."""
    from pathlib import Path
    prompt = (
        Path(__file__).resolve().parent.parent
        / "ai" / "prompts" / "feedback.txt"
    ).read_text(encoding="utf-8")
    assert "turn_id" in prompt
    assert "VERBATIM" in prompt
    assert "AT LEAST 3" in prompt
    assert "candidate/student turn id" in prompt


# ---------------------------------------------------------------------------
# service behaviour
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_feedback_requires_ended_session(db):
    with patch("backend.services.interviews.orchestrator") as orch:
        orch.call_llm = AsyncMock(return_value=_resp("Opener Q?"))
        session = await start_session(db, "user-1", "technical")
    with pytest.raises(ValueError):
        await generate_feedback(db, session.id, "user-1")


@pytest.mark.asyncio
async def test_feedback_ownership_denied(db):
    session, _ = await _build_ended_session(db, ["Fine."])
    with pytest.raises(KeyError):
        await generate_feedback(db, session.id, "user-999")


@pytest.mark.asyncio
async def test_generate_persists_llm_items_referencing_real_turns(db):
    session, ids = await _build_ended_session(
        db, ["Not much to say.", "We used microservices with Redis pub/sub for events."]
    )
    payload = json.dumps(
        {
            "clarity_score": 4,
            "structure_notes": "Answered directly.",
            "conciseness_notes": "Second answer rambles a bit.",
            "feedback_items": [
                {"turn_id": ids["a0"], "category": "clarity", "quote": "Not much to say.", "comment": "too brief"},
                {"turn_id": ids["a1"], "category": "conciseness", "quote": "We used microservices with Redis", "comment": "long"},
            ],
        }
    )
    with patch("backend.services.interviews.orchestrator") as orch:
        orch.call_llm = AsyncMock(return_value=_resp(payload))
        fb = await generate_feedback(db, session.id, "user-1")

    assert fb.clarity_score == 4
    assert fb.session_id == session.id
    assert len(fb.feedback_items) == 2
    assert fb.referenced_turn_ids == sorted([ids["a0"], ids["a1"]])
    turns = await get_turns(db, session)
    for item in fb.feedback_items:
        content = next(t.content for t in turns if t.id == item["turn_id"])
        assert item["quote"] in content  # always verbatim from the turn
    usage = (await db.execute(select(LLMUsageLog))).scalars().all()
    fb_usage = [r for r in usage if r.feature == "communication_feedback"]
    assert len(fb_usage) == 1
    assert fb_usage[0].user_id == "user-1"


@pytest.mark.asyncio
async def test_llm_failure_uses_deterministic_fallback(db):
    session, ids = await _build_ended_session(
        db,
        ["Ok.", "word " * 200, "It was a team project and I took the lead on the backend; we delivered on time."],
        session_type="behavioral",
    )
    with patch("backend.services.interviews.orchestrator") as orch:
        orch.call_llm = AsyncMock(side_effect=RuntimeError("openrouter 402"))
        fb = await generate_feedback(db, session.id, "user-1")
    assert fb.clarity_score == 3
    assert len(fb.feedback_items) == 3
    # fallback items still anchored to the real turns, never generic.
    assert {i["turn_id"] for i in fb.feedback_items} == {ids["a0"], ids["a1"], ids["a2"]}
    # behavioral session -> at least one STAR/structure item, one conciseness one.
    assert any(i["category"] == "structure" for i in fb.feedback_items)
    assert any(i["category"] == "conciseness" for i in fb.feedback_items)


@pytest.mark.asyncio
async def test_regenerate_replaces_not_duplicates(db):
    session, _ = await _build_ended_session(db, ["Fine."])
    payload = json.dumps({"clarity_score": 5, "structure_notes": "S", "conciseness_notes": "C",
                          "feedback_items": []})
    with patch("backend.services.interviews.orchestrator") as orch:
        orch.call_llm = AsyncMock(return_value=_resp(payload))
        await generate_feedback(db, session.id, "user-1")
        fb2 = await generate_feedback(db, session.id, "user-1")
    rows = (await db.execute(select(InterviewFeedback))).scalars().all()
    assert len(rows) == 1
    assert fb2.id == rows[0].id


@pytest.mark.asyncio
async def test_get_feedback_before_and_after(db):
    session, _ = await _build_ended_session(db, ["Fine."])
    assert await get_feedback(db, session.id, "user-1") is None
    payload = json.dumps({"clarity_score": 3, "structure_notes": "S", "conciseness_notes": "C",
                          "feedback_items": []})
    with patch("backend.services.interviews.orchestrator") as orch:
        orch.call_llm = AsyncMock(return_value=_resp(payload))
        await generate_feedback(db, session.id, "user-1")
    assert await get_feedback(db, session.id, "user-1") is not None
    with pytest.raises(KeyError):
        await get_feedback(db, session.id, "user-999")