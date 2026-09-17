"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AuthBanner } from "@/components/auth/auth-banner";
import { PRACTICE_TOPICS } from "@/lib/validators/practice";
import { runCode, type CodeResult } from "@/lib/code-runner";

type Challenge = {
  title: string;
  description: string;
  starterCode: string;
  functionName: string;
  testCases: { input: string; expected: string }[];
};

type Phases = "pick" | "loading" | "work" | "running" | "hinting";

export function PracticeWorkspace() {
  const [phase, setPhase] = useState<Phases>("pick");
  const [topic, setTopic] = useState<string>("arrays");
  const [difficulty, setDifficulty] = useState<string>("easy");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<CodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);

  const generate = async () => {
    setPhase("loading");
    setError(null);
    setResult(null);
    setHint(null);
    setRecorded(false);
    try {
      const res = await fetch("/api/practice/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, difficulty }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; challenge?: Challenge };
      if (!res.ok || !data.challenge) {
        setError(data.error ?? "Couldn't generate a challenge. Please try again.");
        setPhase("pick");
        return;
      }
      setChallenge(data.challenge);
      setCode(data.challenge.starterCode);
      setPhase("work");
    } catch {
      setError("Could not reach the server. Please try again.");
      setPhase("pick");
    }
  };

  const run = async () => {
    if (!challenge) return;
    setPhase("running");
    setError(null);
    const res = await runCode(code, challenge.functionName, challenge.testCases);
    setResult(res);
    setPhase("work");
    if (!recorded) {
      // WHY record only the first run per attempt: keeps history meaningful
      // (one pass/fail row per challenge attempt, not per re-run).
      try {
        await fetch("/api/practice/attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeTitle: challenge.title, passed: res.allPassed }),
        });
        setRecorded(true);
      } catch {
        // WHY swallow: history is best-effort; a failed write must not erase the
        // run result the student just saw.
      }
    }
  };

  const askHint = async () => {
    if (!challenge) return;
    setPhase("hinting");
    try {
      const res = await fetch("/api/practice/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: challenge.title, description: challenge.description, code }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; hint?: string };
      setHint(data.hint ?? data.error ?? "No hint right now — keep trying!");
    } catch {
      setHint("Couldn't fetch a hint right now.");
    } finally {
      setPhase("work");
    }
  };

  if (phase === "pick" || phase === "loading") {
    return (
      <div className="rounded-lg border border-border p-6">
        <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">New challenge</h2>
        {error && <div className="mt-4"><AuthBanner message={error} /></div>}
        <div className="mt-4">
          <label htmlFor="topic" className="block text-sm font-medium text-foreground">Topic</label>
          <select id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {PRACTICE_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="mt-4">
          <label htmlFor="difficulty" className="block text-sm font-medium text-foreground">Difficulty</label>
          <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <Button onClick={generate} disabled={phase === "loading"} className="mt-6 w-full">
          {phase === "loading" ? "Finding a good challenge..." : "Generate challenge"}
        </Button>
      </div>
    );
  }

  if (!challenge) return null;

  const allPassed = result?.allPassed ?? false;

  return (
    <div className="space-y-4">
      {error && <AuthBanner message={error} />}

      <div className="rounded-lg border border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">{challenge.title}</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{challenge.description}</p>
          </div>
          <Button variant="outline" size="sm" onClick={generate} className="flex-shrink-0">
            New challenge
          </Button>
        </div>

        {/* WHY a textarea for the editor: v1 correctness over a heavy code-editor
            dependency (no new deps per RULES.md). A monospace textarea is enough
            to write and run a function. */}
        <label htmlFor="codeditor" className="mt-4 block text-sm font-medium text-foreground">Your solution (JavaScript)</label>
        <textarea
          id="codeditor"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          rows={12}
          className="mt-2 w-full rounded-md border border-input bg-background p-3 font-mono text-sm leading-relaxed"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={run} disabled={phase === "running"}>
            {phase === "running" ? "Running..." : "Run"}
          </Button>
          <Button variant="outline" onClick={askHint} disabled={phase === "hinting"}>
            {phase === "hinting" ? "Thinking..." : "Get a hint"}
          </Button>
        </div>

        {hint ? (
          <p className="mt-4 rounded-md border border-violet-200 bg-violet-50/40 px-4 py-2 text-sm text-violet-900">
            {hint}
          </p>
        ) : null}

        {result ? (
          <div className="mt-6">
            <div className="flex items-center gap-3">
              {result.timedOut ? (
                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Timed out</span>
              ) : result.fatalError ? (
                <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">Error</span>
              ) : allPassed ? (
                <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">All test cases passed 🎉</span>
              ) : (
                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Some cases failed — keep going</span>
              )}
            </div>

            {result.fatalError || result.timedOut ? (
              <p className="mt-2 text-sm text-muted-foreground">{result.fatalError}</p>
            ) : null}

            {/* WHY per-case list, not just a pass/fail: the student needs to see
                WHICH input it broke and the actual output vs expected (DESIGN.md:
                "always show WHAT"). */}
            <ul className="mt-4 space-y-2">
              {result.cases.map((c, i) => (
                <li key={i} className={`rounded-md border px-3 py-2 text-sm ${c.passed ? "border-green-200 bg-green-50/40" : c.error ? "border-red-200 bg-red-50/40" : "border-amber-200 bg-amber-50/40"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Case {i + 1}</span>
                    <span className={`text-xs font-medium ${c.passed ? "text-green-600" : c.error ? "text-red-600" : "text-amber-600"}`}>
                      {c.passed ? "Pass" : c.error ? "Error" : "Fail"}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">args: <code className="text-foreground">{c.input}</code></p>
                  <p className="text-muted-foreground">expected: <code className="text-foreground">{c.expected}</code></p>
                  {c.error ? (
                    <p className="text-red-700">{c.error}</p>
                  ) : c.passed ? null : (
                    <p className="text-muted-foreground">got: <code className="text-foreground">{c.output ?? "undefined"}</code></p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
