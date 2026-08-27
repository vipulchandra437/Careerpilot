import pytest
from backend.services.profile_analysis import compute_merge


def test_merge_github_highest_priority():
    """Test GitHub skills have highest priority."""
    resume_data = {"skills": ["Python", "JavaScript"]}
    github_data = {"all_languages": {"Python": 50000, "Go": 30000}}
    linkedin_data = {"skills": ["Python", "Java"]}

    result = compute_merge(resume_data, github_data, linkedin_data)

    skill_sources = {s["skill"].lower(): s["source"] for s in result["skills"]}
    assert skill_sources.get("python") == "github"
    assert skill_sources.get("go") == "github"
    assert skill_sources.get("javascript") == "resume"


def test_merge_resume_over_linkedin():
    """Test resume skills have priority over LinkedIn."""
    resume_data = {"skills": ["Python", "React"]}
    github_data = None
    linkedin_data = {"skills": ["Python", "Java"]}

    result = compute_merge(resume_data, github_data, linkedin_data)

    skill_sources = {s["skill"].lower(): s["source"] for s in result["skills"]}
    assert skill_sources.get("python") == "resume"
    assert skill_sources.get("react") == "resume"
    assert skill_sources.get("java") == "linkedin"


def test_merge_detects_conflicts():
    """Test conflict detection between sources."""
    resume_data = {"skills": ["Python"]}
    github_data = {"all_languages": {"Go": 10000, "Rust": 5000}}

    result = compute_merge(resume_data, github_data, None)

    conflicts = result["conflicts"]
    assert any(c["skill"] == "go" for c in conflicts)
    assert any(c["skill"] == "rust" for c in conflicts)


def test_merge_empty_sources():
    """Test merge with no data sources."""
    result = compute_merge(None, None, None)
    assert result["skills"] == []
    assert result["conflicts"] == []
    assert result["sources_available"] == []
