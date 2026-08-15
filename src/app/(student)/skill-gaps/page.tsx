import { requireUser } from "@/lib/auth-helpers";
import { computeReadiness } from "@/server/scoring/readiness.service";
import { computeSkillCoverage } from "@/server/scoring/skills";
import { SkillGapsView } from "@/components/skill-gaps/skill-gaps-view";

export const metadata = { title: "Skill Gaps" };

export default async function SkillGapsPage() {
  const user = await requireUser();
  const readiness = await computeReadiness(user.id);

  const items = readiness.skillCoverageItems.map((item) => ({
    skillId: item.skillId,
    skillName: item.skillName,
    skillCategory: item.skillCategory,
    importance: item.importance,
    requiredRating: item.requiredRating,
    currentRating: item.currentRating,
    status: item.status,
    priority: item.priority,
    reason: item.reason,
    recommendedAction: item.recommendedAction,
    estimatedEffort: item.estimatedEffort,
  }));

  const coverage = computeSkillCoverage(
    items.map((i) => ({
      skillId: i.skillId,
      skillName: i.skillName,
      skillCategory: i.skillCategory,
      importance: i.importance,
      requiredRating: i.requiredRating,
    })),
    items.map((i) => ({ skillId: i.skillId, rating: i.currentRating })),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Skill Gaps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Skills your target role requires, compared against your self-assessed ratings.
        </p>
      </div>
      <SkillGapsView
        coverage={coverage}
        targetRole={readiness.targetRole?.title ?? null}
        targetCompany={readiness.targetCompany?.name ?? null}
        items={items}
      />
    </div>
  );
}
