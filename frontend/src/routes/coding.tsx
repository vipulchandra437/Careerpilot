import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  PRACTICE_TOPICS,
  practiceApi,
  type Challenge,
  type PracticeDifficulty,
  type PracticeTopic,
} from "@/lib/api";

export const Route = createFileRoute("/coding")({ component: CodingPage });

type TestResult = { pass: boolean; input: string; expected: string; got: string };

function CodingPage() {
  const [topic, setTopic] = useState<PracticeTopic>("arrays");
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>("easy");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function load() {
    setBusy(true);
    setError(null);
    setHint(null);
    setResults(null);
    setSubmitted(false);
    try {
      const res = await practiceApi.challenge(topic, difficulty);
      setChallenge(res.challenge);
      setCode(res.challenge.starterCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate a challenge.");
    } finally {
      setBusy(false);
    }
  }

  /** Evaluate user code against the challenge's test cases (client-side). */
  function runTests(codeToRun: string, ch: Challenge): TestResult[] {
    const out: TestResult[] = [];
    for (const tc of ch.testCases) {
      let args: unknown[];
      let expected: unknown;
      try {
        const parsedInput = JSON.parse(tc.input);
        args = Array.isArray(parsedInput) ? parsedInput : [parsedInput];
        expected = JSON.parse(tc.expected);
      } catch {
        out.push({ pass: false, input: tc.input, expected: tc.expected, got: "(couldn't parse)" });
        continue;
      }
      try {
        const fn = new Function(`${codeToRun}\nreturn ${ch.functionName};`)() as (...a: unknown[]) => unknown;
        const got = fn(...args);
        const pass = JSON.stringify(got) === JSON.stringify(expected);
        out.push({ pass, input: tc.input, expected: tc.expected, got: JSON.stringify(got) });
      } catch (err) {
        out.push({
          pass: false,
          input: tc.input,
          expected: tc.expected,
          got: `runtime error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
    return out;
  }

  function run() {
    if (!challenge) return;
    setSubmitted(false);
    setResults(runTests(code, challenge));
  }

  async function submit() {
    if (!challenge) return;
    setBusy(true);
    setError(null);
    const r = runTests(code, challenge);
    setResults(r);
    const passed = r.length > 0 && r.every((t) => t.pass);
    try {
      await practiceApi.attempt(challenge.title, passed);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record your attempt.");
    } finally {
      setBusy(false);
    }
  }

  async function getHint() {
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      const res = await practiceApi.hint({
        title: challenge.title,
        description: challenge.description,
        code,
      });
      setHint(res.hint);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't fetch a hint.");
    } finally {
      setBusy(false);
    }
  }

  if (!challenge) {
    return (
      <div className="mx-auto max-w-xl space-y-8">
        <header>
          <h1 className="font-display text-3xl tracking-tight">Coding Test</h1>
          <p className="mt-2 text-muted">Pick a topic and difficulty — a challenge is generated for you.</p>
        </header>
        <div className="rounded-xl border border-border bg-surface p-6 md:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Topic</span>
              <select
                className="field"
                value={topic}
                onChange={(e) => setTopic(e.target.value as PracticeTopic)}
              >
                {PRACTICE_TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Difficulty</span>
              <select
                className="field"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as PracticeDifficulty)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          </div>
          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
          <Button size="lg" className="mt-6" onClick={() => void load()} disabled={busy}>
            {busy ? "Generating…" : "Start Challenge"}
          </Button>
        </div>
      </div>
    );
  }

  const passedCount =
    results && results.length > 0 ? results.filter((r) => r.pass).length : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl tracking-tight">{challenge.title}</h1>
          <span className="rounded-full bg-elevated px-2.5 py-0.5 text-xs text-primary">{topic}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setChallenge(null);
            setCode("");
            setResults(null);
            setHint(null);
          }}
          className="text-sm text-faint hover:text-fg"
        >
          New challenge →
        </button>
      </div>

      <div className="grid overflow-hidden rounded-xl border border-border lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
        <article className="space-y-5 border-b border-border bg-surface p-5 lg:border-r lg:border-b-0">
          <span className="inline-block rounded-sm bg-elevated px-2 py-0.5 text-xs text-warning">
            {difficulty}
          </span>
          <div>
            <h2 className="text-xs font-medium tracking-wide text-muted uppercase">Description</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{challenge.description}</p>
          </div>
          <div>
            <h3 className="text-xs font-medium tracking-wide text-muted uppercase">Test cases</h3>
            <div className="mt-2 space-y-2">
              {challenge.testCases.map((tc, i) => (
                <pre
                  key={i}
                  className="rounded-md bg-elevated p-3 font-mono text-xs leading-relaxed text-stone"
                >
                  fn({tc.input}) {"\u2192"} {tc.expected}
                </pre>
              ))}
            </div>
          </div>
          {hint ? (
            <div className="rounded-md border border-warning/40 bg-elevated p-3">
              <h3 className="text-xs font-medium tracking-wide text-warning uppercase">Hint</h3>
              <p className="mt-1 text-sm text-muted">{hint}</p>
            </div>
          ) : null}
        </article>

        <div className="flex min-h-[420px] flex-col bg-editor">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-xs text-muted">JavaScript · {challenge.functionName}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => void getHint()} disabled={busy}>
                Hint
              </Button>
              <Button size="sm" variant="ghost" onClick={run}>
                Run
              </Button>
              <Button size="sm" variant="accent" onClick={() => void submit()} disabled={busy}>
                {busy ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (results) setResults(null);
            }}
            spellCheck={false}
            className="min-h-[280px] flex-1 resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-bone outline-none"
          />
          <div className="h-28 overflow-auto border-t border-border px-4 py-3 font-mono text-xs">
            {error ? <p className="text-danger">{error}</p> : null}
            {results ? (
              <div className="space-y-1">
                {results.map((r, i) => (
                  <p key={i} className={r.pass ? "text-success" : "text-danger"}>
                    Test {i + 1}: {r.pass ? "passed" : "failed"} · fn({r.input}) {"\u2192"} {r.got}
                    {!r.pass ? ` (expected ${r.expected})` : ""}
                  </p>
                ))}
                {submitted && passedCount === results.length ? (
                  <p className="pt-1 text-success">All tests passed — attempt recorded.</p>
                ) : null}
                {submitted && passedCount < results.length ? (
                  <p className="pt-1 text-muted">Attempt recorded as failed — try again.</p>
                ) : null}
              </div>
            ) : (
              <p className="text-faint">Run to see sample tests.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}