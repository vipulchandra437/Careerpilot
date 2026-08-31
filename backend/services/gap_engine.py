"""Skill gap engine (architecture.md §5.3, PRD §6.1).

Two passes, merged:
  1. Deterministic pass — normalized skill/synonym matching of the merged profile
     against the target role's `required_skills`. Produces a hard gap for any
     required skill that is clearly missing. No LLM.
  2. LLM depth pass — one orchestrator `gap_analysis` call reasons about depth /
     context using the full merged profile, refining severity, reason and
     suggested_resource.

Merge rule (architecture §5.3): the LLM must NEVER drop or clear a required skill
that the deterministic pass found clearly missing. It may refine severity/reason.
A deterministically-present skill may still surface as a depth gap if the LLM flags
it as below the role's required depth.

The result is upserted into `gap_reports` by (snapshot_id, target_role_id) so
re-running analysis updates, never duplicates (PRD §6.1).
"""

import json
import re
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.ai.orchestrator import orchestrator, LLMResponse
from backend.config import get_settings
from backend.models.gap import GapReport
from backend.models.llm_usage import LLMUsageLog
from backend.services.profile_merge import MergedProfile

settings = get_settings()

_PROMPT_PATH = Path(__file__).resolve().parent.parent / "ai" / "prompts" / "gap_analysis.txt"

SEVERITY_ORDER = {"critical": 3, "important": 2, "nice_to_have": 1, "none": 0}

# Alias map: normalized required-skill -> set of aliases that count as "present".
# Keys are normalized (lowercased/stripped); values are raw alias tokens to match.
SKILL_SYNONYMS = {
    "javascript": {"js", "ecmascript", "es6", "node", "node.js", "nodejs", "jsx"},
    "react": {"reactjs", "react.js", "react native", "next.js", "nextjs"},
    "typescript": {"ts"},
    "machine learning": {"ml", "artificial intelligence", "ai", "deep learning"},
    "python": {"python3", "py"},
    "sql": {"postgres", "postgresql", "mysql", "sqlite", "sql server", "mssql", "sql queries", "rdbms"},
    "rest api": {"rest", "restful", "restful api", "api", "apis", "http api",
                 "fastapi", "flask", "django", "django rest", "django rest framework",
                 "express", "express.js", "nestjs", "spring", "spring boot", "gin", "rails"},
    "databases": {"database", "db", "data storage", "mongodb", "redis", "sql", "postgres", "mysql", "sqlite"},
    "docker": {"containers", "containerization", "dockerfile"},
    "git": {"github", "version control", "vcs"},
    "html": {"html5"},
    "css": {"css3", "scss", "sass", "tailwind", "bootstrap"},
    "pandas": {"dataframe", "dataframes"},
    "numpy": {"np"},
    "scikit-learn": {"sklearn", "scikit learn"},
}


def _norm(token: str) -> str:
    """Normalize a skill token to a stable matching key."""
    return re.sub(r"[^a-z0-9]+", " ", token.lower()).strip()


def _skill_aliases(required_skill: str) -> set[str]:
    """Return normalized set of matchable keys for a required skill (name + aliases)."""
    keys = {required_skill}
    keys.update(SKILL_SYNONYMS.get(_norm(required_skill), set()))
    return {_norm(k) for k in keys if _norm(k)}


