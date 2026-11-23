from backend.services.resume_builder import normalize_resume, render_resume_html, build_resume_pdf


def test_normalize_resume_defaults():
    r = normalize_resume({"name": "A", "skills": ["Python", ""], "experience": [{"title": "Dev"}]})
    assert r["name"] == "A"
    assert r["skills"] == ["Python"]
    assert r["experience"][0]["title"] == "Dev"
    assert r["contact"]["email"] == ""


def test_render_resume_html_escapes():
    html = render_resume_html({"name": "<A>", "summary": "<script>x</script>", "skills": []})
    assert "<A>" not in html
    assert "&lt;A&gt;" in html
    assert "<script>x</script>" not in html


def test_build_resume_pdf_returns_bytes():
    pdf = build_resume_pdf({"name": "Test User", "skills": ["Python"], "experience": [{"title": "Dev", "company": "Co", "duration": "2024", "description": "Built APIs"}]})
    assert isinstance(pdf, (bytes, bytearray))
    assert pdf.startswith(b"%PDF")
