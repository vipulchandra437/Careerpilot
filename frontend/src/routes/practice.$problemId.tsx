import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PRACTICE_PROBLEMS,
  type PracticeDifficulty,
} from "@/lib/practice-problems";

export const Route = createFileRoute("/practice/$problemId")({
  component: PracticeProblemPage,
});

const SOLVED_KEY = "practice-solved";

/** Safely read solved problem IDs from localStorage. Returns a Set. */
function readSolved(): Set<string> {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return new Set();
  }
  try {
    const raw = window.localStorage.getItem(SOLVED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

/** Safely write solved problem IDs to localStorage. */
function saveSolved(solved: Set<string>) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
  try {
    window.localStorage.setItem(SOLVED_KEY, JSON.stringify(Array.from(solved)));
  } catch {
    // quota exceeded or disabled – ignore
  }
}

const DIFFICULTY_BG: Record<PracticeDifficulty, string> = {
  Easy: "bg-success/15",
  Medium: "bg-bone/15",
  Hard: "bg-danger/15",
};

const DIFFICULTY_TEXT: Record<PracticeDifficulty, string> = {
  Easy: "text-success",
  Medium: "text-bone",
  Hard: "text-danger",
};

function DifficultyBadge({ difficulty }: { difficulty: PracticeDifficulty }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-medium",
        DIFFICULTY_BG[difficulty],
        DIFFICULTY_TEXT[difficulty],
      )}
    >
      {difficulty}
    </span>
  );
}

function PracticeProblemPage() {
  const { problemId } = useParams({ from: "/practice/$problemId" });
  const problem = PRACTICE_PROBLEMS.find((p) => p.id === problemId);
  const [solved, setSolved] = useState<Set<string>>(() => readSolved());

  useEffect(() => {
    setSolved(readSolved());
  }, []);

  if (!problem) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-display text-2xl tracking-tight text-fg">
          Problem not found
        </h1>
        <p className="text-muted">
          We couldn't find the problem you're looking for.
        </p>
        <Link to="/practice">
          <Button variant="ghost" size="sm">
            ← Back to Practice
          </Button>
        </Link>
      </div>
    );
  }

  const isSolved = solved.has(problem.id);

  function toggleSolved() {
    setSolved((prev) => {
      const next = new Set(prev);
      if (next.has(problemId)) {
        next.delete(problemId);
      } else {
        next.add(problemId);
      }
      saveSolved(next);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
      {/* ── Left: problem details ── */}
      <article className="space-y-5 border-b border-border bg-surface p-5 lg:border-r lg:border-b-0">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl tracking-tight text-fg">
            {problem.title}
          </h1>
          <DifficultyBadge difficulty={problem.difficulty} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {problem.tags.map((tag) => (
            <span
              key={tag}
              className="inline-block rounded-sm bg-panel px-2 py-0.5 text-xs text-faint"
            >
              {tag}
            </span>
          ))}
        </div>

        <div>
          <h2 className="text-xs font-medium tracking-wide text-muted uppercase">
            Description
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted whitespace-pre-line">
            {problem.description}
          </p>
        </div>

        {problem.constraints && (
          <div>
            <h3 className="text-xs font-medium tracking-wide text-muted uppercase">
              Constraints
            </h3>
            <pre className="mt-2 rounded-md bg-elevated p-3 font-mono text-xs leading-relaxed text-stone whitespace-pre-wrap">
              {problem.constraints}
            </pre>
          </div>
        )}

        <div>
          <h3 className="text-xs font-medium tracking-wide text-muted uppercase">
            Example
          </h3>
          <div className="mt-2 space-y-2">
            <pre className="rounded-md bg-elevated p-3 font-mono text-xs leading-relaxed text-stone">
              <span className="text-fg">Input:</span> {problem.example.input}
            </pre>
            <pre className="rounded-md bg-elevated p-3 font-mono text-xs leading-relaxed text-stone">
              <span className="text-fg">Output:</span> {problem.example.output}
            </pre>
            {problem.example.explanation && (
              <pre className="rounded-md bg-elevated p-3 font-mono text-xs leading-relaxed text-stone">
                <span className="text-fg">Explanation:</span>{" "}
                {problem.example.explanation}
              </pre>
            )}
          </div>
        </div>

        {problem.starterCode && (
          <div>
            <h3 className="text-xs font-medium tracking-wide text-muted uppercase">
              Starter Code
            </h3>
            <pre className="mt-2 rounded-md bg-elevated p-3 font-mono text-xs leading-relaxed text-stone whitespace-pre-wrap">
              {problem.starterCode}
            </pre>
          </div>
        )}
      </article>

      {/* ── Right: code area ── */}
      <div className="flex min-h-[420px] flex-col bg-editor">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted">
            JavaScript · Write your solution below
          </span>
          <div className="flex gap-2">
            <Link to="/practice">
              <Button variant="ghost" size="sm">
                ← Back to List
              </Button>
            </Link>
            <Button
              size="sm"
              variant={isSolved ? "ghost" : "primary"}
              onClick={toggleSolved}
            >
              {isSolved ? "✓ Solved" : "Mark as Solved"}
            </Button>
          </div>
        </div>

        <textarea
          placeholder="// Write your code here..."
          className="min-h-[280px] flex-1 resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-fg outline-none"
          spellCheck={false}
          aria-label="Code editor"
        />

        <div className="border-t border-border p-4">
          <Button size="sm" variant="primary" disabled>
            Run (coming soon)
          </Button>
        </div>
      </div>
    </div>
  );
}