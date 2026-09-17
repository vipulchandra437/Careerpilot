"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AuthBanner } from "@/components/auth/auth-banner";
import { roadmapStateSchema } from "@/lib/validators/roadmap";
import type { RoadmapState, RoadmapMilestone } from "@/lib/validators/roadmap";

export type { RoadmapWire } from "@/lib/validators/roadmap";

// WHY client polls instead of waiting on the POST: Vercel Hobby caps a function
// at ~60s and has no background jobs, so generation runs lazily on a GET inside
// the poll (see schemas' status/attemptStartedAt WHY). 4s is a gentle cadence
// that keeps a cold function warm-ish without hammering it; 45 polls ≈ 3 min is
// the patience budget before we ask the student to explicitly retry.
const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 45;

const GENERATING_COPY = ["Reading your resume gaps...", "Weaving in your interview themes...", "Building your 12-week plan...", "Almost there..."];

// WHY a task is a flat index into all-of-tasks concatenated (milestones in order):
// completedIdx (persisted Json) is just numbers — the viewer maps each number to
// a milestone+task for rendering. Toggling is a one-number write.
function flattenTasks(milestones: RoadmapMilestone[]): { milestoneIdx: number; task: string }[] {
  return milestones.flatMap((m, i) => m.tasks.map((task) => ({ milestoneIdx: i, task })));
}

// WHY current-week is derived from createdAt, not stored: it's deterministic
// date math (week 1 = the week the plan was generated); storing it would go stale
// immediately and add a column for no value.
function currentWeek(createdAt: string, totalWeeks: number): number {
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) return 1;
  const elapsed = Date.now() - start;
  const week = Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(Math.max(week, 1), totalWeeks);
}

// WHY offsets are computed from the original milestone list each render: the
// viewer never stores derived offsets (single source of truth = the milestones),
// and recomputing a handful of ints per render is free. Shared with the render
// loop below so the checkbox index math can never drift from what is rendered.
function globalIndex(milestones: RoadmapMilestone[], milestoneIdx: number, taskIdx: number): number {
  let offset = 0;
  for (let i = 0; i < milestoneIdx; i++) offset += milestones[i]!.tasks.length;
  return offset + taskIdx;
}

