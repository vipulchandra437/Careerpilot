"""Deterministic checks for the built-in DSA question bank (RULES.md §4)."""

from backend.seed_dsa import PROBLEMS
from backend.services.coding_challenges import _validate_challenge


def test_bank_is_non_empty_and_valid():
    assert len(PROBLEMS) >= 30
    titles = [p["title"] for p in PROBLEMS]
    assert len(titles) == len(set(titles))
    for p in PROBLEMS:
        normalized = _validate_challenge(
            {k: p[k] for k in ("title", "prompt", "function_signature", "starter_code", "test_cases", "expected_time_complexity")},
            p["skill"],
            "python",
        )
        assert normalized is not None, p["title"]
        assert 3 <= len(normalized["test_cases"]) <= 6, p["title"]


def test_first_case_matches_prompt_example():
    for p in PROBLEMS:
        first = p["test_cases"][0]
        assert f"Input:\n{first['stdin']}" in p["prompt"], p["title"]
        assert f"Output:\n{first['expected']}" in p["prompt"], p["title"]
