import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { computeReadiness } from "@/server/scoring/readiness.service";
import { getRecommendedActions } from "@/server/services/recommendations.service";
import { buildReportData } from "@/server/services/report.service";
import { ReportView } from "@/components/report/report-view";

export const metadata = { title: "Career Report" };

export default async function CareerReportPage() {
  const user = await requireUser();

  const readiness = await computeReadiness(user.id);
  const gaps = readiness.skillCoverageItems;
  const actions = getRecommendedActions(readiness, gaps);
  const report = buildReportData(readiness, gaps, actions);

  // Persist a snapshot for history and admin analytics (at most one per day).
  // The transaction keeps concurrent page loads from writing duplicates.
  const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  await prisma.$transaction(async (tx) => {
    const latestReport = await tx.careerReport.findFirst({
      where: { userId: user.id },
      orderBy: { generatedAt: "desc" },
      select: { generatedAt: true },
    });
    const isNewDay = !latestReport || latestReport.generatedAt.toDateString() !== new Date().toDateString();
    if (!isNewDay) return;
    await tx.careerReport.create({
      data: {
        userId: user.id,
        profileId: profile?.id ?? user.id,
        companyId: profile?.targetCompanyId ?? null,
        jobRoleId: profile?.targetJobRoleId ?? null,
        overallScore: report.overall,
        reportData: report as unknown as object,
      },
    });
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Career Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A printable snapshot of your readiness, gaps, and recommended next steps.
        </p>
      </div>
      <ReportView report={report} />
    </div>
  );
}
