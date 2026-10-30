import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRACTICE_PROBLEMS,
  type PracticeDifficulty,
  type PracticeProblem,
} from "@/lib/practice-problems";

export const Route = createFileRoute("/practice")({
  component: PracticePage,
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

function Scorecard({
  difficulty,
  solved,
  total,
}: {
  difficulty: PracticeDifficulty;
  solved: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((solved / total) * 100) : 0;
  return (
    <div className="flex-1 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted">{difficulty}</span>
        <span className={cn("text-sm font-medium", DIFFICULTY_TEXT[difficulty])}>
          {solved}/{total}
        </span>
      </div>
      {percent > 0 && (
        <div className="mt-2 h-1.5 w-full rounded-sm bg-elevated">
          <div
            className={cn(
              "h-full rounded-sm",
              difficulty === "Easy"
                ? "bg-success"
                : difficulty === "Medium"
                ? "bg-bone"
                : "bg-danger",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}

function Scoreboard({ solved }: { solved: Set<string> }) {
  const stats = useMemo(() => {
    const totals: Record<PracticeDifficulty, number> = {
      Easy: 0,
      Medium: 0,
      Hard: 0,
    };
    const solvedCount: Record<PracticeDifficulty, number> = {
      Easy: 0,
      Medium: 0,
      Hard: 0,
    };
    for (const p of PRACTICE_PROBLEMS) {
      totals[p.difficulty]++;
      if (solved.has(p.id)) {
        solvedCount[p.difficulty]++;
      }
    }
    return { totals, solvedCount };
  }, [solved]);

  return (
    <section>
      <h2 className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">
        Your Progress
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        {(["Easy", "Medium", "Hard"] as const).map((diff) => (
          <Scorecard
            key={diff}
            difficulty={diff}
            solved={stats.solvedCount[diff]}
            total={stats.totals[diff]}
          />
        ))}
      </div>
    </section>
  );
}

const FILTER_OPTIONS: Array<PracticeDifficulty | "All"> = [
  "All",
  "Easy",
  "Medium",
  "Hard",
];

function PracticePage() {
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] =
    useState<PracticeDifficulty | "All">("All");
  const [solved, setSolved] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSolved(readSolved());
  }, []);

  const filtered = useMemo(() => {
    return PRACTICE_PROBLEMS.filter((p) => {
      const matchesSearch = p.title
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesDifficulty =
        difficultyFilter === "All" || p.difficulty === difficultyFilter;
      return matchesSearch && matchesDifficulty;
    });
  }, [search, difficultyFilter]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl tracking-tight">
          Practice Problems
        </h1>
        <p className="mt-2 text-muted">
          Sharpen your coding skills with curated problems.
        </p>
      </header>

      <Scoreboard solved={solved} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <input
            type="search"
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field w-full"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto sm:justify-normal">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setDifficultyFilter(f)}
              className={cn(
                "rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                difficultyFilter === f
                  ? "bg-primary text-primary-fg"
                  : "text-muted hover:bg-elevated hover:text-fg",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-muted">
            No problems match your search.
          </p>
        ) : (
          filtered.map((problem) => (
            <ProblemRow
              key={problem.id}
              problem={problem}
              solved={solved.has(problem.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ProblemRow({
  problem,
  solved,
}: {
  problem: PracticeProblem;
  solved: boolean;
}) {
  return (
    <Link
      to="/practice/$problemId"
      params={{ problemId: problem.id }}
      className="group block rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-elevated"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {solved && <CheckCircle2 className="size-4 text-success" />}
            <h3 className="font-medium group-hover:text-primary">
              {problem.title}
            </h3>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {problem.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-sm bg-panel px-2 py-0.5 text-xs text-faint"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <DifficultyBadge difficulty={problem.difficulty} />
      </div>
    </Link>
  );
}
