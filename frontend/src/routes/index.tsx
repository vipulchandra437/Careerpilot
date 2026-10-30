import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mic,
  Code2,
  FileSearch,
  Map,
  Target,
  Loader2,
  Flame,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/score-ring";
import { useNextSession } from "@/lib/session-context";
import {
  readinessApi,
  resumeApi,
  roadmapApi,
  interviewApi,
  targetApi,
  type Readiness,
  type ReadinessSnapshot,
} from "@/lib/api";
import {
  buildFeatureScores,
  computeReadiness,
  lowestContributor,
  FEATURE_ACTIONS,
  FEATURE_LABELS,
  FEATURE_ROUTES,
  STATUS_LABELS,
  STATUS_COLORS,
  type FeatureContribution,
  type FeatureKey,
} from "@/lib/readiness";
import { useEffect, useState, useMemo } from "react";

// WHY local (not in readiness.ts): readiness.ts is a pure module imported by
// the node test runner, so it must not import lucide-react. Icons are a UI concern.
const FEATURE_ICONS: Record<FeatureKey, ReactNode> = {
  resume: <FileSearch className="size-5" />,
  mock_interview: <Mic className="size-5" />,
  coding_test: <Code2 className="size-5" />,
  roadmap: <Map className="size-5" />,
  target_companies: <Target className="size-5" />,
};

/** Human-readable labels for the readiness level returned by the backend. */
const LEVEL_LABELS: Record<NonNullable<Readiness["level"]>, string> = {
  "needs-work": "Needs Work",
  "getting-there": "Getting There",
  "interview-ready": "Interview Ready",
};

