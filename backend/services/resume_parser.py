import re
import io
from dataclasses import dataclass, field


@dataclass
class ParsedResume:
    skills: list[str] = field(default_factory=list)
    experience: list[dict] = field(default_factory=list)
    education: list[dict] = field(default_factory=list)
    projects: list[dict] = field(default_factory=list)
    raw_text: str = ""


def _extract_text_from_pdf(content: bytes) -> str:
    """Extract text from PDF using PyPDF2."""
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {e}")


def _extract_text_from_docx(content: bytes) -> str:
    """Extract text from DOCX using python-docx."""
    try:
        from docx import Document
        doc = Document(io.BytesIO(content))
        return "\n".join(para.text for para in doc.paragraphs)
    except Exception as e:
        raise ValueError(f"Failed to parse DOCX: {e}")


def _extract_skills(text: str) -> list[str]:
    """Extract skills using keyword matching."""
    common_skills = [
        "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", "ruby", "php",
        "react", "vue", "angular", "node.js", "express", "fastapi", "django", "flask", "spring",
        "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
        "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ci/cd",
        "git", "github", "gitlab", "bitbucket",
        "html", "css", "sass", "tailwind",
        "machine learning", "deep learning", "nlp", "computer vision", "tensorflow", "pytorch",
        "rest api", "graphql", "grpc", "websockets",
        "agile", "scrum", "jira", "confluence",
    ]
    text_lower = text.lower()
    found = [skill for skill in common_skills if skill in text_lower]
    return list(set(found))


_SECTION_HEADER = re.compile(
    r"^(education|skills?|core\s+competenc(?:ies|y)|projects?|certifications?|"
    r"summary|objective|profile|experience|employment\s+history|work\s+(?:history|experience)|"
    r"references?|more|additional\s+skills?)\s*:?\s*$",
    re.IGNORECASE,
)

# Date ranges commonly found in resumes.
_DATE_RANGE = re.compile(
    r"(20\d{2}|19\d{2})\s*(?:-|–|—|to|present|now)\s*(20\d{2}|19\d{2}|present|now)?",
    re.IGNORECASE,
)


def _extract_experience(text: str) -> list[dict]:
    """Best-effort regex fallback for work experience.

    This is NOT the primary extractor (that is LLM-based, see resume_ai.py).
    It is retained so resume uploads still produce structured data when the LLM
    is unavailable. Heuristics only — format variance across real resumes is
    handled far better by the LLM path.
    """
    experience: list[dict] = []
    lines = text.split("\n")

    # Find the experience section start.
    exp_start = None
    for i, line in enumerate(lines):
        s = line.strip()
        if re.match(r"^(work\s+)?(experience|employment\s+history|work\s+history)", s, re.IGNORECASE):
            exp_start = i + 1
            break

    if exp_start is None:
        # Fallback: scan the whole doc for "Title - Company (dates)" style lines.
        return _fallback_experience_from_lines(lines)

    current = None

    for line in lines[exp_start:]:
        s = line.strip()
        if not s:
            continue

        upper = s.upper()

        # Stop at the next major section.
        if _SECTION_HEADER.match(s) and not _looks_like_job_line(s, upper):
            break

        # Bullet / description line -> attach to current job.
        if _is_bullet(s) or _is_description_continuation(s, experience, current, total_lines=len(lines)):
            if current is not None:
                current["description"] = _append(current["description"], _strip_bullet(s))
            continue

        # Looks like a job header (has a date range / season / role markers).
        if _looks_like_job_line(s, upper):
            parsed = _parse_job_header(s)
            if parsed is not None:
                current = {
                    "title": parsed["title"],
                    "company": parsed["company"],
                    "duration": parsed["duration"],
                    "description": "",
                }
                experience.append(current)
                continue

        # Misc line that isn't a header/bullet and we're inside experience:
        # treat as description text for the current role, else a bare entry.
        if current is not None:
            current["description"] = _append(current["description"], s)
        else:
            entry = _parse_job_header(s)
            current = {
                "title": entry["title"] if entry else s,
                "company": entry["company"] if entry else "",
                "duration": entry["duration"] if entry else "",
                "description": "",
            }
            experience.append(current)

    return experience


