"use client";

import { useState } from "react";
import { requireUser } from "@/lib/auth-helpers";
import { computeReadiness } from "@/server/scoring/readiness.service";
import { computeSkillCoverage } from "@/server/scoring/skills";
import { SkillGapsView } from "@/components/skill-gaps/skill-gaps-view";
import { SkillAssessment } from "@/components/skill-gaps/skill-assessment";

type GapItem = {
  skillId: string;
  skillName: string;
  skillCategory: string;
  importance: string;
  requiredRating: number;
  currentRating: number;
  status: string;
  reason: string;
  recommendedAction: string;
  estimatedEffort: string;
};

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
      <SkillGapsViewWithAssessment
        coverage={coverage}
        targetRole={readiness.targetRole?.title ?? null}
        targetCompany={readiness.targetCompany?.name ?? null}
        items={items}
      />
    </div>
  );
}

function SkillGapsViewWithAssessment({
  coverage,
  targetRole,
  targetCompany,
  items,
}: {
  coverage: number;
  targetRole: string | null;
  targetCompany: string | null;
  items: GapItem[];
}) {
  const [assessmentSkill, setAssessmentSkill] = useState<string | null>(null);
  const [itemsState, setItemsState] = useState(items);

  function handleScoreUpdate(skillId: string, newRating: number) {
    setItemsState((prev) =>
      prev.map((item) =>
        item.skillId === skillId
          ? { ...item, currentRating: newRating }
          : item
      )
    );
  }

  return (
    <>
      <SkillGapsView
        coverage={coverage}
        targetRole={targetRole}
        targetCompany={targetCompany}
        items={itemsState}
        onAssessSkill={(skillId) => setAssessmentSkill(skillId)}
      />
      {assessmentSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-background p-6 shadow-xl">
            {(() => {
              const item = itemsState.find((i) => i.skillId === assessmentSkill);
              if (!item) return null;
              return (
                <SkillAssessment
                  skillId={item.skillId}
                  skillName={item.skillName}
                  onScoreUpdate={(rating) => {
                    handleScoreUpdate(item.skillId, rating);
                    setAssessmentSkill(null);
                  }}
                />
              );
            })()}
            <button
              onClick={() => setAssessmentSkill(null)}
              className="mt-4 w-full rounded-md border p-2 text-sm text-muted-foreground hover:bg-accent"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
