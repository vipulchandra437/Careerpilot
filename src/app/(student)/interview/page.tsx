import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { InterviewWorkspace } from "@/components/interview/interview-workspace";
import { InterviewHistoryTab } from "./history-tab";

export const metadata = { title: "Mock Interview" };

export default async function InterviewPage() {
  const user = await requireUser();

  const [companies, recent] = await Promise.all([
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        jobRoles: { select: { id: true, title: true }, orderBy: { title: "asc" } },
      },
    }),
    prisma.interview.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        interviewType: true,
        difficulty: true,
        status: true,
        score: true,
        createdAt: true,
      },
      take: 10,
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mock Interview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Practice a realistic interview with adaptive AI feedback on every answer.
        </p>
      </div>
      <InterviewHistoryTab
        workspace={
          <InterviewWorkspace
            companies={companies.map((c) => ({
              id: c.id,
              name: c.name,
              jobRoles: c.jobRoles.map((r) => ({ id: r.id, title: r.title })),
            }))}
            recent={recent.map((i) => ({
              id: i.id,
              type: i.interviewType,
              difficulty: i.difficulty,
              status: i.status,
              score: i.score,
              createdAt: i.createdAt.toISOString(),
            }))}
          />
        }
      />
    </div>
  );
}
