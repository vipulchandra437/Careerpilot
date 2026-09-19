import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getReadinessDataset } from "@/server/readiness-data";
import { computeReadiness } from "@/lib/readiness";

// WHY a read-only GET endpoint: the new SPA has no server components, so the
// dashboard needs the readiness dataset over HTTP. All scoring logic lives in
// the existing server helpers (readiness-data + readiness) — this route only
// serializes their output, never recomputes it.

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  let dataset;
  try {
    dataset = await getReadinessDataset(session.user.id);
  } catch {
    return NextResponse.json(
      { error: "Couldn't load your readiness data. Please try again.", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  const result = computeReadiness(dataset.resumeScore, dataset.interviewScore);

  return NextResponse.json({
    readiness: result.readiness,
    level: result.level,
    label: result.label,
    breakdown: result.breakdown,
    resumeScore: dataset.resumeScore,
    interviewScore: dataset.interviewScore,
    resumesParsed: dataset.resumesParsed,
    interviewsCompleted: dataset.interviewsCompleted,
    latestInterviewScore: dataset.latestInterviewScore,
    actions: dataset.actions,
    history: dataset.history,
  });
}