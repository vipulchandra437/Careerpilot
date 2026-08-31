"""Coding challenge service (architecture.md §5, PRD §6.3).

Responsibilities:
  - generate_challenge: produce a Challenge from {gap_skill, difficulty,
    target_role} via an LLM call (deterministic test cases), validated before
    persistence.
  - submit_solution: run the student's code through the SANDBOX interface
    (backend.sandbox.executor.run_code) — NEVER executes code in this process —
    grade hermetically against the challenge's fixed test cases, record a
    ChallengeAttempt, update adaptive difficulty, and if passed, mark the
    linked roadmap milestone's action complete (PRD §6.3 acceptance).

Security: the ONLY execution path used here is `run_code`, which spins up an
isolated throwaway container. There is deliberately no "direct execution"
fallback: if the sandbox is unavailable, submission fails cleanly rather than
ever running student code in the API process (RULES.md §2).
"""

import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.ai.orchestrator import orchestrator, LLMResponse
from backend.config import get_settings
from backend.models.challenge import Challenge, ChallengeAttempt, ChallengeProgress
from backend.models.llm_usage import LLMUsageLog
from backend.models.roadmap import RoadmapMilestone
from backend.sandbox.executor import run_code, SandboxRunError, RunResult

settings = get_settings()

_PROMPT_PATH = Path(__file__).resolve().parent.parent / "ai" / "prompts" / "challenge_generation.txt"

DIFFICULTIES = ("beginner", "intermediate", "advanced")

# Milestone action statuses map: a passed challenge marks a milestone's linked
# action "done" (PRD §6.3). Challenge milestones were created with
# linked_action_type == "challenge" (see roadmap service + PHASE.md Phase 3).
MILESTONE_ACTION_TYPE = "challenge"


def load_challenge_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


def build_challenge_prompt(skill: str, difficulty: str, role_name: str) -> str:
    template = load_challenge_prompt()
    return (
        template.replace("{skill}", skill)
        .replace("{difficulty}", difficulty)
        .replace("{role}", role_name)
    )


# ---------------------------------------------------------------------------
# Pure adaptive-difficulty helpers (unit-testable, no I/O)
# ---------------------------------------------------------------------------

def next_difficulty(current: str, direction: int) -> str:
    """Step one level in `direction` (+1 = harder, -1 = easier), clamped to the
    allowed difficulty range."""
    try:
        idx = DIFFICULTIES.index(current)
    except ValueError:
        idx = 0
    return DIFFICULTIES[max(0, min(len(DIFFICULTIES) - 1, idx + direction))]


def apply_adaptive_result(current_progress, passed: bool) -> tuple[str, int, int]:
    """Return (new_difficulty, consecutive_correct, consecutive_wrong).

    Rules (PRD §6.3): 2 correct in a row -> difficulty steps up; 2 incorrect in
    a row -> difficulty steps down. Streak counters reset on a status change.
    """
    cc = current_progress.consecutive_correct
    cw = current_progress.consecutive_wrong
    diff = current_progress.current_difficulty

    if passed:
        cc += 1
        cw = 0
        if cc >= 2:
            diff = next_difficulty(diff, +1)
            cc = 0  # streak consumed by the step-up (matches "2 correct -> up")
    else:
        cw += 1
        cc = 0
        if cw >= 2:
            diff = next_difficulty(diff, -1)
            cw = 0

    return diff, cc, cw


# ---------------------------------------------------------------------------
# Challenge generation / validation
# ---------------------------------------------------------------------------

def _parse_challenge_json(text: str) -> dict | None:
    raw = text.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:].lstrip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        try:
            return json.loads(raw[start : end + 1])
        except json.JSONDecodeError:
            return None


