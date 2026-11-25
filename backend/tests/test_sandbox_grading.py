"""Deterministic grading guards for normalized Judge0 results."""

import base64

from backend.sandbox.executor import _render_tests

TESTS = [{"name": "case", "stdin": "", "expected": "9"}]


def _result(status_id: int, stdout: str) -> dict:
    return {
        "status": {"id": status_id},
        "stdout": base64.b64encode(stdout.encode()).decode(),
        "stderr": None,
        "exit_code": 1 if status_id == 8 else 0,
        "time": 0.01,
    }


def test_runtime_error_is_not_rescued_by_matching_stdout():
    # Judge0 status 8 (NZEC) means the program crashed after printing 9.
    row = _render_tests([_result(8, "9\n")], TESTS, 10)[0]
    assert row["passed"] is False


def test_wrong_answer_trailing_newline_is_still_tolerated():
    row = _render_tests([_result(4, "9\n")], TESTS, 10)[0]
    assert row["passed"] is True
