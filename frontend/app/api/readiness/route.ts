import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/interview/auth";
import { prisma } from "@/lib/interview/db";
import { computeReadiness } from "@/lib/readiness";

// Same base URL the Next.js proxy uses (next.config.js); the token stays the
// caller's Bearer token so FastAPI scopes the snapshot to the signed-in user.
const backendUrl = (process.env.BACKEND_API_URL || "http://localhost:8000").replace(/\/$/, "");

/** Derive a resume score from the backend snapshot instead of trusting a query param. */
function resumeScoreFromSnapshot(snapshot: { resume_data?: unknown } | null): number | null {
  const data = snapshot?.resume_data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const resume = data as Record<string, unknown>;
  const hasText = (value: unknown) => typeof value === "string" && value.trim().length > 0;
  const hasItems = (value: unknown) => Array.isArray(value) && value.length > 0;
  const sections = [
    hasText(resume.name),
    hasText(resume.summary),
    hasItems(resume.skills),
    hasItems(resume.experience),
    hasItems(resume.education),
    hasItems(resume.projects),
  ];
  return Math.round((sections.filter(Boolean).length / sections.length) * 100);
}

async function fetchResumeScore(authHeader: string | null): Promise<number | null> {
  if (!authHeader) return null;
  try {
    const res = await fetch(`${backendUrl}/api/profile/snapshot`, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return resumeScoreFromSnapshot((await res.json()) as { resume_data?: unknown });
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const userId = await requireUser(request);
    const resumeScore = await fetchResumeScore(request.headers.get("authorization"));
    const session = await prisma.interviewSession.findFirst({
      where: { userId, endedAt: { not: null }, overallScore: { not: null } },
      orderBy: { endedAt: "desc" },
    });
    const readiness = computeReadiness({
      interviewScore: session?.overallScore ?? null,
      resumeScore,
    });
    return NextResponse.json({ readiness, latestSessionId: session?.id ?? null });
  } catch (error) {
    const status = error instanceof AuthError ? 401 : 500;
    return NextResponse.json(
      { error: error instanceof AuthError ? error.message : "Server error" },
      { status }
    );
  }
}
