import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { JDAnalysisPageClient } from "@/components/jd-analysis/jd-analysis-page-client";

export const metadata = { title: "JD Analysis" };

export default async function JDAnalysisPage() {
  const user = await requireUser();

  const analyses = await prisma.jDAnalysis.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      company: true,
      matchScore: true,
      requiredSkills: true,
      preferredSkills: true,
      missingSkills: true,
      recommendations: true,
      description: true,
      createdAt: true,
    },
  });

  const resumes = await prisma.resume.findMany({
    where: { profile: { userId: user.id } },
    orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      content: true,
      isPrimary: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">JD Analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analyze job descriptions, compare roles, and optimize your resume for
          each opportunity.
        </p>
      </div>
      <JDAnalysisPageClient
        analyses={analyses.map((a) => ({
          id: a.id,
          title: a.title,
          company: a.company,
          matchScore: a.matchScore,
          requiredSkills: a.requiredSkills,
          preferredSkills: a.preferredSkills,
          missingSkills: a.missingSkills,
          recommendations: a.recommendations,
          description: a.description,
          createdAt: a.createdAt.toISOString(),
        }))}
        resumes={resumes.map((r) => ({
          id: r.id,
          title: r.title,
          content: r.content,
          isPrimary: r.isPrimary,
        }))}
      />
    </div>
  );
}
