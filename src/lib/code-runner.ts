// WHY this module only ever runs on the client (no "use server"): the execution
// sandbox is a browser Web Worker — student code never touches the server, the
// main UI thread, the DB, or the session. A server-based runner would require a
// paid sandbox (Judge0/Docker) which RULES.md forbids for v1.

export interface CodeTestCase {
  input: string; // JSON string: array of args to spread into the function
  expected: string; // JSON string: expected return value
}

export interface CodeResult {
  allPassed: boolean;
  timedOut: boolean;
  // WHY an op-level error string separate from per-case results: lets the UI
  // show a clean banner for "your code timed out / crashed" and a per-case list
  // otherwise.
  fatalError: string | null;
  cases: {
    input: string;
    expected: string;
    passed: boolean;
    output: string | null; // stringified actual output (for Show)
    error: string | null; // per-case run error
  }[];
}

export const RUN_TIMEOUT_MS = 5000;

// WHY a Blob worker rather than a .ts worker file: Next.js needs build config
// (worker-loader / web worker plugin) for bundler workers, but a Blob-injected
// worker needs zero config and keeps the whole sandbox self-contained. The code
// string is trusted (ours) — only the student code passed via postMessage is not.
//
// Exporting the builder lets tests boot the EXACT production script in a Node
// vm context (see _sandbox.eval.test.ts). Keep the script self-contained: it may
// only use globals that exist in both classic workers and a bare vm (JSON,
// Object, Array, Math, Function).
export function buildWorkerScript(): string {
  return `
    // Runs wholly inside the worker thread. Student code is evaluated via the
    // Function constructor inside a private IIFE — sanctioned because the worker
    // is the isolated context (no app, session, or DB reachable from it).
    self.onmessage = function (e) {
      var data = e.data;
      var code = data.code;
      var functionName = data.functionName;
      var testCases = data.testCases;
      var blockedFetch = function () { throw new Error("Network access is disabled in the sandbox."); };

      // WHY sanitize functionName: it is embedded in generated source below, so
      // only valid JS identifiers are allowed.
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(functionName)) {
        self.postMessage({ type: "error", message: "Invalid function name." });
        return;
      }

      var fnRef = null;
      try {
        // (function fetchShield(fetch){ ... }) — the fetch parameter shadows the
        // worker's global fetch for the whole student scope, so any attempt to
        // reach the network throws instead. Wrapping in an IIFE also keeps the
        // student's var/let/const contained, and the trailing return resolves the
        // function by its declared name for function-decl, var, and const styles.
        var mk = new Function("return (function fetchShield(fetch){\\n" + code + "\\nreturn typeof " + functionName + " !== 'undefined' ? " + functionName + " : null;\\n});");
        fnRef = mk()(blockedFetch);
      } catch (err) {
        self.postMessage({ type: "error", message: "Your code couldn't be prepared to run: " + (err && err.message ? err.message : err) });
        return;
      }

      if (typeof fnRef !== "function") {
        self.postMessage({ type: "error", message: "Couldn't find your function '" + functionName + "'. Keep the starter function name." });
        return;
      }

      // WHY per-case try/catch: one bad test input must not blank the whole run.
      // The student still sees which case errored and everything after still
      // executes.
      var results = [];
      for (var i = 0; i < testCases.length; i++) {
        var tc = testCases[i];
        var entry = { input: tc.input, expected: tc.expected, passed: false, output: null, error: null };
        try {
          var args = JSON.parse(tc.input);
          if (!Array.isArray(args)) args = [args];
          var expected = JSON.parse(tc.expected);
          var output = fnRef.apply(null, args);
          entry.output = JSON.stringify(output);
          entry.passed = deepStrictEqual(output, expected);
        } catch (err) {
          entry.error = String(err && err.message ? err.message : err);
        }
        results.push(entry);
      }
      self.postMessage({ type: "result", results: results });
    };

    function deepStrictEqual(a, b) {
      if (a === b) return true;
      if (typeof a !== typeof b) return false;
      if (a === null || b === null) return a === b;
      if (typeof a !== "object") return a === b;
      var aArr = Array.isArray(a), bArr = Array.isArray(b);
      if (aArr !== bArr) return false;
      if (aArr) {
        if (a.length !== b.length) return false;
        for (var i = 0; i < a.length; i++) if (!deepStrictEqual(a[i], b[i])) return false;
        return true;
      }
      var aK = Object.keys(a), bK = Object.keys(b);
      if (aK.length !== bK.length) return false;
      for (var j = 0; j < aK.length; j++) {
        var k = aK[j];
        if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
        if (!deepStrictEqual(a[k], b[k])) return false;
      }
      return true;
    }
  `;
}

// WHY a helper, not exported direct: keeps the Blob URL lifetime and termination
// logic in one place so every caller gets the same 5s timeout + cleanup.
function withWorker(code: string, functionName: string, testCases: CodeTestCase[]): Promise<{ type: string; results?: CodeResult["cases"]; message?: string }> {
  return new Promise((resolve, reject) => {
    const script = buildWorkerScript();
    const blob = new Blob([script], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    let settled = false;

    // WHY terminate-on-timeout: you cannot abort a synchronous running function,
    // but terminating the worker thread DOES stop it instantly. This is the only
    // reliable way to enforce the hard limit against infinite loops.
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      worker.terminate();
      URL.revokeObjectURL(url);
      reject(new Error("TIMED_OUT"));
    }, RUN_TIMEOUT_MS);

    worker.onmessage = (e: MessageEvent) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(e.data as { type: string; results?: CodeResult["cases"]; message?: string });
    };

    worker.onerror = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      reject(new Error(err.message || "Worker error"));
    };

    worker.postMessage({ code, functionName, testCases });
  });
}

// WHY runCode returns a normalized CodeResult rather than raw worker messages:
// the UI consumes one shape — fatal error vs per-case outcomes vs timeout.
export async function runCode(
  code: string,
  functionName: string,
  testCases: CodeTestCase[]
): Promise<CodeResult> {
  try {
    const msg = await withWorker(code, functionName, testCases);
    if (msg.type === "error") {
      return { allPassed: false, timedOut: false, fatalError: msg.message ?? "Your code failed to run.", cases: [] };
    }
    const cases = msg.results ?? [];
    const allPassed = cases.length > 0 && cases.every((c) => c.passed);
    return { allPassed, timedOut: false, fatalError: null, cases };
  } catch (err) {
    if (err instanceof Error && err.message === "TIMED_OUT") {
      return { allPassed: false, timedOut: true, fatalError: "Your code ran too long (over 5 seconds) — check for an infinite loop.", cases: [] };
    }
    return { allPassed: false, timedOut: false, fatalError: "Couldn't run your code in the sandbox.", cases: [] };
  }
}