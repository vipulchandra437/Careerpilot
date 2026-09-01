"""Sandbox executor (architecture.md §5.2, RULES.md §2).

This module is the ONLY authorized path for running student-submitted code. It
NEVER executes code in the API process. Instead it submits the code to an
external JUDGE0 CE instance over HTTP and grades it there, returning a
normalized RunResult.

Why Judge0 (see MEMORY.md P3-1..P3-3):
  - explicit per-submission `enable_network=false` -> blocks all network access
    (satisfies "no network access").
  - native grading against `expected_output` (status id 3 = Accepted), plus
    explicit `cpu_time_limit` / `wall_time_limit` / `memory_limit` /
    `max_processes_and_or_threads` / `stack_limit` -> bounded, isolated runs.
  - config-driven (base URL + optional auth headers from config/.env), so
    switching keyless-public -> RapidAPI/Sulu/self-hosted is a config edit, not
    a rewrite. Public/free CE is for DEVELOPMENT ONLY (see P3-3 limitation).

Security invariant: there is deliberately NO direct-execution fallback. If the
Judge0 service is unavailable (HTTP/network/config error), we raise
SandboxRunError so the caller fails cleanly (e.g. 503) rather than ever running
student code in this process (RULES.md §2).
"""

import base64
import json
import time

import httpx

from backend.config import get_settings

settings = get_settings()

# Judge0 CE submission status ids (unchanged across CE versions).
_STATUS_PROCESSING = {1, 2}          # In Queue, Processing
_STATUS_ACCEPTED = 3
_STATUS_TLE = 5
_STATUS_COMPILE_ERROR = 6
_STATUS_RUNTIME = {7, 8, 9, 10, 11, 12}  # SIGSEGV, SIGXFSZ, SIGFPE, SIGABRT, NZEC, other


class SandboxRunError(RuntimeError):
    """Raised for sandbox infrastructure failures (service unreachable, HTTP
    error, timeout waiting for results, invalid response). NOT raised for
    student-code failures — those come back as a normal RunResult."""


class RunResult:
    """Normalized result of a sandboxed execution, safe to return to API/UI."""

    def __init__(self, spec, parsed):
        self.spec = spec
        self.parsed = parsed

    @property
    def tests(self):
        return (self.parsed or {}).get("tests", [])

    @property
    def passed_count(self):
        return sum(1 for t in self.tests if t.get("passed"))

    @property
    def total_count(self):
        return len(self.tests)

    @property
    def all_passed(self):
        return self.total_count > 0 and self.passed_count == self.total_count

    @property
    def error(self):
        return (self.parsed or {}).get("error")


# --- language map -----------------------------------------------------------

def _language_id(language: str) -> int:
    """Map our language name to a Judge0 language_id. Only Python is supported
    for now; the id is config-driven so adding languages is a config change."""
    if language == "python":
        return settings.judge0_language_id_python
    raise SandboxRunError(f"unsupported language: {language}")


def _auth_headers() -> dict:
    headers = dict(settings.judge0_auth_headers or {})
    headers.setdefault("Content-Type", "application/json")
    return headers


def _submit_url() -> str:
    return settings.judge0_base_url.rstrip("/") + "/submissions/batch"


def check_health() -> dict:
    """Probe the configured Judge0 instance and report its reachability + version.

    Config-driven and works identically against the public CE (`/about` returns
    200) or a self-hosted instance (`/about` and `/version` are unauthenticated,
    while other endpoints require the auth token). Used by the `/api/health`
    endpoint and by the deploy runbook to verify a self-hosted instance before
    pointing the app at it.

    Returns {"status": "ok", "version": str} on success. Raises SandboxRunError
    for infrastructure failures (unreachable, HTTP error, bad payload) — never
    falls back to running code in-process (RULES.md §2).
    """
    base = settings.judge0_base_url.rstrip("/")
    with httpx.Client(timeout=10.0) as client:
        try:
            resp = client.get(base + "/about", headers=_auth_headers())
        except httpx.HTTPError as e:
            raise SandboxRunError(f"Judge0 health check transport error: {e}") from e
    if resp.status_code != 200:
        raise SandboxRunError(
            f"Judge0 health check failed (HTTP {resp.status_code}): {resp.text[:300]}"
        )
    version = (resp.json() or {}).get("version", "unknown")
    return {"status": "ok", "version": version}


def _b64(s: str) -> str:
    return base64.b64encode(s.encode("utf-8")).decode("ascii")


def _build_payload(code: str, language_id: int, tests: list[dict]) -> dict:
    """Each test case becomes one Judge0 submission in a single batch call.

    Isolation/limits applied per submission (controlling the sandbox):
      enable_network=false  -> no network access (RULES.md "no network").
      cpu_time_limit        -> CPU-seconds cap (clamped to public-CE max 5).
      wall_time_limit       -> wall-clock cap (guards real-time hangs).
      memory_limit          -> memory cap in KB.
      max_processes_and_or_threads -> caps process count (blocks fork bombs).
    Expected output supplied so Judge0 grades it (status 3 = Accepted).
    """
    submissions = []
    for t in tests:
        submissions.append(
            {
                "source_code": _b64(code or ""),
                "language_id": language_id,
                "stdin": _b64((t.get("stdin") or "")),
                "expected_output": _b64((t.get("expected") or "")),
                "enable_network": False,
                "cpu_time_limit": max(1, min(5, settings.judge0_cpu_time_limit)),
                "cpu_extra_time": settings.judge0_cpu_extra_time,
                "wall_time_limit": settings.judge0_wall_time_limit,
                "memory_limit": settings.judge0_memory_limit_kb,
                "stack_limit": settings.judge0_stack_limit_kb,
                "max_processes_and_or_threads": settings.judge0_max_processes,
                "number_of_runs": 1,
                "base64_encoded": True,
            }
        )
    return {"submissions": submissions}


