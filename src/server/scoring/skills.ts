import type { GapStatus } from "@prisma/client";
import { clamp } from "@/server/scoring/score-engine";

export interface RequirementWithSkill {
  skillId: string;
  skillName: string;
  skillCategory: string;
  importance: "ESSENTIAL" | "IMPORTANT" | "NICE_TO_HAVE";
  requiredRating: number;
  weight?: number | null;
}

export interface StudentSkillRef {
  skillId: string;
  rating: number;
}

export interface SkillAssessmentItem extends RequirementWithSkill {
  currentRating: number;
  status: GapStatus;
  priority: number;
  reason: string;
  recommendedAction: string;
  estimatedEffort: string;
}

const IMPORTANCE_WEIGHT: Record<string, number> = {
  ESSENTIAL: 1.5,
  IMPORTANT: 1,
  NICE_TO_HAVE: 0.5,
};

export function assessSkill(currentRating: number, requiredRating: number): GapStatus {
  if (currentRating >= requiredRating) return "STRONG";
  if (currentRating >= Math.max(1, requiredRating - 1)) return "GOOD";
  if (currentRating > 0) return "NEEDS_IMPROVEMENT";
  return "MISSING";
}

/** Coverage: weighted ratio of student rating vs required, 0-100. */
export function computeSkillCoverage(
  requirements: RequirementWithSkill[],
  studentSkills: StudentSkillRef[],
): number {
  if (requirements.length === 0) return 0;
  const ratingMap = new Map(studentSkills.map((s) => [s.skillId, s.rating]));
  let weightedRatio = 0;
  let totalWeight = 0;
  for (const req of requirements) {
    if (req.requiredRating <= 0) continue;
    const current = ratingMap.get(req.skillId) ?? 0;
    const weight = IMPORTANCE_WEIGHT[req.importance] * (req.weight ?? 1);
    weightedRatio += (Math.min(current, req.requiredRating) / req.requiredRating) * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) return 0;
  return Math.round(clamp((weightedRatio / totalWeight) * 100));
}

const EFFORT_BY_GAP: Record<GapStatus, string> = {
  MISSING: "3-6 weeks of structured learning",
  NEEDS_IMPROVEMENT: "2-4 weeks of practice",
  GOOD: "1-2 weeks to solidify",
  STRONG: "No further work needed",
};

const ACTION_BY_GAP: Record<GapStatus, string> = {
  MISSING: "Take a structured course and build a practice project",
  NEEDS_IMPROVEMENT: "Follow a focused practice plan with weekly assessments",
  GOOD: "Reinforce with real-world projects and mock tests",
  STRONG: "Keep current level through regular practice",
};

export function computeSkillGaps(
  requirements: RequirementWithSkill[],
  studentSkills: StudentSkillRef[],
): SkillAssessmentItem[] {
  const ratingMap = new Map(studentSkills.map((s) => [s.skillId, s.rating]));
  const items: SkillAssessmentItem[] = [];

  for (const req of requirements) {
    const currentRating = ratingMap.get(req.skillId) ?? 0;
    const status = assessSkill(currentRating, req.requiredRating);
    // priority: missing/essential first
    const importanceBonus = req.importance === "ESSENTIAL" ? 0 : req.importance === "IMPORTANT" ? 1 : 2;
    const priority = (status === "STRONG" ? 10 : status === "GOOD" ? 6 : status === "NEEDS_IMPROVEMENT" ? 3 : 1) + importanceBonus;

    let reason = "";
    if (status === "STRONG") reason = `You are at or above the ${req.requiredRating}/5 level expected.`;
    else if (status === "GOOD") reason = `Close to the required ${req.requiredRating}/5 level — polish it.`;
    else if (status === "NEEDS_IMPROVEMENT")
      reason = `Currently rated ${currentRating}/5, below the required ${req.requiredRating}/5.`;
    else reason = `Not listed in your skills. Required at ${req.requiredRating}/5.`;

    items.push({
      ...req,
      currentRating,
      status,
      priority,
      reason,
      recommendedAction: ACTION_BY_GAP[status],
      estimatedEffort: EFFORT_BY_GAP[status],
    });
  }

  return items.sort((a, b) => {
    if (a.status === "STRONG" && b.status !== "STRONG") return 1;
    if (b.status === "STRONG" && a.status !== "STRONG") return -1;
    return a.priority - b.priority;
  });
}
