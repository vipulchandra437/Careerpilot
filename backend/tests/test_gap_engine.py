import pytest
from unittest.mock import AsyncMock, Mock, patch
from types import SimpleNamespace

from backend.services.profile_merge import MergedProfile, Skill
from backend.services.gap_engine import (
    deterministic_pass,
    merge_passes,
    _parse_llm_json,
    build_gap_prompt,
    run_gap_analysis,
)
from backend.ai.orchestrator import LLMResponse

REQUIRED = [
    {"skill": "python", "weight": 1.0, "min_depth": "working"},
    {"skill": "sql", "weight": 1.0, "min_depth": "working"},
    {"skill": "rest api", "weight": 0.8, "min_depth": "working"},
    {"skill": "docker", "weight": 0.5, "min_depth": "basic"},
]


def _profile(skills: list[Skill] | None = None, languages: dict | None = None, projects=None):
    if skills is None:
        skills = [Skill(name="python", source="resume", confidence="medium")]
    return MergedProfile(
        skills=skills,
        languages_used=languages or {},
        projects=projects or [],
    )


class TestDeterministicPass:
    def test_missing_skills_flagged(self):
        # Only python present -> sql/rest api/docker are hard misses.
        det = deterministic_pass(_profile(), REQUIRED)
        assert det["python"]["matched"] is True
        assert det["sql"]["matched"] is False
        assert det["rest api"]["matched"] is False
        assert det["docker"]["matched"] is False

    def test_severity_from_weight(self):
        det = deterministic_pass(_profile(), REQUIRED)
        assert det["sql"]["severity"] == "critical"  # weight 1.0
        assert det["rest api"]["severity"] == "important"  # weight 0.8
        assert det["docker"]["severity"] == "nice_to_have"  # weight 0.5

    def test_synonym_matching(self):
        # "js" should satisfy "javascript"-style aliases; here use rest api alias "api".
        merged = _profile(
            skills=[
                Skill(name="api", source="resume", confidence="medium"),
                Skill(name="postgres", source="resume", confidence="medium"),
            ]
        )
        det = deterministic_pass(merged, REQUIRED)
        assert det["rest api"]["matched"] is True
        assert det["sql"]["matched"] is True

    def test_github_languages_count(self):
        # Only JavaScript in GitHub languages; profile has no explicit python skill.
        det = deterministic_pass(_profile(skills=[], languages={"JavaScript": 5000}), REQUIRED)
        assert det["python"]["matched"] is False  # not present
        assert det["rest api"]["matched"] is False

    def test_fulltext_description_counts_as_evidence(self):
        # A required skill that only appears in a project/experience description
        # must be matched (was previously a false "critical" hard miss).
        ml_req = [{"skill": "machine learning", "weight": 1.0, "min_depth": "working"}]
        merged = _profile(
            skills=[],
            projects=[
                {
                    "name": "House-Price-Prediction",
                    "description": "Built a machine learning model to predict house prices",
                    "technologies": ["Python"],
                }
            ],
        )
        det = deterministic_pass(merged, ml_req)
        assert det["machine learning"]["matched"] is True

    def test_fulltext_multi_word_phrase(self):
        ml_req = [{"skill": "machine learning", "weight": 1.0, "min_depth": "working"}]
        merged = _profile(
            skills=[],
            projects=[{"name": "X", "description": "Used deep learning and a neural network", "technologies": []}],
        )
        det = deterministic_pass(merged, ml_req)
        assert det["machine learning"]["matched"] is True

    def test_no_false_short_alias_match(self):
        # The 'ai' alias must not match inside common words.
        req = [{"skill": "machine learning", "weight": 1.0, "min_depth": "working"}]
        merged = _profile(skills=[], projects=[{"name": "Waitlist", "description": "An api client", "technologies": []}])
        det = deterministic_pass(merged, req)
        assert det["machine learning"]["matched"] is False


class TestParseLlmJson:
    def test_plain(self):
        raw = '{"gaps": [{"skill": "sql", "severity": "critical", "reason": "r", "suggested_resource": "s"}]}'
        parsed = _parse_llm_json(raw)
        assert parsed[0]["skill"] == "sql"
        assert parsed[0]["severity"] == "critical"

    def test_markdown_fenced(self):
        raw = "```json\n{\"gaps\": [{\"skill\": \"x\", \"severity\": \"important\"}]}\n```"
        parsed = _parse_llm_json(raw)
        assert parsed[0]["severity"] == "important"

    def test_garbage_returns_none(self):
        assert _parse_llm_json("nope") is None

    def test_unknown_severity_coerced_to_none(self):
        raw = '{"gaps": [{"skill": "y", "severity": "extreme"}]}'
        assert _parse_llm_json(raw)[0]["severity"] == "none"


