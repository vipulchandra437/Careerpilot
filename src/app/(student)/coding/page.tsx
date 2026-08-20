import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { CodingWorkspace } from "@/components/coding/coding-workspace";

export const metadata = { title: "Coding" };

const BATCH_SIZE = 500;

async function fetchBatch(userId: string, skip: number, take: number) {
  return prisma.codingProblem.findMany({
    orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
    skip,
    take,
    select: {
      id: true,
      title: true,
      slug: true,
      difficulty: true,
      topics: true,
      companies: true,
      submissions: {
        where: { userId },
        select: { status: true, passedTests: true, totalTests: true },
        orderBy: { createdAt: "desc" as const },
        take: 1,
      },
    },
  });
}

export default async function CodingPage() {
  const user = await requireUser();

  const totalCount = await prisma.codingProblem.count();

  const allProblems: Awaited<ReturnType<typeof fetchBatch>> = [];
  for (let skip = 0; skip < totalCount; skip += BATCH_SIZE) {
    const batch = await fetchBatch(user.id, skip, BATCH_SIZE);
    allProblems.push(...batch);
  }

  const items = allProblems.map((p) => ({
    id: p.id,
    title: p.title,
    difficulty: p.difficulty,
    topics: (p.topics as unknown as string[]) ?? [],
    companies: (p.companies as unknown as string[]) ?? [],
    solved: p.submissions[0]?.status === "ACCEPTED",
    bestRatio:
      p.submissions[0] && p.submissions[0].totalTests > 0
        ? Math.round((p.submissions[0].passedTests / p.submissions[0].totalTests) * 100)
        : 0,
  }));

  const solvedCount = items.filter((p) => p.solved).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coding Assessment</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Solve problems and submit to hidden test cases. Your accepted solutions drive your coding score.
          </p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-2 text-sm">
          <span className="font-semibold">{solvedCount}</span>/{items.length} solved
        </div>
      </div>
      <CodingWorkspace problems={items} />
    </div>
  );
}
