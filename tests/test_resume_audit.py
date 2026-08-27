"""Test script to run resume parser on test fixtures and output JSON results."""
import json
import sys
sys.path.insert(0, "D:\\major project")

from backend.services.resume_parser import parse_resume


def test_resume(filename: str) -> dict:
    """Parse a resume and return structured data."""
    filepath = f"tests/fixtures/{filename}"
    with open(filepath, "rb") as f:
        content = f.read()
    
    result = parse_resume(filename, content)
    
    return {
        "filename": filename,
        "skills": result.skills,
        "experience": result.experience,
        "education": result.education,
        "projects": result.projects,
        "raw_text_length": len(result.raw_text),
    }


if __name__ == "__main__":
    resumes = [
        "resume_clean.txt",
        "resume_messy.txt",
        "resume_minimal.txt",
    ]
    
    results = {}
    for resume in resumes:
        try:
            results[resume] = test_resume(resume)
        except Exception as e:
            results[resume] = {"error": str(e)}
    
    print(json.dumps(results, indent=2))
