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

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[executor] EXECUTION_PROVIDER=local in production. Prefer a self-hosted Piston/Judge0 sandbox.",
    );
  }
  return executeLocal(language, code, cases, timeLimitMs);
}
