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

  const [readiness, resumeCount, projectCount, interviewCount, linkedinAnalyses] =
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

  return <DashboardContent stats={stats} readiness={{ score: readiness.overall, summary, areas }} userName={user.name ?? "there"} />;
}
