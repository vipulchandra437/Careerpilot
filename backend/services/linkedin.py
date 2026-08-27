import re
import json
from dataclasses import dataclass, field


@dataclass
class LinkedInProfile:
    name: str = ""
    headline: str = ""
    summary: str = ""
    skills: list[str] = field(default_factory=list)
    experience: list[dict] = field(default_factory=list)
    education: list[dict] = field(default_factory=list)
    raw_text: str = ""


def _parse_csv_export(content: str) -> LinkedInProfile:
    """Parse LinkedIn data export CSV format."""
    profile = LinkedInProfile(raw_text=content)

    lines = content.split("\n")
    current_section = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if "name" in line.lower() and "first" in line.lower():
            profile.name = line
        elif "headline" in line.lower():
            profile.headline = line
        elif "summary" in line.lower():
            profile.summary = line
        elif "skill" in line.lower():
            current_section = "skills"
        elif "experience" in line.lower() or "position" in line.lower():
            current_section = "experience"
        elif "education" in line.lower():
            current_section = "education"
        elif current_section == "skills":
            profile.skills.append(line)
        elif current_section == "experience":
            profile.experience.append({"title": line})
        elif current_section == "education":
            profile.education.append({"degree": line})

    return profile


def _parse_json_export(content: str) -> LinkedInProfile:
    """Parse LinkedIn data export JSON format."""
    try:
        data = json.loads(content)
        profile = LinkedInProfile()

        if "firstName" in data and "lastName" in data:
            profile.name = f"{data['firstName']} {data['lastName']}"
        if "headline" in data:
            profile.headline = data["headline"]
        if "summary" in data:
            profile.summary = data["summary"]
        if "skills" in data:
            profile.skills = [s.get("name", "") for s in data["skills"] if s.get("name")]
        if "positions" in data:
            profile.experience = [
                {"title": p.get("title", ""), "company": p.get("company", {}).get("name", "")}
                for p in data["positions"].get("values", [])
            ]
        if "educations" in data:
            profile.education = [
                {"degree": e.get("degree", ""), "school": e.get("schoolName", "")}
                for e in data["educations"].get("values", [])
            ]

        return profile
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON format for LinkedIn data export")


def _parse_text_paste(content: str) -> LinkedInProfile:
    """Parse LinkedIn profile info pasted as text."""
    profile = LinkedInProfile(raw_text=content)
    lines = content.split("\n")

    current_section = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Handle "Key: Value" format - check if value is non-empty
        key_value_match = re.match(r"^(name|full name|headline|title|role|about|summary|bio|skills?|competencies|expertise|experience|work history|positions|education|academic)\s*:\s*(.+)$", line, re.IGNORECASE)
        if key_value_match:
            key = key_value_match.group(1).lower()
            value = key_value_match.group(2).strip()
            
            if key in ("name", "full name"):
                profile.name = value
                current_section = None
                continue
            elif key in ("headline", "title", "role"):
                profile.headline = value
                current_section = None
                continue
            elif key in ("about", "summary", "bio"):
                profile.summary = value
                current_section = None
                continue
            elif key in ("skills", "competencies", "expertise"):
                # Skills can be comma-separated on same line
                skills = re.split(r"[,•\-]", value)
                profile.skills.extend([s.strip() for s in skills if s.strip()])
                current_section = "skills"
                continue
            elif key in ("experience", "work history", "positions"):
                current_section = "experience"
                continue
            elif key in ("education", "academic"):
                current_section = "education"
                continue

        # Detect section headers (without values) - handle optional colon
        if re.match(r"^(skills?|competencies|expertise)\s*:?\s*$", line, re.IGNORECASE):
            current_section = "skills"
        elif re.match(r"^(experience|work history|positions)\s*:?\s*$", line, re.IGNORECASE):
            current_section = "experience"
        elif re.match(r"^(education|academic)\s*:?\s*$", line, re.IGNORECASE):
            current_section = "education"
        elif current_section == "skills":
            # Split by comma, bullet points, or newlines
            skills = re.split(r"[,•\-]", line)
            profile.skills.extend([s.strip() for s in skills if s.strip()])
        elif current_section == "experience":
            profile.experience.append({"title": line})
        elif current_section == "education":
            profile.education.append({"degree": line})

    return profile


def parse_linkedin_import(content: str, filename: str = "") -> LinkedInProfile:
    """Parse LinkedIn data export (manual upload only - no scraping)."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "json":
        return _parse_json_export(content)
    elif ext == "csv":
        return _parse_csv_export(content)
    else:
        # Try JSON first, then CSV, then plain text
        try:
            return _parse_json_export(content)
        except json.JSONDecodeError:
            pass

        if "," in content[:100]:
            return _parse_csv_export(content)

        return _parse_text_paste(content)


def parse_linkedin_paste(content: str) -> LinkedInProfile:
    """Parse LinkedIn profile info pasted as text. Manual import only - no scraping."""
    return _parse_text_paste(content)
