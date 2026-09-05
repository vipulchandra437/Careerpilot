import pytest
import json
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

from backend.services.resume_ai import (
    _parse_llm_json,
    parse_resume_with_ai,
    _EXTRACTION_PROMPT,
)
from backend.ai.orchestrator import LLMResponse

_FIXTURES = Path(__file__).resolve().parents[2] / "tests" / "fixtures"
_CLEAN = (_FIXTURES / "resume_clean.txt").read_bytes()
_TABULAR = (_FIXTURES / "resume_tabular.txt").read_bytes()


def _dummy_resp(content: str):
    return LLMResponse(content=content, model="openai/gpt-4o-mini", tokens_in=10, tokens_out=20, cost_usd=0.0)


class TestParseLlmJson:
    def test_plain_json(self):
        raw = json.dumps(
            {
                "experience": [{"title": "SE", "company": "Acme", "duration": "2020-2023", "description": "did things"}],
                "education": [{"degree": "BS", "institution": "U", "year": "2019"}],
                "projects": [{"name": "P", "description": "d", "technologies": ["python"]}],
            }
        )
        parsed = _parse_llm_json(raw)
        assert parsed["experience"][0]["company"] == "Acme"
        assert parsed["education"][0]["institution"] == "U"
        assert parsed["projects"][0]["technologies"] == ["python"]

    def test_markdown_fenced_json(self):
        raw = "```json\n{\"experience\": [{\"title\": \"T\"}]}\n```"
        parsed = _parse_llm_json(raw)
        assert parsed["experience"][0]["title"] == "T"

    def test_garbage_returns_none(self):
        assert _parse_llm_json("not json at all") is None

    def test_missing_keys_default_to_empty(self):
        parsed = _parse_llm_json('{"experience": "notalist"}')
        assert parsed["experience"] == []


class TestParseResumeWithAI:
    async def _run(self, llm_content=None, fail=False, filename="resume.txt", content=_CLEAN):
        with patch("backend.services.resume_ai.orchestrator") as mock_orch:
            if fail:
                mock_orch.call_llm = AsyncMock(side_effect=RuntimeError("LLM down"))
            else:
                mock_orch.call_llm = AsyncMock(return_value=_dummy_resp(llm_content or "{}"))
            db = AsyncMock()
            db.add_all = Mock()
            return await parse_resume_with_ai(filename, content, "user-1", db), mock_orch

    @pytest.mark.asyncio
    async def test_llm_path_used_when_successful(self):
        good_json = json.dumps(
            {
                "experience": [{"title": "Senior SE", "company": "Google", "duration": "Jan 2022 - Present", "description": "Led data pipeline"}],
                "education": [{"degree": "BS CS", "institution": "Stanford", "year": "2017"}],
                "projects": [{"name": "CLI tool", "description": "migrations", "technologies": ["Python"]}],
            }
        )
        result, mock_orch = await self._run(llm_content=good_json)
        assert mock_orch.call_llm.await_count >= 1
        # LLM output should win (not regex).
        assert result.experience[0]["company"] == "Google"
        assert result.experience[0]["description"] == "Led data pipeline"
        assert result.projects[0]["technologies"] == ["Python"]
        # Skills still come from regex extractor.
        assert "python" in result.skills

    @pytest.mark.asyncio
    async def test_llm_usage_logged_on_success(self):
        good_json = json.dumps({"experience": [{"title": "T", "company": "C", "duration": "x", "description": "d"}]})
        with patch("backend.services.resume_ai.orchestrator") as mock_orch:
            mock_orch.call_llm = AsyncMock(return_value=_dummy_resp(good_json))
            db = AsyncMock()
            db.add_all = Mock()
            await parse_resume_with_ai("resume.txt", _CLEAN, "user-1", db)
            db.add_all.assert_called_once()
            db.commit.assert_awaited()

    @pytest.mark.asyncio
    async def test_falls_back_to_regex_when_llm_fails(self):
        result, _ = await self._run(fail=True)
        # Regex fallback still yields something (best effort), never raises.
        assert isinstance(result.experience, list)

    @pytest.mark.asyncio
    async def test_regex_fallback_when_llm_returns_empty(self):
        # LLM returns structured-but-empty -> fall back to regex (never crash).
        result, _ = await self._run(llm_content="{}", content=_TABULAR)
        assert result.raw_text  # text extracted
        assert isinstance(result.experience, list) and isinstance(result.education, list)

    @pytest.mark.asyncio
    async def test_skips_llm_when_no_api_key(self):
        # When no API key is configured, call_llm must NOT be invoked; regex is used.
        with patch("backend.services.resume_ai.settings") as mock_settings:
            mock_settings.openrouter_api_key = ""
            with patch("backend.services.resume_ai.orchestrator") as mock_orch:
                mock_orch.call_llm = AsyncMock()
                db = AsyncMock()
                db.add_all = Mock()
                result = await parse_resume_with_ai("resume.txt", _TABULAR, "user-1", db)
                mock_orch.call_llm.assert_not_awaited()
                assert result.raw_text


def test_prompt_embeds_resume_text():
    p = _EXTRACTION_PROMPT.replace("<<<RESUME>>>", "MYRESUME")
    assert "MYRESUME" in p
    assert "JSON" in p
