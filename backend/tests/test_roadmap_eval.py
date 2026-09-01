"""RULES.md §4 eval set — roadmap generation deterministic guards.

The full roadmap eval (RULES.md entry) is the LLM-side behavioral check that
milestones are gap-linking, sequenced, and actionable. These are the no-LLM
deterministic guards that pin the same contract at the validation layer:
milestones with a non-gap skill or a missing action are discarded, valid ones
survive, and the fallback ordering is critical-first.
"""

import pytest

from backend.services.roadmap import (
    _fallback_milestones,
    _validate_milestones,
    _build_gap_summary,
)

GAPS = [
    {"skill": "sql", "severity": "critical", "matched": False, "reason": "no evidence"},
    {"skill": "docker", "severity": "important", "matched": True, "reason": "shallow"},
    {"skill": "git", "severity": "nice_to_have", "matched": False, "reason": "no evidence"},
]


def test_validate_keeps_valid_milestone():
    milestones = [
        {
            "title": "Build a REST API with FastAPI + SQLModel",
            "linked_gap_skill": "sql",            # exact match in gap list
            "status": "not_started",
            "linked_action_type": "challenge",
            "linked_action_id": "sql-queries",
            "order_index": 0,
            "estimated_hours": 6,
        }
    ]
    valid = _validate_milestones(milestones, GAPS)
    assert len(valid) == 1
    assert valid[0]["linked_gap_skill"] == "sql"


def test_validate_discards_non_gap_skill():
    # A milestone that invents a skill NOT in the gap list must be dropped.
    milestones = [
        {
            "title": "Learn AWS",
            "linked_gap_skill": "aws",            # not in GAPS
            "status": "not_started",
            "linked_action_type": "resource",
            "linked_action_id": "https://aws.amazon.com",
            "order_index": 0,
        }
    ]
    assert _validate_milestones(milestones, GAPS) == []


def test_validate_discards_missing_action_type():
    milestones = [
        {
            "title": "Deepen SQL",
            "linked_gap_skill": "sql",
            "status": "not_started",
            "linked_action_type": "",             # just "study" — no action
            "linked_action_id": "",
            "order_index": 0,
        }
    ]
    assert _validate_milestones(milestones, GAPS) == []


def test_validate_discards_missing_action_id():
    milestones = [
        {
            "title": "Deepen Docker",
            "linked_gap_skill": "docker",
            "status": "not_started",
            "linked_action_type": "challenge",
            "linked_action_id": "",               # non-empty required
            "order_index": 0,
        }
    ]
    assert _validate_milestones(milestones, GAPS) == []


def test_validate_handles_paraphrased_skill():
    # Paraphrasing ("sql database") must NOT match an exact gap skill "sql".
    milestones = [
        {
            "title": "SQL databases",
            "linked_gap_skill": "sql database",   # paraphrased, not exact
            "status": "not_started",
            "linked_action_type": "resource",
            "linked_action_id": "https://w3schools.com/sql/",
            "order_index": 0,
        }
    ]
    assert _validate_milestones(milestones, GAPS) == []


def test_validate_defaults_estimated_hours_by_severity():
    # Critical gap -> defaults to 8h; important -> stays if provided.
    milestones = [
        {"title": "SQL", "linked_gap_skill": "sql", "status": "not_started",
         "linked_action_type": "resource", "linked_action_id": "u", "order_index": 0},
        {"title": "Git", "linked_gap_skill": "git", "status": "not_started",
         "linked_action_type": "resource", "linked_action_id": "u", "order_index": 1,
         "estimated_hours": 3},
    ]
    valid = _validate_milestones(milestones, GAPS)
    by_skill = {m["linked_gap_skill"]: m for m in valid}
    assert by_skill["sql"]["estimated_hours"] == 8      # critical default
    assert by_skill["git"]["estimated_hours"] == 3      # provided value kept


def test_fallback_orders_critical_first():
    # Fallback roadmap (no LLM) must not emit milestones for severity "none" and
    # must preserve gap order with critical gaps first.
    gaps = [
        {"skill": "aws", "severity": "critical", "matched": False},
        {"skill": "none_skill", "severity": "none", "matched": False},
        {"skill": "docker", "severity": "important", "matched": True},
        {"skill": "git", "severity": "nice_to_have", "matched": False},
    ]
    ms = _fallback_milestones(gaps, "Backend Engineer")
    skills = [m["linked_gap_skill"] for m in ms]
    assert "none_skill" not in skills               # severity "none" skipped
    assert skills[0] == "aws"                       # critical first
    assert "docker" in skills
    assert "git" in skills


def test_build_gap_summary_lists_all_with_severity():
    summary = _build_gap_summary(GAPS)
    assert "CRITICAL" in summary.upper()
    assert "MISSING" in summary or "DEPTH GAP" in summary
    assert "sql" in summary
    assert "docker" in summary
