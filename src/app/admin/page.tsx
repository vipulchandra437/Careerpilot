import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { Users, Building2, Briefcase, Database, Code2, FileText, TrendingUp, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  const [
    totalUsers,
    totalStudents,
    totalCompanies,
    totalRoles,
    totalSkills,
    totalProblems,
    totalSubmissions,
    acceptedSubmissions,
    totalInterviews,
    totalReports,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.company.count(),
    prisma.jobRole.count(),
    prisma.skill.count(),
    prisma.codingProblem.count(),
    prisma.codingSubmission.count(),
    prisma.codingSubmission.count({ where: { status: "ACCEPTED" } }),
    prisma.interview.count({ where: { status: "COMPLETED" } }),
    prisma.careerReport.count(),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
  ]);

  const stats = [
    { label: "Total users", value: totalUsers, icon: Users },
    { label: "Students", value: totalStudents, icon: ShieldCheck },
    { label: "Companies", value: totalCompanies, icon: Building2 },
    { label: "Job roles", value: totalRoles, icon: Briefcase },
    { label: "Skills", value: totalSkills, icon: Database },
    { label: "Problems", value: totalProblems, icon: Code2 },
    { label: "Submissions", value: `${acceptedSubmissions}/${totalSubmissions}`, icon: TrendingUp },
    { label: "Completed interviews", value: totalInterviews, icon: FileText },
    { label: "Career reports", value: totalReports, icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform overview. Signed in as {admin.email}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <s.icon className="size-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent signups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={u.role === "ADMIN" ? "secondary" : "outline"}>{u.role.toLowerCase()}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
