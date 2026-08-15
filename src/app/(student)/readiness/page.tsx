import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { computeCompanyReadiness } from "@/server/scoring/company-readiness.service";
import { ReadinessView } from "@/components/readiness/readiness-view";

export const metadata = { title: "Company Readiness" };

export default async function ReadinessPage() {
  const user = await requireUser();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: {
      targetCompany: { select: { id: true, name: true } },
      targetJobRole: { select: { id: true, title: true, level: true, minExperience: true } },
    },
  });

  const targetRole = profile?.targetJobRole;
  const targetCompany = profile?.targetCompany;

  if (!targetRole || !targetCompany) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Company Readiness</h1>
        <p className="text-sm text-muted-foreground">
          Set a target company and role to see how ready you are for that specific position.
        </p>
      </div>
    );
  }

  const result = await computeCompanyReadiness(user.id, targetCompany.id, targetRole.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Company Readiness</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your weighted readiness for {targetRole.title} at {targetCompany.name}.
        </p>
      </div>
      <ReadinessView
        overall={result.overall}
        companyName={targetCompany.name}
        roleTitle={targetRole.title}
        level={targetRole.level}
        minExperience={targetRole.minExperience}
        breakdown={result.breakdown.map((b) => ({ key: b.key, label: b.label, score: b.score, weight: b.weight }))}
      />
    </div>
  );
}
