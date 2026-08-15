import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { DEFAULT_WEIGHTS, CATEGORY_LABELS, CATEGORY_KEYS } from "@/server/scoring/score-engine";
import { AssessmentConfig } from "@/components/admin/assessment-config";

export const metadata = { title: "Admin Assessment Config" };

export default async function AdminAssessmentConfigPage() {
  await requireAdmin();

  const roles = await prisma.jobRole.findMany({
    orderBy: [{ companyId: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      level: true,
      weights: true,
      company: { select: { name: true } },
    },
  });

  const defaultWeights = CATEGORY_KEYS.map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    value: DEFAULT_WEIGHTS[key] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assessment Config</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How readiness categories are weighted in each role&apos;s overall score. Weights are normalized to 100.
        </p>
      </div>
      <AssessmentConfig
        defaultWeights={defaultWeights}
        roles={roles.map((r) => ({
          id: r.id,
          title: r.title,
          level: r.level,
          companyName: r.company.name,
          weights: (r.weights as Record<string, number>) ?? {},
        }))}
        categoryLabels={CATEGORY_KEYS.map((key) => ({ key, label: CATEGORY_LABELS[key] }))}
      />
    </div>
  );
}