def _profile_evidence(merged: MergedProfile) -> dict:
    """Normalize merged profile into a searchable evidence structure."""
    present = {
        "github": set(),
        "resume": set(),
        "linkedin": set(),
        "projects": set(),
        "languages": set(),
    }
    for s in merged.skills:
        if s.source in present and s.name:
            present[s.source].add(s.name)
    for lang in merged.languages_used.keys():
        if lang:
            present["languages"].add(lang)
    # Any GitHub evidence (sourced skills or language stats) implies git usage,
    # since you cannot have GitHub repos without using version control.
    has_github = any(s.source == "github" for s in merged.skills) or bool(merged.languages_used)
    if has_github:
        present["github"].add("git")
        present["github"].add("github")
    for p in merged.projects:
        techs = p.get("technologies") or []
        if isinstance(techs, str):
            techs = [techs]
        for t in techs:
            if t:
                present["projects"].add(t)
        if p.get("name"):
            present["projects"].add(p["name"])
    # Union of all raw tokens, normalized, plus per-source normalized sets.
    raw_union = set().union(*present.values()) if present.values() else set()
    normalized = {_norm(t): t for t in raw_union}
    # Full free-text of the profile (names + descriptions + experience bullets),
    # normalized, for phrase/keyword substring matching (catches signal that lives
    # in prose, e.g. "built a machine learning model", which token matching misses).
    text_parts = [p.get("name", "") for p in merged.projects]
    text_parts += [p.get("description") or "" for p in merged.projects]
    text_parts += [
        f"{e.get('title','')} {e.get('company','')} {e.get('description') or ''}"
        for e in merged.experience
    ]
    text_parts += list(merged.languages_used.keys())
    text_parts += [s.name for s in merged.skills]
    fulltext = _norm(" ".join(text_parts))
    return {
        "normalized": normalized,
        "github": {_norm(t) for t in present["github"]},
        "resume": {_norm(t) for t in present["resume"]},
        "linkedin": {_norm(t) for t in present["linkedin"]},
        "projects": {_norm(t) for t in present["projects"]},
        "languages": {_norm(t) for t in present["languages"]},
        "fulltext": fulltext,
        "merged": merged,
    }


def _severity_from_weight(weight: float) -> str:
    if weight >= 0.9:
        return "critical"
    if weight >= 0.6:
        return "important"
    return "nice_to_have"


def _phrase_in_text(alias: str, fulltext: str) -> bool:
    """Word-boundary substring check for a normalized alias phrase in normalized text.

    Skips single-char aliases (too noisy, e.g. 'a'/'c') and empty text. The 'ai'
    alias is elided here because 2-letter 'ai' matches inside words is undesirable;
    multi-word ML terms ('machine learning', 'deep learning') still catch real signal.
    """
    if len(alias) < 2 or len(fulltext) < len(alias):
        return False
    if alias == "ai":  # 2-letter, over-matches; rely on 'machine learning' etc.
        return False
    pattern = re.compile(rf"(?<![a-z0-9]){re.escape(alias)}(?![a-z0-9])")
    return bool(pattern.search(fulltext))


def deterministic_pass(merged: MergedProfile, required_skills: list[dict]) -> dict[str, dict]:
    """Pure deterministic pass. Returns {skill: {matched, severity, weight}}.

    A required skill counts as "matched" if any evidence token matches its normalized
    name/alias (token set), OR any alias phrase appears in the profile's free text (
    project/experience descriptions), OR the skill name itself is found in the text.
    """
    evidence = _profile_evidence(merged)
    result = {}
    for req in required_skills:
        skill = req["skill"]
        weight = float(req.get("weight", 0.5))
        aliases = _skill_aliases(skill)
        matched = False
        matched_sources = []  # ordered source labels for deterministic reason text
        for label, pool in (
            ("resume", evidence["resume"]),
            ("github", evidence["github"]),
            ("linkedin", evidence["linkedin"]),
            ("projects", evidence["projects"]),
            ("languages", evidence["languages"]),
        ):
            if aliases & pool:
                matched = True
                matched_sources.append(label)
        if not matched:
            # Free-text scan: exact skill name or any alias phrase in the prose.
            if _phrase_in_text(_norm(skill), evidence["fulltext"]):
                matched = True
                matched_sources.append("profile text")
            else:
                for alias in aliases:
                    if _phrase_in_text(alias, evidence["fulltext"]):
                        matched = True
                        matched_sources.append("profile text")
                        break
        result[skill] = {
            "matched": matched,
            "sources": matched_sources,
            "severity": (_severity_from_weight(weight) if not matched else "none"),
            "weight": weight,
            "min_depth": req.get("min_depth", "basic"),
        }
    return result


