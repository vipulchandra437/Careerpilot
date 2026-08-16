export type CodeLanguage = "python" | "javascript";

export interface TestCase {
  args: unknown[];
  expected: unknown;
}

export interface TestCaseResult {
  ok: boolean;
  got: unknown;
  expected: unknown;
  error?: string;
}

export interface ExecutionOutcome {
  passed: number;
  total: number;
  results: TestCaseResult[];
  compileError?: string;
  runtimeError?: string;
  timedOut: boolean;
  runtimeMs: number;
}

/**
 * JSON deep-equality used by the JS test harness. Function names and harness
 * locals are prefixed with `__cp` so user solution code cannot shadow them.
 * NaN compares equal to NaN.
 */
const JS_HARNESS_FUNCTIONS = `function __cpDeepEqual(a, b) {
  if (a === b) return true;
  if (a !== a && b !== b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a); const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!kb.includes(k)) return false;
    if (!__cpDeepEqual(a[k], b[k])) return false;
  }
  return true;
}
`;

export function buildPythonWrapper(code: string, cases: TestCase[]): string {
  const encoded = JSON.stringify(cases);
  return `${code}

import json, sys, os, traceback

def __cp_safe(v):
    if isinstance(v, float) and v != v:
        return "NaN"
    if isinstance(v, float) and v in (float("inf"), float("-inf")):
        return "Infinity" if v > 0 else "-Infinity"
    if isinstance(v, dict):
        return {k: __cp_safe(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [__cp_safe(x) for x in v]
    return v

__cp_cases = json.loads(${JSON.stringify(encoded)})
__cp_results = []
for __cp_c in __cp_cases:
    try:
        __cp_got = solution(*__cp_c["args"])
        __cp_results.append({"ok": __cp_got == __cp_c["expected"], "got": __cp_safe(__cp_got), "expected": __cp_safe(__cp_c["expected"])})
    except Exception:
        __cp_results.append({"ok": False, "error": traceback.format_exc(limit=1).strip().splitlines()[-1], "expected": __cp_safe(__cp_c["expected"])})
print("__RESULTS__" + json.dumps(__cp_results, default=str, allow_nan=False))
sys.stdout.flush()
# Hard-exit so background threads spawned by user code cannot print a forged
# marker after the real one; os._exit skips interpreter shutdown.
os._exit(0)
`;
}

export function buildJsWrapper(code: string, cases: TestCase[]): string {
  const encoded = JSON.stringify(cases);
  return `${JS_HARNESS_FUNCTIONS}
${code}

(async () => {
  const __cp_cases = ${encoded};
  const __cp_results = [];
  for (const __cp_c of __cp_cases) {
    try {
      const __cp_got = await solution(...__cp_c.args);
      __cp_results.push({ ok: __cpDeepEqual(__cp_got, __cp_c.expected), got: __cp_got, expected: __cp_c.expected });
    } catch (e) {
      __cp_results.push({ ok: false, error: String(e && e.message ? e.message : e), expected: __cp_c.expected });
    }
  }
  let __cp_out;
  try {
    __cp_out = JSON.stringify(__cp_results);
  } catch {
    __cp_results.forEach((r) => {
      try { r.got = JSON.stringify(r.got); } catch { r.got = String(r.got); }
      try { r.expected = JSON.stringify(r.expected); } catch { r.expected = String(r.expected); }
    });
    __cp_out = JSON.stringify(__cp_results);
  }
  try {
    // Synchronous write guarantees the marker reaches the pipe before we exit,
    // and process.exit(0) kills any deferred timers that could forge output.
    const fs = require("fs");
    fs.writeSync(1, "__RESULTS__" + __cp_out);
  } catch {
    console.log("__RESULTS__" + __cp_out);
  }
  process.exit(0);
})();
`;
}

/**
 * Parse the harness output marker. Returns the parsed per-case results or null
 * when the marker was not found / could not be parsed.
 */
export function parseHarnessOutput(stdout: string): {
  parsed: TestCaseResult[] | null;
  markerFound: boolean;
} {
  const marker = "__RESULTS__";
  // The harness always prints its marker LAST, so take the last occurrence:
  // user code that prints "__RESULTS__" (accidentally or maliciously) before
  // a forged JSON array must not be able to spoof pass/fail results.
  const markerIdx = stdout.lastIndexOf(marker);
  if (markerIdx === -1) {
    return { parsed: null, markerFound: false };
  }
  try {
    const parsed = JSON.parse(stdout.slice(markerIdx + marker.length)) as TestCaseResult[];
    return { parsed, markerFound: true };
  } catch {
    return { parsed: null, markerFound: true };
  }
}

export function outcomeErrorText(stdout: string, stderr: string, timedOut: boolean): string {
  if (timedOut) return "Code execution timed out.";
  return (stderr || stdout || "No test output produced.").slice(0, 2000);
}
