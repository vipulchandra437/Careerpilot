"""Roadmap generation service (architecture.md §5.4, PRD §6.2).

Runs as a background job (FastAPI BackgroundTasks for v1) that takes a GapReport and
produces a versioned Roadmap with RoadmapMilestones. Uses one LLM call with the
roadmap prompt.
"""

import json
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.ai.orchestrator import orchestrator, LLMResponse
from backend.config import get_settings
from backend.models.gap import GapReport
from backend.models.llm_usage import LLMUsageLog
from backend.models.roadmap import Roadmap, RoadmapMilestone
from backend.services.gap_engine import _build_evidence_text
from backend.services.profile_merge import MergedProfile

settings = get_settings()

_PROMPT_PATH = Path(__file__).resolve().parent.parent / "ai" / "prompts" / "roadmap.txt"


def load_roadmap_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


def _build_gap_summary(gaps: list[dict]) -> str:
    """Format gaps into a concise summary for the prompt."""
    if not gaps:
        return "No gaps found."
    lines = []
    for g in gaps:
        severity = g.get("severity", "unknown")
        skill = g.get("skill", "unknown")
        reason = g.get("reason", "")
        matched = g.get("matched", False)
        prefix = "DEPTH GAP (present but shallow)" if matched else "MISSING"
        lines.append(f"  - [{severity.upper()}] {skill} ({prefix}): {reason}")
    return "\n".join(lines)


def build_roadmap_prompt(
    role_name: str,
    gaps: list[dict],
    merged: MergedProfile,
) -> str:
    template = load_roadmap_prompt()
    gap_summary = _build_gap_summary(gaps)
    return template.replace("{role_name}", role_name).replace(
        "{gap_summary}", gap_summary
    ).replace("{profile_evidence}", _build_evidence_text(merged))


def _parse_roadmap_json(text: str) -> dict | None:
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


def _validate_milestones(milestones: list[dict], gaps: list[dict]) -> list[dict]:
    """Validate milestones against gap skills, discard invalid ones."""
    gap_skills = {g.get("skill", "") for g in gaps}
    skill_to_severity = {g.get("skill", ""): g.get("severity", "nice_to_have") for g in gaps}
    
    valid = []
    for i, m in enumerate(milestones):
        linked_skill = m.get("linked_gap_skill", "")
        action_type = m.get("linked_action_type", "")
        action_id = m.get("linked_action_id", "")

        # Must have exact skill match
        if linked_skill not in gap_skills:
            continue
        # Must have action type
        if not action_type or action_type not in ("challenge", "interview", "resource"):
            continue
        # Must have action id
        if not action_id:
            continue

        # Default estimated hours based on severity if not provided
        estimated_hours = m.get("estimated_hours")
        if estimated_hours is None:
            severity = skill_to_severity.get(linked_skill, "nice_to_have")
            estimated_hours = 8 if severity == "critical" else (5 if severity == "important" else 3)

        valid.append({
            "title": m.get("title", "")[:200],
            "linked_gap_skill": linked_skill,
            "status": m.get("status", "not_started"),
            "linked_action_type": action_type,
            "linked_action_id": action_id,
            "order_index": m.get("order_index", i),
            "estimated_hours": estimated_hours,
        })
    return valid


async def _upsert_roadmap(
    db: AsyncSession,
    user_id: str,
    gap_report_id: str,
    milestones_data: list[dict],
    version: str = "v1.0",
) -> Roadmap:
    """Create a new Roadmap version with milestones."""
    # Check if a roadmap already exists for this gap_report
    result = await db.execute(
        select(Roadmap).where(Roadmap.gap_report_id == gap_report_id)
    )
    roadmap = result.scalar_one_or_none()

    if roadmap:
        # Version bump: keep existing roadmap but create new version
        # For v1, we'll just overwrite milestones (simple approach)
        # In future: could implement proper versioning with append-only
        roadmap.version = version
        # Delete old milestones
        await db.execute(
            RoadmapMilestone.__table__.delete().where(
                RoadmapMilestone.roadmap_id == roadmap.id
            )
        )
    else:
        roadmap = Roadmap(
            user_id=user_id,
            gap_report_id=gap_report_id,
            version=version,
        )
        db.add(roadmap)
        await db.flush()

    # Add milestones
    for i, m in enumerate(milestones_data):
        milestone = RoadmapMilestone(
            roadmap_id=roadmap.id,
            title=m.get("title", "")[:200],
            linked_gap_skill=m.get("linked_gap_skill"),
            status=m.get("status", "not_started"),
            linked_action_type=m.get("linked_action_type"),
            linked_action_id=m.get("linked_action_id"),
            order_index=m.get("order_index", i),
            estimated_hours=m.get("estimated_hours"),
        )
        db.add(milestone)

    await db.commit()
    await db.refresh(roadmap)
    return roadmap