def _parse_llm_json(text: str) -> list[dict] | None:
    raw = text.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:].lstrip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        try:
            data = json.loads(raw[start : end + 1])
        except json.JSONDecodeError:
            return None
    gaps = (data or {}).get("gaps") if isinstance(data, dict) else None
    if not isinstance(gaps, list):
        return None
    out = []
    for g in gaps:
        if not isinstance(g, dict) or not g.get("skill"):
            continue
        severity = str(g.get("severity") or "none").lower()
        if severity not in SEVERITY_ORDER:
            severity = "none"
        out.append(
            {
                "skill": str(g["skill"]).strip(),
                "severity": severity,
                "reason": str(g.get("reason") or "").strip(),
                "suggested_resource": str(g.get("suggested_resource") or "").strip(),
            }
        )
    return out


def _default_reason(skill: str, role_name: str) -> str:
    return f"'{skill}' is required for {role_name} but there is no evidence of it in your profile."


_SOURCE_LABELS = {
    "resume": "listed on your resume",
    "github": "listed on your GitHub",
    "linkedin": "listed on your LinkedIn",
    "projects": "used in a project",
    "languages": "shown in your GitHub language stats",
    "profile text": "mentioned in a project or experience description",
}


def _present_skill_reason(skill: str, sources: list[str], role_name: str) -> str:
    """Deterministic, evidence-grounded reason for a skill that IS present.

    The deterministic pass proved the skill is evidenced (and in which source), so we
    generate the reason from that ground truth instead of letting the LLM re-derive
    free-form text that can drift run-to-run or contradict the evidence (the SQL case).
    The LLM still contributes the severity, which is the nuance (depth judgment) it is
    actually needed for.
    """
    if not sources:
        return _default_reason(skill, role_name)
    source_desc = _SOURCE_LABELS.get(sources[0], "present in your profile")
    return f"'{skill}' is {source_desc}, but there is limited evidence of working depth for {role_name}."


def _empty_resource(skill: str) -> str:
    return f"No free resource mapped for '{skill}' yet."


def merge_passes(
    deterministic: dict[str, dict],
    llm_gaps: list[dict] | None,
    role_name: str,
) -> list[dict]:
    """Merge deterministic + LLM passes into the final gap list (arch §5.3)."""
    llm_by_skill = {_norm(g["skill"]): g for g in llm_gaps} if llm_gaps else {}

    final = []
    for skill, det in deterministic.items():
        llm = llm_by_skill.get(_norm(skill))
        if not det["matched"]:
            # Hard miss from the deterministic pass: always surfaces as a gap (err on the
            # side of surfacing genuine absences for the user to judge). The LLM may refine
            # severity/reason/resource but never clears the skill. The deterministic pass
            # is already thorough (token + full-text + git-from-github), so its hard misses
            # are genuinely-absent skills; letting the LLM drop them risks under-flagging.
            severity = llm["severity"] if llm and llm["severity"] != "none" else det["severity"]
            reason = (llm["reason"] if llm and llm["reason"] else "") or _default_reason(skill, role_name)
            resource = (
                llm["suggested_resource"] if llm and llm["suggested_resource"] else _empty_resource(skill)
            )
            final.append(
                {
                    "skill": skill,
                    "severity": severity,
                    "reason": reason,
                    "suggested_resource": resource,
                    "matched": False,
                }
            )
        else:
            # Present deterministically; surface as a gap only if LLM flags depth as below requirement.
            if llm and llm["severity"] != "none":
                final.append(
                    {
                        "skill": skill,
                        "severity": llm["severity"],
                        # Reason is deterministic from the proven source; never let the LLM
                        # re-derive free-form text that can drift or contradict the evidence.
                        "reason": _present_skill_reason(skill, det.get("sources", []), role_name),
                        "suggested_resource": llm["suggested_resource"],
                        "matched": True,
                    }
                )
    # Sort: critical > important > nice_to_have, then by weight desc within a band.
    final.sort(
        key=lambda g: (SEVERITY_ORDER[g["severity"]], deterministic[g["skill"]]["weight"]),
        reverse=True,
    )
    return final


