from backend.services.resume_analysis import _normalize_analysis, _fallback_analysis


def test_normalize_analysis_clamps_and_filters():
    data = _normalize_analysis({
        "overall_score": 140,
        "ats_score": -3,
        "summary": "  Good  ",
        "strengths": ["  Impact  ", "", 1],
        "weaknesses": ["Missing metrics"],
        "section_feedback": [{"section": "Experience", "status": "bad", "feedback": "Add metrics"}],
        "bullet_improvements": [{"original": "Did stuff", "improved": "Built X improving Y by 20%", "reason": "Impact"}],
        "missing_keywords": ["Docker"],
        "action_items": ["Quantify results"],
    })
    assert data["overall_score"] == 100
    assert data["ats_score"] == 0
    assert data["summary"] == "Good"
    assert data["strengths"] == ["Impact"]
    assert data["section_feedback"][0]["status"] == "needs_work"
    assert data["bullet_improvements"][0]["improved"].startswith("Built X")


def test_fallback_analysis_handles_sparse_resume():
    data = _fallback_analysis({"skills": ["Python"], "experience": [], "education": [], "projects": []}, "Backend Engineer")
    assert 0 <= data["overall_score"] <= 100
    assert "Backend Engineer" in data["summary"]
    assert data["action_items"]
