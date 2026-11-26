// Hire readiness from two components: interview 60%, resume 40% (PRD §4).
// Scores are 0-10 for interviews and 0-100 for resumes; output is 0-100.

export type ReadinessCoverage = "both" | "interview" | "resume" | "none";

export interface ReadinessInput {
  interviewScore?: number | null;
  resumeScore?: number | null;
}

export interface ReadinessResult {
  score: number;
  interviewWeight: number;
  resumeWeight: number;
  interviewComponent: number;
  resumeComponent: number;
  coverage: ReadinessCoverage;
}

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const interview =
    typeof input.interviewScore === "number" && Number.isFinite(input.interviewScore)
      ? clamp(input.interviewScore, 10)
      : null;
  const resume =
    typeof input.resumeScore === "number" && Number.isFinite(input.resumeScore)
      ? clamp(input.resumeScore, 100) / 10
      : null;

  let score10 = 0;
  let coverage: ReadinessCoverage = "none";
  if (interview !== null && resume !== null) {
    score10 = 0.6 * interview + 0.4 * resume;
    coverage = "both";
  } else if (interview !== null) {
    score10 = interview;
    coverage = "interview";
  } else if (resume !== null) {
    score10 = resume;
    coverage = "resume";
  }

  // With one component missing, it takes the whole score so a user is not
  // penalised twice for an analysis they have not run yet.
  const interviewComponent =
    interview === null ? 0 : Math.round((coverage === "both" ? 0.6 * interview : interview) * 10);
  const resumeComponent =
    resume === null ? 0 : Math.round((coverage === "both" ? 0.4 * resume : resume) * 10);

  return {
    score: Math.round(score10 * 10),
    interviewWeight: 0.6,
    resumeWeight: 0.4,
    interviewComponent,
    resumeComponent,
    coverage,
  };
}

/** Dashboard score: both groups are 0-100; a missing group contributes 0. */
export function computeDashboardReadiness(input: {
  resumeScore?: number | null;
  interviewScore?: number | null;
}): number {
  const score = (value: number | null | undefined) =>
    typeof value === "number" && Number.isFinite(value) ? clamp(value, 100) : 0;
  return Math.round(0.4 * score(input.resumeScore) + 0.6 * score(input.interviewScore));
}
