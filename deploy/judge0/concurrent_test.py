"""Concurrent isolation test against a SELF-HOSTED Judge0.

Re-verifies the Phase 3 security property under concurrency, but against OUR
instance instead of the public CE. Run this ON the VM host (or anywhere that can
reach the self-hosted Judge0) and paste the output back.

Usage:
  python3 concurrent_test.py http://127.0.0.1:2358 <AUTHN_TOKEN>

What it does:
  - Launches N correct "sum of two ints" submissions and M malicious ones
    (CPU-hog infinite loop) concurrently through the batch endpoint.
  - Asserts every correct submission returns ITS OWN correct result (isolation:
    no cross-talk), and the hogs are cut off by the cpu_time_limit, never hang.
  - Reports pass/fail per category and any infra failures (should be ZERO).
"""

import base64
import concurrent.futures as cf
import json
import sys
import time
import urllib.request
import urllib.error

BASE = sys.argv[1].rstrip("/")
AUTH = sys.argv[2] if len(sys.argv) > 2 else ""
N_CORRECT = int(sys.argv[3]) if len(sys.argv) > 3 else 12
N_HOG = int(sys.argv[4]) if len(sys.argv) > 4 else 12


def b64(s: str) -> str:
    return base64.b64encode(s.encode("utf-8")).decode("ascii")


def headers():
    h = {"Content-Type": "application/json", "User-Agent": "judge0-concurrent-test/1.0"}
    if AUTH:
        h["X-Judge0-Token"] = AUTH
    return h


def http_json(req):
    """GET/POST returning parsed JSON, or raising urllib errors (handled by caller)."""
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def http_json_quiet(req):
    """Like http_json but returns {'error': <msg>} on transport/HTTP failure so a
    single rate-limit or hiccup does not abort the whole concurrent run. Counted
    as an infra failure by the caller (must be 0 against our own instance)."""
    try:
        return http_json(req)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace") if e.fp else str(e)
        return {"error": f"HTTP {e.code}: {body[:200]}"}
    except (urllib.error.URLError, OSError) as e:
        return {"error": f"transport: {e}"}


def submit(code: str, stdin: str, expected: str, hog: bool):
    payload = {
        "source_code": b64(code),
        "language_id": 71,
        "stdin": b64(stdin),
        # NOTE: no expected_output here. We compare stdout ourselves so a lonely
        # wrong-answer counts as FAIL, not the Judge0-side Runtime Error (NZEC)
        # that a mismatch produces. This keeps isolation assertions meaningful.
        "base64_encoded": "true",
        "enable_network": False,
        "cpu_time_limit": 1 if hog else 5,
        "memory_limit": 65536,
        "max_processes_and_or_threads": 32,
    }
    req = urllib.request.Request(BASE + "/submissions", data=json.dumps(payload).encode(), headers=headers(), method="POST")
    created = http_json_quiet(req)
    if "error" in created:
        return created
    token = created.get("token")
    if not token:
        return {"error": f"no token: {created}"}
    # poll until finished
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        g = urllib.request.Request(BASE + f"/submissions/{token}?base64_encoded=true", headers=headers())
        res = http_json_quiet(g)
        if "error" in res:
            return res
        sid = res.get("status", {}).get("id")
        if sid not in (1, 2):  # 1=InQueue 2=Processing
            return res
        time.sleep(0.25)
    return {"error": "poll timeout"}


def correct_one(i, a, b, want):
    r = submit(f"a,b=map(int,input().split())\nprint(a+b)", f"{a} {b}\n", want, hog=False)
    if "error" in r:
        return {"kind": "correct", "i": i, "infra": True, "error": r["error"]}
    stdout = _decode(r.get("stdout"))
    ok = stdout == want
    return {"kind": "correct", "i": i, "infra": False, "passed": ok, "got": stdout, "want": want, "status": (r.get("status") or {}).get("description"), "time": r.get("time")}


def hog_one(i):
    r = submit("while True: pass", "", "", hog=True)
    if "error" in r:
        return {"kind": "hog", "i": i, "infra": True, "error": r["error"]}
    sid = (r.get("status") or {}).get("id")
    timed_out = sid == 5  # Time Limit Exceeded
    return {"kind": "hog", "i": i, "infra": False, "timed_out": timed_out, "status": (r.get("status") or {}).get("description")}


def _decode(o):
    if not o:
        return ""
    try:
        return base64.b64decode(o).decode("utf-8", errors="replace")
    except Exception:
        return "<decode-error>"


def main():
    # each correct submission gets a UNIQUE expected result so cross-talk is detected
    cases = [(i, i * 1000, i + 1, f"{i * 1000 + i + 1}\n") for i in range(1, N_CORRECT + 1)]
    start = time.monotonic()

    with cf.ThreadPoolExecutor(max_workers=min(16, N_CORRECT + N_HOG)) as ex:
        futures = [ex.submit(correct_one, *c) for c in cases]
        futures += [ex.submit(hog_one, i) for i in range(N_HOG)]
        results = [f.result() for f in futures]

    elapsed = time.monotonic() - start
    corr = [r for r in results if r["kind"] == "correct"]
    hogs = [r for r in results if r["kind"] == "hog"]
    passed = sum(r["passed"] for r in corr if not r["infra"])
    hog_ok = sum(r["timed_out"] for r in hogs if not r["infra"])
    infra_fail = sum(1 for r in results if r["infra"])

    print("=== CONCURRENT ISOLATION vs SELF-HOSTED Judge0 ===")
    print(f"target: {BASE}")
    print(f"correct submissions: {passed}/{len(corr)} passed")
    for r in corr:
        if r["infra"]:
            print(f"  [INFRA] sub#{r['i']:>2} {r['error']}")
            continue
        mark = "OK " if r["passed"] else "FAIL"
        print(f"  [{mark}] sub#{r['i']:>2} got={r['got']!r} want={r['want']!r} status={r['status']} time={r['time']}")
    print(f"cpu-hogs: {hog_ok}/{len(hogs)} terminated by time limit")
    for r in hogs:
        if r["infra"]:
            print(f"  [INFRA] hog#{r['i']:>2} {r['error']}")
            continue
        print(f"  [{'OK ' if r['timed_out'] else 'FAIL'}] hog#{r['i']:>2} status={r['status']}")
    print(f"infra failures: {infra_fail} (MUST be 0)")
    print(f"elapsed: {elapsed:.1f}s")

    ok = passed == len(corr) and hog_ok == len(hogs) and infra_fail == 0
    print("RESULT:", "PASS — isolation holds" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())