export function RoadmapViewer({ initial }: { initial: RoadmapState }) {
  const [state, setState] = useState<RoadmapState>(initial);
  const [completed, setCompleted] = useState<Set<number>>(
    () => (initial.status === "ready" ? new Set(initial.roadmap.completedIdx) : new Set())
  );
  const [banner, setBanner] = useState<string | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
  const pollHandle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const polls = useRef(0);

  const roadmap = state.status === "ready" ? state.roadmap : null;
  const isGenerating = state.status === "pending";

  const clearPoll = useCallback(() => {
    if (pollHandle.current) {
      clearTimeout(pollHandle.current);
      pollHandle.current = null;
    }
  }, []);

  // WHY the generate button cycles staged copy (DESIGN.md: loading ≠ bare
  // spinner): generation can take a minute-plus, so the button reflects progress.
  useEffect(() => {
    if (isGenerating) {
      const id = setInterval(() => setStageIndex((prev) => (prev + 1) % GENERATING_COPY.length), 2000);
      return () => clearInterval(id);
    }
  }, [isGenerating]);

  // WHY the poll is a self-rescheduling setTimeout (not setInterval): a slow
  // GET (the lazy worker actually generating) must be allowed to finish before
  // the next tick is scheduled, or in-flight generations would be abandoned.
  const pollOnce = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/roadmap");
      const parsed = roadmapStateSchema.safeParse(await res.json());
      if (!parsed.success) return true; // keep polling on a malformed payload
      const next = parsed.data;
      if (next.status === "ready") {
        setState(next);
        setCompleted(new Set(next.roadmap.completedIdx));
        setBanner(null);
        return true;
      }
      if (next.status === "failed") {
        setState(next);
        return true;
      }
      if (next.status === "none") {
        setState({ status: "none" });
        return true;
      }
      return false; // still pending → keep polling
    } catch {
      return true; // transient network error → keep polling, it self-heals
    }
  }, []);

  const startPolling = useCallback(() => {
    polls.current = 0;
    const tick = async () => {
      if (polls.current >= MAX_POLLS) {
        setState({ status: "failed", error: "Generation is taking longer than expected. Refresh and try again." });
        return;
      }
      polls.current += 1;
      const stop = await pollOnce();
      if (stop) return;
      pollHandle.current = setTimeout(tick, POLL_INTERVAL_MS);
    };
    void tick();
  }, [pollOnce]);

  useEffect(() => clearPoll, [clearPoll]);

  const generate = async () => {
    clearPoll();
    setState({ status: "pending" });
    setBanner(null);
    setConfirmingRegenerate(false);
    try {
      const res = await fetch("/api/roadmap", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setState({ status: "failed", error: data.error ?? "Couldn't start generation. Please try again." });
        return;
      }
      startPolling();
    } catch {
      setState({ status: "failed", error: "Could not reach the server. Please try again." });
    }
  };

  const toggleTask = async (idx: number) => {
    if (!roadmap) return;
    // WHY optimistic: instant checkbox feedback (DESIGN.md), with a revert if the
    // save fails — never a spinner across a task toggle.
    const nextSet = new Set(completed);
    if (nextSet.has(idx)) nextSet.delete(idx);
    else nextSet.add(idx);
    setCompleted(nextSet);
    const applied = Array.from(nextSet).sort((a, b) => a - b);

    try {
      const res = await fetch("/api/roadmap", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedIdx: applied }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setBanner(data.error ?? "Couldn't save your progress.");
        revertToggle(idx);
        return;
      }
      setBanner(null);
    } catch {
      setBanner("Could not reach the server. Please try again.");
      revertToggle(idx);
    }
  };

  // WHY a functional revert: two rapid toggles can race — a failing first toggle
  // must only undo ITS OWN flip, not reset to a stale pre-both-toggles snapshot
  // (which would wipe a second, successful toggle's optimistic state). The
  // updater inverts `idx` against whatever is currently true.
  const revertToggle = (idx: number) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const tasks = useMemo(
    () => (roadmap ? flattenTasks(roadmap.content.milestones) : []),
    [roadmap]
  );

  if (!roadmap) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">Your 12-week roadmap</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Generates once, grounded in your actual resume gaps, interview themes, and target company. Adjust it anytime.
        </p>

        {state.status === "failed" && (
          <div className="mt-4 space-y-3">
            <AuthBanner message={state.error ?? "Couldn't generate your roadmap — please try again."} />
            <Button onClick={generate} className="mt-2">
              Try again
            </Button>
          </div>
        )}

        {isGenerating && (
          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium text-foreground">Generating your plan…</p>
            <p className="text-sm text-muted-foreground">
              This usually takes 1–2 minutes. Keep this tab open — your plan appears here automatically.
            </p>
          </div>
        )}

        {state.status === "none" && (
          <Button onClick={generate} disabled={isGenerating} className="mt-6">
            {isGenerating ? GENERATING_COPY[stageIndex % GENERATING_COPY.length] : "Generate my roadmap"}
          </Button>
        )}
      </div>
    );
  }

  const week = currentWeek(roadmap.createdAt, roadmap.content.milestones.length);
  const done = completed.size;
  const total = tasks.length;
  const nextTask = tasks.find((t, i) => !completed.has(i));

  return (
    <div className="space-y-6">
      {banner && <AuthBanner message={banner} />}

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">Your 12-week roadmap</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Week {week} of {roadmap.content.milestones.length} · {done}/{total} tasks done
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {confirmingRegenerate ? (
              <>
                <p className="text-sm text-amber-800">Regenerating replaces your current plan and clears progress.</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={generate} disabled={isGenerating}>
                    {isGenerating ? GENERATING_COPY[stageIndex % GENERATING_COPY.length] : "Yes, regenerate"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmingRegenerate(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setConfirmingRegenerate(true)}>
                Regenerate
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar (deterministic, LLM never scores anything here) */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-violet-600 transition-all"
            style={{ width: total ? `${Math.round((done / total) * 100)}%` : "0%" }}
          />
        </div>

        {roadmap.content.focusAreas.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {roadmap.content.focusAreas.map((f) => (
              <span key={f.skill} title={f.reason} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                {f.skill}{f.weeks > 1 ? ` · ${f.weeks}w` : ""}
              </span>
            ))}
          </div>
        )}

        {nextTask ? (
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Next up:</span> {nextTask.task}
          </p>
        ) : (
          <p className="mt-4 text-sm text-foreground">
            Every task complete — regenerating builds your next challenge.
          </p>
        )}
      </div>

      {/* Vertical weekly timeline (scope: weekly goal + tasks + resource) */}
      <ol className="space-y-6">
        {roadmap.content.milestones.map((milestone, mIdx) => (
          <li key={milestone.week} className="relative pl-6 sm:pl-8">
            <span className="absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
              {milestone.week}
            </span>
            <div className={`rounded-lg border p-4 ${milestone.week === week ? "border-violet-300 bg-violet-50/40" : "border-border bg-card"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium text-foreground">Week {milestone.week}: {milestone.goal}</h3>
                {milestone.week === week && (
                  <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                    Current week
                  </span>
                )}
              </div>
              <ul className="mt-3 space-y-1.5">
                {milestone.tasks.map((task, tIdx) => {
                  const globalIdx = globalIndex(roadmap.content.milestones, mIdx, tIdx);
                  const checked = completed.has(globalIdx);
                  return (
                    <li key={`${milestone.week}-${tIdx}`} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTask(globalIdx)}
                        className="mt-0.5 h-4 w-4 accent-violet-600"
                        aria-label={`Mark complete: ${task}`}
                      />
                      <span className={checked ? "text-muted-foreground line-through" : "text-foreground"}>{task}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {milestone.linksTo === "practice" && (
                  <Link href="/dashboard/practice" className="font-medium text-primary hover:underline">
                    Practice this topic
                  </Link>
                )}
                {milestone.linksTo === "interview" && (
                  <Link href="/dashboard/interview/start" className="font-medium text-primary hover:underline">
                    Run a mock interview
                  </Link>
                )}
                {milestone.resource && (
                  <span className="text-muted-foreground">Resource: {milestone.resource}</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}