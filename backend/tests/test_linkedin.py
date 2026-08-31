import pytest
from backend.services.linkedin import (
    parse_linkedin_import,
    parse_linkedin_paste,
    _parse_text_paste,
    _parse_json_export,
    _parse_csv_export,
)


def test_parse_text_paste_skills():
    text = """
    Name: John Doe
    Headline: Software Engineer
    Skills: Python, JavaScript, React, Docker
    Experience:
    Software Engineer at Google
    """
    profile = _parse_text_paste(text)
    assert profile.name == "John Doe"
    assert profile.headline == "Software Engineer"
    assert "python" in [s.lower() for s in profile.skills]
    assert "javascript" in [s.lower() for s in profile.skills]


def test_parse_text_paste_sections():
    text = """
    Name: Jane Smith
    Headline: Data Scientist
    Skills:
    - Python
    - Machine Learning
    - TensorFlow
    Experience:
    Data Scientist at Meta
    Education:
    MS Computer Science, Stanford
    """
    profile = _parse_text_paste(text)
    assert profile.name == "Jane Smith"
    assert len(profile.skills) >= 2
    assert len(profile.experience) >= 1
    assert len(profile.education) >= 1


def test_parse_json_export():
    json_data = """
    {
        "firstName": "John",
        "lastName": "Doe",
        "headline": "Software Engineer",
        "summary": "Experienced developer",
        "skills": [
            {"name": "Python"},
            {"name": "JavaScript"},
            {"name": "React"}
        ],
        "positions": {
            "values": [
                {"title": "Software Engineer", "company": {"name": "Google"}}
            ]
        },
        "educations": {
            "values": [
                {"degree": "BS CS", "schoolName": "Stanford"}
            ]
        }
    }
    """
    profile = _parse_json_export(json_data)
    assert profile.name == "John Doe"
    assert profile.headline == "Software Engineer"
    assert "Python" in profile.skills
    assert "JavaScript" in profile.skills
    assert len(profile.experience) >= 1
    assert len(profile.education) >= 1


def test_parse_csv_export_keyvalue_dump():
    """Hand-pasted 'Key,Value' profile dump."""
    csv_data = """Name,John Doe
Headline,Software Engineer
Skills,Python
Skills,JavaScript
Skills,React
Experience,Software Engineer at Google
Education,BS CS Stanford"""
    profile = _parse_csv_export(csv_data)
    assert "John Doe" in profile.name
    assert len(profile.skills) >= 1


def test_parse_csv_export_columnar_skills():
    """Real LinkedIn export Skills.csv: header row `Name,Endorsements` + rows."""
    csv_data = """Name,Endorsements
Python,17
Docker,9
"Machine Learning",5"""
    profile = _parse_csv_export(csv_data)
    assert "Python" in profile.skills
    assert "Docker" in profile.skills
    assert "Machine Learning" in profile.skills
    assert len(profile.skills) == 3


def test_parse_csv_export_columnar_positions():
    """Real LinkedIn export Positions.csv: `Title,Company Name,...` header."""
    csv_data = """Title,Company Name,Location
Software Engineer,Google,Remote
Senior Data Scientist,Meta,NYC"""
    profile = _parse_csv_export(csv_data)
    assert len(profile.experience) == 2
    assert profile.experience[0]["title"] == "Software Engineer"
    assert profile.experience[0]["company"] == "Google"


def test_parse_linkedin_import_json():
    json_data = '{"firstName": "Test", "lastName": "User", "headline": "Dev"}'
    profile = parse_linkedin_import(json_data, "profile.json")
    assert profile.name == "Test User"


def test_parse_linkedin_paste():
    text = "Name: Test User\nHeadline: Developer\nSkills: Python, JavaScript"
    profile = parse_linkedin_paste(text)
    assert profile.name == "Test User"
    assert "python" in [s.lower() for s in profile.skills]
