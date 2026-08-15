import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { AnalyticsView } from "@/components/admin/analytics-view";

export const metadata = { title: "Admin Analytics" };

export default async function AdminAnalyticsPage() {
  await requireAdmin();

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  const [signups, submissions, codingSubmissions, interviews, linkedin, github, projects, resumes, communication, scoreHistory, targetRoles, targetCompanies] =
    await Promise.all([
      prisma.user.groupBy({
        by: ["createdAt"],
        where: { createdAt: { gte: daysAgo(30) } },
        _count: { _all: true },
      }),
      prisma.codingSubmission.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.codingSubmission.findMany({ select: { passedTests: true, totalTests: true } }),
      prisma.interview.findMany({
        select: { status: true, score: true },
      }),
      prisma.linkedInAnalysis.findMany({ select: { score: true } }),
      prisma.gitHubAnalysis.findMany({ select: { score: true } }),
      prisma.projectAnalysis.findMany({ select: { score: true } }),
      prisma.resumeAnalysis.findMany({ select: { overallScore: true } }),
      prisma.communicationAnalysis.findMany({ select: { score: true } }),
      prisma.scoreHistory.groupBy({
        by: ["type"],
        _avg: { score: true },
        _count: { _all: true },
      }),
      prisma.studentProfile.findMany({
        where: { targetJobRoleId: { not: null } },
        select: {
          targetCompanyId: true,
          targetJobRole: { select: { title: true, company: { select: { name: true } } } },
        },
      }),
      prisma.studentProfile.findMany({
        where: { targetCompanyId: { not: null } },
        select: { targetCompany: { select: { name: true } } },
      }),
    ]);

  const perDay = new Map<string, number>();
  for (const row of signups) {
    const day = row.createdAt.toISOString().slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + row._count._all);
  }
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = daysAgo(29 - i).toISOString().slice(0, 10);
    return { date: d, count: perDay.get(d) ?? 0 };
  });

  const avg = (arr: { score: number | null }[]) =>
    arr.length ? Math.round((arr.reduce((s, a) => s + (a.score ?? 0), 0) / arr.length) * 10) / 10 : null;

  const roleDist = new Map<string, number>();
  for (const p of targetRoles) {
    const name = p.targetJobRole?.title ?? "Unknown";
    roleDist.set(name, (roleDist.get(name) ?? 0) + 1);
  }
  const companyDist = new Map<string, number>();
  for (const p of targetCompanies) {
    const name = p.targetCompany?.name ?? "Unknown";
    companyDist.set(name, (companyDist.get(name) ?? 0) + 1);
  }
  for (const p of targetRoles) {
    if (p.targetCompanyId) continue;
    const name = p.targetJobRole?.company.name ?? "Unknown";
    companyDist.set(name, (companyDist.get(name) ?? 0) + 1);
  }

  const verdicts = {
    COMPLETED: interviews.filter((i) => i.status === "COMPLETED").length,
    IN_PROGRESS: interviews.filter((i) => i.status === "IN_PROGRESS").length,
    ABORTED: interviews.filter((i) => i.status === "ABORTED").length,
    avgScore: interviews.length ? Math.round((interviews.reduce((s, i) => s + (i.score ?? 0), 0) / interviews.length) * 10) / 10 : null,
  };

  const submissionStatus = submissions.map((s) => ({
    status: s.status,
    count: s._count._all,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform-wide usage and score trends.</p>
      </div>
      <AnalyticsView
        signupsLast30={last30}
        submissions={submissionStatus}
        verdicts={verdicts}
        avgScores={{
          resume: avg(resumes.map((r) => ({ score: r.overallScore }))),
          coding:
            codingSubmissions.length > 0
              ? Math.round(
                  (codingSubmissions.reduce((s, c) => s + (c.totalTests > 0 ? c.passedTests / c.totalTests : 0), 0) /
                    codingSubmissions.length) *
                    100 * 10,
                ) / 10
              : null,
          interview: avg(interviews),
          github: avg(github),
          linkedin: avg(linkedin),
          communication: avg(communication),
          projects: avg(projects),
        }}
        scoreBreakdown={scoreHistory.map((row) => ({
          type: row.type,
          avg: Math.round((row._avg.score ?? 0) * 10) / 10,
          count: row._count._all,
        }))}
        roleDist={[...roleDist.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)}
        companyDist={[...companyDist.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)}
      />
    </div>
  );
}
