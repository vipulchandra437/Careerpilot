from io import BytesIO

import pytest
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from backend.services.resume_parser import parse_resume, _extract_skills, _extract_experience, _extract_education


def test_extract_skills():
    text = """
    Skills: Python, JavaScript, React, Node.js, PostgreSQL, Docker, AWS
    Experience with machine learning and deep learning using TensorFlow and PyTorch.
    """
    skills = _extract_skills(text)
    assert "python" in skills
    assert "javascript" in skills
    assert "react" in skills
    assert "postgresql" in skills
    assert "docker" in skills
    assert "aws" in skills
    assert "machine learning" in skills
    assert "tensorflow" in skills


def test_extract_experience():
    text = """
    Work Experience
    Software Engineer at Google (2020-2023)
    - Built scalable microservices
    - Led team of 5 engineers
    
    Developer at Startup (2018-2020)
    - Full-stack development
    """
    experience = _extract_experience(text)
    assert len(experience) >= 1


def test_extract_education():
    text = """
    Education
    Bachelor of Science in Computer Science
    Stanford University, 2018
    
    Master of Science in Computer Science
    MIT, 2020
    """
    education = _extract_education(text)
    assert len(education) >= 1


def test_parse_resume_text():
    text = """
    John Doe
    Software Engineer
    
    Skills: Python, JavaScript, React, Docker
    Experience: 3 years at Google
    Education: BS Computer Science, Stanford
    """
    content = text.encode("utf-8")
    result = parse_resume("resume.txt", content)
    assert result.raw_text == text
    assert "python" in result.skills
    assert "javascript" in result.skills


def test_parse_resume_invalid_format():
    with pytest.raises(ValueError, match="Unsupported file format"):
        parse_resume("resume.exe", b"fake content")


def test_parse_resume_empty_content():
    # Test with invalid PDF content that should fail parsing
    with pytest.raises(ValueError):
        parse_resume("resume.pdf", b"not a real pdf")


def test_parse_resume_pdf_uses_installed_pypdf():
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    content = DecodedStreamObject()
    content.set_data(b"BT /F1 12 Tf 72 700 Td (Python developer) Tj ET")
    page[NameObject("/Contents")] = writer._add_object(content)
    font = DictionaryObject({
        NameObject("/Type"): NameObject("/Font"),
        NameObject("/Subtype"): NameObject("/Type1"),
        NameObject("/BaseFont"): NameObject("/Helvetica"),
    })
    page[NameObject("/Resources")] = DictionaryObject({
        NameObject("/Font"): DictionaryObject({NameObject("/F1"): writer._add_object(font)})
    })
    buffer = BytesIO()
    writer.write(buffer)

    result = parse_resume("resume.pdf", buffer.getvalue())
    assert "Python developer" in result.raw_text
    assert "python" in result.skills
