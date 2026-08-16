/**
 * Deterministic scoring engine.
 *
 * The final readiness scores are ALWAYS computed here in the backend from real
 * data. AI never produces final scores — it only produces evaluation data
 * (analysis text, structured breakdowns) that feeds into these calculations.
 */

export type CategoryKey =
  | "RESUME"
  | "CODING"
  | "INTERVIEW"
  | "COMMUNICATION"
  | "PROJECTS"
  | "GITHUB"
  | "LINKEDIN"
  | "SKILL_COVERAGE";

export type CategoryScores = Record<CategoryKey, number>;
export type Weights = Partial<Record<CategoryKey, number>>;

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  RESUME: "Resume",
  CODING: "Coding",
  INTERVIEW: "Interview",
  COMMUNICATION: "Communication",
  PROJECTS: "Projects",
  GITHUB: "GitHub",
  LINKEDIN: "LinkedIn",
  SKILL_COVERAGE: "Skill Coverage",
};

/** Default weights (sum = 100). Overridable per company/job role. */
export const DEFAULT_WEIGHTS: Weights = {
  RESUME: 15,
  CODING: 25,
  INTERVIEW: 20,
  COMMUNICATION: 10,
  PROJECTS: 10,
  GITHUB: 10,
  LINKEDIN: 5,
  SKILL_COVERAGE: 5,
};

export const CATEGORY_KEYS: CategoryKey[] = [
  "RESUME",
  "CODING",
  "INTERVIEW",
  "COMMUNICATION",
  "PROJECTS",
  "GITHUB",
  "LINKEDIN",
  "SKILL_COVERAGE",
];

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/** Normalize partial weights so they sum to 100. */
export function normalizeWeights(weights: Weights | null | undefined): Record<CategoryKey, number> {
  const merged: Record<CategoryKey, number> = {
    RESUME: DEFAULT_WEIGHTS.RESUME ?? 15,
    CODING: DEFAULT_WEIGHTS.CODING ?? 25,
    INTERVIEW: DEFAULT_WEIGHTS.INTERVIEW ?? 20,
    COMMUNICATION: DEFAULT_WEIGHTS.COMMUNICATION ?? 10,
    PROJECTS: DEFAULT_WEIGHTS.PROJECTS ?? 10,
    GITHUB: DEFAULT_WEIGHTS.GITHUB ?? 10,
    LINKEDIN: DEFAULT_WEIGHTS.LINKEDIN ?? 5,
    SKILL_COVERAGE: DEFAULT_WEIGHTS.SKILL_COVERAGE ?? 5,
  };
  if (weights) {
    for (const key of CATEGORY_KEYS) {
      // Ignore non-finite and negative values so a corrupted weights JSON can
      // never produce NaN or negative contributions in the final score.
      const value = weights[key];
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        merged[key] = value;
      }
    }
  }
  const total = CATEGORY_KEYS.reduce((sum, k) => sum + merged[k], 0);
  // All-zero/negative weights would make every score NaN or zero — fall back
  // to the sane defaults instead of propagating broken config.
  if (total <= 0) return { ...DEFAULT_WEIGHTS } as Record<CategoryKey, number>;
  const normalized = { ...merged };
  for (const k of CATEGORY_KEYS) normalized[k] = (normalized[k] / total) * 100;
  return normalized;
}

/** Weighted sum of category scores → overall readiness 0-100. */
export function computeOverall(
  scores: CategoryScores,
  weights: Weights | null | undefined,
): number {
  const w = normalizeWeights(weights);
  const total = CATEGORY_KEYS.reduce((sum, k) => sum + scores[k] * w[k], 0);
  return Math.round(clamp(total / 100));
}

export function emptyCategoryScores(): CategoryScores {
  return {
    RESUME: 0,
    CODING: 0,
    INTERVIEW: 0,
    COMMUNICATION: 0,
    PROJECTS: 0,
    GITHUB: 0,
    LINKEDIN: 0,
    SKILL_COVERAGE: 0,
  };
}

/** Priority helpers for dashboards. */
export function topScores(scores: CategoryScores, count = 3): { key: CategoryKey; score: number }[] {
  return CATEGORY_KEYS.map((key) => ({ key, score: scores[key] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

export function weakestScores(scores: CategoryScores, count = 3): { key: CategoryKey; score: number }[] {
  return CATEGORY_KEYS.map((key) => ({ key, score: scores[key] }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count);
}

export function readinessBand(score: number): {
  label: string;
  color: string;
  tone: "critical" | "warning" | "good" | "excellent";
} {
  if (score >= 85) return { label: "Ready to apply", color: "emerald", tone: "excellent" };
  if (score >= 70) return { label: "Almost ready", color: "sky", tone: "good" };
  if (score >= 50) return { label: "In progress", color: "amber", tone: "warning" };
  return { label: "Getting started", color: "rose", tone: "critical" };
}
