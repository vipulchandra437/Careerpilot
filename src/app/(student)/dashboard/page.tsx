import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { computeReadiness } from "@/server/scoring/readiness.service";
import { CATEGORY_LABELS, readinessBand, type CategoryKey } from "@/server/scoring/score-engine";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export const metadata = { title: "Dashboard" };

const CATEGORY_HREF: Record<CategoryKey, string> = {
  RESUME: "/resume",
  CODING: "/coding",
  INTERVIEW: "/interview",
  COMMUNICATION: "/communication",
  PROJECTS: "/projects",
  GITHUB: "/github",
  LINKEDIN: "/linkedin",
  SKILL_COVERAGE: "/skill-gaps",
};

export default async function DashboardPage() {
  const user = await requireUser();

  const [readiness, resumeCount, projectCount, interviewCount, linkedinAnalyses, goals, scoreHistory, notifications] =
    await Promise.all([
      computeReadiness(user.id),
      prisma.resume.count({ where: { profile: { userId: user.id } } }),
      prisma.project.count({ where: { userId: user.id } }),
      prisma.interview.count({ where: { userId: user.id } }),
      prisma.linkedInAnalysis.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
      prisma.careerGoal.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.scoreHistory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: { score: true, createdAt: true },
      }),
      prisma.notification.findMany({
        where: { userId: user.id, read: false },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);

  const band = readinessBand(readiness.overall);
  const areas = (Object.keys(readiness.scores) as CategoryKey[])
    .map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      score: readiness.scores[key],
      href: CATEGORY_HREF[key],
      detail: `${readiness.scores[key]}/100`,
    }))
    .sort((a, b) => a.score - b.score);

  const stats = {
    resumeCount,
    projectCount,
    interviewCount,
    resumeScore: readiness.scores.RESUME,
    linkedinScore: readiness.scores.LINKEDIN || linkedinAnalyses[0]?.score || null,
  };

  const summary = `${band.label} · ${readiness.targetRole?.title ?? "target role"} · ${readiness.overall}/100`;

  const enrichedGoals = goals.map((g) => ({
    id: g.id,
    category: g.category,
    targetScore: g.targetScore,
    deadline: g.deadline?.toISOString() ?? null,
    status: g.status,
  }));

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekHistory = scoreHistory.filter((h) => h.createdAt >= oneWeekAgo);
  const byDay = new Map<string, { total: number; count: number }>();
  for (const h of weekHistory) {
    const day = h.createdAt.toISOString().slice(0, 10);
    const entry = byDay.get(day) ?? { total: 0, count: 0 };
    entry.total += h.score;
    entry.count += 1;
    byDay.set(day, entry);
  }
  const weeklyScores = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, { total, count }]) => Math.round(total / count));

  const allAreas = (Object.keys(readiness.scores) as CategoryKey[]).map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    score: readiness.scores[key],
    href: CATEGORY_HREF[key],
  }));

  const quickActions: { label: string; description: string; href: string; icon: string; color: string }[] = [];
  if (notifications.length > 0) {
    quickActions.push({
      label: notifications[0].title,
      description: notifications[0].body.slice(0, 60),
      href: notifications[0].link ?? "/notifications",
      icon: "bell",
      color: "bg-amber-500",
    });
  }
  const lowestArea = [...allAreas].sort((a, b) => a.score - b.score)[0];
  if (lowestArea && lowestArea.score < 70) {
    quickActions.push({
      label: `Improve ${lowestArea.label}`,
      description: `Your ${lowestArea.label.toLowerCase()} score is ${lowestArea.score}/100`,
      href: lowestArea.href,
      icon: "zap",
      color: "bg-blue-500",
    });
  }
  if (weeklyScores.length < 5) {
    quickActions.push({
      label: "Daily challenge",
      description: "Solve a coding problem to keep your streak",
      href: "/coding",
      icon: "calendar-check",
      color: "bg-emerald-500",
    });
  }

  return (
    <DashboardContent
      stats={stats}
      readiness={{ score: readiness.overall, summary, areas }}
      userName={user.name ?? "there"}
      goals={enrichedGoals}
      peerData={null}
      quickActions={quickActions.slice(0, 3)}
      weeklyScores={weeklyScores}
    />
  );
}
