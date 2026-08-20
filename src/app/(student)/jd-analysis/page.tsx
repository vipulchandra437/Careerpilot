import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { JDAnalyzer } from "@/components/jd-analysis/jd-analyzer";

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
      createdAt: true,
    },
    take: 10,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">JD Analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a job description to extract required skills, see how well you
          match, and get a personalized improvement plan.
        </p>
      </div>
      <JDAnalyzer
        analyses={analyses.map((a) => ({
          id: a.id,
          title: a.title,
          company: a.company,
          matchScore: a.matchScore,
          requiredSkills: a.requiredSkills,
          preferredSkills: a.preferredSkills,
          missingSkills: a.missingSkills,
          recommendations: a.recommendations,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
