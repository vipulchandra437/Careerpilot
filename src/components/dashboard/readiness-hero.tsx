// WHY a server component (no "use client"): the hero is pure presentation of
// already-computed data with zero interactivity — keeping it server-rendered
// avoids a client bundle for what is static markup. ReadinessActions is a
// separate export so the progress page can reuse the exactly-same action list.

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeReadiness, LEVEL_LABELS } from "@/lib/readiness";
import type { ReadinessDataset } from "@/server/readiness-data";

function ReadinessRing({ value }: { value: number }) {
  // WHY inline SVG for the ring: a progress ring is ~20 lines of SVG and needs
  // no chart dependency (RULES: zero new heavy deps). Draw order is: full track
  // circle, then a partial arc whose length equals value/100 of the
  // circumference; stroke-dashoffset reveals the arc from the top (rotate -90).
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const filled = (value / 100) * circumference;
  // WHY green only at interview-ready: colour is semantic encouragement — green
  // says "book the interview" without turning <80 into a failure label.
  const color = value >= 80 ? "text-green-600" : "text-violet-600";
  return (
    <div className="relative grid h-24 w-24 place-items-center">
      <svg viewBox="0 0 72 72" className="h-24 w-24 -rotate-90">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filled}
          className={color}
        />
      </svg>
      <div className="absolute text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

// WHY separate export: DESIGN.md requires top-3 actions next to ANY score —
// the progress page shows numbers too (share card), so it reuses this exact
// list rather than duplicating the "never a bare number" rule.
export function ReadinessActions({ actions }: { actions: string[] }) {
  return (
    <ol className="space-y-2">
      {actions.slice(0, 3).map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

// WHY contribution bars, not raw-score bars: weight multiplied by score is the
// only honest visual of how much each input *actually matters* to the number.
// The two fills sum to exactly readiness, so the breakdown is self-checkable.
function Breakdown({ dataset }: { dataset: ReadinessDataset }) {
  const parts = [
    {
      key: "resume",
      label: "Resume",
      score: dataset.resumeScore,
      weight: 0.4,
      fill: dataset.resumeScore == null ? 0 : Math.round(dataset.resumeScore * 0.4),
      barClass: "bg-slate-400",
    },
    {
      key: "interview",
      label: "Interview",
      score: dataset.interviewScore,
      weight: 0.6,
      fill: dataset.interviewScore == null ? 0 : Math.round(dataset.interviewScore * 0.6),
      barClass: "bg-violet-600",
    },
  ] as const;

  return (
    <div className="w-full max-w-sm space-y-4">
      {parts.map((part) => (
        <div key={part.key}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">{part.label}</span>
            <span className="font-medium text-foreground">
              {part.score == null ? "—" : part.score}
              <span className="text-muted-foreground"> × {part.weight * 100}%</span>
            </span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${part.label} contributes ${part.fill} points`}
          >
            <div className={`h-full rounded-full ${part.barClass}`} style={{ width: `${part.fill}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReadinessHero({ dataset }: { dataset: ReadinessDataset }) {
  // WHY recompute via the same pure function the rest of the app uses: the
  // headline number here MUST be byte-identical to the progress page's final
  // snapshot — importing computeReadiness guarantees that by construction.
  const { readiness, level, label } = computeReadiness(dataset.resumeScore, dataset.interviewScore);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        {/* WHY heading asks a question: brand voice is an encouraging coach, not
            a scoreboard (DESIGN.md) — "readiness" framed as progress, never a
            verdict. */}
        <CardTitle className="text-base">How hire-ready are you right now?</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          <div className="flex w-full flex-col items-center gap-2 md:w-auto md:items-start">
            <ReadinessRing value={readiness} />
            <div className="text-center md:text-left">
              <div className="text-lg font-semibold text-foreground">{LEVEL_LABELS[level]}</div>
              {label ? (
                <p className="mt-1 max-w-[16rem] text-sm text-muted-foreground">{label}</p>
              ) : (
                <p className="mt-1 max-w-[16rem] text-sm text-muted-foreground">
                  Resume 40% + interviews 60% — the number updates as you improve.
                </p>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col justify-center gap-8 md:max-w-sm">
            <Breakdown dataset={dataset} />
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Next up</p>
              <ReadinessActions actions={dataset.actions} />
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
          <span>{dataset.resumesParsed} resumes parsed</span>
          <span>{dataset.interviewsCompleted} interviews completed</span>
          <span>
            Latest interview score:{" "}
            {dataset.latestInterviewScore == null ? "—" : `${dataset.latestInterviewScore}/10`}
          </span>
          <Link href="/dashboard/progress" className="font-medium text-violet-600 hover:underline">
            View your progress →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}