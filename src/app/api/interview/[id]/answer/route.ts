import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { evaluateAnswer } from "@/server/services/interview.service";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string() });

const answerSchema = z.object({
  questionId: z.string(),
  answer: z.string().min(1).max(10000),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = paramsSchema.parse(await context.params);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = answerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid answer payload" }, { status: 400 });
  }

  const interview = await prisma.interview.findFirst({
    where: { id, userId: user.id },
    include: { questions: { where: { id: parsed.data.questionId } } },
  });
  if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  if (interview.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Interview is no longer active" }, { status: 400 });
  }
  const question = interview.questions[0];
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const evaluation = await evaluateAnswer(question.prompt, parsed.data.answer, interview.interviewType);

  await prisma.interviewAnswer.upsert({
    where: { questionId: question.id },
    update: { answerText: parsed.data.answer, evaluation: evaluation as unknown as object, score: evaluation.score, answeredAt: new Date() },
    create: {
      questionId: question.id,
      answerText: parsed.data.answer,
      evaluation: evaluation as unknown as object,
      score: evaluation.score,
    },
  });

  return NextResponse.json({ evaluation });
}