class TestMergePasses:
    def test_hard_miss_always_survives(self):
        det = deterministic_pass(_profile(), REQUIRED)
        # LLM wrongly claims sql is "none" (cleared) -> must still appear.
        llm = [
            {"skill": "sql", "severity": "none", "reason": "", "suggested_resource": ""},
            {"skill": "python", "severity": "none", "reason": "", "suggested_resource": ""},
        ]
        final = merge_passes(det, llm, "Backend Engineer")
        skills = {g["skill"] for g in final}
        assert "sql" in skills  # hard miss preserved despite LLM "none"
        assert "python" not in skills  # present + LLM none -> not a gap
        sql = next(g for g in final if g["skill"] == "sql")
        assert sql["matched"] is False

    def test_present_skill_surfaces_gap_from_llm_depth(self):
        # python present deterministically, but LLM flags depth below role requirement.
        det = deterministic_pass(_profile(), REQUIRED)
        llm = [{"skill": "python", "severity": "important", "reason": "Only toy scripts", "suggested_resource": "Docs"}]
        final = merge_passes(det, llm, "Backend Engineer")
        py = next(g for g in final if g["skill"] == "python")
        assert py["matched"] is True
        assert py["severity"] == "important"
        # Reason is deterministic from the proven source, NOT the LLM's free-form text
        # (so it can't drift run-to-run or contradict the evidence).
        assert py["reason"].startswith("'python' is listed on your resume")

    def test_present_skill_reason_is_deterministic_not_llm(self):
        # Python is evidenced on LinkedIn -> reason references LinkedIn regardless of
        # what the LLM wrote for the reason. This is the SQL-LinkedIn flakiness fix:
        # the reason must be stable and grounded, never "not evidenced" for an evidenced skill.
        merged = _profile(
            skills=[Skill(name="python", source="linkedin", confidence="low")], languages={"Python": 100}
        )
        det = deterministic_pass(merged, REQUIRED)
        # Both source=linkedin AND github languages are present; the first proven source
        # listed is used for the reason. Deterministic.
        llm = [
            {
                "skill": "python",
                "severity": "critical",
                "reason": "not evidenced in the current profile",
                "suggested_resource": "",
            }
        ]
        final = merge_passes(det, llm, "Backend Engineer")
        py = next(g for g in final if g["skill"] == "python")
        assert py["severity"] == "critical"  # severity still comes from LLM depth judgment
        assert "not evidenced" not in py["reason"]  # grounded, deterministic
        assert "python" in py["reason"]
        assert "LinkedIn" in py["reason"]  # references the actual proven source

    def test_no_llm_falls_back_to_deterministic(self):
        final = merge_passes(deterministic_pass(_profile(), REQUIRED), None, "Backend Engineer")
        skills = {g["skill"] for g in final}
        assert skills == {"sql", "rest api", "docker"}
        # Python present -> absent from gap list.
        assert "python" not in skills

    def test_hard_miss_survives_even_with_llm_none(self):
        # Strict merge rule: a deterministic hard miss stays a gap even if the LLM says
        # "none" (LLM may refine severity/reason, never clear). Errs toward surfacing
        # genuine absences rather than letting the LLM silently drop a required skill.
        det = deterministic_pass(_profile(), REQUIRED)  # sql/rest api/docker hard misses
        llm = [
            {"skill": "sql", "severity": "none", "reason": "Uses PostgreSQL daily", "suggested_resource": ""},
            {"skill": "docker", "severity": "none", "reason": "not evidenced", "suggested_resource": ""},
        ]
        final = merge_passes(det, llm, "Backend Engineer")
        skills = {g["skill"] for g in final}
        assert "sql" in skills
        assert "docker" in skills
        # If the LLM is silent on a hard-missed skill, it still surfaces with the
        # deterministic severity.
        sql = next(g for g in final if g["skill"] == "sql")
        assert sql["severity"] == "critical"  # LLM said "none" -> deterministic severity used

    def test_github_evidence_implies_git(self):
        # A profile with GitHub-sourced skills / languages counts as git evidence.
        merged = _profile(skills=[Skill(name="python", source="github", confidence="high")], languages={"Python": 100})
        req = [{"skill": "git", "weight": 0.8, "min_depth": "basic"}]
        det = deterministic_pass(merged, req)
        assert det["git"]["matched"] is True

    def test_sorted_by_severity(self):
        final = merge_passes(deterministic_pass(_profile(), REQUIRED), None, "Backend Engineer")
        sev = [g["severity"] for g in final]
        assert sev == sorted(sev, key=lambda s: {"critical": 3, "important": 2, "nice_to_have": 1}[s], reverse=True)


