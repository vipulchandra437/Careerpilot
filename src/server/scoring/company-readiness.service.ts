import { prisma } from "@/lib/db";
import { Prisma, ScoreType } from "@prisma/client";
import {
  CATEGORY_KEYS,
  CategoryKey,
  CategoryScores,
  computeOverall,
  normalizeWeights,
} from "@/server/scoring/score-engine";
import {
  computeReadiness,
} from "@/server/scoring/readiness.service";
import { computeSkillCoverage, RequirementWithSkill } from "@/server/scoring/skills";

export interface ReadinessBreakdownItem {
  key: CategoryKey;
  label: string;
  score: number;
  weight: number;
}

export interface CompanyReadinessResult {
  overall: number;
  breakdown: ReadinessBreakdownItem[];
  scores: CategoryScores;
  weights: Record<string, number>;
  companyId: string;
  jobRoleId: string;
}

/** Persist a score point for progress tracking. */
export async function recordScoreHistory(
  userId: string,
  type: ScoreType,
  score: number,
  meta?: Record<string, unknown>,
  tx: Prisma.TransactionClient = prisma,
) {
  await tx.scoreHistory.create({
    data: { userId, type, score, meta: (meta as object) ?? undefined },
  });
}

/**
 * Compute readiness for a specific company + job role (may differ from the
 * student's selected target). Deterministic: real data + role weights only.
 *
 * Reads are side-effect free; pass `persist: true` (e.g. from an explicit
 * action) to store the result and a score-history point. Read-only views such
 * as the readiness page must not persist on every render.
 */
export async function computeCompanyReadiness(
  userId: string,
  companyId: string,
  jobRoleId: string,
  options?: { persist?: boolean },
): Promise<CompanyReadinessResult> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      studentSkills: { select: { skillId: true, rating: true } },
    },
  });
  if (!profile) throw new Error("Student profile not found");

  const role = await prisma.jobRole.findUnique({
    where: { id: jobRoleId },
    include: {
      skillRequirements: {
        include: { skill: { select: { id: true, name: true, category: true } } },
      },
    },
  });
  if (!role) throw new Error("Job role not found");
  if (role.companyId !== companyId) throw new Error("Job role does not belong to the company");

  // Base category scores (uses student's target role for coverage — we override below).
  const base = await computeReadiness(userId);

  // Skill coverage against THIS role's requirements.
  const requirements: RequirementWithSkill[] = role.skillRequirements.map((r) => ({
    skillId: r.skill.id,
    skillName: r.skill.name,
    skillCategory: r.skill.category,
    importance: r.importance,
    requiredRating: r.requiredRating,
    weight: r.weight,
  }));
  const coverage = computeSkillCoverage(requirements, profile.studentSkills);

  const scores: CategoryScores = { ...base.scores, SKILL_COVERAGE: coverage };
  const weights = normalizeWeights(role.weights as Record<string, number> | null | undefined);
  const overall = computeOverall(scores, weights);

  const breakdown: ReadinessBreakdownItem[] = CATEGORY_KEYS.map((key) => ({
    key,
    label: key.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
    score: scores[key],
    weight: Math.round(weights[key]),
  }));

  if (options?.persist) {
    // Persist results.
    await prisma.companyReadiness.upsert({
      where: { profileId_jobRoleId: { profileId: profile.id, jobRoleId } },
      update: {
        companyId,
        overallScore: overall,
        breakdown: breakdown as unknown as object,
        computedAt: new Date(),
      },
      create: {
        profileId: profile.id,
        companyId,
        jobRoleId,
        overallScore: overall,
        breakdown: breakdown as unknown as object,
      },
    });

    await recordScoreHistory(userId, "COMPANY_READINESS", overall, {
      companyId,
      jobRoleId,
      company: role.companyId,
    });
  }

  return { overall, breakdown, scores, weights, companyId, jobRoleId };
}