export const Route = createFileRoute("/")({ component: Dashboard });

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Convert a Date or ISO string to a YYYY-MM-DD day key. */
function dayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Count consecutive days with activity, ending at the most recent active day. */
function currentStreak(history: ReadinessSnapshot[]): number {
  if (history.length === 0) return 0;
  const days = new Set(history.map((h) => dayKey(h.at)));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (days.has(dayKey(d))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/** Map a readiness level to a text color class. */
function levelClass(level: NonNullable<Readiness["level"]>): string {
  switch (level) {
    case "needs-work":
      return "text-warning";
    case "getting-there":
      return "text-primary";
    case "interview-ready":
      return "text-success";
  }
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

  // Today's headline = the frontend's 5-feature engine applied to the raw
  // per-feature scores the backend ships as `features`. Null → 0 contribution,
  // never a failing grade, so an incomplete profile reads as "building up",
  // not "bad".
  const featureScores = buildFeatureScores(readiness?.features ?? null);
  const computed = computeReadiness(featureScores);
  const breakdownByKey = Object.fromEntries(
    computed.breakdown.map((b) => [b.key, b]),
  ) as Record<FeatureKey, FeatureContribution>;

  const scores = {
    overall: computed.overall,
    resume: breakdownByKey.resume?.score ?? 0,
    interview: breakdownByKey.mock_interview?.score ?? 0,
  };

  // Today's Focus = the single feature dragging the headline down the most.
  const focus = lowestContributor(computed.breakdown);
  const focusItem = {
    icon: FEATURE_ICONS[focus.key],
    title: FEATURE_LABELS[focus.key],
    body: `${FEATURE_LABELS[focus.key]} is your lowest contributor (${focus.contribution} pts toward your overall score). Raising this area moves the needle fastest.`,
    to: FEATURE_ROUTES[focus.key],
    action: FEATURE_ACTIONS[focus.key],
  };

  const streak = useMemo(() => {
    if (!readiness?.history) return 0;
    return currentStreak(readiness.history);
  }, [readiness?.history]);

  const activeDays = useMemo(() => {
    if (!readiness?.history) return 0;
    return new Set(readiness.history.map((h) => dayKey(h.at))).size;
  }, [readiness?.history]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          {greeting()}, {name}
        </h1>
        <p className="mt-2 text-muted">Let's continue building your career.</p>
      </header>

      {error ? (
        <div className="rounded-xl border border-border bg-surface p-5 text-sm text-warning">{error}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-12 xl:gap-8">
        {/* ─── Left: Profile + Continue preparation ─── */}
        <aside className="space-y-6 xl:col-span-3">
          {/* Profile card */}
          <section className="rounded-xl border border-border bg-surface p-6 shadow-soft">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 grid size-20 place-items-center rounded-full bg-primary font-display text-2xl font-bold text-primary-fg">
                {user?.name
                  ? user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "–"}
              </div>
              <h2 className="font-display text-lg font-medium text-fg">
                {user?.name ?? "Guest"}
              </h2>
              {user?.email ? (
                <p className="mt-1 text-sm text-muted">{user.email}</p>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Stat
                icon={<FileSearch className="size-4" />}
                value={readiness?.resumesParsed ?? resumeCount}
                label="Resumes"
              />
              <Stat
                icon={<Mic className="size-4" />}
                value={readiness?.interviewsCompleted ?? interviewCount}
                label="Interviews"
              />
              <Stat
                icon={<Flame className="size-4" />}
                value={streak}
                label="Day streak"
              />
              <Stat
                icon={<Calendar className="size-4" />}
                value={activeDays}
                label="Active days"
              />
            </div>
          </section>

          {/* Continue preparation */}
          <section className="rounded-xl border border-border bg-surface p-6 shadow-soft">
            <h3 className="mb-4 text-[15px] font-medium">Continue Preparation</h3>
            <ul className="space-y-2">
              <ContinueRow
                title="Resume analysis"
                meta={resumeCount === 0 ? "Upload a resume to begin" : `${resumeCount} resume(s) on file`}
                to="/resume"
              />
              <ContinueRow
                title="Mock interview"
                meta="Behavioral or technical, 5 or 10 questions"
                to="/interview"
              />
              <ContinueRow
                title="Career roadmap"
                meta={roadmapStatus || "Generate a focused plan"}
                to="/roadmap"
              />
            </ul>
          </section>
        </aside>

        {/* ─── Center: Scores and tables ─── */}
        <main className="space-y-6 xl:col-span-6">
          {/* Overall readiness */}
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
              {readiness?.level ? (
                <div className="hidden text-right sm:block">
                  <p className="text-xs text-faint uppercase">Level</p>
                  <p className={`mt-1 text-sm font-medium ${levelClass(readiness.level)}`}>
                    {LEVEL_LABELS[readiness.level]}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <ScoreRing value={scores.resume ?? 0} label="Resume" />
              <ScoreRing value={scores.interview ?? 0} label="Interview" />
              {targetName ? (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Target className="size-4 text-primary" />
                  <span>Target: {targetName}</span>
                </div>
              ) : null}
            </div>
          </section>

          {/* Readiness by area — ScoreRings for all 5 features */}
          <section className="rounded-xl border border-border bg-surface p-6 shadow-soft">
            <h2 className="mb-4 text-lg font-medium">Readiness by Area</h2>
            <div className="flex flex-wrap gap-6">
              {computed.breakdown.map((b) => (
                <ScoreRing
                  key={b.key}
                  value={b.score ?? 0}
                  label={FEATURE_LABELS[b.key]}
                  size={72}
                />
              ))}
            </div>
          </section>

          {/* Score breakdown — horizontal bars */}
          <section className="rounded-xl border border-border bg-surface p-6 shadow-soft">
            <h2 className="mb-4 text-lg font-medium">Score Breakdown</h2>
            <div className="space-y-4">
              {computed.breakdown.map((b) => {
                const score = b.score ?? 0;
                const statusColor = STATUS_COLORS[b.status];
                return (
                  <div key={b.key} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {FEATURE_ICONS[b.key]}
                        <span className="text-sm font-medium text-fg">{FEATURE_LABELS[b.key]}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium ${statusColor}`}>
                          {STATUS_LABELS[b.status]}
                        </span>
                        <span className="text-sm tabular-nums text-fg">{score}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted">
                      <span>weight {b.weight}%</span>
                      <span>{b.contribution} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent submissions — table from history */}
          <section className="rounded-xl border border-border bg-surface p-6 shadow-soft">
            <h2 className="mb-4 text-lg font-medium">Recent Submissions</h2>
            {readiness && readiness.history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 pb-2 text-xs font-medium uppercase text-faint">Date</th>
                      <th className="px-3 pb-2 text-xs font-medium uppercase text-faint">Readiness</th>
                      <th className="px-3 pb-2 text-xs font-medium uppercase text-faint">Level</th>
                      <th className="px-3 pb-2 text-xs font-medium uppercase text-faint">Resume</th>
                      <th className="px-3 pb-2 text-xs font-medium uppercase text-faint">Interview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readiness.history.slice(0, 10).map((h) => (
                      <tr key={h.at} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-sm text-muted">{new Date(h.at).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-sm font-medium text-fg tabular-nums">{h.readiness}/100</td>
                        <td className={`px-3 py-2 text-sm font-medium ${levelClass(h.level)}`}>
                          {LEVEL_LABELS[h.level]}
                        </td>
                        <td className="px-3 py-2 text-sm text-muted tabular-nums">
                          {h.resumeScore ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-sm text-muted tabular-nums">
                          {h.interviewScore ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">
                No submissions yet. Complete a resume analysis or mock interview to build your history.
              </p>
            )}
          </section>
        </main>

        {/* ─── Right: Activity + Focus ─── */}
        <aside className="space-y-6 xl:col-span-3">
          {/* Activity heatmap */}
          <section className="rounded-xl border border-border bg-surface p-6 shadow-soft">
            <h3 className="mb-4 text-[15px] font-medium">Activity</h3>
            {readiness && readiness.history.length > 0 ? (
              <ActivityHeatmap history={readiness.history} />
            ) : (
              <p className="text-sm text-muted">
                No activity yet. Upload a resume or run a mock interview to build your history.
              </p>
            )}
          </section>

          {/* Today's focus */}
          <section className="rounded-xl border border-border bg-surface p-6 shadow-soft">
            <h2 className="mb-4 text-lg font-medium">Today's Focus</h2>
            <div className="grid gap-4">
              <FocusCard key={focusItem.to} {...focusItem} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-elevated px-3 py-2.5">
      <div className="text-primary">{icon}</div>
      <div>
        <p className="font-display text-lg font-medium text-fg tabular-nums">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

function ActivityHeatmap({ history }: { history: ReadinessSnapshot[] }) {
  const activityMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const h of history) {
      const key = dayKey(h.at);
      const existing = map[key];
      if (existing === undefined || h.readiness > existing) {
        map[key] = h.readiness;
      }
    }
    return map;
  }, [history]);

  // 26 weeks × 7 days = 182 cells, going backwards from today
  const weeks = 26;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: { key: string; score: number }[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    for (let d = 6; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - w * 7 - d);
      const key = dayKey(date);
      cells.push({ key, score: activityMap[key] ?? 0 });
    }
  }

  function cellColor(score: number): string {
    if (score === 0) return "bg-elevated";
    if (score < 34) return "bg-primary/30";
    if (score < 67) return "bg-primary/50";
    return "bg-primary/80";
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell) => (
          <div
            key={cell.key}
            className={`size-3 rounded-sm ${cellColor(cell.score)}`}
            title={cell.score > 0 ? `${cell.key}: ${cell.score}/100` : cell.key}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <span>Less</span>
        <div className="flex items-center gap-0.5">
          <div className="size-3 rounded-sm bg-elevated" />
          <div className="size-3 rounded-sm bg-primary/30" />
          <div className="size-3 rounded-sm bg-primary/50" />
          <div className="size-3 rounded-sm bg-primary/80" />
        </div>
        <span>More</span>
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
