// WHY a dedicated server helper: the roadmap generator and the mentor both need
// the same compact picture of "who this student is right now" (weaknesses,
// action items, interview themes, target, readiness). One query path here keeps
// both LLM features consistent and makes the snapshot ~300 tokens for the mentor
// (prompt economy). This module is read-only — it never writes to a student's
// resume, analysis, or interview data (RULES: mentor context is a snapshot).

import "server-only";

import { prisma } from "@/server/prisma";
import { analysisResultSchema } from "@/lib/validators";
import {
  averageScore,
  blendResumeScore,
  extractInterviewThemes,
  levelForScore,
  INTERVIEW_SCORE_SCALE,
} from "@/lib/readiness";

export interface StudentOverview {
  readinessScore: number | null; // 0-100 blended deterministically
  readinessLevel: string | null; // "needs-work" | "getting-there" | "interview-ready"
  weaknesses: string[]; // top 3 from the LATEST resume analysis
  actionItems: string[]; // top 3 from the latest analysis
  interviewThemes: string[]; // extracted from the latest completed session summary
  latestInterviewSummary: string | null; // truncated, for the mentor
  interviewScore: number | null; // 0-100 avg of last window (drives the persona)
  target: { companyName: string; role: string } | null;
}

// WHY parallel queries + deterministic normalization, not an LLM call: the
// snapshot must be cheap (one request, a few indexed reads) and stable — the
// same weaknesses the readiness dashboard shows are the ones the coach quotes.
export async function getStudentOverview(userId: string): Promise<StudentOverview> {
  const [resumes, sessions, target] = await Promise.all([
    prisma.resume.findMany({
      where: { userId },
      select: { analysisResult: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.interviewSession.findMany({
      where: { userId, status: "completed", finalScore: { not: null } },
      select: { finalScore: true, summary: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.targetCompany.findFirst({
      where: { userId, active: true },
      orderBy: { createdAt: "desc" },
      select: { companyName: true, role: true },
    }),
  ]);

  // WHY latest analysis wins: it is the student's most current self-reported
  // picture; older analyses describe a resume they have since changed.
  const latestAnalysis = resumes.find((r) => r.analysisResult != null)?.analysisResult ?? null;
  const analysis = latestAnalysis == null ? null : analysisResultSchema.safeParse(latestAnalysis);

  const weaknesses = analysis?.success
    ? analysis.data.weaknesses.slice(0, 3).map((w) => w.issue)
    : [];
  const actionItems = analysis?.success ? analysis.data.actionItems.slice(0, 3) : [];

  const latest = sessions[sessions.length - 1] ?? null;
  const themes = extractInterviewThemes(latest?.summary ?? null);
  const interviewScore = averageScore(sessions.map((s) => (s.finalScore ?? 0) * INTERVIEW_SCORE_SCALE));

  // WHY a second blend for the overview: read the newest analysis for readiness
  // (resume side) exactly like the dashboard does, keeping both numbers identical.
  const resumeScore =
    analysis?.success
      ? blendResumeScore(analysis.data.overallScore, analysis.data.atsScore)
      : null;

  const readinessScore = interviewScore != null && resumeScore != null
    ? Math.round(resumeScore * 0.4 + interviewScore * 0.6)
    : resumeScore ?? (interviewScore != null ? interviewScore : null);

  const latestSummary = latest?.summary ?? null;
  const truncatedSummary = latestSummary == null ? null : cutSummary(latestSummary);

  return {
    readinessScore,
    readinessLevel: readinessScore != null ? levelForScore(readinessScore) : null,
    weaknesses,
    actionItems,
    interviewThemes: themes,
    latestInterviewSummary: truncatedSummary,
    interviewScore,
    target,
  };
}

// WHY a hard slice near 180 chars: the mentor snapshot is quoted verbatim into a
// prompt; a long transcript would blow the ~300-token budget. The slice prefers
// breaking at a sentence end when one exists early enough.
export function cutSummary(summary: string, max = 180): string {
  const clipped = summary.length > max ? summary.slice(0, max) : summary;
  const lastPeriod = clipped.lastIndexOf(".");
  if (summary.length > max && lastPeriod > 60) return clipped.slice(0, lastPeriod + 1);
  return clipped;
}

// WHY a dedicated compact formatter: the mentor prompt receives a ~300-token
// plain-text snapshot (prompt economy). The exact inclusion list (readiness +
// level, weaknesses, target, interview summary/themes) is the "what the coach
// knows" contract — missing fields render honestly as "not set yet" so the mentor
// never invents data.
export const LEVEL_LABELS: Record<string, string> = {
  "needs-work": "Needs work",
  "getting-there": "Getting there",
  "interview-ready": "Interview ready",
};

export function serializeMentorSnapshot(overview: StudentOverview): string {
  const lines: string[] = [];
  lines.push(
    overview.readinessScore == null
      ? "Readiness: not computed yet (analyze a resume or complete an interview)"
      : `Readiness: ${overview.readinessScore}/100 (${LEVEL_LABELS[overview.readinessLevel ?? ""] ?? overview.readinessLevel})`
  );
  lines.push(
    overview.target
      ? `Target company: ${overview.target.companyName} (${overview.target.role})`
      : "Target company: none set"
  );
  lines.push(`Top weaknesses from resume analysis: ${overview.weaknesses.length ? overview.weaknesses.join("; ") : "none recorded yet"}`);
  lines.push(`Latest interview summary: ${overview.latestInterviewSummary ?? "no completed interview yet"}`);
  if (overview.interviewThemes.length) {
    lines.push(`Latest interview improvement themes: ${overview.interviewThemes.join("; ")}`);
  }
  return lines.join("\n");
}