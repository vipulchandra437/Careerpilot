import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  generateInterviewQuestions,
  interviewTypeLabel,
} from "@/server/services/interview.service";

export const runtime = "nodejs";

const startSchema = z.object({
  type: z.enum(["HR", "TECHNICAL", "BEHAVIORAL", "SYSTEM_DESIGN", "AI_ML"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  companyId: z.string().optional(),
  jobRoleId: z.string().optional(),
  questionCount: z.number().int().min(3).max(8).default(5),
});

export async function GET() {
  const user = await requireUser();
  const interviews = await prisma.interview.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      interviewType: true,
      difficulty: true,
      status: true,
      score: true,
      startedAt: true,
      endedAt: true,
    },
    take: 20,
  });
  return NextResponse.json({ interviews });
}

export async function POST(request: Request) {
  const user = await requireUser();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid interview payload" }, { status: 400 });
  }

  let context: string | undefined;
  let companyId: string | null = parsed.data.companyId ?? null;
  if (parsed.data.jobRoleId) {
    const role = await prisma.jobRole.findUnique({
      where: { id: parsed.data.jobRoleId },
      select: { title: true, companyId: true },
    });
    if (!role) return NextResponse.json({ error: "Job role not found" }, { status: 400 });
    if (companyId && role.companyId !== companyId) {
      return NextResponse.json({ error: "Job role does not belong to the selected company" }, { status: 400 });
    }
    companyId = role.companyId;
    context = role.title;
  } else if (companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 400 });
    context = company.name;
  }

  const questions = await generateInterviewQuestions(
    parsed.data.type,
    parsed.data.difficulty,
    parsed.data.questionCount,
    context,
  );

  const interview = await prisma.interview.create({
    data: {
      userId: user.id,
      companyId,
      jobRoleId: parsed.data.jobRoleId || null,
      interviewType: parsed.data.type,
      difficulty: parsed.data.difficulty,
      questions: {
        create: questions.map((prompt, i) => ({
          prompt,
          questionType: interviewTypeLabel(parsed.data.type),
          order: i + 1,
        })),
      },
    },
    include: {
      questions: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json({
    interview: {
      id: interview.id,
      type: interview.interviewType,
      difficulty: interview.difficulty,
      status: interview.status,
      questions: interview.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        order: q.order,
      })),
    },
  });
}
