import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { LinkedInAnalyzer } from "@/components/analyzers/linkedin-analyzer";

export const metadata = { title: "LinkedIn Analyzer" };

export default async function LinkedInPage() {
  const user = await requireUser();

  const analyses = await prisma.linkedInAnalysis.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, score: true, createdAt: true },
    take: 5,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">LinkedIn Analyzer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste your profile text and get a recruiter&apos;s-eye review with concrete fixes.
        </p>
      </div>
      <LinkedInAnalyzer
        analyses={analyses.map((a) => ({
          id: a.id,
          score: a.score,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
