import pytest
from backend.services.profile_merge import compute_merge


def _sources(merged):
    """Extract {skill_name_lower: source} from the merged profile."""
    return {s.name.lower(): s.source for s in merged.skills}


def test_merge_github_highest_priority():
    """Test GitHub skills have highest priority."""
    resume_data = {"skills": ["Python", "JavaScript"]}
    github_data = {"languages": {"Python": 50000, "Go": 30000}}
    linkedin_data = {"skills": ["Python", "Java"]}

    result = compute_merge(github_data, resume_data, linkedin_data)

    sources = _sources(result)
    assert sources.get("python") == "github"
    assert sources.get("go") == "github"
    assert sources.get("javascript") == "resume"


def test_merge_resume_over_linkedin():
    """Test resume skills have priority over LinkedIn."""
    resume_data = {"skills": ["Python", "React"]}
    github_data = None
    linkedin_data = {"skills": ["Python", "Java"]}

    result = compute_merge(github_data, resume_data, linkedin_data)

    sources = _sources(result)
    assert sources.get("python") == "resume"
    assert sources.get("react") == "resume"
    assert sources.get("java") == "linkedin"


def test_merge_detects_conflicts():
    """Test conflict detection between sources."""
    resume_data = {"skills": ["Python"]}
    github_data = {"languages": {"Go": 10000, "Rust": 5000}}

    result = compute_merge(github_data, resume_data, None)

    conflict_skills = {c.skill.lower() for c in result.conflicts}
    assert "go" in conflict_skills
    assert "rust" in conflict_skills


def test_merge_empty_sources():
    """Test merge with no data sources."""
    result = compute_merge(None, None, None)
    assert result.skills == []
    assert result.conflicts == []
    assert result.projects == []
