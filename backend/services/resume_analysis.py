"""Resume analysis service (LLM via orchestrator, RULES.md §1)."""

from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from backend.ai.orchestrator import orchestrator
from backend.models.llm_usage import LLMUsageLog
from backend.models.target_role import TargetRoleProfile

_PROMPT_PATH = Path(__file__).resolve().parent.parent / "ai" / "prompts" / "resume_analysis.txt"


def _clamp_score(value, default: int = 50) -> int:
    try:
        n = int(float(value))
    except (TypeError, ValueError):
        return default
    return max(0, min(100, n))


def _as_str_list(value, limit: int) -> list[str]:
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value:
        if isinstance(item, str) and item.strip():
            out.append(item.strip())
            if len(out) >= limit:
                break
    return out


def _parse_json(raw: str) -> dict | None:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:].lstrip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            return None
        try:
            data = json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None
    return data if isinstance(data, dict) else None


def _normalize_analysis(data: dict) -> dict:
    section_feedback = []
    for item in data.get("section_feedback") or []:
        if not isinstance(item, dict):
            continue
        section = str(item.get("section") or "Other").strip() or "Other"
        status = str(item.get("status") or "needs_work").strip().lower()
        if status not in {"good", "needs_work", "missing"}:
            status = "needs_work"
        feedback = str(item.get("feedback") or "").strip()
        if feedback:
            section_feedback.append({"section": section, "status": status, "feedback": feedback})
        if len(section_feedback) >= 8:
            break

    bullet_improvements = []
    for item in data.get("bullet_improvements") or []:
        if not isinstance(item, dict):
            continue
        original = str(item.get("original") or "").strip()
        improved = str(item.get("improved") or "").strip()
        reason = str(item.get("reason") or "").strip()
        if improved:
            bullet_improvements.append({"original": original, "improved": improved, "reason": reason})
        if len(bullet_improvements) >= 5:
            break

    return {
        "overall_score": _clamp_score(data.get("overall_score"), 50),
        "ats_score": _clamp_score(data.get("ats_score"), 50),
        "summary": str(data.get("summary") or "Resume analyzed.").strip(),
        "strengths": _as_str_list(data.get("strengths"), 8),
        "weaknesses": _as_str_list(data.get("weaknesses"), 8),
        "section_feedback": section_feedback,
        "bullet_improvements": bullet_improvements,
        "missing_keywords": _as_str_list(data.get("missing_keywords"), 10),
        "action_items": _as_str_list(data.get("action_items"), 6),
    }


def _fallback_analysis(resume_data: dict, target_role: str | None) -> dict:
    skills = resume_data.get("skills") or []
    experience = resume_data.get("experience") or []
    education = resume_data.get("education") or []
    projects = resume_data.get("projects") or []
    present = sum(1 for x in [skills, experience, education, projects] if x)
    score = 35 + present * 12 + min(len(skills), 8) * 2
    score = max(0, min(100, score))
    missing = []
    if not experience:
        missing.append("experience")
    if not education:
        missing.append("education")
    if not projects:
        missing.append("projects")
    if len(skills) < 5:
        missing.append("skills keywords")
    summary = "Baseline resume analysis (AI unavailable). Add missing sections and quantify impact."
    if target_role:
        summary = f"Baseline resume analysis for {target_role} (AI unavailable)."
    return {
        "overall_score": score,
        "ats_score": max(0, score - 5),
        "summary": summary,
        "strengths": [f"{len(skills)} skills detected"] if skills else [],
        "weaknesses": [f"Missing or thin: {', '.join(missing)}"] if missing else [],
        "section_feedback": [
            {
                "section": "Experience" if not experience else "Skills",
                "status": "missing" if not experience else "needs_work",
                "feedback": "Add role bullets with measurable impact." if not experience else "Add role-specific keywords and evidence.",
            }
        ],
        "bullet_improvements": [],
        "missing_keywords": [],
        "action_items": ["Add measurable impact to bullets", "Tailor keywords to the target role"],
    }


async def analyze_resume(
    db: AsyncSession,
    *,
    user_id: str,
    resume_data: dict,
    target_role: TargetRoleProfile | None = None,
    job_description: str | None = None,
) -> dict:
    prompt = _PROMPT_PATH.read_text(encoding="utf-8")
    role_text = target_role.name if target_role else ""
    prompt = (
        prompt.replace("{resume_data}", json.dumps(resume_data, ensure_ascii=False)[:12000])
        .replace("{target_role}", role_text)
        .replace("{job_description}", (job_description or "")[:4000])
    )

    try:
        resp = await orchestrator.call_llm(feature="resume_analysis", prompt=prompt, user_id=user_id)
        parsed = _parse_json(resp.content)
        if parsed:
            db.add(
                LLMUsageLog(
                    user_id=user_id,
                    feature="resume_analysis",
                    model=resp.model,
                    tokens_in=resp.tokens_in,
                    tokens_out=resp.tokens_out,
                    cost_usd=resp.cost_usd,
                )
            )
            await db.commit()
            return _normalize_analysis(parsed)
    except Exception:
        pass

    return _fallback_analysis(resume_data, role_text or None)