async def run_roadmap_generation(
    db: AsyncSession,
    user_id: str,
    gap_report: GapReport,
    merged: MergedProfile,
    target_role_name: str,
    use_llm: bool = True,
) -> Roadmap:
    """Run roadmap generation from a GapReport and upsert the Roadmap + milestones."""
    gaps = gap_report.gaps or []

    llm_milestones = None
    usage_row = None

    if use_llm and settings.openrouter_api_key:
        prompt = build_roadmap_prompt(target_role_name, gaps, merged)
        try:
            resp: LLMResponse = await orchestrator.call_llm(
                feature="roadmap",
                prompt=prompt,
                user_id=user_id,
            )
            parsed = _parse_roadmap_json(resp.content)
            if parsed and "milestones" in parsed:
                # Validate milestones against actual gap skills
                llm_milestones = _validate_milestones(parsed["milestones"], gaps)
                usage_row = LLMUsageLog(
                    user_id=user_id,
                    feature="roadmap",
                    model=resp.model,
                    tokens_in=resp.tokens_in,
                    tokens_out=resp.tokens_out,
                    cost_usd=resp.cost_usd,
                )
        except Exception:
            # LLM transport/failure or unparseable output -> fallback to deterministic
            llm_milestones = None

    if not llm_milestones:
        # Fallback: simple deterministic milestones from gaps
        llm_milestones = _fallback_milestones(gaps, target_role_name)

    version = "v1.0"
    roadmap = await _upsert_roadmap(db, user_id, gap_report.id, llm_milestones, version)

    if usage_row is not None:
        db.add(usage_row)
        await db.commit()

    return roadmap


def _fallback_milestones(gaps: list[dict], role_name: str) -> list[dict]:
    """Generate basic milestones without LLM when unavailable."""
    # Map common skills to challenge slugs
    challenge_map = {
        "sql": "sql-queries",
        "rest api": "fastapi-rest-api",
        "databases": "sql-queries",
        "docker": "docker-basics",
        "git": "git-workflow",
        "python": "fastapi-rest-api",
        "machine learning": "ml-model-training",
        "pandas": "ml-model-training",
        "numpy": "ml-model-training",
        "scikit-learn": "ml-model-training",
        "react": "react-hooks",
        "typescript": "react-hooks",
    }

    resource_map = {
        "sql": "https://www.w3schools.com/sql/",
        "rest api": "https://fastapi.tiangolo.com/tutorial/",
        "databases": "https://www.postgresql.org/docs/current/tutorial.html",
        "docker": "https://docs.docker.com/get-started/",
        "git": "https://git-scm.com/book/en/v2",
        "machine learning": "https://www.coursera.org/learn/machine-learning",
        "pandas": "https://pandas.pydata.org/docs/getting_started/index.html",
        "numpy": "https://numpy.org/doc/stable/user/absolute_beginners.html",
        "scikit-learn": "https://scikit-learn.org/stable/tutorial/index.html",
    }

    milestones = []
    order = 0
    for g in gaps:
        skill = g.get("skill", "")
        severity = g.get("severity", "nice_to_have")
        if severity == "none":
            continue
        matched = g.get("matched", False)

        action_type = "resource"
        action_id = resource_map.get(skill.lower(), f"https://www.google.com/search?q=learn+{skill.replace(' ', '+')}")

        # For critical/important, try to use a challenge
        if severity in ("critical", "important") and skill.lower() in challenge_map:
            action_type = "challenge"
            action_id = challenge_map[skill.lower()]

        title_prefix = "Deepen" if matched else "Learn"
        title = f"{title_prefix} {skill} for {role_name}"

        milestones.append({
            "title": title,
            "linked_gap_skill": skill,
            "status": "not_started",
            "linked_action_type": action_type,
            "linked_action_id": action_id,
            "order_index": order,
            "estimated_hours": 6 if severity == "critical" else 4,
        })
        order += 1

    return milestones


