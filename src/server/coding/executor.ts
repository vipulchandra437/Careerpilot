import { executeCode as executeLocal } from "./local-executor";
import { executeCode as executePiston, type CodeLanguage, type ExecutionOutcome } from "./piston.service";

export type { CodeLanguage, ExecutionOutcome } from "./harness";

/**
 * Pick the code-execution backend. Defaults to local in development so the
 * coding feature works out of the box; set EXECUTION_PROVIDER=piston for a
 * self-hosted Piston (or Judge0-style) sandbox in production.
 */
export async function executeCode(
  language: CodeLanguage,
  code: string,
  cases: { args: unknown[]; expected: unknown }[],
  timeLimitMs: number,
): Promise<ExecutionOutcome> {
  const provider = (process.env.EXECUTION_PROVIDER ?? "local").toLowerCase();

  if (provider === "piston") {
    return executePiston(language, code, cases, timeLimitMs);
  }

  // Fail closed: running untrusted user code as the server OS user is RCE.
  // The local executor is for development only.
  if (process.env.NODE_ENV === "production") {
    return {
      passed: 0,
      total: cases.length,
      results: [],
      runtimeError:
        "Code execution is disabled: EXECUTION_PROVIDER=piston is required in production.",
      timedOut: false,
      runtimeMs: 0,
    };
  }
  return executeLocal(language, code, cases, timeLimitMs);
}
