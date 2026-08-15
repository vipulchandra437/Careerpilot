import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { UsersManager } from "@/components/admin/users-manager";

export const metadata = { title: "Admin Users" };

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          codingSubmissions: true,
          interviews: true,
          projects: true,
          scoreHistories: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage platform users and their roles.</p>
      </div>
      <UsersManager
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
          submissions: u._count.codingSubmissions,
          interviews: u._count.interviews,
          projects: u._count.projects,
          scoreEvents: u._count.scoreHistories,
        }))}
      />
    </div>
  );
}
