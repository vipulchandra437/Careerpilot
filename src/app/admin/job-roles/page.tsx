import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { JobRolesManager } from "@/components/admin/job-roles-manager";

export const metadata = { title: "Admin Job Roles" };

export default async function AdminJobRolesPage() {
  await requireAdmin();

  const [companies, roles] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.jobRole.findMany({
      orderBy: [{ companyId: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        level: true,
        minExperience: true,
        description: true,
        weights: true,
        companyId: true,
        company: { select: { name: true } },
        _count: { select: { skillRequirements: true, profiles: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Job Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">Roles listed under each company with their scoring weights.</p>
      </div>
      <JobRolesManager
        companies={companies}
        roles={roles.map((r) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          level: r.level,
          minExperience: r.minExperience,
          description: r.description,
          weights: (r.weights as Record<string, number>) ?? {},
          companyId: r.companyId,
          companyName: r.company.name,
          requirementCount: r._count.skillRequirements,
          targetCount: r._count.profiles,
        }))}
      />
    </div>
  );
}