def _fallback_experience_from_lines(lines: list[str]) -> list[dict]:
    """No explicit EXPERIENCE header found: scan for 'Role - Company (dates)'."""
    out: list[dict] = []
    for line in lines:
        s = line.strip()
        if not s or _SECTION_HEADER.match(s):
            continue
        if _is_bullet(s):
            continue
        parsed = _parse_job_header(s)
        if parsed and _DATE_RANGE.search(s):
            out.append(
                {
                    "title": parsed["title"],
                    "company": parsed["company"],
                    "duration": parsed["duration"],
                    "description": "",
                }
            )
    return out


def _looks_like_job_line(s: str, upper: str) -> bool:
    """A best-effort guess that a line is a job heading rather than prose."""
    if _is_bullet(s):
        return False
    if _DATE_RANGE.search(s):  # contains a year/date range
        return True
    # Contains a known role keyword and a company-ish token.
    if re.search(r"\b(engineer|developer|intern|analyst|manager|architect|"
                 r"consultant|designer|lead|senior|junior|staff|principal)\b", s, re.IGNORECASE):
        return True
    return False


def _parse_job_header(s: str) -> dict | None:
    """Parse a job heading line into {title, company, duration}.

    Accepts many common layouts:
      - "Title | Company | Date"
      - "Title at Company (Date)"
      - "Title - Company - Date"
      - "Role @ Company , Date"
      - "Date | Title @ Company"
      - "Experience: Role at Company (Date)"
      - "google - software engineer thing (2020 to now)"
    """
    line = re.sub(r"^(experience|work)\s*:\s*", "", s, flags=re.IGNORECASE).strip()

    # Split on common separators, keeping the date range attached to duration.
    # Prefer '|' and '@' as strong separators.
    date_match = _DATE_RANGE.search(line)
    duration = date_match.group(0) if date_match else ""

    # Remove the date range text so the remainder is title/company.
    remainder = _DATE_RANGE.sub("", line).strip(" |,•-–—()")

    # company = '@ Company' or trailing 'Company' segment / 'at Company'
    company = ""
    at_company = re.search(r"(?:@|at)\s+([A-Za-z0-9 _.\-&'+]+)", remainder, re.IGNORECASE)
    if at_company:
        company = at_company.group(1).strip()
        title = remainder[: at_company.start()].strip(" |,•-–—")
        title = re.sub(r"[-–—|]\s*$", "", title).strip()
    else:
        # Try splitting by '|' or ' - ' into [role, company, ...]
        parts = re.split(r"\s*\|\s*", remainder)
        if len(parts) >= 2 and len(parts[0]) <= 5:
            # e.g. "2021–Present | Senior Engineer @ Finly"
            title = parts[1].strip()
            company = "@".join(parts[1:]) 
            cm = re.search(r"@\s*(.+)$", title, re.IGNORECASE)
            if cm:
                company = cm.group(1).strip()
                title = title[: cm.start()].strip(" |@")
        else:
            seg = re.split(r"\s+[-–—]\s+", remainder)
            if len(seg) >= 2:
                title = seg[0].strip()
                company = " - ".join(seg[1:]).strip()
            else:
                title = remainder.strip()

    if not title:
        return None
    return {"title": title, "company": company or "", "duration": duration}


def _is_bullet(s: str) -> bool:
    return bool(re.match(r"^\s*([-•*·◦▪])", s))


def _strip_bullet(s: str) -> str:
    return re.sub(r"^\s*([-•*·◦▪])\s*", "", s).strip()


def _is_description_continuation(
    s: str, experience: list[dict], current: dict | None, total_lines: int
) -> bool:
    """Heuristic: short lines or lines without role markers inside an
    established job block are descriptions."""
    return current is not None


def _append(existing: str, chunk: str) -> str:
    chunk = chunk.strip()
    if not chunk:
        return existing
    return f"{existing} {chunk}".strip() if existing else chunk


