import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  interviewApi,
  type InterviewLength,
  type InterviewMode,
  type InterviewSession,
} from "@/lib/api";

export const Route = createFileRoute("/interview")({ component: InterviewPage });

function InterviewPage() {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [results, setResults] = useState<{ finalScore: number | null; summary: string | null } | null>(null);

  if (session) {
    return results ? (
      <Results session={session} results={results} onReset={() => { setSession(null); setResults(null); }} />
    ) : (
      <Live session={session} onResults={setResults} onAbandon={() => setSession(null)} />
    );
  }
  return <Setup onStart={setSession} />;
}

function Setup({ onStart }: { onStart: (s: InterviewSession) => void }) {
  const [mode, setMode] = useState<InterviewMode>("technical");
  const [length, setLength] = useState<InterviewLength>(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const session = await interviewApi.start({ mode, length });
      onStart(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the interview.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Mock Interview</h1>
        <p className="mt-2 text-muted">Practice in a focused environment that feels like the real thing.</p>
      </header>
      <div className="rounded-xl border border-border bg-surface p-6 md:p-8">
        <h2 className="mb-6 text-lg font-medium">Interview Setup</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Interview Type">
            <select className="field" value={mode} onChange={(e) => setMode(e.target.value as InterviewMode)}>
              <option value="technical">Technical</option>
              <option value="behavioral">Behavioral</option>
            </select>
          </Field>
          <Field label="Number of Questions">
            <select className="field" value={length} onChange={(e) => setLength(Number(e.target.value) as InterviewLength)}>
              <option value={5}>5 questions</option>
              <option value={10}>10 questions</option>
            </select>
          </Field>
        </div>
        <div className="mt-6 flex gap-6 border-y border-border py-4 text-sm text-muted">
          <span>
            Duration: <strong className="text-fg">{length} questions</strong>
          </span>
          <span>
            Stage: <strong className="text-fg">{mode === "technical" ? "Technical" : "Behavioral"}</strong>
          </span>
        </div>
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
        <Button size="lg" className="mt-6" onClick={start} disabled={busy}>
          {busy ? "Preparing…" : "Start Interview"}
        </Button>
      </div>
    </div>
  );
}

function Live({
  session,
  onResults,
  onAbandon,
}: {
  session: InterviewSession;
  onResults: (r: { finalScore: number | null; summary: string | null }) => void;
  onAbandon: () => void;
}) {
  const questions = session.transcript;
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState<"question" | "followUp">("question");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<
    Record<number, { score: number; feedback: string; followUp: string | null; followUpScore?: number; followUpFeedback?: string }>
  >({});
  const [error, setError] = useState<string | null>(null);

  const current = questions[turn];
  const answered = Object.keys(feedback).length;
  const pct = Math.min(100, ((turn + (phase === "followUp" ? 1 : 0)) / questions.length) * 100);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await interviewApi.answer(session.id, answer);
      await applyAnswer(res.evaluation.score, res.evaluation.feedback, res.followUp, res.allAnswered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't evaluate your answer. Try again.");
      setBusy(false);
    }
  }

  async function skip() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await interviewApi.answer(session.id, " ");
      await applyAnswer(res.evaluation.score, res.evaluation.feedback, res.followUp, res.allAnswered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't evaluate your answer. Try again.");
      setBusy(false);
    }
  }

  async function applyAnswer(score: number, evalFeedback: string, followUp: string | null, allAnswered: boolean) {
    const prev = feedback[turn] ?? { score: 0, feedback: "", followUp: null };
    const next =
      phase === "followUp"
        ? { ...feedback, [turn]: { ...prev, followUpScore: score, followUpFeedback: evalFeedback } }
        : { ...feedback, [turn]: { score, feedback: evalFeedback, followUp } };
    setFeedback(next);
    setAnswer("");

    if (allAnswered) {
      const finished = await interviewApi.finish(session.id);
      onResults({ finalScore: finished.finalScore, summary: finished.summary });
      return;
    }

    if (phase === "question" && followUp) {
      setPhase("followUp");
    } else {
      setTurn((t) => Math.min(t + 1, questions.length - 1));
      setPhase("question");
    }
  }

  const questionText = phase === "followUp" ? feedback[turn]?.followUp ?? current.followUp : current.question;
  const focusLabel = phase === "followUp" ? "Follow-up" : questions.length > 0 ? current.focus : "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl tracking-tight">
          {session.mode === "technical" ? "Technical" : "Behavioral"} Interview
        </h1>
        <p className="mt-2 text-muted">Stay focused. Answer clearly and think out loud.</p>
      </header>
      <div className="flex items-center gap-4 text-sm text-muted">
        <span>
          Question {turn + 1} of {questions.length}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <button type="button" onClick={onAbandon} className="text-xs text-faint hover:text-fg">
          Abandon
        </button>
      </div>
      {feedback[turn] && phase === "question" && answered > 0 ? (
        <section className="rounded-lg border border-border bg-surface p-4 text-sm">
          <p className="flex items-center gap-2 text-xs font-medium text-muted">
            Last answer
            <span className="rounded-full bg-elevated px-2 py-0.5 text-primary tabular-nums">
              {feedback[turn].score}/10
            </span>
          </p>
          <p className="mt-1 leading-relaxed text-muted">{feedback[turn].feedback}</p>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-surface p-6 md:p-8">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">
          {focusLabel || (session.mode === "technical" ? "Technical" : "Behavioral")}
        </p>
        <p className="mt-3 text-lg leading-relaxed">{questionText}</p>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <label className="text-xs font-medium text-muted">Your answer</label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={7}
          className="mt-2 w-full resize-y rounded-md border border-border bg-elevated p-3 text-sm text-fg outline-none"
          placeholder="Type your response here…"
        />
      </section>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex gap-3">
        <Button variant="ghost" onClick={() => void skip()} disabled={busy}>
          Skip
        </Button>
        <Button className="flex-1" onClick={() => void submit()} disabled={busy}>
          {busy ? "Evaluating…" : "Submit Answer →"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function Results({
  session,
  results,
  onReset,
}: {
  session: InterviewSession;
  results: { finalScore: number | null; summary: string | null };
  onReset: () => void;
}) {
  const score = results.finalScore ?? 0;
  const scoreText = results.finalScore === null ? "—" : `${Math.round(score * 10)}`;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Interview Score</h1>
        <p className="mt-1 font-display text-5xl tabular-nums text-primary">
          {scoreText}
          {results.finalScore !== null && <span className="ml-1 text-xl text-muted">/ 100</span>}
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          {session.mode === "technical" ? "Technical" : "Behavioral"} ·{" "}
          {session.questionCount} questions
        </p>
      </header>
      {results.summary ? (
        <section className="rounded-lg border border-border bg-surface p-5">
          <h3 className="mb-3 text-sm font-medium">Summary</h3>
          <p className="text-sm leading-relaxed text-muted">{results.summary}</p>
        </section>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={onReset} className="flex-1">
          Practice Again
        </Button>
        <Link to="/" className="flex-1">
          <Button variant="ghost" className="w-full">
            Continue Preparation
          </Button>
        </Link>
      </div>
    </div>
  );
}