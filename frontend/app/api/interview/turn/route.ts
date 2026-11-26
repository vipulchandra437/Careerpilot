import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { z } from "zod";
import { prisma } from "@/lib/interview/db";
import { callInterviewLLM } from "@/lib/llm";
import {
  difficultyInstruction,
  fallbackQuestion,
  questionBank,
  type Difficulty,
  type InterviewType,
} from "@/lib/interview/questions";
import { applyLlmReport, buildRuleReport, savedAnswerSchema } from "@/lib/interview/report";
import type { InterviewReportData } from "@/lib/interview/report";

const typeSchema = z.enum(["hr", "technical", "mixed"]);
const difficultySchema = z.enum(["easy", "standard", "tough"]);
const character: Record<InterviewType, string> = { hr: "Maya", technical: "Dev", mixed: "Sam" };

class AuthError extends Error {}

async function requireUser(request: Request): Promise<string> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const secret = process.env.JWT_SECRET_KEY;
  if (!token || !secret) throw new AuthError("Missing credentials");
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    if (payload.type !== "access" || typeof payload.sub !== "string") {
      throw new AuthError("Invalid token");
    }
    return payload.sub;
  } catch {
    throw new AuthError("Invalid token");
  }
}

async function ownedSession(sessionId: string, userId: string) {
  const session = await prisma.interviewSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new AuthError("Session not found");
  return session;
}

const spokenSystem = (type: InterviewType, difficulty: Difficulty) =>
  `You are ${character[type]}, a friendly interviewer in a voice call. Interview type: ${type}. ` +
  `${difficultyInstruction[difficulty]} Ask exactly one question in at most three short sentences. ` +
  `Plain spoken English only, no markdown, no lists, no stage directions.`;

async function nextQuestion(
  type: InterviewType,
  difficulty: Difficulty,
  previousQuestion: string,
  answer: string,
  bankIndex: number,
  followUp: boolean
) {
  const bank = questionBank(type);
  const topic = bank[Math.min(Math.max(bankIndex, 0), bank.length - 1)];
  const task = followUp
    ? `Ask one specific follow-up that digs into a concrete detail of this answer: ${answer}`
    : `Move to a new topic and ask this question: ${topic.text}`;
  try {
    const result = await callInterviewLLM(
      spokenSystem(type, difficulty),
      `Previous question: ${previousQuestion}\nCandidate answer: ${answer}\n${task}`,
      { maxTokens: 160 }
    );
    return { text: result.text, index: bankIndex, source: result.provider };
  } catch {
    // Every provider failed — the typed bank keeps the call running.
    return { text: fallbackQuestion(type, bankIndex).text, index: bankIndex, source: "bank" };
  }
}

export async function GET(request: Request) {
  try {
    const userId = await requireUser(request);
    const sessionId = new URL(request.url).searchParams.get("sessionId") ?? "";
    if (!z.string().uuid().safeParse(sessionId).success) {
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
    }
    await ownedSession(sessionId, userId);
    const [session, answers, report] = await Promise.all([
      prisma.interviewSession.findUnique({ where: { id: sessionId } }),
      prisma.interviewAnswer.findMany({ where: { sessionId }, orderBy: { index: "asc" } }),
      prisma.interviewReport.findUnique({ where: { sessionId } }),
    ]);
    if (!session || !report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    return NextResponse.json({
      session,
      answers,
      report: JSON.parse(report.json) as InterviewReportData,
    });
  } catch (error) {
    const status = error instanceof AuthError ? 401 : 500;
    return NextResponse.json({ error: error instanceof AuthError ? error.message : "Server error" }, { status });
  }
}

export async function POST(request: Request) {
  let userId: string;
  try {
    userId = await requireUser(request);
  } catch (error) {
    const message = error instanceof AuthError ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const action = z.object({ action: z.enum(["start", "turn", "finish"]) }).safeParse(raw);
  if (!action.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (action.data.action === "start") {
    const body = z
      .object({ action: z.literal("start"), type: typeSchema, difficulty: difficultySchema })
      .safeParse(raw);
    if (!body.success) return NextResponse.json({ error: "Invalid setup" }, { status: 400 });
    const { type, difficulty } = body.data;
    const session = await prisma.interviewSession.create({
      data: { userId, type, difficulty },
    });
    const first = questionBank(type)[0];
    return NextResponse.json({
      sessionId: session.id,
      question: first.text,
      index: 0,
      source: "bank",
    });
  }

  if (action.data.action === "turn") {
    const body = z
      .object({
        action: z.literal("turn"),
        sessionId: z.string().uuid(),
        turnIndex: z.number().int().min(0),
        question: z.string().min(1).max(500),
        answer: z.string().min(1).max(10000),
        type: typeSchema,
        difficulty: difficultySchema,
      })
      .safeParse(raw);
    if (!body.success) return NextResponse.json({ error: "Invalid turn" }, { status: 400 });
    const { sessionId, turnIndex, question, answer, type, difficulty } = body.data;
    try {
      await ownedSession(sessionId, userId);
    } catch {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    const answersSoFar = turnIndex + 1;
    const followUp = answersSoFar % 2 === 1;
    const bankIndex = Math.floor((followUp ? answersSoFar - 1 : answersSoFar) / 2);
    if (bankIndex >= questionBank(type).length) {
      return NextResponse.json({ question: "", done: true, index: bankIndex });
    }
    const next = await nextQuestion(type, difficulty, question, answer, bankIndex, followUp);
    return NextResponse.json({ ...next, done: false });
  }

  const body = z
    .object({ action: z.literal("finish"), sessionId: z.string().uuid(), answers: z.array(savedAnswerSchema).min(1).max(20) })
    .safeParse(raw);
  if (!body.success) return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
  const { sessionId } = body.data;
  try {
    await ownedSession(sessionId, userId);
  } catch {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const rules = buildRuleReport(body.data.answers);
  let report: InterviewReportData = rules;
  try {
    const result = await callInterviewLLM(
      "You assess mock interview answers. Return strict JSON only, no markdown. " +
        "Keys: verdict (short string), overall_score (0-10), per_answer_score (array of 0-10), " +
        "strengths, mistakes, better_version, top_fixes (arrays of short strings).",
      JSON.stringify({
        answers: body.data.answers.map((a) => ({ question: a.question, answer: a.text, checks: a.metrics.checks })),
        ruleScore: rules.overallScore,
      }),
      { json: true, maxTokens: 800 }
    );
    report = applyLlmReport(JSON.parse(result.text), body.data.answers, result.provider) ?? rules;
  } catch {
    // Validation failure or provider failure keeps the rule-based report.
  }

  await prisma.$transaction([
    prisma.interviewAnswer.createMany({
      data: body.data.answers.map((a) => ({
        sessionId,
        index: a.index,
        question: a.question,
        text: a.text,
        metrics: JSON.stringify(a.metrics),
        score: a.score,
      })),
    }),
    prisma.interviewReport.upsert({
      where: { sessionId },
      create: { sessionId, json: JSON.stringify(report) },
      update: { json: JSON.stringify(report) },
    }),
    prisma.interviewSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date(), overallScore: report.overallScore, verdict: report.verdict },
    }),
  ]);

  return NextResponse.json({ report });
}