def _extract_education(text: str) -> list[dict]:
    """Best-effort regex fallback for education (LLM is the primary path).

    Groups related lines into a single {degree, institution, year} record.
    """
    education: list[dict] = []
    lines = text.split("\n")

    degree_re = re.compile(
        r"^(bachelor|master|ph\.?d\.?|b\.?s\.?|m\.?s\.?|b\.?e\.?|m\.?e\.?|"
        r"bachelor\s+of|master\s+of|doctor\s+of)\b",
        re.IGNORECASE,
    )
    year_re = re.compile(r"(19|20)\d{2}")

    def flush(current: dict | None) -> None:
        if current and (current["degree"] or current["institution"] or current["year"]):
            education.append(current)

    current: dict | None = None

    # Locate the education section.
    edu_start = None
    for i, line in enumerate(lines):
        if re.match(r"^education\s*:?\s*$", line.strip(), re.IGNORECASE):
            edu_start = i + 1
            break

    scan_lines = lines[edu_start:] if edu_start is not None else lines
    for line in scan_lines:
        s = line.strip()
        if not s:
            continue
        if edu_start is not None and _SECTION_HEADER.match(s) and not re.search(r"college|university|institute|school", s, re.IGNORECASE):
            break

        if degree_re.match(s):
            flush(current)
            m_year = year_re.search(s)
            year = m_year.group(0) if m_year else ""
            current = {"degree": s, "institution": "", "year": year}
            # Strip the year out of the degree label.
            current["degree"] = year_re.sub("", s).strip(" ,|–-")
        elif re.search(r"(university|college|institute|school)", s, re.IGNORECASE) or year_re.search(s):
            m_year = year_re.search(s)
            year = m_year.group(0) if m_year else ""
            if current and not current["institution"]:
                current["institution"] = year_re.sub("", s).strip(" ,|–-")
                current["year"] = year or current["year"]
            else:
                flush(current)
                current = {"degree": "", "institution": year_re.sub("", s).strip(" ,|–-"), "year": year}

    flush(current)
    return education


def _extract_projects(text: str) -> list[dict]:
    """Best-effort regex fallback for projects (LLM is the primary path).

    Stops at the next major section (unlike the old version which captured
    everything to EOF) and attaches bullets/tech as description.
    """
    projects: list[dict] = []
    lines = text.split("\n")

    in_projects = False
    current: dict | None = None

    for line in lines:
        s = line.strip()
        if not s:
            continue

        if re.search(r"(projects?|personal projects?)\s*:?\s*$", s, re.IGNORECASE):
            in_projects = True
            continue

        if not in_projects:
            continue

        # Stop at the next major section header.
        if _SECTION_HEADER.match(s) and not re.search(
            r"(project|dashboard|app|tool|service|site|platform|api)\b", s, re.IGNORECASE
        ):
            break

        techs = []
        tm = re.findall(r"\[([^\]]+)\]|\(([^)]*)\)", s)
        for a, b in tm:
            for cand in (a, b):
                if cand and re.search(r"\b(\w+\.js|react|node|d3|go|python|ts|typescript|graphql|websockets?|docker|aws|kafka|kubernetes|redis|stripe|fastapi|postgres)\b", cand, re.IGNORECASE):
                    techs = [t.strip() for t in re.split(r"[,/]", cand) if t.strip()]

        if _is_bullet(s):
            body = _strip_bullet(s)
            if current is not None:
                current["description"] = _append(current["description"], body)
            else:
                current = {"name": body, "description": "", "technologies": techs}
                projects.append(current)
            continue

        # A non-bullet line inside projects: treat as a new project heading.
        current = {"name": s, "description": "", "technologies": techs}
        projects.append(current)

    return projects


def _extract_structured_data(text: str) -> dict:
    """Extract structured data from resume text."""
    return {
        "skills": _extract_skills(text),
        "experience": _extract_experience(text),
        "education": _extract_education(text),
        "projects": _extract_projects(text),
    }


def _extract_text_from_txt(content: bytes) -> str:
    """Extract text from plain text file."""
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return content.decode("latin-1")
        except Exception as e:
            raise ValueError(f"Failed to decode text file: {e}")


def parse_resume(filename: str, content: bytes) -> ParsedResume:
    """Parse a resume file (PDF, DOCX, or TXT) into structured data."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf":
        text = _extract_text_from_pdf(content)
    elif ext in ("docx", "doc"):
        text = _extract_text_from_docx(content)
    elif ext == "txt":
        text = _extract_text_from_txt(content)
    else:
        raise ValueError(f"Unsupported file format: {ext}. Use PDF, DOCX, or TXT.")

    if not text.strip():
        raise ValueError("Could not extract text from the file. It may be corrupted, password-protected, or image-based.")

    structured = _extract_structured_data(text)

    return ParsedResume(
        skills=structured["skills"],
        experience=structured["experience"],
        education=structured["education"],
        projects=structured["projects"],
        raw_text=text,
    )
