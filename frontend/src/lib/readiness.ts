/**
 * CareerPilot — 5-feature Career Readiness engine (frontend).
 *
 * WHY this lives in the SPA, not the Next.js backend: the raw per-feature
 * scores (resume, mock_interview, coding_test, roadmap, target_companies) are
 * already derived by the backend and shipped as `features` on the Readiness
 * payload. The AGGREGATION — turning those five weights + scores into a
 * headline number, a per-feature breakdown, and a "lowest contributor" focus —
 * is pure, has no DB/secret access, and is unit-tested with `node --test`.
 * Keeping it here lets the dashboard own its own score card without another
 * round-trip, and keeps the scoring logic in the same bundle that renders it.
 *
 * Weighting model (integer points, Σ = 100):
 *   resume 30, mock_interview 30, coding_test 20, roadmap 15, target_companies 5.
 * A feature with no score yet contributes 0 rather than a failing grade, so a
 * half-finished profile can't read as "bad readiness" the way a scored-but-bad
 * resume could.
 */

export type FeatureKey =
  | "resume"
  | "mock_interview"
  | "coding_test"
  | "roadmap"
  | "target_companies";

/** Raw 0–100 (or null = feature has produced no score yet) + the integer points
 * this feature carries toward the headline. */
export interface FeatureScore {
  key: FeatureKey;
  score: number | null;
  weight: number;
}

/** Status shown for each feature in the breakdown. "not_started" is a missing
 * measurement (null score) and renders distinctly from a low-but-measured grade. */
export type FeatureStatus = "not_started" | "strong" | "weak";

export interface FeatureContribution {
  key: FeatureKey;
  score: number | null;
  weight: number;
  contribution: number; // round(weight * score / 100), null → 0
  status: FeatureStatus;
}

export interface ReadinessResult {
  overall: number; // 0–100, integer
  breakdown: FeatureContribution[];
}

/** Raw per-feature scores keyed by feature, as returned by the backend. */
export type FeatureScores = Record<FeatureKey, number | null>;

/** Canonical presentation order — also defines the tie-break order for the
 * "lowest contributor" focus (first feature with the min contribution wins). */
export const FEATURE_ORDER: FeatureKey[] = [
  "resume",
  "mock_interview",
  "coding_test",
  "roadmap",
  "target_companies",
];

/** Integer points; Σ = 100. Named constants so the dashboard ring weights and
 * the test matrix can never drift out of sync. */
// Weighed by hiring-signal density: resume & interview carry the most signal (30 each), coding proof (20), roadmap engagement (15), target-company intent (5).
export const FEATURE_WEIGHTS: Record<FeatureKey, number> = {
  resume: 30,
  mock_interview: 30,
  coding_test: 20,
  roadmap: 15,
  target_companies: 5,
};

/** Status cutoffs for a feature's OWN score (independent of the headline):
 *  >= STRONG_THRESHOLD → "strong", a measured score below it → "weak", and a
 *  null score (no data yet) → "not_started". Deliberately lower than the
 *  headline "On Track" bar (80) so a single strong feature is recognizable
 *  even when the headline is still climbing. */
export const STRONG_THRESHOLD = 70;

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  resume: "Resume",
  mock_interview: "Mock Interview",
  coding_test: "Coding Test",
  roadmap: "Roadmap",
  target_companies: "Target Companies",
};

export const FEATURE_ROUTES: Record<FeatureKey, string> = {
  resume: "/resume",
  mock_interview: "/interview",
  coding_test: "/coding",
  roadmap: "/roadmap",
  target_companies: "/profile",
};

export const FEATURE_ACTIONS: Record<FeatureKey, string> = {
  resume: "Review Resume",
  mock_interview: "Start Interview",
  coding_test: "Take Test",
  roadmap: "View Roadmap",
  target_companies: "Set Target",
};

export const STATUS_LABELS: Record<FeatureStatus, string> = {
  not_started: "Not started",
  strong: "Strong",
  weak: "Needs work",
};

export const STATUS_COLORS: Record<FeatureStatus, string> = {
  not_started: "text-muted",
  strong: "text-success",
  weak: "text-warning",
};

/** Attach the canonical weights to the raw feature scores so `computeReadiness`
 * stays a pure function of its input (easy to test in isolation). */
export function buildFeatureScores(scores: FeatureScores | null): FeatureScore[] {
  return FEATURE_ORDER.map((key) => ({
    key,
    score: scores ? scores[key] ?? null : null,
    weight: FEATURE_WEIGHTS[key],
  }));
}

function clampScore(n: number | null | undefined): number | null {
  if (n == null) return null;
  const v = Math.round(Number(n));
  if (Number.isNaN(v)) return null;
  return Math.max(0, Math.min(100, v));
}

export function computeReadiness(features: FeatureScore[]): ReadinessResult {
  const breakdown: FeatureContribution[] = features.map((f) => {
    const score = clampScore(f.score);
    // WHY null → 0 here: a missing feature is "not measured", and must read as
    // 0 contribution (absent), never as a 0-grade. clampScore(null) → null, and
    // null*weight/100 is treated as 0 so the feature simply doesn't help yet.
    const contribution = Math.round((f.weight * (score ?? 0)) / 100);
    return {
      key: f.key,
      score,
      weight: f.weight,
      contribution,
      // null (no data) is "not_started", never a failing "weak 0".
      status:
        score == null
          ? "not_started"
          : score >= STRONG_THRESHOLD
            ? "strong"
            : "weak",
    };
  });

  // WHY cap at 100: with Σweight = 100 and scores ≤ 100 the sum can't exceed 100,
  // but rounding could in principle push past it for arbitrary inputs, so the
  // cap is an explicit safety net on the headline number.
  const overall = Math.min(100, breakdown.reduce((sum, b) => sum + b.contribution, 0));

  return { overall, breakdown };
}

/** The feature dragging the headline down the most — the single fastest lever
 * for the student. A feature with no data ("not_started", 0 contribution) is
 * never surfaced unless EVERY feature is "not_started", so "Today's Focus"
 * always points at something the student can actually move. Ties resolve to
 * the first feature in FEATURE_ORDER. */
export function lowestContributor(breakdown: FeatureContribution[]): FeatureContribution {
  const started = breakdown.filter((b) => b.status !== "not_started");
  const pool = started.length === 0 ? breakdown : started;
  return pool.reduce((min, b) => (b.contribution < min.contribution ? b : min));
}

/** Target-company score from the count of active targets — mirrors the backend
 * getter in `src/server/readiness-data.ts` (keep in sync). */
export function computeTargetCompaniesScore(count: number): number | null {
  if (count <= 0) return null;
  return count >= 2 ? 100 : 50;
}
