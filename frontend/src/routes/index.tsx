import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, Code2, FileSearch, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/score-ring";
import { useNextSession } from "@/lib/session-context";
import { readinessApi, resumeApi, roadmapApi, interviewApi, targetApi } from "@/lib/api";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({ component: Dashboard });

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { user, status } = useNextSession();
  const [readiness, setReadiness] = useState<Awaited<ReturnType<typeof readinessApi.get>> | null>(null);
  const [resumeCount, setResumeCount] = useState(0);
  const [roadmapStatus, setRoadmapStatus] = useState("");
  const [interviewCount, setInterviewCount] = useState(0);
  const [targetName, setTargetName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [r, resumes, roadmap, interviews, target] = await Promise.allSettled([
          readinessApi.get(),
          resumeApi.list(),
          roadmapApi.get(),
          interviewApi.history(),
          targetApi.get(),
        ]);
        if (cancelled) return;
        if (r.status === "fulfilled") setReadiness(r.value);
        if (resumes.status === "fulfilled") setResumeCount(resumes.value.length);
        if (roadmap.status === "fulfilled" && roadmap.value.status === "ready") {
          setRoadmapStatus("In progress");
        } else if (roadmap.status === "fulfilled" && roadmap.value.status === "none") {
          setRoadmapStatus("Not started");
        } else {
          setRoadmapStatus("");
        }
        if (interviews.status === "fulfilled") setInterviewCount(interviews.value.length);
        if (target.status === "fulfilled" && target.value.target) {
          setTargetName(target.value.target.companyName);
        }
        if (r.status === "rejected") {
          setError("Couldn't load your readiness. The backend may be warming up — refresh shortly.");
        }
      } catch {
        if (!cancelled) setError("Couldn't load your dashboard. Please refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const name = (user?.name ?? "there").split(" ")[0];

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const scores = {
    overall: readiness?.readiness ?? 0,
    resume: readiness?.resumeScore,
    interview: readiness?.interviewScore,
  };

  const readyFor = {
    resume: scores.resume !== null && scores.resume !== undefined,
    interview: scores.interview !== null && scores.interview !== undefined,
  };

  const focusItems: { icon: ReactNode; title: string; body: string; to: string; action: string }[] = [];
  if (readyFor.interview) {
    focusItems.push({
      icon: <Mic className="size-5" />,
      title: "Practice one interview",
      body: `Your interview readiness is ${scores.interview}/100. A focused mock can move it fastest.`,
      to: "/interview",
      action: "Start Interview",
    });
  }
  if (readyFor.resume) {
    focusItems.push({
      icon: <FileSearch className="size-5" />,
      title: resumeCount === 0 ? "Upload your resume" : "Review your resume",
      body:
        resumeCount === 0
          ? "No resume uploaded yet — upload one to get a real readiness score."
          : `Resume readiness is ${scores.resume}/100. Analyze it for next steps.`,
      to: "/resume",
      action: resumeCount === 0 ? "Upload Resume" : "Analyze Resume",
    });
  }
  focusItems.push({
    icon: <Code2 className="size-5" />,
    title: "Take a coding challenge",
    body: "A quick arrays or hashmaps problem keeps your DSA sharp.",
    to: "/coding",
    action: "Take Test",
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          {greeting()}, {name}
        </h1>
        <p className="mt-2 text-muted">Let’s continue building your career.</p>
      </header>

      {error ? (
        <div className="rounded-xl border border-border bg-surface p-5 text-sm text-warning">{error}</div>
      ) : null}

      <section className="rounded-xl border border-border bg-surface p-6 shadow-soft md:p-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Overall Career Readiness</p>
            <p className="mt-1 font-display text-5xl tabular-nums tracking-tight text-primary">
              {scores.overall}
              <span className="ml-1 text-xl text-muted">/ 100</span>
            </p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
              {readiness?.label
                ? readiness.label
                : "Complete your resume analysis and one interview to unlock your readiness score."}
            </p>
          </div>
          {targetName ? (
            <div className="hidden text-right sm:block">
              <p className="text-xs text-faint uppercase">Active target</p>
              <p className="mt-1 text-sm font-medium text-fg">{targetName}</p>
            </div>
          ) : null}
        </div>
        <div className="mt-8 flex flex-wrap gap-6">
          <ScoreRing value={readyFor.resume ? (scores.resume ?? 0) : 0} label="Resume" />
          <ScoreRing value={readyFor.interview ? (scores.interview ?? 0) : 0} label="Interview" />
          <div className="flex items-center gap-2 text-xs text-muted">
            {resumeCount > 0 ? `${resumeCount} resume${resumeCount === 1 ? "" : "s"} on file` : "No resume yet"} ·
            {interviewCount > 0 ? ` ${interviewCount} interview${interviewCount === 1 ? "" : "s"}` : " no interviews"} ·
            {roadmapStatus ? ` roadmap ${roadmapStatus.toLowerCase()}` : ""}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium">Today’s Focus</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {focusItems.map((item) => (
            <FocusCard key={item.to + item.title} {...item} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h3 className="mb-4 text-[15px] font-medium">Continue Preparation</h3>
          <ul className="space-y-2">
            <ContinueRow title="Resume analysis" meta={resumeCount === 0 ? "Upload a resume to begin" : `${resumeCount} resume(s) on file`} to="/resume" />
            <ContinueRow title="Mock interview" meta="Behavioral or technical, 5 or 10 questions" to="/interview" />
            <ContinueRow title="Career roadmap" meta={roadmapStatus || "Generate a focused plan"} to="/roadmap" />
          </ul>
        </section>
        <section className="rounded-lg border border-border bg-surface p-5">
          <h3 className="mb-4 text-[15px] font-medium">Recent Activity</h3>
          {readiness && readiness.history.length > 0 ? (
            <ul className="space-y-3">
              {readiness.history.slice(0, 5).map((h) => (
                <li key={h.at} className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="flex-1 text-sm text-muted">
                    Readiness {h.readiness}
                    {h.resumeScore !== null && h.resumeScore !== undefined ? ` · resume ${h.resumeScore}` : ""}
                    {h.interviewScore !== null && h.interviewScore !== undefined ? ` · interview ${h.interviewScore}` : ""}
                  </span>
                  <span className="text-xs text-faint whitespace-nowrap">
                    {new Date(h.at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              No activity yet. Upload a resume or run a mock interview to build your history.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function FocusCard({
  icon,
  title,
  body,
  to,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  to: string;
  action: string;
}) {
  return (
    <article className="flex flex-col rounded-lg border border-border bg-surface p-5">
      <div className="mb-3 grid size-10 place-items-center rounded-md bg-elevated text-primary">
        {icon}
      </div>
      <h3 className="text-[15px] font-medium">{title}</h3>
      <p className="mt-1 mb-5 flex-1 text-sm leading-relaxed text-muted">{body}</p>
      <Link to={to}>
        <Button size="md" className="w-full">
          {action} →
        </Button>
      </Link>
    </article>
  );
}

function ContinueRow({ title, meta, to }: { title: string; meta: string; to: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md bg-elevated px-3 py-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted">{meta}</p>
      </div>
      <Link to={to} className="text-sm font-medium text-primary hover:text-fg">
        Continue →
      </Link>
    </li>
  );
}
