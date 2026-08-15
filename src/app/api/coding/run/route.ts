import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { executeCode, type CodeLanguage } from "@/server/coding/executor";
import { ApiError, toErrorResponse, validateBody } from "@/lib/api";

export const runtime = "nodejs";

const runSchema = z.object({
  problemId: z.string(),
  language: z.enum(["python", "javascript"]),
  code: z.string().min(1).max(20000),
});

export async function POST(request: Request) {
  await requireUser();
  try {
    const data = await validateBody(request, runSchema);

    const problem = await prisma.codingProblem.findUnique({
      where: { id: data.problemId },
      select: { testCases: true, timeLimitMs: true },
    });
    if (!problem) {
      throw new ApiError(404, "Problem not found");
    }

    const cases = (problem.testCases as unknown as { args: unknown[]; expected: unknown }[]) ?? [];
    const outcome = await executeCode(
      data.language as CodeLanguage,
      data.code,
      cases,
      problem.timeLimitMs,
    );

    return NextResponse.json({ outcome });
  } catch (error) {
    return toErrorResponse(error);
  }
}
