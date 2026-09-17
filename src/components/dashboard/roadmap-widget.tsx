import Link from "next/link";
import type { RoadmapMilestone } from "@/lib/validators/roadmap";

// WHY a server component: the widget is pure derivation over already-fetched
// data (current week = date math on createdAt; next task = first unchecked).
// No client bundle, no extra API call — the dashboard page passes the row it
// already queried.

export interface RoadmapWidgetInput {
  content: { milestones: RoadmapMilestone[] };
  completedIdx: number[];
  createdAt: string;
}

export type RoadmapWidgetStatus = "none" | "pending" | "ready" | "failed";

function currentWeek(createdAt: string, totalWeeks: number): number {
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) return 1;
  const week = Math.floor((Date.now() - start) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(Math.max(week, 1), totalWeeks);
}

export function RoadmapWidget({ status, roadmap }: { status: RoadmapWidgetStatus; roadmap: RoadmapWidgetInput | null }) {
  // WHY status is the first gate: a pending row's content is a {} placeholder —
  // reaching into it for milestone counts would crash. The widget shows only the
  // lifecycle truth here and lets the roadmap page run the poll.
  if (status === "pending") {
    return (
      <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/40 p-5">
        <p className="font-medium text-foreground">Generating your roadmap…</p>
        <p className="mt-1 text-sm text-muted-foreground">
          It usually takes 1–2 minutes. Your plan appears here when it&apos;s ready.
        </p>
        <Link
          href="/dashboard/roadmap"
          className="mt-3 inline-flex items-center rounded-md border border-violet-300 bg-background px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100/40"
        >
          Open roadmap
        </Link>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="mt-3 rounded-lg border border-border p-5">
        <p className="font-medium text-foreground">Your roadmap didn&apos;t finish generating</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This is usually a temporary AI limit — retry from the roadmap page.
        </p>
        <Link
          href="/dashboard/roadmap"
          className="mt-3 inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-secondary/30"
        >
          Retry generation
        </Link>
      </div>
    );
  }

  if (status === "none" || !roadmap || roadmap.content.milestones.length === 0) {
    return (
      <div className="mt-3 rounded-lg border border-border p-5">
        <p className="font-medium text-foreground">Your 12-week roadmap awaits</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn your weak spots into a week-by-week study plan.
        </p>
        <Link
          href="/dashboard/roadmap"
          className="mt-3 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Build my roadmap
        </Link>
      </div>
    );
  }

  const weeks = roadmap.content.milestones.length;
  const week = currentWeek(roadmap.createdAt, weeks);

  const completed = new Set(roadmap.completedIdx);
  const done = completed.size;
  const tasks = roadmap.content.milestones.flatMap((m) => m.tasks);
  let offset = 0;
  let nextTask: { week: number; task: string } | null = null;
  for (let m = 0; m < roadmap.content.milestones.length; m++) {
    const milestone = roadmap.content.milestones[m]!;
    for (let t = 0; t < milestone.tasks.length; t++) {
      if (!completed.has(offset + t)) {
        nextTask = { week: milestone.week, task: milestone.tasks[t]! };
        break;
      }
    }
    if (nextTask) break;
    offset += milestone.tasks.length;
  }

  return (
    <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">Roadmap — Week {week} of {weeks}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {done}/{tasks.length} tasks done
          </p>
        </div>
        <Link
          href="/dashboard/roadmap"
          className="inline-flex items-center rounded-md border border-violet-300 bg-background px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100/40"
        >
          Open roadmap
        </Link>
      </div>
      {nextTask ? (
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Next task:</span> {nextTask.task}
          <span className="text-xs text-violet-600"> (Week {nextTask.week})</span>
        </p>
      ) : (
        <p className="mt-3 text-sm font-medium text-foreground">
          Every task complete — regenerate your roadmap for a fresh 12 weeks.
        </p>
      )}
    </div>
  );
}