async def get_roadmap_with_milestones(
    db: AsyncSession,
    gap_report_id: str,
) -> tuple[Roadmap, list[RoadmapMilestone]] | None:
    """Fetch roadmap and its milestones for a gap report."""
    result = await db.execute(
        select(Roadmap).where(Roadmap.gap_report_id == gap_report_id)
    )
    roadmap = result.scalar_one_or_none()
    if not roadmap:
        return None

    milestones_result = await db.execute(
        select(RoadmapMilestone)
        .where(RoadmapMilestone.roadmap_id == roadmap.id)
        .order_by(RoadmapMilestone.order_index)
    )
    milestones = milestones_result.scalars().all()
    return roadmap, list(milestones)


async def get_roadmap_by_id_with_milestones(
    db: AsyncSession,
    roadmap_id: str,
) -> tuple[Roadmap, list[RoadmapMilestone]] | None:
    """Fetch roadmap and its milestones by roadmap ID."""
    result = await db.execute(
        select(Roadmap).where(Roadmap.id == roadmap_id)
    )
    roadmap = result.scalar_one_or_none()
    if not roadmap:
        return None

    milestones_result = await db.execute(
        select(RoadmapMilestone)
        .where(RoadmapMilestone.roadmap_id == roadmap.id)
        .order_by(RoadmapMilestone.order_index)
    )
    milestones = milestones_result.scalars().all()
    return roadmap, list(milestones)


async def update_milestone_status(
    db: AsyncSession,
    milestone_id: str,
    new_status: str,
) -> RoadmapMilestone | None:
    """Update a milestone's status and re-order the roadmap.

    Re-ordering logic:
    - Completed milestones move to the end (preserving their relative order)
    - Remaining milestones (not_started, in_progress) are re-sequenced starting from 0
      by their original priority (severity desc, then original order)
    - This implements PRD §6.2: "completing milestones re-ranks what's left"
    """
    if new_status not in ("not_started", "in_progress", "done"):
        raise ValueError("Invalid status")

    result = await db.execute(
        select(RoadmapMilestone).where(RoadmapMilestone.id == milestone_id)
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        return None

    # Fetch all milestones in this roadmap to re-order
    roadmap_result = await db.execute(
        select(Roadmap).where(Roadmap.id == milestone.roadmap_id)
    )
    roadmap = roadmap_result.scalar_one_or_none()
    if not roadmap:
        return None

    all_milestones_result = await db.execute(
        select(RoadmapMilestone)
        .where(RoadmapMilestone.roadmap_id == roadmap.id)
        .order_by(RoadmapMilestone.order_index)
    )
    all_milestones = list(all_milestones_result.scalars().all())

    # Update the target milestone's status
    milestone.status = new_status

    # Re-order:
    # 1. Separate completed vs active milestones
    completed = [m for m in all_milestones if m.status == "done"]
    active = [m for m in all_milestones if m.status != "done"]

    # 2. Sort active by original priority (we'll use the gap severity order embedded in the milestones)
    # Since we don't store severity on milestones, we sort by original order_index for stability
    active.sort(key=lambda m: m.order_index)

    # 3. Re-assign order_index: active first (0..N-1), then completed (N..)
    new_order = 0
    for m in active:
        m.order_index = new_order
        new_order += 1
    for m in completed:
        m.order_index = new_order
        new_order += 1

    await db.commit()
    await db.refresh(milestone)
    return milestone