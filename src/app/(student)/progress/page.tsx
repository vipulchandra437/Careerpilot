import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { computeReadiness } from "@/server/scoring/readiness.service";
import { CATEGORY_LABELS, readinessBand, type CategoryKey } from "@/server/scoring/score-engine";
import { ProgressView } from "@/components/progress/progress-view";

export const metadata = { title: "Progress" };

export default async function ProgressPage() {
  const user = await requireUser();

  const [readiness, scoreHistory, submissionCount, interviewCount, commCount, projectCount] =
    await Promise.all([
      computeReadiness(user.id),
      prisma.scoreHistory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: { type: true, score: true, createdAt: true },
      }),
      prisma.codingSubmission.count({ where: { userId: user.id, status: "ACCEPTED" } }),
      prisma.interview.count({ where: { userId: user.id } }),
      prisma.communicationAnalysis.count({ where: { userId: user.id } }),
      prisma.project.count({ where: { userId: user.id } }),
    ]);

  // Daily trend: average of all score events recorded on each day.
  const byDay = new Map<string, { total: number; count: number }>();
  for (const h of scoreHistory) {
    const day = h.createdAt.toISOString().slice(0, 10);
    const entry = byDay.get(day) ?? { total: 0, count: 0 };
    entry.total += h.score;
    entry.count += 1;
    byDay.set(day, entry);
  }
  const dailyTrend = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, { total, count }]) => ({ date, score: Math.round(total / count) }));

  // Latest recorded score per type.
  const latestByType = new Map<string, { score: number; createdAt: string }>();
  for (const h of scoreHistory) {
    const existing = latestByType.get(h.type);
    if (!existing || h.createdAt > new Date(existing.createdAt)) {
      latestByType.set(h.type, { score: Math.round(h.score), createdAt: h.createdAt.toISOString() });
    }
  }

  const band = readinessBand(readiness.overall);
  const categories = (Object.keys(readiness.scores) as CategoryKey[]).map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    score: readiness.scores[key],
    latestScore: latestByType.get(key)?.score ?? null,
  }));

  const recentEvents = [...scoreHistory].reverse().slice(0, 20);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track how your readiness and every score category evolve over time.
        </p>
      </div>
      <ProgressView
        overall={readiness.overall}
        bandLabel={band.label}
        dailyTrend={dailyTrend}
        categories={categories}
        counts={{
          submissionsAccepted: submissionCount,
          interviews: interviewCount,
          communications: commCount,
          projects: projectCount,
        }}
        recentEvents={recentEvents.map((e) => ({
          type: e.type,
          score: Math.round(e.score),
          createdAt: e.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
