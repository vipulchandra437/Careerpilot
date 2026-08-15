import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  generateInterviewQuestions,
  interviewTypeLabel,
} from "@/server/services/interview.service";
import { ApiError, toErrorResponse, validateBody } from "@/lib/api";

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
  try {
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
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const data = await validateBody(request, startSchema);

    let context: string | undefined;
    let companyId: string | null = data.companyId ?? null;
    if (data.jobRoleId) {
      const role = await prisma.jobRole.findUnique({
        where: { id: data.jobRoleId },
        select: { title: true, companyId: true },
      });
      if (!role) throw new ApiError(400, "Job role not found");
      if (companyId && role.companyId !== companyId) {
        throw new ApiError(400, "Job role does not belong to the selected company");
      }
      companyId = role.companyId;
      context = role.title;
    } else if (companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      });
      if (!company) throw new ApiError(400, "Company not found");
      context = company.name;
    }

    const questions = await generateInterviewQuestions(
      data.type,
      data.difficulty,
      data.questionCount,
      context,
    );

    const interview = await prisma.interview.create({
      data: {
        userId: user.id,
        companyId,
        jobRoleId: data.jobRoleId || null,
        interviewType: data.type,
        difficulty: data.difficulty,
        questions: {
          create: questions.map((prompt, i) => ({
            prompt,
            questionType: interviewTypeLabel(data.type),
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
  } catch (error) {
    return toErrorResponse(error);
  }
}