def _validate_challenge(data: dict, skill: str) -> dict | None:
    """Validate a generated challenge and return a normalized dict, or None."""
    test_cases = data.get("test_cases")
    if not isinstance(test_cases, list) or not (3 <= len(test_cases) <= 6):
        return None
    normalized_tests = []
    for tc in test_cases:
        if not isinstance(tc, dict):
            return None
        stdin = tc.get("stdin")
        expected = tc.get("expected")
        if not isinstance(stdin, str) or not isinstance(expected, str):
            return None
        normalized_tests.append(
            {"name": tc.get("name", ""), "stdin": stdin, "expected": expected}
        )
    title = (data.get("title") or "").strip()
    prompt = (data.get("prompt") or "").strip()
    signature = (data.get("function_signature") or "").strip()
    if not title or not prompt or not signature:
        return None
    return {
        "title": title[:300],
        "prompt": prompt,
        "function_signature": signature,
        "starter_code": data.get("starter_code", ""),
        "test_cases": normalized_tests,
        "expected_time_complexity": data.get("expected_time_complexity") or None,
        "skill": skill,
    }


async def generate_challenge(
    db: AsyncSession,
    *,
    user_id: str,
    skill: str,
    difficulty: str,
    target_role_id: str,
    role_name: str,
    use_llm: bool = True,
) -> Challenge | None:
    """Generate a challenge for a skill/difficulty/role and persist it.

    Returns the persisted Challenge, or None if generation/validation failed.
    A deterministic fallback is NOT provided (see module docstring): if the LLM
    is unavailable we fail cleanly rather than fabricate a challenge.
    """
    if difficulty not in DIFFICULTIES:
        difficulty = "beginner"

    challenge = None
    usage_row = None

    if use_llm and settings.openrouter_api_key:
        # One primary attempt + ONE corrective retry. LLM output is intermittent
        # (e.g. it may emit expression-syntax test values that break strict JSON);
        # a retry with an explicit corrective hint converts that variance into a
        # working challenge instead of a 502. Still never fabricates a challenge.
        for attempt in range(2):
            prompt = build_challenge_prompt(skill, difficulty, role_name)
            if attempt == 1:
                prompt += (
                    "\n\nYour previous attempt produced invalid JSON (likely an "
                    "expression such as `\"a\" * 1000` or `\" \".join(...)` inside a "
                    "test-case string). Emit ONLY literal JSON string values — no "
                    "expressions, no repetition, no ranges — and keep inputs small "
                    "enough to write out fully. Return ONLY a single valid JSON object."
                )
            try:
                resp: LLMResponse = await orchestrator.call_llm(
                    feature="challenge_generation", prompt=prompt, user_id=user_id
                )
                parsed = _parse_challenge_json(resp.content)
                if parsed:
                    normalized = _validate_challenge(parsed, skill)
                    if normalized:
                        challenge = Challenge(
                            target_role_id=target_role_id,
                            skill=skill,
                            difficulty=difficulty,
                            title=normalized["title"],
                            prompt=normalized["prompt"],
                            function_signature=normalized["function_signature"],
                            starter_code=normalized["starter_code"],
                            test_cases=normalized["test_cases"],
                            expected_time_complexity=normalized["expected_time_complexity"],
                        )
                        db.add(challenge)
                        usage_row = LLMUsageLog(
                            user_id=user_id,
                            feature="challenge_generation",
                            model=resp.model,
                            tokens_in=resp.tokens_in,
                            tokens_out=resp.tokens_out,
                            cost_usd=resp.cost_usd,
                        )
                        break
            except Exception:
                challenge = None
                usage_row = None

    if challenge is None:
        await db.rollback()
        return None

    if usage_row is not None:
        db.add(usage_row)
    await db.commit()
    await db.refresh(challenge)
    return challenge


async def get_or_make_progress(
    db: AsyncSession, user_id: str, skill: str
) -> ChallengeProgress:
    """Fetch the user's difficulty state for a skill, creating it if absent."""
    result = await db.execute(
        select(ChallengeProgress).where(
            ChallengeProgress.user_id == user_id,
            ChallengeProgress.skill == skill,
        )
    )
    progress = result.scalar_one_or_none()
    if progress is None:
        progress = ChallengeProgress(user_id=user_id, skill=skill)
        db.add(progress)
        await db.flush()
    return progress


