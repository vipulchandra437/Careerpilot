"""In-container code runner (architecture.md §5.2).

This script executes INSIDE the isolated sandbox container. It is NOT part of
the API process and never runs on the host. The container itself is the
security boundary (see Dockerfile + backend/sandbox/executor.py):
  - --network none           -> no network access
  - --read-only root fs      -> cannot write outside the workspace
  - --cap-drop ALL           -> drops all Linux capabilities
  - non-root 'sandbox' user  -> cannot escalate
  - --pids-limit / timeout   -> contains runaway loops

The runner reads a single JSON "run spec" on stdin:
{
  "language": "python",
  "code": "<student source>",
  "tests": [ {"name": "t1", "stdin": "2\\n3", "expected": "5"} ]
}

It writes the student code to its current (writable, isolated) workspace, then
executes it per test case under a wall-clock watchdog. Output is a single JSON
result. This watchdog is a SECOND line of defense on top of the container's
timeout/memory/pids limits enforced by the executor.

Only the portion of the filesystem the container is granted is reachable; the
host filesystem is never mounted in (executor.py mounts nothing from the
host).
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

LANG_COMMAND = {
    # Each value: fixed interpreter prefix for running the user's code file.
    # The file is written as solution.<ext> in the workspace.
    "python": lambda f: [sys.executable, "-u", f],
    # Keep dictionary of supported languages small/fixed on purpose; adding
    # compilers/interpreters that are NOT present in the image will fail fast
    # (subprocess exits non-zero), which is the desired safe behavior.
}


def _run_test(command, stdin_data, timeout_s):
    """Run one test case under a wall-clock watchdog and return its result."""
    start = time.monotonic()
    try:
        proc = subprocess.run(
            command,
            input=stdin_data,
            capture_output=True,
            text=True,
            timeout=timeout_s,
            cwd=os.getcwd(),
        )
    except subprocess.TimeoutExpired:
        # Timeout is the watchdog kicking in (container limits may also fire).
        return {
            "timed_out": True,
            "exit_code": None,
            "stdout": "",
            "stderr": "Execution timed out (wall-clock watchdog).",
            "elapsed_ms": int((time.monotonic() - start) * 1000),
        }

    elapsed_ms = int((time.monotonic() - start) * 1000)
    return {
        "timed_out": False,
        "exit_code": proc.returncode,
        "stdout": proc.stdout[-4000:],   # cap large output
        "stderr": proc.stderr[-4000:],
        "elapsed_ms": elapsed_ms,
    }


def main():
    try:
        spec = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"invalid run spec: {e}"}))
        return 1

    language = spec.get("language", "python")
    code = spec.get("code", "")
    tests = spec.get("tests", []) or []
    timeout_s = float(spec.get("timeout_seconds", 4.0))

    runner = LANG_COMMAND.get(language)
    if runner is None:
        print(json.dumps({"error": f"unsupported language: {language}"}))
        return 1

    # Write the student code only into the isolated workspace (tmpfs/scratch).
    # The parent (executor) is responsible for wiping/removing this workspace
    # entirely after the run; nothing here touches the host.
    ext = {"python": "py"}.get(language, "py")
    workdir = tempfile.mkdtemp(prefix="sandbox_run_")
    code_path = os.path.join(workdir, f"solution.{ext}")
    try:
        with open(code_path, "w", encoding="utf-8") as fh:
            fh.write(code)

        results = []
        for t in tests:
            result = _run_test(runner(code_path), t.get("stdin", ""), timeout_s)
            result["name"] = t.get("name", "")
            passed = (
                (not result["timed_out"])
                and result["exit_code"] == 0
                and result["stdout"].strip() == t.get("expected", "").strip()
            )
            result["passed"] = passed
            results.append(result)
    finally:
        # Wipe the workspace inside the container.
        shutil.rmtree(workdir, ignore_errors=True)

    print(json.dumps({"tests": results}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