def _create_batch(payload: dict) -> list[str]:
    """Create a batch submission, returning the token for each test case."""
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(
            _submit_url(),
            params={"base64_encoded": "true"},
            headers=_auth_headers(),
            json=payload,
        )
    if resp.status_code not in (200, 201):
        raise SandboxRunError(
            f"Judge0 submit failed (HTTP {resp.status_code}): {resp.text[:300]}"
        )
    data = resp.json()
    tokens = [item.get("token") for item in data]
    if not tokens or any(t is None for t in tokens):
        raise SandboxRunError(f"Judge0 returned no tokens: {resp.text[:300]}")
    return tokens


def _poll_results(tokens: list[str]) -> list[dict]:
    """Poll /submissions/batch until every case is finished, then return the
    per-case result dicts (with base64-encoded text fields still encoded)."""
    url = settings.judge0_base_url.rstrip("/") + "/submissions/batch"
    deadline = time.monotonic() + settings.judge0_poll_timeout_s
    interval = settings.judge0_poll_interval_ms / 1000.0
    token_param = ",".join(tokens)
    while True:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(
                url,
                params={"tokens": token_param, "base64_encoded": "true"},
                headers=_auth_headers(),
            )
        if resp.status_code != 200:
            raise SandboxRunError(
                f"Judge0 poll failed (HTTP {resp.status_code}): {resp.text[:300]}"
            )
        items = resp.json().get("submissions", [])
        if len(items) == len(tokens) and all(
            item.get("status", {}).get("id") not in _STATUS_PROCESSING
            for item in items
        ):
            return items
        if time.monotonic() >= deadline:
            raise SandboxRunError(
                f"Judge0 timed out waiting for {len(tokens)} submission(s)."
            )
        time.sleep(interval)


def _decode(o):
    return base64.b64decode(o).decode("utf-8", errors="replace") if o else ""


def _map_status(status_id: int) -> tuple[bool, bool]:
    """Return (passed, timed_out) for a Judge0 status id."""
    if status_id == _STATUS_ACCEPTED:
        return True, False
    return False, status_id == _STATUS_TLE


def _render_tests(results: list[dict], tests: list[dict], elapsed_ms_total: int) -> list[dict]:
    """Normalize Judge0 results into the RunResult.tests shape the rest of the
    service consumes (name/passed/timed_out/exit_code/stdout/stderr/elapsed_ms)."""
    out = []
    for r, t in zip(results, tests):
        status = r.get("status", {}) or {}
        status_id = status.get("id")
        passed, timed_out = _map_status(status_id)
        stderr_parts = []
        if status.get("description"):
            stderr_parts.append(status["description"])
        compile_output = _decode(r.get("compile_output"))
        if compile_output:
            stderr_parts.append(compile_output)
        stderr_raw = _decode(r.get("stderr"))
        if stderr_raw:
            stderr_parts.append(stderr_raw)
        out.append(
            {
                "name": t.get("name", ""),
                "passed": passed,
                "timed_out": timed_out,
                "exit_code": r.get("exit_code"),
                "stdout": (_decode(r.get("stdout")) or "")[-4000:],
                "stderr": ("\n".join(stderr_parts) or "")[-4000:],
                "elapsed_ms": int(float(r.get("time") or 0) * 1000),
            }
        )
    return out


def run_code(
    language: str,
    code: str,
    tests: list[dict],
    timeout_seconds: float | None = None,
) -> RunResult:
    """Execute user code on the external Judge0 sandbox and return a RunResult.

    `tests` is a list of {"name", "stdin", "expected"} — each is run against
    fixed expected output (deterministic), so results are auditable.

    Raises SandboxRunError only for infrastructure failures (service down,
    HTTP error, wait timeout). Student-code failures come back as normal
    (non-passing) RunResult entries.
    """
    language_id = _language_id(language)
    payload = _build_payload(code, language_id, tests or [])
    spec = {
        "language": language,
        "code": code,
        "tests": tests,
        "timeout_seconds": timeout_seconds or settings.judge0_cpu_time_limit,
    }

    if not tests:
        return RunResult(spec, {"tests": []})

    start = time.monotonic()
    try:
        tokens = _create_batch(payload)
        results = _poll_results(tokens)
    except httpx.HTTPError as e:
        raise SandboxRunError(f"Judge0 transport error: {e}") from e

    elapsed_ms_total = int((time.monotonic() - start) * 1000)
    rendered = _render_tests(results, tests, elapsed_ms_total)
    return RunResult(spec, {"tests": rendered})
