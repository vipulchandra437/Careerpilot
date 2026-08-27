from dataclasses import dataclass, field


@dataclass
class Skill:
    name: str
    source: str  # "github", "resume", "linkedin"
    confidence: str  # "high", "medium", "low"


@dataclass
class Conflict:
    skill: str
    github_signal: str | None = None
    resume_signal: str | None = None
    linkedin_signal: str | None = None
    resolution: str = ""


@dataclass
class MergedProfile:
    skills: list[Skill] = field(default_factory=list)
    experience: list[dict] = field(default_factory=list)
    education: list[dict] = field(default_factory=list)
    projects: list[dict] = field(default_factory=list)
    languages_used: dict = field(default_factory=dict)
    conflicts: list[Conflict] = field(default_factory=list)


def _merge_skills(
    github_skills: dict,
    resume_skills: list[str],
    linkedin_skills: list[str],
) -> tuple[list[Skill], list[Conflict]]:
    """Merge skills from all sources with priority: GitHub > resume > LinkedIn."""
    merged = {}
    conflicts = []

    # GitHub languages (highest confidence - actual code activity)
    for lang, bytes_count in github_skills.items():
        normalized = lang.lower().strip()
        merged[normalized] = Skill(name=normalized, source="github", confidence="high")

    # Resume skills (medium confidence - claimed but verified by document)
    for skill in resume_skills:
        normalized = skill.lower().strip()
        if normalized in merged:
            # Skill exists in both GitHub and resume - no conflict, higher confidence
            merged[normalized].confidence = "high"
        else:
            merged[normalized] = Skill(name=normalized, source="resume", confidence="medium")

    # LinkedIn skills (lowest confidence - self-reported)
    for skill in linkedin_skills:
        normalized = skill.lower().strip()
        if normalized in merged:
            # Already have higher confidence source
            if merged[normalized].source == "github":
                conflicts.append(Conflict(
                    skill=normalized,
                    github_signal="Used in code",
                    linkedin_signal="Listed on profile",
                    resolution="GitHub activity takes priority",
                ))
        else:
            merged[normalized] = Skill(name=normalized, source="linkedin", confidence="low")

    return list(merged.values()), conflicts


def _detect_conflicts(
    github_data: dict | None,
    resume_data: dict | None,
    linkedin_data: dict | None,
) -> list[Conflict]:
    """Detect conflicts between data sources."""
    conflicts = []

    github_skills = {s.lower() for s in github_data.get("languages", {}).keys()} if github_data else set()
    resume_skills = {s.lower() for s in resume_data.get("skills", [])} if resume_data else set()
    linkedin_skills = {s.lower() for s in linkedin_data.get("skills", [])} if linkedin_data else set()

    # Skills in GitHub but not in resume
    for skill in github_skills - resume_skills:
        conflicts.append(Conflict(
            skill=skill,
            github_signal="Used in code",
            resume_signal="Not mentioned",
            resolution="GitHub activity indicates real usage",
        ))

    # Skills in resume but not in GitHub
    for skill in resume_skills - github_skills:
        conflicts.append(Conflict(
            skill=skill,
            resume_signal="Listed on resume",
            github_signal="No code activity",
            resolution="May need verification through practice",
        ))

    # Skills only on LinkedIn
    for skill in linkedin_skills - github_skills - resume_skills:
        conflicts.append(Conflict(
            skill=skill,
            linkedin_signal="Listed on LinkedIn",
            github_signal="No code activity",
            resume_signal="Not mentioned",
            resolution="Lowest confidence - may need verification",
        ))

    return conflicts


def compute_merge(
    github_data: dict | None,
    resume_data: dict | None,
    linkedin_data: dict | None,
) -> MergedProfile:
    """Merge data from all sources. Priority: GitHub activity > resume > LinkedIn tags."""
    github_skills = github_data.get("languages", {}) if github_data else {}
    resume_skills = resume_data.get("skills", []) if resume_data else []
    linkedin_skills = linkedin_data.get("skills", []) if linkedin_data else []

    skills, skill_conflicts = _merge_skills(github_skills, resume_skills, linkedin_skills)
    source_conflicts = _detect_conflicts(github_data, resume_data, linkedin_data)

    # Merge experience from resume (primary source)
    experience = resume_data.get("experience", []) if resume_data else []

    # Merge education from resume (primary source)
    education = resume_data.get("education", []) if resume_data else []

    # Merge projects from resume
    projects = resume_data.get("projects", []) if resume_data else []

    # Add GitHub repos as projects
    if github_data and github_data.get("repos"):
        for repo in github_data["repos"][:5]:  # Top 5 repos
            projects.append({
                "name": repo.get("name", ""),
                "description": repo.get("description", ""),
                "technologies": [repo.get("language")] if repo.get("language") else [],
                "source": "github",
            })

    return MergedProfile(
        skills=skills,
        experience=experience,
        education=education,
        projects=projects,
        languages_used=github_data.get("languages", {}) if github_data else {},
        conflicts=skill_conflicts + source_conflicts,
    )
