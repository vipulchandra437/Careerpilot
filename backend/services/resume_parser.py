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


def _extract_experience(text: str) -> list[dict]:
    """Extract work experience sections."""
    experience = []
    lines = text.split("\n")

    # Find experience section boundaries
    exp_start = None
    for i, line in enumerate(lines):
        if re.search(r"^(work\s+)?experience|employment|work\s+history", line.strip(), re.IGNORECASE):
            exp_start = i + 1
            break

    if exp_start is None:
        return experience

    # Extract until next section or end
    for line in lines[exp_start:]:
        line = line.strip()
        if not line:
            continue
        # Stop at next section header
        if re.match(r"^(education|skills?|projects?|certifications?|summary|objective|references?)", line, re.IGNORECASE):
            break
        # Match job title patterns: Title | Company | Date or Title at Company
        job_match = re.match(
            r"^(.+?)(?:\s*\|\s*|\s+at\s+)(.+?)(?:\s*\|\s*|\s*\()\s*(.+?)\s*\)?$",
            line, re.IGNORECASE
        )
        if job_match:
            experience.append({
                "title": job_match.group(1).strip(),
                "company": job_match.group(2).strip(),
                "duration": job_match.group(3).strip(),
                "description": "",
            })
        elif re.match(r"^(software|senior|junior|lead|staff|principal|developer|engineer|intern|analyst|manager|architect)", line, re.IGNORECASE):
            experience.append({
                "title": line,
                "company": "",
                "duration": "",
                "description": "",
            })

    return experience


def _extract_education(text: str) -> list[dict]:
    """Extract education sections."""
    education = []
    lines = text.split("\n")

    # Find education section boundaries
    edu_start = None
    for i, line in enumerate(lines):
        if re.match(r"^education", line.strip(), re.IGNORECASE):
            edu_start = i + 1
            break

    if edu_start is None:
        # Fallback: scan for degree patterns
        for line in lines:
            line = line.strip()
            if not line:
                continue
            if re.match(r"^(bachelor|master|ph\.?d\.?|b\.?s\.?|m\.?s\.?|b\.?e\.?|m\.?e\.?)\s+(of\s+)?", line, re.IGNORECASE):
                education.append({"degree": line, "institution": "", "year": ""})
        return education

    # Extract until next section or end
    for line in lines[edu_start:]:
        line = line.strip()
        if not line:
            continue
        # Stop at next section header
        if re.match(r"^(experience|skills?|projects?|certifications?|summary|objective|work|references?)", line, re.IGNORECASE):
            break
        # Match degree patterns
        if re.match(r"^(bachelor|master|ph\.?d\.?|b\.?s\.?|m\.?s\.?|b\.?e\.?|m\.?e\.?)", line, re.IGNORECASE):
            education.append({"degree": line, "institution": "", "year": ""})
        elif re.match(r"^(university|college|institute|school)", line, re.IGNORECASE):
            education.append({"degree": "", "institution": line, "year": ""})
        elif re.search(r"(university|college|institute|school)", line, re.IGNORECASE):
            education.append({"degree": "", "institution": line, "year": ""})

    return education


def _extract_projects(text: str) -> list[dict]:
    """Extract project sections."""
    projects = []
    lines = text.split("\n")
    in_projects = False

    for line in lines:
        line = line.strip()
        if re.search(r"(projects?|personal projects?)", line, re.IGNORECASE):
            in_projects = True
            continue
        if in_projects and line:
            projects.append({"name": line, "description": "", "technologies": []})

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
