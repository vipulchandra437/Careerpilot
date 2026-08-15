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

/** JSON deep-equality used by the JS test harness. */
const JS_HARNESS_FUNCTIONS = `function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a); const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!kb.includes(k)) return false;
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}
`;

export function buildPythonWrapper(code: string, cases: TestCase[]): string {
  const encoded = JSON.stringify(cases);
  return `${code}

import json, time, traceback

_cases = json.loads(${JSON.stringify(encoded)})
_start = time.time()
_results = []
for _c in _cases:
    try:
        _got = solution(*_c["args"])
        _results.append({"ok": _got == _c["expected"], "got": _got, "expected": _c["expected"]})
    except Exception:
        _results.append({"ok": False, "error": traceback.format_exc(limit=1).strip().splitlines()[-1], "expected": _c["expected"]})
print("__RESULTS__" + json.dumps(_results))
`;
}

export function buildJsWrapper(code: string, cases: TestCase[]): string {
  const encoded = JSON.stringify(cases);
  return `${JS_HARNESS_FUNCTIONS}
${code}

const _cases = ${encoded};
const _start = Date.now();
const _results = [];
for (const _c of _cases) {
  try {
    const _got = solution(..._c.args);
    _results.push({ ok: deepEqual(_got, _c.expected), got: _got, expected: _c.expected });
  } catch (e) {
    _results.push({ ok: false, error: String(e), expected: _c.expected });
  }
}
console.log("__RESULTS__" + JSON.stringify(_results));
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
  const markerIdx = stdout.indexOf(marker);
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
