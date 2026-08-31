import re
import json
import csv
import io
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


_KEYVALUE_KEYS = {
    "name", "full name", "headline", "title", "role", "about", "summary",
    "bio", "skills", "competencies", "expertise", "experience", "work history",
    "positions", "education", "academic",
}


def _csv_rows(content: str) -> list[list[str]]:
    """Parse CSV content into rows (robust to quoted fields/multiline cells)."""
    return [r for r in csv.reader(io.StringIO(content)) if r and any(c.strip() for c in r)]


def _is_keyvalue_dump(rows: list[list[str]]) -> bool:
    """A key/value profile dump repeats label keys in the first column
    (Name/Headline/Skills/Experience/...). A columnar export file carries data
    in the first column (skill names, company names, ...). Treat as key/value
    when the majority of data rows start with a known label key."""
    if not rows or not rows[0]:
        return True
    data_rows = [r for r in rows[1:] if len(r) >= 2]
    if not data_rows:
        return (rows[0][0] or "").strip().lower() in _KEYVALUE_KEYS
    hits = sum(1 for r in data_rows if (r[0] or "").strip().lower() in _KEYVALUE_KEYS)
    return hits / len(data_rows) >= 0.5


def _parse_keyvalue_dump(rows: list[list[str]]) -> LinkedInProfile:
    """Parse a hand-pasted 'Key,Value' profile dump (e.g.
    'Name,John Doe' / 'Skills,Python' / 'Experience,...')."""
    profile = LinkedInProfile()
    sections: dict[str, list[str]] = {}
    for row in rows:
        if not row or len(row) < 2:
            continue
        key = (row[0] or "").strip().lower()
        value = (row[1] or "").strip()
        if not value:
            continue
        sections.setdefault(key, []).append(value)

    profile.name = sections.get("name", sections.get("full name", [""]))[0]
    profile.headline = sections.get("headline", sections.get("title", sections.get("role", [""])))[0]
    profile.summary = sections.get("summary", sections.get("about", sections.get("bio", [""])))[0]

    skills: list[str] = []
    for val in sections.get("skills", sections.get("competencies", sections.get("expertise", []))):
        for piece in re.split(r"[,•;|]", val):
            piece = piece.strip()
            if piece and piece not in skills:
                skills.append(piece)
    profile.skills = skills

    profile.experience = [
        {"title": v} for v in sections.get("experience", sections.get("work history", sections.get("positions", [])))
    ]
    profile.education = [
        {"degree": v} for v in sections.get("education", sections.get("academic", []))
    ]
    return profile


def _parse_columnar(rows: list[list[str]]) -> LinkedInProfile:
    """Parse real LinkedIn data-export CSV files:
    Skills.csv (`Name,Endorsements` + rows), Positions.csv
    (`Title,Company Name,...`), Education.csv (`School Name,Degree,...`)."""
    profile = LinkedInProfile()
    header = [(c or "").strip().lower() for c in rows[0]]
    body = rows[1:]

    def col(*needles, fallback=0):
        for i, h in enumerate(header):
            if any(n in h for n in needles):
                return i
        return fallback

    # Skills.csv: a skill-name column (often "Name") alongside "Endorsements".
    skill_col = col("skill") or (col("name") if any("endors" in h for h in header) else -1)
    if skill_col >= 0:
        skill_col = col("skill", "name")
        skills: list[str] = []
        for r in body:
            if len(r) > skill_col and (r[skill_col] or "").strip():
                s = r[skill_col].strip()
                if s and s not in skills:
                    skills.append(s)
        profile.skills = skills
        return profile

    # Positions.csv: title/role column + company/organization column.
    title_col = col("title", "position", "role")
    comp_col = col("company", "organization")
    if title_col >= 0 or comp_col >= 0:
        for r in body:
            item: dict[str, str] = {}
            if title_col >= 0 and len(r) > title_col:
                item["title"] = r[title_col].strip()
            if comp_col >= 0 and len(r) > comp_col:
                item["company"] = r[comp_col].strip()
            if item:
                profile.experience.append(item)
        return profile

    # Education.csv: school + degree columns.
    school_col = col("school", "institution", "university")
    degree_col = col("degree", "qualification", "education level")
    if school_col >= 0 or degree_col >= 0:
        for r in body:
            item: dict[str, str] = {}
            if school_col >= 0 and len(r) > school_col:
                item["school"] = r[school_col].strip()
            if degree_col >= 0 and len(r) > degree_col:
                item["degree"] = r[degree_col].strip()
            if item:
                profile.education.append(item)
        return profile

    return profile


def _parse_csv_export(content: str) -> LinkedInProfile:
    """Parse LinkedIn data export CSV format.

    Handles both a hand-pasted 'Key,Value' profile dump and real LinkedIn
    data-export files (Skills.csv / Positions.csv / Education.csv), which are
    columnar with a header row.
    """
    profile = LinkedInProfile(raw_text=content)
    rows = _csv_rows(content)
    if not rows:
        return profile

    if _is_keyvalue_dump(rows):
        return _parse_keyvalue_dump(rows)

    return _parse_columnar(rows)


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
