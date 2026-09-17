// WHY a dedicated server helper (one file = one responsibility): both the
// dashboard and the progress page need the same derivation logic. Centralizing
// it here means the headine readiness number is computed exactly once, the same
// way, for every consumer — no drift between screens.

import "server-only";

import { prisma } from "@/server/prisma";
import { analysisResultSchema } from "@/lib/validators";
import {
  averageScore,
  blendResumeScore,
  buildSnapshot,
  extractInterviewThemes,
  INTERVIEW_SCORE_SCALE,
  type ReadinessSnapshot,
} from "@/lib/readiness";

export interface ReadinessDataset {
  // Latest cumulative inputs for the hero number.
  resumeScore: number | null; // blended (overall+ATS) of the newest analysis
  interviewScore: number | null; // avg of last 1-3 completed session scores
  // Stats row.
  resumesParsed: number;
  interviewsCompleted: number;
  latestInterviewScore: number | null; // 0-10, for "latest score" stat
  // Top-3 action items to always render next to the number (DESIGN.md rule).
  actions: string[];
  // Chronological snapshots for the progress line (empty until >=1 event).
  history: ReadinessSnapshot[];
}
interface AnalyzedResume {
  at: Date;
  resumeScore: number;
  actionItems: string[];
}

interface CompletedInterview {
  at: Date;
  score: number; // scaled to 0-100
  summary: string | null;
}

// WHY a discriminant: the two event shapes must be distinguishable after the
// array sort so TypeScript narrows the union safely (no `as` casts).
type ReadinessEvent =
  | { kind: "resume"; at: Date; resumeScore: number }
  | { kind: "interview"; at: Date; interviewScore: number };

// WHY optimistic about schema but validated at the boundary: analysisResult is
// LLM-produced JSON persisted on the Resume row. We re-validate with the same
// zod schema the analyze route used so a corrupt/legacy blob can never poison
// the deterministic score — it's simply skipped.
function toAnalyzedResume(row: { analysisResult: unknown; updatedAt: Date }): AnalyzedResume | null {
  const parsed = analysisResultSchema.safeParse(row.analysisResult);
  if (!parsed.success) return null;
  const resumeScore = blendResumeScore(parsed.data.overallScore, parsed.data.atsScore);
  if (resumeScore == null) return null;
  return { at: row.updatedAt, resumeScore, actionItems: parsed.data.actionItems };
}

// WHY history is DERIVED, not stored (PHASES.md: prefer derivation, add a
// ReadinessSnapshot row only if recomputation proves too slow): with a handful
// of resumes and sessions per user, rebuilding the timeline from source rows is
// trivially fast and can never go stale. Events are (a) analysis updates —
// dated by Resume.updatedAt because @updatedAt fires on the analyze write — and
// (b) session finishes — dated by InterviewSession.updatedAt, set by the finish
// route when it flips status/finalScore. Walking events in time order and
// carrying forward "latest resume" + "interview window so far" reproduces what
// the score was at every moment.
export async function getReadinessDataset(userId: string): Promise<ReadinessDataset> {
  const [resumeRows, sessionRows] = await Promise.all([
    prisma.resume.findMany({
      where: { userId },
      select: {
        id: true,
        parsedData: true,
        analysisResult: true,
        updatedAt: true,
      },
    }),
    prisma.interviewSession.findMany({
      where: { userId, status: "completed" },
      select: { finalScore: true, summary: true, updatedAt: true },
      orderBy: { updatedAt: "asc" },
    }),
  ]);

  const analyses: AnalyzedResume[] = [];
  for (const row of resumeRows) {
    if (row.analysisResult == null) continue;
    const analyzed = toAnalyzedResume({ analysisResult: row.analysisResult, updatedAt: row.updatedAt });
    if (analyzed) analyses.push(analyzed);
  }

  const interviews: CompletedInterview[] = [];
  for (const row of sessionRows) {
    const raw = row.finalScore;
    if (raw == null) continue;
    interviews.push({
      at: row.updatedAt,
      score: raw * INTERVIEW_SCORE_SCALE,
      summary: row.summary,
    });
  }

  // Latest cumulative numbers: newest analysis + avg of last window of sessions.
  const latestAnalysis = analyses.reduce<AnalyzedResume | null>(
    (latest, a) => (latest && latest.at >= a.at ? latest : a),
    null
  );
  const resumeScore = latestAnalysis?.resumeScore ?? null;
  const interviewScore = averageScore(interviews.map((i) => i.score));

  // Events → chronological snapshots.
  const events: ReadinessEvent[] = [
    ...analyses.map((a) => ({ kind: "resume" as const, at: a.at, resumeScore: a.resumeScore })),
    ...interviews.map((i) => ({ kind: "interview" as const, at: i.at, interviewScore: i.score })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  let curResume: number | null = null;
  const windowScores: number[] = [];
  const history: ReadinessSnapshot[] = [];
  for (const ev of events) {
    if (ev.kind === "resume") curResume = ev.resumeScore;
    else windowScores.push(ev.interviewScore);
    history.push(buildSnapshot(ev.at.toISOString(), curResume, windowScores));
  }

  return {
    resumeScore,
    interviewScore,
    resumesParsed: resumeRows.filter((r) => r.parsedData != null).length,
    interviewsCompleted: sessionRows.length,
    latestInterviewScore: interviews.length > 0 ? Math.round(interviews[interviews.length - 1].score / INTERVIEW_SCORE_SCALE) : null,
    actions: buildTopActions(latestAnalysis, interviews),
    history,
  };
}

// WHY actions always return exactly the top-3 (when anything exists) and nothing
// lying: DESIGN.md forbids a bare number. Priority order is resume actionItems
// (explicit, specific) then interview themes, with honest fillers only when a
// source is absent — the student always sees a concrete next step.
function buildTopActions(
  latestAnalysis: AnalyzedResume | null,
  interviews: CompletedInterview[]
): string[] {
  const actions: string[] = [];

  if (!latestAnalysis) {
    if (interviews.length === 0) {
      return [
        "Upload and analyze your resume to get a readiness score",
        "Then run a mock interview built from your resume",
        "Fix the specific issues the analysis report calls out",
      ];
    }
    // Edge: interviews without any parsed resume (practice sessions) — the
    // resume half is missing, so the score is incomplete until one is added.
    return [
      "Upload and analyze a resume to unlock the full score",
      "Your interviews count — keep practicing",
      "Revisit your latest interview feedback for themes",
    ];
  }

  const resumeActions = latestAnalysis.actionItems.slice(0, 3);
  const latestInterview = interviews.reduce<CompletedInterview | null>(
    (latest, i) => (latest && latest.at >= i.at ? latest : i),
    null
  );
  const themes = extractInterviewThemes(latestInterview?.summary ?? null);

  for (const item of [...resumeActions, ...themes]) {
    if (actions.length >= 3) break;
    actions.push(item);
  }

  for (let i = actions.length; i < 3; i++) {
    actions.push(
      interviews.length === 0
        ? "Complete a mock interview to unlock your full score"
        : "Run another mock interview to keep improving"
    );
  }

  return actions;
}