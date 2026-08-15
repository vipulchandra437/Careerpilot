import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { CareerGoalForm } from "@/components/career-goal/career-goal-form";

export const metadata = { title: "Career Goal" };

export default async function CareerGoalPage() {
  const user = await requireUser();

  const [companies, profile] = await Promise.all([
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        industry: true,
        jobRoles: {
          select: { id: true, title: true, level: true, description: true },
          orderBy: { title: "asc" },
        },
      },
    }),
    prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { targetCompanyId: true, targetJobRoleId: true, onboardingCompletedAt: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Career Goal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the company and role you&apos;re preparing for. CareerPilot measures your
          readiness against this target and builds your roadmap around it.
        </p>
      </div>
      <CareerGoalForm
        companies={companies}
        initialCompanyId={profile?.targetCompanyId ?? null}
        initialRoleId={profile?.targetJobRoleId ?? null}
        onboardingCompleted={Boolean(profile?.onboardingCompletedAt)}
      />
    </div>
  );
}
