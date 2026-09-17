import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { askBrain } from "@/lib/llm";
import { classifyCompany } from "@/lib/company-type";
import {
  INTERVIEW_QUESTIONS_SYSTEM_PROMPT,
  buildInterviewQuestionsPrompt,
  type CompanyContext,
} from "@/lib/prompts/interviewQuestions";
import { interviewStartSchema, questionsResponseSchema } from "@/lib/validators/interview";

// WHY all questions generated upfront: one LLM call is cheaper than N calls spread
// across the session, and it lets us cap length server-side before any answers land.

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
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

  const parsed = interviewStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const { mode, length, resumeId } = parsed.data;

  // WHY ownership check on resume: a user shouldn't be able to start an interview
  // with another user's resume data. findUnique returns null for both "no such
  // resume" and "not yours" — same 404 response either way.
  let parsedData = null;
  if (resumeId) {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      select: { id: true, userId: true, parsedData: true },
    });
    if (!resume || resume.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Resume not found.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    if (!resume.parsedData) {
      return NextResponse.json(
        { error: "That resume hasn't been parsed yet. Parse it first.", code: "NOT_PARSED" },
        { status: 400 }
      );
    }
    parsedData = resume.parsedData;
  }

  // WHY fetch the active target here (not on the client): the company context
  // is server-owned and never exposed to the client prompt. classification is a
  // deterministic heuristic (see company-type.ts) — the LLM only sees the text
  // guidance appended to the prompt, never our internal type logic.
  let company: CompanyContext | null = null;
  try {
    const target = await prisma.targetCompany.findFirst({
      where: { userId: session.user.id, active: true },
      orderBy: { createdAt: "desc" },
      select: { companyName: true, role: true },
    });
    if (target) {
      company = {
        companyName: target.companyName,
        role: target.role,
        typeHint: classifyCompany(target.companyName),
      };
    }
  } catch {
    // WHY swallow: a target lookup failure must never block an interview the
    // student explicitly started. Without a target the session is simply not
    // company-adapted — a safe, silent degradation.
    company = null;
  }

  // Generate questions via askBrain (provider fallback is inside askBrain)
  let llmRaw: string;
  try {
    llmRaw = await askBrain(
      buildInterviewQuestionsPrompt(parsedData ?? {}, mode, length, company ?? undefined),
      INTERVIEW_QUESTIONS_SYSTEM_PROMPT,
      "interview-questions"
    );
  } catch {
    return NextResponse.json(
      {
        error: "AI providers are at their daily limit — please try again in a few hours.",
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
      { error: "Couldn't generate questions — please try again.", code: "MALFORMED_OUTPUT" },
      { status: 422 }
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    return NextResponse.json(
      { error: "Couldn't generate questions — please try again.", code: "MALFORMED_OUTPUT" },
      { status: 422 }
    );
  }

  const validated = questionsResponseSchema.safeParse(parsedJson);
  if (!validated.success || validated.data.questions.length === 0) {
    return NextResponse.json(
      { error: "Couldn't generate questions — please try again.", code: "MALFORMED_OUTPUT" },
      { status: 422 }
    );
  }

  // WHY cap questions to requested length: the LLM might return more than asked.
  const questions = validated.data.questions.slice(0, length);

  // Initialize transcript with first question
  const transcript = questions.map((q) => ({
    question: q.text,
    focus: q.focus,
    answer: null,
    evaluation: null,
    followUp: null,
    followUpAnswer: null,
    followUpEvaluation: null,
  }));

  let created;
  try {
    created = await prisma.interviewSession.create({
      data: {
        userId: session.user.id,
        resumeId: resumeId ?? undefined,
        mode,
        status: "active",
        transcript: transcript as Prisma.InputJsonValue,
        questionCount: questions.length,
      },
      select: { id: true, mode: true, status: true, transcript: true, questionCount: true, createdAt: true },
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't create the interview session. Please try again.", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: created.id,
    mode: created.mode,
    status: created.status,
    questionCount: created.questionCount,
    transcript: created.transcript as unknown,
    createdAt: created.createdAt.toISOString(),
  }, { status: 201 });
}
