import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { buildReport } from "@/server/services/interview.service";
import { recordScoreHistory } from "@/server/scoring/company-readiness.service";
import { ApiError, toErrorResponse, validateParams } from "@/lib/api";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string() });

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  try {
    const { id } = await validateParams(paramsSchema, await context.params);

    const interview = await prisma.interview.findFirst({
      where: { id, userId: user.id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { answer: true },
        },
      },
    });
    if (!interview) throw new ApiError(404, "Interview not found");
    if (interview.status === "ABORTED") {
      throw new ApiError(400, "This interview was aborted and can no longer be finished");
    }
    if (interview.status === "COMPLETED") {
      return NextResponse.json({ interview: { id, status: interview.status, score: interview.score, report: interview.report } });
    }

    const evaluations = interview.questions
      .filter((q) => q.answer)
      .map((q) => ({
        question: q.prompt,
        evaluation: q.answer!.evaluation as unknown as {
          score: number;
          feedback: string;
          strengths: string[];
          improvements: string[];
        },
      }));

    const report = buildReport(interview.interviewType, interview.difficulty, evaluations);

    // Atomically claim the transition IN_PROGRESS -> COMPLETED so concurrent
    // finish requests are idempotent and score history is recorded only once
    // (and both updates commit together).
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.interview.updateMany({
        where: { id, userId: user.id, status: "IN_PROGRESS" },
        data: {
          status: "COMPLETED",
          score: report.totalScore,
          report: report as unknown as object,
          endedAt: new Date(),
        },
      });

      if (claimed.count === 0) {
        const current = await tx.interview.findUnique({
          where: { id },
          select: { status: true, score: true, report: true },
        });
        return { claimed: false, current };
      }

      // Progress tracking for the interview category.
      await recordScoreHistory(user.id, "INTERVIEW", report.totalScore, {
        interviewId: id,
        type: interview.interviewType,
      }, tx);

      return { claimed: true, current: null };
    });

    if (!result.claimed) {
      if (!result.current) throw new ApiError(404, "Interview not found");
      return NextResponse.json({
        interview: {
          id,
          status: result.current.status,
          score: result.current.score,
          report: result.current.report,
        },
      });
    }

    return NextResponse.json({
      interview: {
        id,
        status: "COMPLETED",
        score: report.totalScore,
        report,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
