import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ScoreRing } from "@/components/score-ring";
import { useNextSession } from "@/lib/session-context";
import { interviewApi, readinessApi, targetApi, type Target } from "@/lib/api";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user } = useNextSession();
  const [readiness, setReadiness] = useState<Awaited<ReturnType<typeof readinessApi.get>> | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [interviews, setInterviews] = useState<Awaited<ReturnType<typeof interviewApi.history>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [r, t, i] = await Promise.allSettled([
        readinessApi.get(),
        targetApi.get(),
        interviewApi.history(),
      ]);
      if (cancelled) return;
      if (r.status === "fulfilled") setReadiness(r.value);
      if (t.status === "fulfilled") setTarget(t.value.target);
      if (i.status === "fulfilled") setInterviews(i.value);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const name = user?.name ?? "Your name";
  const email = user?.email ?? "";
  const overall = readiness?.readiness ?? null;

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Profile</h1>
        <p className="mt-2 text-muted">Your real account and readiness data.</p>
      </header>
      <section className="flex items-center gap-5 rounded-xl border border-border bg-surface p-6">
        <span className="grid size-16 place-items-center rounded-full bg-primary font-display text-2xl text-primary-fg">
          {name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-2xl">{name}</p>
          <p className="truncate text-sm text-muted">{email}</p>
        </div>
        <div className="ml-auto hidden sm:block">
          <ScoreRing value={overall ?? 0} label="Ready" />
        </div>
      </section>

      {overall !== null ? (
        <section className="grid gap-4 rounded-xl border border-border bg-surface p-6 md:grid-cols-2">
          <div>
            <p className="font-display text-4xl tabular-nums tracking-tight text-primary">
              {overall}
              <span className="ml-1 text-lg text-muted">/ 100</span>
            </p>
            <p className="mt-1 text-sm text-muted">
              {readiness?.label ?? "Overall career readiness"}
            </p>
          </div>
          <div className="flex gap-6">
            <ScoreRing value={readiness?.resumeScore ?? 0} label="Resume" />
            <ScoreRing value={readiness?.interviewScore ?? 0} label="Interview" />
          </div>
        </section>
      ) : null}

      <section className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <div>
          <p className="text-xs font-medium text-muted">Target role</p>
          {target ? (
            <p className="mt-1 text-sm text-stone">
              {target.role} @ {target.companyName}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              No target set —{" "}
              <a href="/companies" className="text-primary hover:text-fg">
                add one
              </a>
              .
            </p>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-muted">Recent interviews</p>
          {interviews.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {interviews.slice(0, 5).map((i) => (
                <li key={i.id} className="flex items-center justify-between rounded-md bg-elevated px-3 py-2 text-sm">
                  <span className="capitalize text-muted">{i.mode}</span>
                  <span className="text-xs text-faint">
                    {new Date(i.createdAt).toLocaleDateString()}
                    {i.finalScore !== null ? ` · ${Math.round(i.finalScore * 10)}/100` : " · in progress"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted">No interviews yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
