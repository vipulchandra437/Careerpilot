import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { askBrain } from "@/lib/llm";
import {
  INTERVIEW_FINISH_SYSTEM_PROMPT,
  buildInterviewFinishPrompt,
} from "@/lib/prompts/interviewFinish";
import { interviewIdSchema } from "@/lib/validators/interview";

// WHY finish computes summary server-side: the transcript can be large and the
// summary LLM call needs to see the full Q&A history. Keeping it server-side
// also means we can compute finalScore atomically with the status change.

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json(
      { error: "Invalid session ID.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }
  const idCheck = interviewIdSchema.safeParse(id);
  if (!idCheck.success) {
    return NextResponse.json(
      { error: "Invalid session ID.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const sessionRecord = await prisma.interviewSession.findUnique({
    where: { id: idCheck.data },
    select: { id: true, userId: true, status: true, transcript: true },
  });

  if (!sessionRecord || sessionRecord.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Session not found.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (sessionRecord.status !== "active") {
    return NextResponse.json(
      { error: "This session has already ended.", code: "SESSION_ENDED" },
      { status: 400 }
    );
  }

  const transcript = sessionRecord.transcript as Array<{
    question: string;
    focus: string;
    answer: string | null;
    evaluation: { score: number; feedback: string; followUp: string } | null;
    followUp: string | null;
    followUpAnswer: string | null;
    followUpEvaluation: { score: number; feedback: string } | null;
  }>;

  // Collect all scores (primary + follow-up)
  const scores: number[] = [];
  for (const turn of transcript) {
    if (turn.evaluation?.score != null) scores.push(turn.evaluation.score);
    if (turn.followUpEvaluation?.score != null) scores.push(turn.followUpEvaluation.score);
  }

  const finalScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  // Generate summary via askBrain
  let summary = "";
  let themes: string[] = [];
  try {
    const llmRaw = await askBrain(
      buildInterviewFinishPrompt(transcript, scores),
      INTERVIEW_FINISH_SYSTEM_PROMPT,
      "interview-finish"
    );

    const cleaned = llmRaw.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      summary = typeof parsed.summary === "string" ? parsed.summary : "";
      themes = Array.isArray(parsed.themes) ? parsed.themes.slice(0, 2) : [];
    }
  } catch {
    // WHY graceful degradation: if the summary LLM call fails, we still have
    // finalScore from the per-question evaluations. The session completes.
    summary = "Session completed. Review your per-question feedback above for specific improvement areas.";
    themes = [];
  }

  // Build summary string with themes
  if (themes.length > 0) {
    summary = `${summary} Top improvement areas: ${themes.join(", ")}.`;
  }

  try {
    await prisma.interviewSession.update({
      where: { id: sessionRecord.id },
      data: {
        status: "completed",
        finalScore: finalScore ?? undefined,
        summary: summary || undefined,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't finalize the session. Please try again.", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    finalScore: finalScore ?? null,
    summary: summary || null,
  });
}