class TestBuildGapPrompt:
    def test_embeds_role_and_skills(self):
        merged = _profile()
        p = build_gap_prompt("Backend Engineer", REQUIRED, merged)
        assert "Backend Engineer" in p
        assert "python" in p
        assert "profile evidence" in p.lower()

    def test_handles_none_github_project_fields(self):
        # GitHub-sourced projects can have None description/technologies; must not crash.
        merged = _profile(
            skills=[],
            projects=[
                {"name": "Repo A", "description": None, "technologies": None, "source": "github"},
                {"name": "Repo B", "description": "Has desc", "technologies": ["Go"], "source": "github"},
            ],
        )
        p = build_gap_prompt("Backend Engineer", REQUIRED, merged)
        assert "Repo A" in p
        assert "Repo B" in p


class TestRunGapAnalysis:
    @pytest.mark.asyncio
    async def test_llm_path_and_usage_log(self):
        class FakeRole:
            id = "role-1"
            name = "Backend Engineer"
            required_skills = REQUIRED

        def _dummy_resp(content):
            return LLMResponse(content=content, model="openai/gpt-4o-mini", tokens_in=20, tokens_out=30, cost_usd=0.0)

        merged = _profile(languages={"Python": 1000, "JavaScript": 500})
        llm_content = (
            '{"gaps": ['
            '{"skill": "sql", "severity": "important", "reason": "Only toy scripts", "suggested_resource": "Postgres Docs"},'
            '{"skill": "python", "severity": "none", "reason": "", "suggested_resource": ""}'
            "]}"
        )
        db = AsyncMock()
        db.add = Mock()
        with patch("backend.services.gap_engine._upsert_report", new=AsyncMock(side_effect=lambda _db, s, t, g: SimpleNamespace(id="r-1", target_role_id=t, gaps=g))):
            with patch("backend.services.gap_engine.orchestrator") as mock_orch:
                mock_orch.call_llm = AsyncMock(return_value=_dummy_resp(llm_content))
                report = await run_gap_analysis(db, "snap-1", FakeRole(), merged, "user-1")

        assert mock_orch.call_llm.await_count == 1
        assert mock_orch.call_llm.await_args.kwargs["feature"] == "gap_analysis"
        assert mock_orch.call_llm.await_args.kwargs["user_id"] == "user-1"
        assert "python" in mock_orch.call_llm.await_args.kwargs["prompt"]
        # Data written: db.add called for report and usage row.
        assert db.add.called
        assert db.commit.await_count >= 1
        # Hard miss sql preserved; python present + LLM none -> not a gap.
        skills = {g["skill"] for g in report.gaps}
        assert "sql" in skills
        assert "python" not in skills
        sql = next(g for g in report.gaps if g["skill"] == "sql")
        assert sql["reason"] == "Only toy scripts"

    @pytest.mark.asyncio
    async def test_deterministic_when_llm_fails(self):
        class FakeRole:
            id = "role-1"
            name = "Backend Engineer"
            required_skills = REQUIRED

        merged = _profile()
        db = AsyncMock()
        with patch("backend.services.gap_engine._upsert_report", new=AsyncMock(side_effect=lambda _db, s, t, g: SimpleNamespace(id="r-1", target_role_id=t, gaps=g))):
            with patch("backend.services.gap_engine.orchestrator") as mock_orch:
                mock_orch.call_llm = AsyncMock(side_effect=RuntimeError("LLM down"))
                report = await run_gap_analysis(db, "snap-1", FakeRole(), merged, "user-1")

        skills = {g["skill"] for g in report.gaps}
        assert "sql" in skills
        # No usage row when LLM failed.
        assert not any(isinstance(a.args[0], object) for a in db.add.call_args_list)

    @pytest.mark.asyncio
    async def test_skips_llm_when_no_api_key(self):
        class FakeRole:
            id = "role-1"
            name = "Backend Engineer"
            required_skills = REQUIRED

        merged = _profile()
        db = AsyncMock()
        with patch("backend.services.gap_engine._upsert_report", new=AsyncMock(side_effect=lambda _db, s, t, g: SimpleNamespace(id="r-1", target_role_id=t, gaps=g))):
            with patch("backend.services.gap_engine.settings") as mock_settings:
                mock_settings.openrouter_api_key = ""
                with patch("backend.services.gap_engine.orchestrator") as mock_orch:
                    mock_orch.call_llm = AsyncMock()
                    report = await run_gap_analysis(db, "snap-1", FakeRole(), merged, "user-1")

        mock_orch.call_llm.assert_not_awaited()
        assert any(g["skill"] == "sql" for g in report.gaps)


