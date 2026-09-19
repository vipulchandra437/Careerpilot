import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { roadmapApi, type RoadmapWire } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/roadmap")({ component: RoadmapPage });

function RoadmapPage() {
  const [status, setStatus] = useState<"none" | "pending" | "failed" | "ready">("none");
  const [roadmap, setRoadmap] = useState<RoadmapWire | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const state = await roadmapApi.get();
      setStatus(state.status);
      if (state.status === "ready") setRoadmap(state.roadmap);
      if (state.status === "failed") setError(state.error ?? "Roadmap generation failed.");
      return state;
    } catch {
      setError("Couldn't load your roadmap.");
      return null;
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [load]);

  const pollUntilDone = async () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      const state = await load();
      if (state && (state.status === "ready" || state.status === "failed")) {
        if (pollRef.current) window.clearInterval(pollRef.current);
      }
    }, 4000);
  };

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      await roadmapApi.generate();
      setStatus("pending");
      await pollUntilDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start roadmap generation.");
      setStatus("failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(idx: number) {
    if (!roadmap) return;
    const next = roadmap.completedIdx.includes(idx)
      ? roadmap.completedIdx.filter((i) => i !== idx)
      : [...roadmap.completedIdx, idx];
    setRoadmap({ ...roadmap, completedIdx: next });
    try {
      await roadmapApi.setProgress(next);
    } catch {
      // Optimistic update; reload to resync on next visit.
    }
  }

  if (status === "none") {
    return (
      <div className="mx-auto max-w-xl space-y-8">
        <header>
          <h1 className="font-display text-3xl tracking-tight">Career Roadmap</h1>
          <p className="mt-2 text-muted">A focused plan built from your readiness data.</p>
        </header>
        <div className="rounded-xl border border-border bg-surface p-6 md:p-8">
          <p className="text-sm leading-relaxed text-muted">
            You don’t have a roadmap yet. Generate one — it takes a few seconds and is
            personalized to your resume strength and interview history.
          </p>
          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
          <Button size="lg" className="mt-6" onClick={() => void generate()} disabled={busy}>
            {busy ? "Starting…" : "Generate My Roadmap"}
          </Button>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="mx-auto max-w-xl space-y-8">
        <header>
          <h1 className="font-display text-3xl tracking-tight">Career Roadmap</h1>
        </header>
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-10 text-center">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted">Generating your roadmap… this can take ~20 seconds.</p>
        </div>
      </div>
    );
  }

  if (status === "failed" || !roadmap) {
    return (
      <div className="mx-auto max-w-xl space-y-8">
        <header>
          <h1 className="font-display text-3xl tracking-tight">Career Roadmap</h1>
        </header>
        <div className="rounded-xl border border-border bg-surface p-6 md:p-8">
          <p className="text-sm text-danger">
            {error ?? "Roadmap generation failed. Please try again."}
          </p>
          <Button size="lg" className="mt-6" onClick={() => void generate()} disabled={busy}>
            {busy ? "Retrying…" : "Try Again"}
          </Button>
        </div>
      </div>
    );
  }

  const done = roadmap.completedIdx.length;
  const total = roadmap.content.milestones.length;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Career Roadmap</h1>
        <p className="mt-2 text-muted">
          {done} of {total} milestones complete
        </p>
      </header>

      {roadmap.content.focusAreas.length > 0 ? (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-medium">Focus areas</h2>
          <ul className="mt-3 space-y-2">
            {roadmap.content.focusAreas.map((f) => (
              <li key={f.skill} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-muted">
                  <strong className="text-fg">{f.skill}</strong> — {f.reason}{" "}
                  <span className="text-faint">({f.weeks} weeks)</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ol className="relative space-y-4 border-l border-border pl-8">
        {roadmap.content.milestones.map((m, i) => {
          const isDone = roadmap.completedIdx.includes(i);
          return (
            <li key={i} className="relative">
              <button
                type="button"
                onClick={() => void toggle(i)}
                aria-pressed={isDone}
                className={cn(
                  "absolute -left-8 top-1 grid size-6 -translate-x-1/2 place-items-center rounded-full border",
                  isDone
                    ? "border-primary bg-primary text-primary-fg"
                    : "border-border bg-surface text-transparent",
                )}
              >
                <Check className="size-3.5" strokeWidth={2.5} />
              </button>
              <article
                className={cn(
                  "rounded-lg border p-5",
                  isDone ? "border-primary/30 bg-elevated" : "border-border bg-surface",
                )}
              >
                <p className="text-xs text-faint">Week {m.week}</p>
                <h2 className="mt-1 text-[15px] font-medium">{m.goal}</h2>
                <p className="mt-2 text-sm text-muted">{m.tasks.join(" · ")}</p>
                <p className="mt-3 text-sm text-stone">Resource: {m.resource}</p>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}