# ---------------------------------------------------------------------------
# Submission / grading (sandbox-only execution)
# ---------------------------------------------------------------------------

async def get_challenge(db: AsyncSession, challenge_id: str) -> Challenge | None:
    result = await db.execute(select(Challenge).where(Challenge.id == challenge_id))
    return result.scalar_one_or_none()


def check_solution(challenge: Challenge, code: str) -> RunResult:
    """Run code through the sandbox and grade it WITHOUT persisting anything.

    Used by the "Run" action (DESIGN.md §2.5): shows test results without
    consuming a submission. Grading is identical to submit, but no attempt is
    recorded and no milestone is touched.
    """
    return run_code(
        language="python",
        code=code,
        tests=challenge.test_cases or [],
        timeout_seconds=float(settings.sandbox_execution_timeout),
    )


async def get_progress_for_skill(
    db: AsyncSession, user_id: str, skill: str
) -> ChallengeProgress | None:
    result = await db.execute(
        select(ChallengeProgress).where(
            ChallengeProgress.user_id == user_id,
            ChallengeProgress.skill == skill,
        )
    )
    return result.scalar_one_or_none()


async def submit_solution(
    db: AsyncSession,
    *,
    user_id: str,
    challenge: Challenge,
    code: str,
    roadmap_milestone_id: str | None = None,
) -> ChallengeAttempt:
    """Grade a submission by running it ONLY in the sandbox (never here).

    Steps:
      1. Run code against challenge.test_cases via the sandbox interface.
      2. Grade hermetically: all tests passed and none timed out => passed.
      3. Record the ChallengeAttempt.
      4. Update adaptive difficulty state for the user+skill.
      5. If passed and linked to a milestone, mark that milestone's linked
         action complete (PRD §6.3 acceptance).
    """
    progress = await get_or_make_progress(db, user_id, challenge.skill)

    # -- 1 & 2: execute in the sandbox only ---------------------------------
    result: RunResult = run_code(
        language="python",
        code=code,
        tests=challenge.test_cases or [],
        timeout_seconds=float(settings.sandbox_execution_timeout),
    )

    tests = result.tests
    passed = result.all_passed
    status = "passed" if passed else ("timeout" if any(t.get("timed_out") for t in tests) else "failed")

    if result.error:
        status = "error"
        passed = False

    # -- 3: record the attempt ----------------------------------------------
    attempt = ChallengeAttempt(
        user_id=user_id,
        challenge_id=challenge.id,
        roadmap_milestone_id=roadmap_milestone_id,
        status=status,
        code_submitted=code,
        results=tests,
        difficulty_at_submission=progress.current_difficulty,
        consecutive_correct=progress.consecutive_correct,
        consecutive_wrong=progress.consecutive_wrong,
    )
    db.add(attempt)

    # -- 4: adaptive difficulty ----------------------------------------------
    new_diff, cc, cw = apply_adaptive_result(progress, passed)
    progress.current_difficulty = new_diff
    progress.consecutive_correct = cc
    progress.consecutive_wrong = cw

    # -- 5: mark the linked milestone's action complete on pass --------------
    if passed and roadmap_milestone_id:
        await _mark_milestone_challenge_done(db, roadmap_milestone_id, user_id)

    await db.commit()
    await db.refresh(attempt)
    return attempt


async def _mark_milestone_challenge_done(
    db: AsyncSession, milestone_id: str, user_id: str
) -> bool:
    """Mark a milestone's linked action complete (status -> done).

    Only acts on milestones whose linked_action_type is a challenge and that
    belong to the user. Re-orders the roadmap via the existing service helper.
    """
    from backend.services.roadmap import update_milestone_status

    result = await db.execute(
        select(RoadmapMilestone).where(RoadmapMilestone.id == milestone_id)
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        return False
    if milestone.linked_action_type != MILESTONE_ACTION_TYPE:
        return False
    if milestone.status == "done":
        return True

    updated = await update_milestone_status(db, milestone_id, "done")
    return updated is not None
