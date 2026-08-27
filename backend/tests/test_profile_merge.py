import pytest
from backend.services.profile_merge import compute_merge, _merge_skills, _detect_conflicts


def test_merge_skills_github_priority():
    github_skills = {"Python": 1000, "JavaScript": 500}
    resume_skills = ["Python", "React", "Node.js"]
    linkedin_skills = ["Python", "Java", "C++"]

    skills, conflicts = _merge_skills(github_skills, resume_skills, linkedin_skills)

    # Python should have high confidence (in all three)
    python_skill = next(s for s in skills if s.name == "python")
    assert python_skill.confidence == "high"
    assert python_skill.source == "github"

    # JavaScript should have high confidence (in GitHub and resume)
    js_skill = next(s for s in skills if s.name == "javascript")
    assert js_skill.confidence == "high"

    # React should have medium confidence (resume only)
    react_skill = next(s for s in skills if s.name == "react")
    assert react_skill.confidence == "medium"
    assert react_skill.source == "resume"

    # Java should have low confidence (LinkedIn only)
    java_skill = next(s for s in skills if s.name == "java")
    assert java_skill.confidence == "low"
    assert java_skill.source == "linkedin"


def test_merge_skills_conflicts():
    github_skills = {"Python": 1000}
    resume_skills = ["JavaScript"]
    linkedin_skills = ["Python"]

    skills, conflicts = _merge_skills(github_skills, resume_skills, linkedin_skills)

    # Should have a conflict for Python (GitHub vs LinkedIn)
    python_conflicts = [c for c in conflicts if c.skill == "python"]
    assert len(python_conflicts) == 1
    assert python_conflicts[0].github_signal == "Used in code"
    assert python_conflicts[0].linkedin_signal == "Listed on profile"


def test_detect_conflicts():
    github_data = {"languages": {"Python": 1000, "JavaScript": 500}}
    resume_data = {"skills": ["Python", "React"]}
    linkedin_data = {"skills": ["Python", "Java"]}

    conflicts = _detect_conflicts(github_data, resume_data, linkedin_data)

    # JavaScript: in GitHub but not in resume
    js_conflicts = [c for c in conflicts if c.skill == "javascript"]
    assert len(js_conflicts) == 1
    assert js_conflicts[0].github_signal == "Used in code"
    assert js_conflicts[0].resume_signal == "Not mentioned"

    # React: in resume but not in GitHub
    react_conflicts = [c for c in conflicts if c.skill == "react"]
    assert len(react_conflicts) == 1
    assert react_conflicts[0].resume_signal == "Listed on resume"

    # Java: only in LinkedIn
    java_conflicts = [c for c in conflicts if c.skill == "java"]
    assert len(java_conflicts) == 1
    assert java_conflicts[0].linkedin_signal == "Listed on LinkedIn"


def test_compute_merge_full():
    github_data = {
        "languages": {"Python": 1000, "JavaScript": 500},
        "repos": [{"name": "project1", "language": "Python"}],
    }
    resume_data = {
        "skills": ["Python", "React"],
        "experience": [{"title": "Software Engineer"}],
        "education": [{"degree": "BS CS"}],
        "projects": [{"name": "resume-project"}],
    }
    linkedin_data = {
        "skills": ["Python", "Java"],
        "experience": [{"title": "Developer"}],
    }

    merged = compute_merge(github_data, resume_data, linkedin_data)

    # Should have skills from all sources
    skill_names = [s.name for s in merged.skills]
    assert "python" in skill_names
    assert "javascript" in skill_names
    assert "react" in skill_names
    assert "java" in skill_names

    # Experience from resume
    assert len(merged.experience) >= 1
    assert merged.experience[0]["title"] == "Software Engineer"

    # Education from resume
    assert len(merged.education) >= 1

    # Projects should include both resume and GitHub repos
    project_names = [p.get("name") for p in merged.projects]
    assert "resume-project" in project_names
    assert "project1" in project_names


def test_compute_merge_empty():
    merged = compute_merge(None, None, None)
    assert merged.skills == []
    assert merged.experience == []
    assert merged.education == []
    assert merged.projects == []
