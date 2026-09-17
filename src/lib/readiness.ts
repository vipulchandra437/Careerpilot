// WHY a single pure module for scoring: PHASES.md 4.5 requires the Hire
// Readiness Score to be DETERMINISTIC code, not an LLM call — the number must
// be stable and explainable so a student can trust it. Every function here is a
// pure transform of already-validated inputs; no network, no date math, no DB.

// Scores are 0-100. Resume contributes 40%, interviews 60%.
export const RESUME_WEIGHT = 0.4;
export const INTERVIEW_WEIGHT = 0.6;

// WHY 70/30 blend of overall + ATS: overall is the holistic content review
// (depth, impact, relevance) while ATS reflects format/keyword pass. Content
// that is easy to read matters more than keyword trickery, so it weighs higher.
export const RESUME_BLEND = { overallWeight: 0.7, atsWeight: 0.3 } as const;

// WHY average the LAST up-to-3 interviews rather than the single latest: a
// single erratic session (interviewee got a hard question set, bad day) would
// swing the score unfairly. Averaging a small window keeps the number stable
// while still reflecting recent performance. Chosen 3 as a round compromise —
// more would lag improvement, less would be noisy.
export const INTERVIEW_AVERAGE_WINDOW = 3;

// Interview finalScore is 0-10 (per-question eval scores averaged); scale to
// 0-100 so both inputs live on the same axis before weighting.
export const INTERVIEW_SCORE_SCALE = 10;

// Level thresholds are intentional encouragement bands, not pass/fail:
//   <50  "Needs work"       — early journey, fundamentals missing
//   50-79 "Getting there"   — solid base, close to recruiter-ready
//   >=80 "Interview ready"  — good enough to book the real thing
export const LEVEL_THRESHOLDS = { needsWorkMax: 49, gettingThereMax: 79 } as const;

export type ReadinessLevel = "needs-work" | "getting-there" | "interview-ready";

export const LEVEL_LABELS: Record<ReadinessLevel, string> = {
  "needs-work": "Needs work",
  "getting-there": "Getting there",
  "interview-ready": "Interview ready",
};

// WHY labels are part of the result, not the UI: partial-score wording is a
// data property ("this score is incomplete") — grouping it with the math keeps
// every consumer showing the same honest message.
export const PARTIAL_LABELS = {
  noResume: "Upload + parse a resume to begin",
  noInterview: "Add an interview to complete your score",
} as const;

export interface ReadinessBreakdown {
  resume: { score: number | null; weight: number };
  interview: { score: number | null; weight: number };
}

export interface ReadinessResult {
  readiness: number; // 0-100, integer
  breakdown: ReadinessBreakdown;
  level: ReadinessLevel;
  // WHY label can be null: only set when the score is partial (missing resume
  // or interview) so the UI knows a full score needs no qualification.
  label: string | null;
}

export interface ReadinessSnapshot {
  at: string; // ISO timestamp of the data event that created this snapshot
  resumeScore: number | null;
  interviewScore: number | null;
  readiness: number;
  level: ReadinessLevel;
  label: string | null;
}

const clampScore = (n: number | null | undefined): number | null => {
  if (n == null) return null;
  const v = Math.round(n);
  // WHY clamp: even validated inputs could drift (LLM-echoed resume scores,
  // future schema changes). The formula must never emit a number outside 0-100.
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
};

export function levelForScore(score: number): ReadinessLevel {
  if (score <= LEVEL_THRESHOLDS.needsWorkMax) return "needs-work";
  if (score <= LEVEL_THRESHOLDS.gettingThereMax) return "getting-there";
  return "interview-ready";
}

// WHY a blended integer rather than a float: the readiness number is displayed
// and compared; rounding here (not later) keeps the breakdown addition exactly
// equal to the headline number so students can verify the math by hand.
export function blendResumeScore(overallScore: number | null, atsScore: number | null): number | null {
  const overall = clampScore(overallScore);
  const ats = clampScore(atsScore);
  // WHY both-null guard: analysis is missing entirely → resume contributes 0.
  if (overall == null && ats == null) return null;
  return Math.round(
    (overall ?? 0) * RESUME_BLEND.overallWeight + (ats ?? 0) * RESUME_BLEND.atsWeight
  );
}

// WHY average of the last `window` entries, not all: older sessions describe a
// student who has since improved; including them drags the current number down
// without real meaning. Scores are in chronological order when passed in.
export function averageScore(scores: number[], window = INTERVIEW_AVERAGE_WINDOW): number | null {
  if (scores.length === 0) return null;
  const recent = scores.slice(-window);
  const sum = recent.reduce((a, s) => a + clampScore(s)!, 0);
  return Math.round(sum / recent.length);
}

export function computeReadiness(
  resumeScore: number | null,
  interviewScore: number | null
): ReadinessResult {
  const resume = clampScore(resumeScore);
  const interview = clampScore(interviewScore);

  // WHY per-missing-input readability before the weighted formula: each partial
  // state has its own honest headline. Two inputs missing → still show a number
  // (0) so the hero ring renders and the label explains what's next.
  let readiness: number;
  let label: string | null = null;
  if (resume != null && interview != null) {
    readiness = Math.round(resume * RESUME_WEIGHT + interview * INTERVIEW_WEIGHT);
  } else if (resume != null) {
    readiness = resume;
    label = PARTIAL_LABELS.noInterview;
  } else if (interview != null) {
    readiness = interview;
    label = PARTIAL_LABELS.noResume;
  } else {
    readiness = 0;
    label = PARTIAL_LABELS.noResume;
  }

  return {
    readiness,
    breakdown: {
      resume: { score: resume, weight: RESUME_WEIGHT },
      interview: { score: interview, weight: INTERVIEW_WEIGHT },
    },
    level: levelForScore(readiness),
    label,
  };
}

// Sessions are expected to be ascending by finish time. Pass the accumulated
// window of interview scores so the snapshot reflects "as of this event".
export function buildSnapshot(
  at: string,
  resumeScore: number | null,
  interviewScores: number[]
): ReadinessSnapshot {
  const interview = averageScore(interviewScores);
  const result = computeReadiness(resumeScore, interview);
  return {
    at,
    resumeScore: clampScore(resumeScore),
    interviewScore: interview,
    readiness: result.readiness,
    level: result.level,
    label: result.label,
  };
}

// WHY a marker-based extractor instead of storing themes separately: interview
// themes are already embedded in the persisted summary string ("Top improvement
// areas: X, Y.") by the finish route. Parsing keeps this deterministic and
// requires no schema change. Returns [] when absent so callers get a clean list.
const THEMES_MARKER = "Top improvement areas:";

export function extractInterviewThemes(summary: string | null): string[] {
  if (!summary) return [];
  const idx = summary.indexOf(THEMES_MARKER);
  if (idx === -1) return [];
  const rest = summary.slice(idx + THEMES_MARKER.length).trim();
  return rest
    .split(",")
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .slice(0, 3);
}