def _build_evidence_text(merged: MergedProfile) -> str:
    lines = []
    if merged.skills:
        lines.append("Skills (source / confidence):")
        for s in merged.skills:
            lines.append(f"  - {s.name} ({s.source}, {s.confidence})")
    if merged.languages_used:
        lines.append("GitHub languages (bytes):")
        for lang, b in list(merged.languages_used.items())[:20]:
            lines.append(f"  - {lang}: {b}")
    if merged.projects:
        lines.append("Projects:")
        for p in merged.projects[:15]:
            techs = p.get("technologies") or []
            if isinstance(techs, str):
                techs = [techs]
            techs = ", ".join(str(t) for t in techs)
            desc = (p.get("description") or "")[:200]
            lines.append(f"  - {p.get('name', '')} [{techs}] {desc}")
    if merged.experience:
        lines.append("Experience (top roles):")
        for e in merged.experience[:5]:
            desc = (e.get("description") or "")[:300]
            lines.append(f"  - {e.get('title', '')} @ {e.get('company', '')}: {desc}")
    return "\n".join(lines) if lines else "No profile evidence provided."


def load_gap_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


def build_gap_prompt(role_name: str, required_skills: list[dict], merged: MergedProfile) -> str:
    template = load_gap_prompt()
    req_lines = "\n".join(
        f"  - {r['skill']} (weight {r.get('weight', 0.5)}, min depth {r.get('min_depth', 'basic')})"
        for r in required_skills
    )
    return template.replace("{role_name}", role_name).replace("{required_skills}", req_lines).replace(
        "{profile_evidence}", _build_evidence_text(merged)
    )


async def run_gap_analysis(
    db: AsyncSession,
    snapshot_id: str,
    target_role: "TargetRoleProfile",
    merged: MergedProfile,
    user_id: str,
    use_llm: bool = True,
) -> GapReport:
    """Run deterministic + (optional) LLM passes and upsert the GapReport."""
    required_skills = target_role.required_skills or []
    deterministic = deterministic_pass(merged, required_skills)

    llm_gaps = None
    usage_row = None
    if use_llm and settings.openrouter_api_key:
        # Build the prompt OUTSIDE the try so a prompt/format bug surfaces loudly
        # (it must never be silently masked as "LLM unavailable"). Only the actual
        # LLM transport + parse degrade gracefully to a deterministic-only report.
        prompt = build_gap_prompt(target_role.name, required_skills, merged)
        try:
            resp: LLMResponse = await orchestrator.call_llm(
                feature="gap_analysis",
                prompt=prompt,
                user_id=user_id,
            )
            parsed = _parse_llm_json(resp.content)
            if parsed:
                llm_gaps = parsed
                usage_row = LLMUsageLog(
                    user_id=user_id,
                    feature="gap_analysis",
                    model=resp.model,
                    tokens_in=resp.tokens_in,
                    tokens_out=resp.tokens_out,
                    cost_usd=resp.cost_usd,
                )
        except Exception:
            # LLM transport/failure or unparseable output -> deterministic-only (never 500).
            llm_gaps = None

    gaps = merge_passes(deterministic, llm_gaps, target_role.name)

    report = await _upsert_report(db, snapshot_id, target_role.id, gaps)

    if usage_row is not None:
        db.add(usage_row)
        await db.commit()

    return report


async def _upsert_report(
    db: AsyncSession,
    snapshot_id: str,
    target_role_id: str,
    gaps: list[dict],
) -> GapReport:
    result = await db.execute(
        select(GapReport).where(
            GapReport.snapshot_id == snapshot_id,
            GapReport.target_role_id == target_role_id,
        )
    )
    report = result.scalar_one_or_none()
    if report:
        report.gaps = gaps
    else:
        report = GapReport(snapshot_id=snapshot_id, target_role_id=target_role_id, gaps=gaps)
        db.add(report)
    await db.commit()
    await db.refresh(report)
    return report
