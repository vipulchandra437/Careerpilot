import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ApiError, toErrorResponse, validateParams } from "@/lib/api";

export const runtime = "nodejs";

const paramsSchema = z.object({ problemId: z.string() });

export async function GET(_request: Request, context: { params: Promise<{ problemId: string }> }) {
  const user = await requireUser();
  try {
    const { problemId } = await validateParams(paramsSchema, await context.params);

    const problem = await prisma.codingProblem.findUnique({
      where: { id: problemId },
      select: { id: true },
    });
    if (!problem) throw new ApiError(404, "Problem not found");

    const submissions = await prisma.codingSubmission.findMany({
      where: { userId: user.id, problemId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        language: true,
        status: true,
        passedTests: true,
        totalTests: true,
        runtimeMs: true,
        code: true,
        aiFeedback: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    return toErrorResponse(error);
  }
}
