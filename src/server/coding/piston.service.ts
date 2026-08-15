const PISTON_API_URL = (process.env.PISTON_API_URL ?? "https://emkc.org/api/v2/piston").replace(/\/+$/, "");
const PISTON_API_KEY = process.env.PISTON_API_KEY ?? "";
const RUNTIMES_URL = `${PISTON_API_URL}/runtimes`;
const EXECUTE_URL = `${PISTON_API_URL}/execute`;

import {
  buildJsWrapper,
  buildPythonWrapper,
  parseHarnessOutput,
  outcomeErrorText,
  type TestCase,
  type CodeLanguage,
  type ExecutionOutcome,
} from "./harness";

export type { CodeLanguage, ExecutionOutcome } from "./harness";

interface PistonRuntime {
  language: string;
  version: string;
}

let cachedRuntimes: PistonRuntime[] | null = null;

async function getRuntimes(): Promise<PistonRuntime[]> {
  if (cachedRuntimes) return cachedRuntimes;
  try {
    const res = await fetch(RUNTIMES_URL, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      cachedRuntimes = (await res.json()) as PistonRuntime[];
    }
  } catch {
    // fall through to known versions
  }
  return cachedRuntimes ?? [];
}

function pickVersion(language: string): string {
  const known: Record<string, string> = { python: "3.10.0", javascript: "18.15.0" };
  return known[language] ?? "";
}

/** Run user code against test cases via the Piston sandbox. */
export async function executeCode(
  language: CodeLanguage,
  code: string,
  cases: TestCase[],
  timeLimitMs: number,
): Promise<ExecutionOutcome> {
  const runtimes = await getRuntimes();
  const available = runtimes.filter((r) => r.language === language);
  const version =
    available.find((r) => r.version === pickVersion(language))?.version ??
    available[0]?.version ??
    pickVersion(language);

  const fileContent = language === "python" ? buildPythonWrapper(code, cases) : buildJsWrapper(code, cases);

  const runTimeoutMs = Math.min(timeLimitMs, 15000);
  const body = {
    language,
    version,
    files: [{ content: fileContent }],
    compile_timeout: 10000,
    run_timeout: runTimeoutMs,
    run_cpu_time: runTimeoutMs,
    run_memory_limit: 512 * 1024 * 1024,
  };

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(EXECUTE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(PISTON_API_KEY ? { Authorization: `Bearer ${PISTON_API_KEY}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(runTimeoutMs + 10000),
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    return {
      passed: 0,
      total: cases.length,
      results: [],
      runtimeError: timedOut
        ? "Code execution timed out."
        : "Code sandbox is unreachable. Please try again.",
      timedOut,
      runtimeMs: Date.now() - started,
    };
  }

  if (!res.ok) {
    return {
      passed: 0,
      total: cases.length,
      results: [],
      runtimeError:
        res.status === 401 || res.status === 403
          ? "Code sandbox is not configured. Set PISTON_API_KEY or point PISTON_API_URL at a self-hosted Piston instance."
          : `Sandbox error (${res.status}). Please try again.`,
      timedOut: false,
      runtimeMs: Date.now() - started,
    };
  }

  const data = (await res.json()) as {
    run?: { stdout?: string; stderr?: string; code?: number; signal?: string | null };
    compile?: { stderr?: string; code?: number };
  };

  const runtimeMs = Date.now() - started;
  const stdout = data.run?.stdout ?? "";
  const stderr = data.run?.stderr ?? "";
  const timedOut = Boolean(data.run?.signal && data.run.signal !== null);
  const compileError = data.compile?.stderr;

  if (compileError) {
    return {
      passed: 0,
      total: cases.length,
      results: [],
      compileError: compileError.slice(0, 2000),
      timedOut: false,
      runtimeMs,
    };
  }

  const { parsed, markerFound } = parseHarnessOutput(stdout);
  if (!markerFound) {
    return {
      passed: 0,
      total: cases.length,
      results: [],
      runtimeError: outcomeErrorText(stdout, stderr, timedOut),
      timedOut,
      runtimeMs,
    };
  }
  if (!parsed) {
    return {
      passed: 0,
      total: cases.length,
      results: [],
      runtimeError: "Could not parse sandbox output.",
      timedOut: false,
      runtimeMs,
    };
  }

  const passed = parsed.filter((r) => r.ok).length;
  return {
    passed,
    total: cases.length,
    results: parsed,
    timedOut,
    runtimeMs,
  };
}
