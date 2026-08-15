import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { evaluateAnswer } from "@/server/services/interview.service";
import { ApiError, toErrorResponse, validateBody, validateParams } from "@/lib/api";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string() });

const answerSchema = z.object({
  questionId: z.string(),
  answer: z.string().min(1).max(10000),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  try {
    const { id } = await validateParams(paramsSchema, await context.params);
    const data = await validateBody(request, answerSchema);

    const interview = await prisma.interview.findFirst({
      where: { id, userId: user.id },
      include: { questions: { where: { id: data.questionId } } },
    });
    if (!interview) throw new ApiError(404, "Interview not found");
    if (interview.status !== "IN_PROGRESS") {
      throw new ApiError(400, "Interview is no longer active");
    }
    const question = interview.questions[0];
    if (!question) throw new ApiError(404, "Question not found");

    const evaluation = await evaluateAnswer(question.prompt, data.answer, interview.interviewType);

    await prisma.interviewAnswer.upsert({
      where: { questionId: question.id },
      update: { answerText: data.answer, evaluation: evaluation as unknown as object, score: evaluation.score, answeredAt: new Date() },
      create: {
        questionId: question.id,
        answerText: data.answer,
        evaluation: evaluation as unknown as object,
        score: evaluation.score,
      },
    });

    return NextResponse.json({ evaluation });
  } catch (error) {
    return toErrorResponse(error);
  }
}
