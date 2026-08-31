"""Coding challenge models (architecture.md §3, PRD §6.3).

The `Challenge` holds a fixed set of deterministic test cases (expected output
strings). Grading is done in the sandbox (backend/sandbox) — never in the API
process. `ChallengeAttempt` records each submission result and carries the
consecutive-correct/wrong counters used by the adaptive-difficulty logic.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Integer, String, JSON, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class Challenge(Base):
    """A practice challenge scoped to {gap_skill, difficulty, target_role}."""

    __tablename__ = "challenges"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    target_role_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    skill: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    function_signature: Mapped[str] = mapped_column(Text, nullable=False)
    starter_code: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # list of {"name", "stdin", "expected"} — deterministic expected outputs the
    # sandbox grades against. Never derived from the student's own runtime.
    test_cases: Mapped[list | None] = mapped_column(JSON, nullable=False, default=list)
    expected_time_complexity: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )


class ChallengeAttempt(Base):
    """One submission of a challenge, plus the adaptive-difficulty streak state.

    `consecutive_correct` / `consecutive_wrong` snapshot the streak at the time
    of the attempt so adaptive difficulty (2 correct -> up, 2 incorrect -> down)
    is auditable after the fact.
    """

    __tablename__ = "challenge_attempts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    challenge_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    roadmap_milestone_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="failed")
    code_submitted: Mapped[str] = mapped_column(Text, nullable=False)
    # per-test results from the sandbox: {"name", "passed", "timed_out",
    # "exit_code", "stdout", "stderr", "elapsed_ms"}
    results: Mapped[list | None] = mapped_column(JSON, nullable=False, default=list)
    difficulty_at_submission: Mapped[str | None] = mapped_column(String(20), nullable=True)
    consecutive_correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    consecutive_wrong: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )


class ChallengeProgress(Base):
    """Per-(user, skill) adaptive-difficulty state (PRD §6.3).

    `consecutive_correct` (2 -> difficulty steps up) and `consecutive_wrong`
    (2 -> difficulty steps down) are updated on every submission and persisted
    here so the next generated challenge for that skill uses the right level.
    """

    __tablename__ = "challenge_progress"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    skill: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    current_difficulty: Mapped[str] = mapped_column(
        String(20), nullable=False, default="beginner"
    )
    consecutive_correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    consecutive_wrong: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
