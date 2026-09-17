import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { askBrain } from "@/lib/llm";
import {
  INTERVIEW_EVAL_SYSTEM_PROMPT,
  buildInterviewEvalPrompt,
  type EvalCompanyContext,
} from "@/lib/prompts/interviewEval";
import { interviewIdSchema, interviewAnswerSchema, evaluationResponseSchema } from "@/lib/validators/interview";

// WHY evaluate + advance in one POST: the client sends one answer, the server
// evaluates it, optionally generates a follow-up, and returns the next question
// (or the follow-up). One round-trip per answer keeps the chat responsive.

type TranscriptTurn = {
  question: string;
  focus: string;
  answer: string | null;
  evaluation: unknown | null;
  followUp: string | null;
  followUpAnswer: string | null;
  followUpEvaluation: unknown | null;
  // WHY this flag exists: so the client can distinguish a turn whose answer was
  // persisted but not yet evaluated (LLM failure path) from a fully-complete turn.
  evaluated: boolean;
};

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
    select: { id: true, userId: true, status: true, transcript: true, mode: true },
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Something went wrong reading the request. Please try again.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const answerCheck = interviewAnswerSchema.safeParse(body);
  if (!answerCheck.success) {
    return NextResponse.json(
      { error: answerCheck.error.issues[0].message, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

    const answer = answerCheck.data.answer;
  // WHY cast to a typed shape with `evaluated` optional: older transcripts from
  // before this fix won't have the field. The route defaults missing to `true`
  // so legacy turns aren't treated as unevaluated on retry.
  const transcript = (sessionRecord.transcript as Array<Partial<TranscriptTurn>>).map(
    (t) => ({ ...t, evaluated: t.evaluated ?? true } as TranscriptTurn)
  );

      // WHY evaluated flag in the predicate: a turn whose answer was persisted with
  // evaluated:false (an LLM failure mid-flight) must be selected again on retry
  // so the client can re-evaluate the already-saved answer. The three clauses:
  //   - answer === null        → a fresh unanswered question
  //   - !t.evaluated           → an unevaluated turn (retry path after a 503)
  //   - followUp pending       → an unanswered follow-up
  const currentIndex = transcript.findIndex(
    (t) => t.answer === null || !t.evaluated || (t.followUp && t.followUpAnswer === null)
  );

  // If all questions answered (including follow-ups), session is complete
  if (currentIndex === -1) {
    return NextResponse.json(
      { error: "All questions have been answered. Finish the session.", code: "SESSION_COMPLETE" },
      { status: 400 }
    );
  }

  const currentTurn = transcript[currentIndex];

  // WHY persist the answer BEFORE the LLM call: if all providers fail, the user's
  // typed answer must still survive a refresh. We save the turn with the answer
  // in place but evaluation null + evaluated: false, then update with the evaluation
  // after a successful LLM round-trip. The client retry logic re-evaluates any
  // turn where evaluated === false.
  const updatedTranscript = [...transcript];
  const isFollowUp = !!(currentTurn.followUp && currentTurn.answer !== null);

  if (isFollowUp) {
    updatedTranscript[currentIndex] = {
      ...currentTurn,
      followUpAnswer: answer,
      followUpEvaluation: null,
      evaluated: false,
    };
  } else {
    updatedTranscript[currentIndex] = {
      ...currentTurn,
      answer,
      evaluation: null,
      followUp: null,
      evaluated: false,
    };
  }

  // Persist the unevaluated answer immediately: even if the LLM call below
  // fails, the student's typed answer survives a refresh and the client can
  // retry to re-evaluate this same turn.
  try {
    await prisma.interviewSession.update({
      where: { id: sessionRecord.id },
      data: { transcript: updatedTranscript as Prisma.InputJsonValue, updatedAt: new Date() },
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't save your answer. Please try again.", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  const questionToEvaluate = isFollowUp ? currentTurn.followUp! : currentTurn.question;
  const focusToEvaluate = currentTurn.focus;

  let priorContext: string | undefined;
  if (isFollowUp && currentTurn.answer) {
    priorContext = `Original question: ${currentTurn.question}\nStudent's first answer: ${currentTurn.answer}`;
  }

  // WHY fetch the active target for evaluation: lets feedback reference role
  // expectations per scope ("feedback may reference role expectations").
  // Failure only drops the company hint — the eval proceeds unscored-unchanged.
  let company: EvalCompanyContext | null = null;
  try {
    const target = await prisma.targetCompany.findFirst({
      where: { userId: session.user.id, active: true },
      orderBy: { createdAt: "desc" },
      select: { companyName: true, role: true },
    });
    if (target) company = { companyName: target.companyName, role: target.role };
  } catch {
    company = null;
  }

  // Call the brain for evaluation
  let llmRaw: string;
  try {
    llmRaw = await askBrain(
      buildInterviewEvalPrompt(questionToEvaluate, focusToEvaluate, answer, priorContext, company ?? undefined),
      INTERVIEW_EVAL_SYSTEM_PROMPT,
      "interview-eval"
    );
  } catch {
    return NextResponse.json(
      {
        error: "AI providers are at their daily limit — please try again in a few minutes.",
        code: "ALL_PROVIDERS_FAILED",
      },
      { status: 503 }
    );
  }

  // Defensive JSON parsing
  const cleaned = llmRaw.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    return NextResponse.json(
      { error: "Couldn't evaluate your answer — please try again.", code: "MALFORMED_OUTPUT" },
      { status: 422 }
    );
  }

  let evalJson: unknown;
  try {
    evalJson = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    return NextResponse.json(
      { error: "Couldn't evaluate your answer — please try again.", code: "MALFORMED_OUTPUT" },
      { status: 422 }
    );
  }

  const validated = evaluationResponseSchema.safeParse(evalJson);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Couldn't evaluate your answer — please try again.", code: "MALFORMED_OUTPUT" },
      { status: 422 }
    );
  }

  const evaluation = validated.data;

  // Update the persisted turn with the evaluation (no redeclaration — the
  // updatedTranscript array was already built and written before the LLM call).
  if (isFollowUp) {
    updatedTranscript[currentIndex] = {
      ...currentTurn,
      followUpAnswer: answer,
      followUpEvaluation: evaluation,
      evaluated: true,
    };
  } else {
    updatedTranscript[currentIndex] = {
      ...currentTurn,
      answer,
      evaluation,
      followUp: evaluation.followUp || null,
      evaluated: true,
    };
  }

  // If there's a follow-up, the next answer will fill it in.
  // If no follow-up, we'll return the next question in the response.

  // Find the next unanswered question (after the current one)
  const nextIndex = updatedTranscript.findIndex(
    (t, i) => i > currentIndex && (t.answer === null || (t.followUp && t.followUpAnswer === null))
  );

  const nextQuestion = nextIndex !== -1 ? updatedTranscript[nextIndex] : null;

  // Persist updated transcript
  try {
    await prisma.interviewSession.update({
      where: { id: sessionRecord.id },
      data: { transcript: updatedTranscript as Prisma.InputJsonValue, updatedAt: new Date() },
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't save your answer. Please try again.", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    evaluation: {
      score: evaluation.score,
      feedback: evaluation.feedback,
    },
    followUp: evaluation.followUp || null,
    nextQuestion: nextQuestion ? { text: nextQuestion.question, focus: nextQuestion.focus } : null,
    allAnswered: nextIndex === -1,
  });
}
