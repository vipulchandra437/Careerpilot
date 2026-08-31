"""LLM-based structured resume extraction.

Primary extractor for the brittle experience/education/projects sections.
Routed through the orchestrator (RULES.md §1 — feature modules must not import
OpenRouter directly). Falls back to the improved regex parser in
`resume_parser.py` whenever the LLM is unavailable or fails, so resume upload
never hard-fails. Skill extraction remains regex-based (proven reliable).
"""

import json
from dataclasses import asdict
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.ai.orchestrator import orchestrator
from backend.config import get_settings
from backend.models.llm_usage import LLMUsageLog
from backend.services.resume_parser import (
    ParsedResume,
    parse_resume,
    _extract_skills,
    _extract_text_from_pdf,
    _extract_text_from_docx,
    _extract_text_from_txt,
)

settings = get_settings()

_EXTRACTION_PROMPT = """You are a resume parser. Extract structured data from the resume text below.

Return ONLY valid JSON with this exact shape (no markdown, no commentary):
{
  "experience": [{"title": "", "company": "", "duration": "", "description": ""}],
  "education": [{"degree": "", "institution": "", "year": ""}],
  "projects": [{"name": "", "description": "", "technologies": []}]
}

Rules:
- "experience": one entry per role. Put ALL bullet points and prose describing that role into "description" (combined into one string).
- "education": one entry per degree, with institution and year where present.
- "projects": one entry per project; put tech keywords into "technologies".
- Use empty strings/arrays where a field is absent. Do NOT invent data.
- Preserve the original names, companies, and dates exactly as written.

RESUME TEXT:
<<<RESUME>>>
"""


def _extract_text(filename: str, content: bytes) -> str:
    """Delegates text extraction to the same helpers as the regex parser."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "pdf":
        return _extract_text_from_pdf(content)
    if ext in ("docx", "doc"):
        return _extract_text_from_docx(content)
    if ext == "txt":
        return _extract_text_from_txt(content)
    raise ValueError(f"Unsupported file format: {ext}. Use PDF, DOCX, or TXT.")


def _parse_llm_json(raw: str) -> dict | None:
    """Parse and normalize the LLM's JSON, tolerating markdown fences."""
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:].lstrip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # Try to extract the first {...} block as a last resort.
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        try:
            data = json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None

    if not isinstance(data, dict):
        return None

    def _norm_list(key: str, fields: tuple) -> list[dict]:
        raw_list = data.get(key) or []
        out = []
        if isinstance(raw_list, list):
            for item in raw_list:
                if not isinstance(item, dict):
                    continue
                record = {}
                for f in fields:
                    v = item.get(f, "") or ""
                    # technologies is a list of strings, not a scalar.
                    if f == "technologies":
                        record[f] = [t for t in v if isinstance(t, str)] if isinstance(v, list) else []
                    else:
                        record[f] = str(v)
                out.append(record)
        return out

    return {
        "experience": _norm_list("experience", ("title", "company", "duration", "description")),
        "education": _norm_list("education", ("degree", "institution", "year")),
        "projects": _norm_list("projects", ("name", "description", "technologies")),
    }


async def _log_usage(db: AsyncSession, user_id: str, rows: list[LLMUsageLog]) -> None:
    """Persist llm_usage_log rows (Phase 6 requires this for every feature)."""
    if not rows:
        return
    db.add_all(rows)
    await db.commit()


async def parse_resume_with_ai(
    filename: str,
    content: bytes,
    user_id: str,
    db: AsyncSession | None = None,
) -> ParsedResume:
    """Parse a resume, preferring LLM extraction, falling back to regex.

    Returns a `ParsedResume`. Skills are always taken from the regex extractor
    (reliable); experience/education/projects prefer the LLM when it succeeds.
    When the LLM is unavailable, fails, or returns unusable JSON, the improved
    regex parser (`parse_resume`) is used so uploads never fail.
    """
    text = _extract_text(filename, content)
    if not text.strip():
        raise ValueError(
            "Could not extract text from the file. It may be corrupted, "
            "password-protected, or image-based."
        )

    # Baseline skills (regex — reliable).
    skills = _extract_skills(text)

    # ---- LLM path (primary) ----
    if settings.openrouter_api_key:
        try:
            resp = await orchestrator.call_llm(
                feature="resume_parsing",
                prompt=_EXTRACTION_PROMPT.replace("<<<RESUME>>>", text),
                user_id=user_id,
            )
            structured = _parse_llm_json(resp.content)
            if structured is not None and (
                structured["experience"] or structured["education"] or structured["projects"]
            ):
                if db is not None:
                    await _log_usage(
                        db,
                        user_id,
                        [
                            LLMUsageLog(
                                user_id=user_id,
                                feature="resume_parsing",
                                model=resp.model,
                                tokens_in=resp.tokens_in,
                                tokens_out=resp.tokens_out,
                                cost_usd=resp.cost_usd,
                            )
                        ],
                    )
                return ParsedResume(
                    skills=skills,
                    experience=structured["experience"],
                    education=structured["education"],
                    projects=structured["projects"],
                    raw_text=text,
                )
        except Exception:
            # LLM unavailable/failed -> fall through to regex.
            pass

    # ---- Regex fallback ----
    fallback = parse_resume(filename, content)
    return ParsedResume(
        skills=skills or fallback.skills,
        experience=fallback.experience,
        education=fallback.education,
        projects=fallback.projects,
        raw_text=fallback.raw_text,
    )
