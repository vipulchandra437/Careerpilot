import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { GitHubAnalyzer } from "@/components/analyzers/github-analyzer";

export const metadata = { title: "GitHub Analyzer" };

export default async function GitHubPage() {
  const user = await requireUser();

  const analyses = await prisma.gitHubAnalysis.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, username: true, score: true, createdAt: true },
    take: 5,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">GitHub Analyzer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Understand how recruiters read your GitHub profile and what to fix.
        </p>
      </div>
      <GitHubAnalyzer
        analyses={analyses.map((a) => ({
          id: a.id,
          username: a.username,
          score: a.score,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
