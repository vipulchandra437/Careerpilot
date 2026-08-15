import type { ReadinessResult } from "@/server/scoring/readiness.service";
import type { SkillAssessmentItem } from "@/server/scoring/skills";
import type { RecommendedAction } from "@/server/services/recommendations.service";
import { CATEGORY_LABELS, CategoryKey, readinessBand, topScores, weakestScores } from "@/server/scoring/score-engine";

export interface ReportData {
  generatedAt: string;
  overall: number;
  band: string;
  targetCompany: string | null;
  targetRole: string | null;
  categoryScores: { key: string; label: string; score: number }[];
  strengths: { label: string; score: number }[];
  weaknesses: { label: string; score: number }[];
  skillGaps: { skillName: string; status: string; reason: string; requiredRating: number; currentRating: number }[];
  recommendedActions: RecommendedAction[];
  summary: string;
}

export function buildReportData(
  readiness: ReadinessResult,
  gaps: SkillAssessmentItem[],
  actions: RecommendedAction[],
): ReportData {
  const band = readinessBand(readiness.overall);

  const categoryScores = (Object.keys(readiness.scores) as CategoryKey[]).map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    score: readiness.scores[key],
  }));

  const top = topScores(readiness.scores, 3);
  const weak = weakestScores(readiness.scores, 3);

  const strengths = top.map((t) => ({ label: `${CATEGORY_LABELS[t.key]} (${t.score})`, score: t.score }));
  const weaknesses = weak
    .filter((w) => w.score < 70)
    .map((w) => ({ label: `${CATEGORY_LABELS[w.key]} (${w.score})`, score: w.score }));

  const skillGaps = gaps
    .filter((g) => g.status !== "STRONG")
    .slice(0, 10)
    .map((g) => ({
      skillName: g.skillName,
      status: g.status,
      reason: g.reason,
      requiredRating: g.requiredRating,
      currentRating: g.currentRating,
    }));

  const missing = gaps.filter((g) => g.status === "MISSING").length;
  const summary =
    `Your overall readiness is ${readiness.overall}/100 (${band.label}). ` +
    (readiness.targetRole
      ? `You are targeting ${readiness.targetRole.title}${readiness.targetCompany ? ` at ${readiness.targetCompany.name}` : ""}. `
      : "You have not set a target role yet — setting one improves the accuracy of this report. ") +
    (missing > 0
      ? `${missing} skill${missing === 1 ? " is" : "s are"} completely missing from your profile. `
      : "") +
    `Focus on your lowest-weighted gaps first to move the overall score fastest.`;

  return {
    generatedAt: new Date().toISOString(),
    overall: readiness.overall,
    band: band.label,
    targetCompany: readiness.targetCompany?.name ?? null,
    targetRole: readiness.targetRole?.title ?? null,
    categoryScores,
    strengths,
    weaknesses,
    skillGaps,
    recommendedActions: actions,
    summary,
  };
}
