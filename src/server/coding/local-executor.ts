import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildJsWrapper,
  buildPythonWrapper,
  parseHarnessOutput,
  outcomeErrorText,
  type TestCase,
  type ExecutionOutcome,
  type CodeLanguage,
} from "./harness";

const MAX_OUTPUT_BYTES = 256 * 1024;
const HARD_RUN_CAP_MS = 15000;

function extension(language: CodeLanguage): string {
  return language === "python" ? "py" : "js";
}

function command(language: CodeLanguage): { cmd: string; args: (string)[] } {
  if (language === "python") {
    return { cmd: process.env.PYTHON ?? "python", args: [] };
  }
  return { cmd: "node", args: [] };
}

/**
 * Run the harness file in a child process with a hard time limit.
 * On Windows this uses the host user's account, so it is intended for local
 * development. Use the Piston provider (or a self-hosted sandbox) in production.
 */
function runFile(
  cmd: string,
  args: string[],
  filePath: string,
  timeLimitMs: number,
): Promise<{ stdout: string; stderr: string; code: number | null; timedOut: boolean }> {
  return new Promise((resolve, reject) => {
    const limit = Math.min(Math.max(500, timeLimitMs), HARD_RUN_CAP_MS);
    // On POSIX, start the child as its own process group so a timeout can
    // SIGKILL the whole tree (grandchildren included), not just the direct child.
    const child = spawn(cmd, [...args, filePath], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      detached: process.platform !== "win32",
    });

    const stdoutChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderr = "";
    let settled = false;
    const getStdout = () => Buffer.concat(stdoutChunks).toString("utf8");
    const onData = (kind: "stdout" | "stderr") => (chunk: Buffer) => {
      if (kind === "stdout") {
        // Keep the LAST MAX_OUTPUT_BYTES: the harness prints its results
        // marker at the end, so front-truncation would discard the results
        // and every large-output solution would look like a timeout.
        stdoutChunks.push(chunk);
        stdoutBytes += chunk.length;
        while (stdoutBytes > MAX_OUTPUT_BYTES && stdoutChunks.length > 0) {
          const dropped = stdoutChunks.shift();
          if (dropped) stdoutBytes -= dropped.length;
        }
      } else if (kind === "stderr" && stderr.length < MAX_OUTPUT_BYTES) {
        stderr += chunk.toString("utf8");
      }
    };
    child.stdout.on("data", onData("stdout"));
    child.stderr.on("data", onData("stderr"));

    const killTree = () => {
      if (!child.pid) {
        child.kill("SIGKILL");
        return;
      }
      try {
        if (process.platform === "win32") {
          const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
            stdio: "ignore",
            windowsHide: true,
          });
          killer.unref();
        } else {
          process.kill(-child.pid, "SIGKILL");
        }
      } catch {
        child.kill("SIGKILL");
      }
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      killTree();
      resolve({ stdout: getStdout(), stderr, code: null, timedOut: true });
    }, limit);

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout: getStdout(), stderr, code, timedOut: false });
    });
  });
}

/** Execute user code against test cases using the local Python/Node runtimes. */
export async function executeCode(
  language: CodeLanguage,
  code: string,
  cases: TestCase[],
  timeLimitMs: number,
): Promise<ExecutionOutcome> {
  const dir = await mkdtemp(join(tmpdir(), "careerpilot-run-"));
  const filePath = join(dir, `solution.${extension(language)}`);
  const content = language === "python" ? buildPythonWrapper(code, cases) : buildJsWrapper(code, cases);

  try {
    await writeFile(filePath, content, "utf8");
  } catch {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    return {
      passed: 0,
      total: cases.length,
      results: [],
      runtimeError: "Code sandbox is unavailable. Please try again.",
      timedOut: false,
      runtimeMs: 0,
    };
  }

  const { cmd, args } = command(language);
  const started = Date.now();
  let run: { stdout: string; stderr: string; code: number | null; timedOut: boolean };
  try {
    run = await runFile(cmd, args, filePath, timeLimitMs);
  } catch (err) {
    const missing = err instanceof Error && (err as NodeJS.ErrnoException).code === "ENOENT";
    return {
      passed: 0,
      total: cases.length,
      results: [],
      runtimeError: missing
        ? `Could not find the ${language} runtime (${cmd}). Install it locally to run code.`
        : `Code sandbox is unavailable. Please try again.`,
      timedOut: false,
      runtimeMs: Date.now() - started,
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }

  const runtimeMs = Date.now() - started;
  const { parsed, markerFound } = parseHarnessOutput(run.stdout);
  if (!markerFound) {
    return {
      passed: 0,
      total: cases.length,
      results: [],
      runtimeError: outcomeErrorText(run.stdout, run.stderr, run.timedOut),
      timedOut: run.timedOut,
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
  return { passed, total: cases.length, results: parsed, timedOut: run.timedOut, runtimeMs };
}

export type LocalCodeLanguage = CodeLanguage;
export type LocalExecutionOutcome = ExecutionOutcome;
