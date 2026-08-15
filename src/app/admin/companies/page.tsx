import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { CompaniesManager } from "@/components/admin/companies-manager";

export const metadata = { title: "Admin Companies" };

export default async function AdminCompaniesPage() {
  await requireAdmin();

  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      industry: true,
      description: true,
      _count: { select: { jobRoles: true, profiles: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
        <p className="mt-1 text-sm text-muted-foreground">Companies that appear in the career goal picker.</p>
      </div>
      <CompaniesManager
        companies={companies.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          industry: c.industry,
          description: c.description,
          roleCount: c._count.jobRoles,
          targetCount: c._count.profiles,
        }))}
      />
    </div>
  );
}
