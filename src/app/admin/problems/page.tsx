import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ProblemsManager } from "@/components/admin/problems-manager";

export const metadata = { title: "Admin Coding Problems" };

export default async function AdminProblemsPage() {
  await requireAdmin();

  const problems = await prisma.codingProblem.findMany({
    orderBy: [{ difficulty: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      difficulty: true,
      topics: true,
      expectedComplexity: true,
      _count: { select: { submissions: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Coding Problems</h1>
        <p className="mt-1 text-sm text-muted-foreground">Problems available in the coding practice module.</p>
      </div>
      <ProblemsManager
        problems={problems.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          difficulty: p.difficulty,
          topics: (p.topics as unknown as string[]) ?? [],
          expectedComplexity: p.expectedComplexity,
          submissionCount: p._count.submissions,
        }))}
      />
    </div>
  );
}
