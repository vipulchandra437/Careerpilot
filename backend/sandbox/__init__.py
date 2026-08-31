"""Sandboxed code execution service (architecture.md §5.2, RULES.md §2).

Public API for feature code:
  from backend.sandbox.executor import run_code

Never import or call sandbox internals for executing user code outside of
`run_code` — that is the only authorized execution path.
"""

from backend.sandbox.executor import run_code, RunResult, SandboxRunError

__all__ = ["run_code", "RunResult", "SandboxRunError"]
