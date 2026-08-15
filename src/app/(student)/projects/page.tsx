import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ProjectsManager } from "@/components/analyzers/projects-analyzer";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await requireUser();

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      analyses: { orderBy: { createdAt: "desc" }, take: 1, select: { score: true, createdAt: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catalog your projects and get quality feedback with concrete improvement suggestions.
        </p>
      </div>
      <ProjectsManager
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          repoUrl: p.repoUrl,
          description: p.description,
          techStack: (p.techStack as unknown as string[]) ?? [],
          createdAt: p.createdAt.toISOString(),
          latestScore: p.analyses[0]?.score ?? null,
          latestAnalyzedAt: p.analyses[0]?.createdAt.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
