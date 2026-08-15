import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { SkillsManager } from "@/components/admin/skills-manager";

export const metadata = { title: "Admin Skills" };

export default async function AdminSkillsPage() {
  await requireAdmin();

  const skills = await prisma.skill.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      _count: { select: { studentSkills: true, skillRequirements: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Skills</h1>
        <p className="mt-1 text-sm text-muted-foreground">Skills available to students and role requirements.</p>
      </div>
      <SkillsManager
        skills={skills.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          description: s.description,
          studentCount: s._count.studentSkills,
          requirementCount: s._count.skillRequirements,
        }))}
      />
    </div>
  );
}
