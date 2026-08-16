import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { computeReadiness } from "@/server/scoring/readiness.service";
import { generateRoadmap, flattenRoadmap } from "@/server/services/roadmap.service";
import { RoadmapView } from "@/components/roadmap/roadmap-view";

export const metadata = { title: "Learning Roadmap" };

export default async function RoadmapPage() {
  const user = await requireUser();

  const readiness = await computeReadiness(user.id);

  if (!readiness.targetRole) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Learning Roadmap</h1>
        <p className="text-sm text-muted-foreground">
          Set a career goal to generate a personalized week-by-week learning plan.
        </p>
      </div>
    );
  }

  const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  if (!profile) notFound();

  const targetRole = readiness.targetRole;
  if (!targetRole) notFound();

  const input = generateRoadmap(readiness.skillCoverageItems);

  // Transaction guards against two concurrent page loads racing to create
  // duplicate ACTIVE roadmaps for the same profile + job role.
  const roadmap = await prisma.$transaction(async (tx) => {
    const existing = await tx.learningRoadmap.findFirst({
      where: { profileId: profile.id, jobRoleId: targetRole.id, status: "ACTIVE" },
      include: { tasks: { orderBy: { week: "asc" } } },
    });

    if (existing) return existing;

    return tx.learningRoadmap.create({
      data: {
        profileId: profile.id,
        jobRoleId: targetRole.id,
        durationWeeks: input.durationWeeks,
        overview: input.overview,
        content: input.phases as unknown as object,
        status: "ACTIVE",
        tasks: {
          create: flattenRoadmap(input.phases),
        },
      },
      include: { tasks: { orderBy: { week: "asc" } } },
    });
  });

  const content = (roadmap.content as unknown as { week: number; title: string; description: string }[]) ?? [];
  const phases = content.map((phase) => {
    const tasks = roadmap.tasks.filter((t) => t.week === phase.week).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description ?? "",
      type: t.type,
      week: t.week,
      completed: t.completed,
      completedAt: t.completedAt?.toISOString() ?? null,
    }));
    return { week: phase.week, title: phase.title, description: phase.description, tasks };
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Learning Roadmap</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Week-by-week plan for {readiness.targetRole.title} at {readiness.targetCompany?.name ?? "your target"}.
        </p>
      </div>
      <RoadmapView
        roadmapId={roadmap.id}
        durationWeeks={roadmap.durationWeeks}
        overview={roadmap.overview ?? ""}
        phases={phases}
        totalCount={roadmap.tasks.length}
      />
    </div>
  );
}
