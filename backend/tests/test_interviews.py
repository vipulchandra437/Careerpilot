"""Tests for the mock-interview service deterministic logic (RULES.md §4).

LLM output is mocked; these cover session lifecycle, ownership, turn ordering,
usage logging, and the transcript that is embedded into the follow-up prompt
(the "see the running transcript" guarantee from PRD §6.4).
"""

import pytest
from pytest_asyncio import fixture as asyncio_fixture
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base
from backend.models import User, InterviewSession, InterviewTurn, LLMUsageLog  # noqa: F401 (register tables)
from backend.ai.orchestrator import LLMResponse
from backend.services.interviews import (
    start_session,
    submit_answer,
    get_session,
    get_turns,
    end_session,
    conclude_session,
    clean_closing,
    build_transcript,
    clean_question,
    _next_order,
    _CLOSE_FALLBACK,
)


def _resp(content: str) -> LLMResponse:
    return LLMResponse(content=content, model="openai/gpt-4o", tokens_in=50, tokens_out=40, cost_usd=0.0004)


@asyncio_fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as session:
        yield session
    await engine.dispose()


def _mock_orchestrator(question: str):
    return patch(
        "backend.services.interviews.orchestrator",
        MockOrch(question),
    )


class MockOrch:
    def __init__(self, question: str):
        self.call_llm = AsyncMock(return_value=_resp(question))


# ---------------------------------------------------------------------------
# pure helpers
# ---------------------------------------------------------------------------

def test_clean_question_strips_surrounding_noise():
    assert clean_question('  "What is a hash map?"  ') == "What is a hash map?"
    assert clean_question("```\nExplain closures.\n```") == "Explain closures."
    assert clean_question("Plain question?") == "Plain question?"


def test_clean_question_rejects_empty():
    with pytest.raises(ValueError):
        clean_question("   ")


def test_build_transcript_orders_and_labels():
    turns = [
        InterviewTurn(session_id="s", role="interviewer", content="Q1", order_index=0),
        InterviewTurn(session_id="s", role="student", content="A1", order_index=1),
        InterviewTurn(session_id="s", role="interviewer", content="Q2", order_index=2),
    ]
    t = build_transcript(turns)
    assert t.splitlines() == ["Interviewer: Q1", "Candidate: A1", "Interviewer: Q2"]


def test_next_order():
    turns = [
        InterviewTurn(session_id="s", role="interviewer", content="Q", order_index=0),
        InterviewTurn(session_id="s", role="student", content="A", order_index=1),
    ]
    assert _next_order(turns) == 2
    assert _next_order([]) == 0


def test_followup_prompt_enforces_concrete_detail():
    """Regression guard (RULES.md §4 eval): technical follow-ups must enforce a
    concrete detail on vague/off-topic answers, never bridge generically.

    Deterministic side of the interview eval set entry — pins the enforcement
    rules in the versioned prompt file so prompt drift breaks the suite instead
    of silently regressing the known weak point."""
    from pathlib import Path
    prompt = (
        Path(__file__).resolve().parent.parent
        / "ai" / "prompts" / "interview.txt"
    ).read_text(encoding="utf-8")
    assert "press for a" in prompt  # vague -> concrete-detail demand
    assert "specific example" in prompt
    assert "did not address the question" in prompt  # off-topic rule
    assert "FORBIDDEN" in prompt
    assert "generic bridging" in prompt.lower()


# ---------------------------------------------------------------------------
# session lifecycle
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_start_session_writes_opener_and_usage(db):
    with _mock_orchestrator("Tell me about your backend experience."):
        session = await start_session(db, "user-1", "technical")
    assert session.type == "technical"
    assert session.status == "in_progress"
    turns = await get_turns(db, session)
    assert len(turns) == 1
    assert turns[0].role == "interviewer"
    assert turns[0].content == "Tell me about your backend experience."
    assert turns[0].order_index == 0
    from sqlalchemy import select
    rows = (await db.execute(select(LLMUsageLog))).scalars().all()
    assert len(rows) == 1
    assert rows[0].feature == "mock_interview"


@pytest.mark.asyncio
async def test_start_session_validates_type(db):
    with pytest.raises(ValueError):
        await start_session(db, "user-1", "brainstorm")


@pytest.mark.asyncio
async def test_submit_answer_appends_then_follow_up(db):
    with _mock_orchestrator("What exactly is your backend experience?"):
        session = await start_session(db, "user-1", "technical")
    turns = await get_turns(db, session)
    assert len(turns) == 1

    with patch("backend.services.interviews.orchestrator") as orch:
        orch.call_llm = AsyncMock(return_value=_resp("You said Django — why Django over FastAPI?"))
        session, _ = await submit_answer(db, session.id, "user-1", "I mostly used Django at my last job.")
        follow_up_prompt = orch.call_llm.await_args.kwargs["prompt"]

    turns = await get_turns(db, session)
    assert [t.role for t in turns] == ["interviewer", "student", "interviewer"]
    assert turns[1].role == "student"
    assert turns[1].content == "I mostly used Django at my last job."
    assert turns[2].content == "You said Django — why Django over FastAPI?"
    # The follow-up call MUST have seen the student's answer in the transcript.
    assert "I mostly used Django" in follow_up_prompt
    assert "What exactly is your backend experience?" in follow_up_prompt