class TestEvalSetBeyondSql:
    """RULES.md §4 eval set — gap analysis beyond the single-skill SQL case.

    Mixed-evidence, non-fabrication across multiple skills. Deterministic guards
    that back the eval-set entry (the LLM-side stability check is run live).
    """

    MIXED_REQUIRED = [
        {"skill": "python", "weight": 1.0, "min_depth": "working"},
        {"skill": "docker", "weight": 0.8, "min_depth": "basic"},
        {"skill": "kubernetes", "weight": 0.6, "min_depth": "basic"},
        {"skill": "aws", "weight": 0.7, "min_depth": "basic"},
    ]

    def _mixed_profile(self):
        # python: bare resume tag. docker: project the demonstrably USES it.
        # kubernetes: only a GitHub language, no explicit bullet. aws: NO evidence.
        return MergedProfile(
            skills=[Skill(name="python", source="resume", confidence="medium")],
            languages_used={"Kubernetes": 8000},
            projects=[
                {
                    "name": "K8s-Deployer",
                    "description": "Wrote Dockerfiles and deployed the service to a Kubernetes cluster",
                    "technologies": ["Docker", "Kubernetes"],
                }
            ],
        )

    def test_absent_skill_fallback_is_grounded_when_llm_silent(self):
        # aws has NO evidence. When the LLM is silent on it, the deterministic
        # fallback must never fabricate a source — it says "no evidence".
        det = deterministic_pass(self._mixed_profile(), self.MIXED_REQUIRED)
        llm = [
            {"skill": "python", "severity": "important", "reason": "", "suggested_resource": ""},
        ]  # note: no aws entry -> deterministic fallback reason
        final = merge_passes(det, llm, "Backend Engineer")
        aws = next(g for g in final if g["skill"] == "aws")
        assert aws["matched"] is False
        assert "no evidence" in aws["reason"].lower()  # grounded, never invented
        assert "resume" not in aws["reason"].lower()

    def test_absent_skill_reason_respects_llm_but_merge_never_clears(self):
        # For an ABSENT skill the merge uses the LLM's reason if given (subject to the
        # prompt's CORRECTNESS-FIRST rule), but the skill itself is never cleared/dropped.
        det = deterministic_pass(self._mixed_profile(), self.MIXED_REQUIRED)
        llm = [
            {"skill": "aws", "severity": "critical",
             "reason": "No cloud experience evidenced",
             "suggested_resource": ""},
        ]
        final = merge_passes(det, llm, "Backend Engineer")
        aws = next(g for g in final if g["skill"] == "aws")
        assert aws["matched"] is False
        # The hard-miss skills is never dropped even if the LLM had said none.
        assert any(g["skill"] == "aws" for g in final)

    def test_deep_project_evidence_matches_not_bare_tag(self):
        # docker is evidenced by a project that demonstrably uses it -> matched.
        # aws is not -> hard miss.
        det = deterministic_pass(self._mixed_profile(), self.MIXED_REQUIRED)
        assert det["docker"]["matched"] is True      # project tech + prose
        assert det["aws"]["matched"] is False        # no evidence anywhere
        assert det["kubernetes"]["matched"] is True  # github language + project prose

    def test_present_skill_reason_is_grounded_to_project_source(self):
        det = deterministic_pass(self._mixed_profile(), self.MIXED_REQUIRED)
        llm = [
            {"skill": "docker", "severity": "important",
             "reason": "not evidenced in the current profile",  # false; it IS evidenced
             "suggested_resource": "Docker docs"},
        ]
        final = merge_passes(det, llm, "Backend Engineer")
        docker = next(g for g in final if g["skill"] == "docker")
        # Reason grounded & deterministic; never claims "not evidenced" for an evidenced skill.
        assert "not evidenced" not in docker["reason"]
        assert docker["matched"] is True

    def test_kubernetes_github_language_reason_attributes_github(self):
        det = deterministic_pass(self._mixed_profile(), self.MIXED_REQUIRED)
        llm = [{"skill": "kubernetes", "severity": "important",
                "reason": "", "suggested_resource": "K8s docs"}]
        final = merge_passes(det, llm, "Backend Engineer")
        k8s = next(g for g in final if g["skill"] == "kubernetes")
        assert k8s["matched"] is True
        # Deterministic reason references the actual proven source (project uses it).
        assert k8s["reason"]
