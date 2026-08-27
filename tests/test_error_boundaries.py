"""Error boundary tests for resume parsing pipeline."""
import json
import sys
sys.path.insert(0, "D:\\major project")

from backend.services.resume_parser import parse_resume


def test_empty_file():
    """Test zero-byte file upload."""
    try:
        result = parse_resume("resume.pdf", b"")
        return {"status": "unexpected_success", "result": str(result)}
    except ValueError as e:
        return {"status": "expected_error", "error": str(e)}


def test_image_only_pdf():
    """Test scanned/image-only PDF lacking text layer."""
    # Create a minimal valid PDF with no text content
    minimal_pdf = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
206
%%EOF"""
    try:
        result = parse_resume("scanned.pdf", minimal_pdf)
        return {"status": "unexpected_success", "result": str(result)}
    except ValueError as e:
        return {"status": "expected_error", "error": str(e)}


def test_corrupted_file():
    """Test corrupted/container-mismatched file."""
    # TXT content with .pdf extension
    txt_content = b"This is not a PDF file, it's just text content."
    try:
        result = parse_resume("fake.pdf", txt_content)
        return {"status": "unexpected_success", "raw_text": result.raw_text[:100]}
    except ValueError as e:
        return {"status": "expected_error", "error": str(e)}


def test_unsupported_format():
    """Test unsupported file format."""
    try:
        result = parse_resume("resume.exe", b"fake content")
        return {"status": "unexpected_success", "result": str(result)}
    except ValueError as e:
        return {"status": "expected_error", "error": str(e)}


def test_oversized_content():
    """Test oversized content (simulated - 11MB)."""
    try:
        # Simulate oversized file by creating large content
        large_content = b"x" * (11 * 1024 * 1024)
        result = parse_resume("large.pdf", large_content)
        return {"status": "unexpected_success", "result": str(result)}
    except ValueError as e:
        return {"status": "expected_error", "error": str(e)}


if __name__ == "__main__":
    tests = {
        "empty_file": test_empty_file(),
        "image_only_pdf": test_image_only_pdf(),
        "corrupted_file": test_corrupted_file(),
        "unsupported_format": test_unsupported_format(),
        "oversized_content": test_oversized_content(),
    }
    print(json.dumps(tests, indent=2))