@pytest.mark.asyncio
async def test_ownership_denied(db):
    with _mock_orchestrator("Opener Q?"):
        session = await start_session(db, "user-1", "technical")
    with pytest.raises(KeyError):
        await submit_answer(db, session.id, "user-999", "answer")
    with pytest.raises(KeyError):
        await get_session(db, session.id, "user-999")


@pytest.mark.asyncio
async def test_answer_after_end_rejected(db):
    with _mock_orchestrator("Opener Q?"):
        session = await start_session(db, "user-1", "technical")
    await end_session(db, session.id, "user-1")
    with pytest.raises(ValueError):
        await submit_answer(db, session.id, "user-1", "too late")


@pytest.mark.asyncio
async def test_empty_answer_rejected(db):
    with _mock_orchestrator("Opener Q?"):
        session = await start_session(db, "user-1", "technical")
    with pytest.raises(ValueError):
        await submit_answer(db, session.id, "user-1", "   ")


@pytest.mark.asyncio
async def test_end_session_sets_status_and_ended_at(db):
    with _mock_orchestrator("Opener Q?"):
        session = await start_session(db, "user-1", "behavioral")
    ended = await end_session(db, session.id, "user-1")
    assert ended.status == "ended"
    assert ended.ended_at is not None


@pytest.mark.asyncio
async def test_failed_follow_up_preserves_student_turn(db):
    with _mock_orchestrator("Opener Q?"):
        session = await start_session(db, "user-1", "technical")
    with patch("backend.services.interviews.orchestrator") as orch:
        orch.call_llm = AsyncMock(side_effect=RuntimeError("openrouter down"))
        with pytest.raises(RuntimeError):
            await submit_answer(db, session.id, "user-1", "my answer survives")
    turns = await get_turns(db, session)
    # opener + student answer persisted even though the follow-up call failed.
    assert len(turns) == 2
    assert turns[-1].role == "student"
    assert turns[-1].content == "my answer survives"


# ---------------------------------------------------------------------------
# natural session end (conclude_session)
# ---------------------------------------------------------------------------

def test_clean_closing_strips_noise():
    assert clean_closing('"Nice work today."') == "Nice work today."
    assert clean_closing("```\nWe will stop here.\n```") == "We will stop here."
    assert clean_closing("   ") is None
    assert clean_closing("``````") is None


@pytest.mark.asyncio
async def test_conclude_appends_closing_and_ends(db):
    with _mock_orchestrator("Opener Q?"):
        session = await start_session(db, "user-1", "technical")
    with patch("backend.services.interviews.orchestrator") as orch:
        orch.call_llm = AsyncMock(return_value=_resp("You gave a solid answer on the unique-characters approach — keep that focus."))
        ended = await conclude_session(db, session.id, "user-1")
        prompt = orch.call_llm.await_args.kwargs["prompt"]
    assert ended.status == "ended"
    assert ended.ended_at is not None
    turns = await get_turns(db, session)
    assert turns[-1].role == "interviewer"
    assert turns[-1].content == "You gave a solid answer on the unique-characters approach — keep that focus."
    # The closing prompt saw the candidate's answer ("unique-characters" came from it).
    assert "Opener Q?" in prompt


@pytest.mark.asyncio
async def test_conclude_falls_back_on_llm_failure(db):
    with _mock_orchestrator("Opener Q?"):
        session = await start_session(db, "user-1", "behavioral")
    with patch("backend.services.interviews.orchestrator") as orch:
        orch.call_llm = AsyncMock(side_effect=RuntimeError("openrouter 402"))
        ended = await conclude_session(db, session.id, "user-1")
    assert ended.status == "ended"
    turns = await get_turns(db, session)
    assert turns[-1].content == _CLOSE_FALLBACK


@pytest.mark.asyncio
async def test_conclude_idempotent(db):
    with _mock_orchestrator("Opener Q?"):
        session = await start_session(db, "user-1", "technical")
    with patch("backend.services.interviews.orchestrator") as orch:
        orch.call_llm = AsyncMock(return_value=_resp("Closing one."))
        await conclude_session(db, session.id, "user-1")
        await conclude_session(db, session.id, "user-1")
    turns = await get_turns(db, session)
    # one opener + one closing, exactly — the second call added nothing.
    assert [t.role for t in turns] == ["interviewer", "interviewer"]
    assert turns[-1].order_index == 1


@pytest.mark.asyncio
async def test_conclude_ownership_denied(db):
    with _mock_orchestrator("Opener Q?"):
        session = await start_session(db, "user-1", "technical")
    with pytest.raises(KeyError):
        await conclude_session(db, session.id, "user-999")