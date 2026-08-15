import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { executeCode, type CodeLanguage } from "@/server/coding/executor";

export const runtime = "nodejs";

const runSchema = z.object({
  problemId: z.string(),
  language: z.enum(["python", "javascript"]),
  code: z.string().min(1).max(20000),
});

export async function POST(request: Request) {
  await requireUser();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = runSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid run payload" }, { status: 400 });
  }

  const problem = await prisma.codingProblem.findUnique({
    where: { id: parsed.data.problemId },
    select: { testCases: true, timeLimitMs: true },
  });
  if (!problem) {
    return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  }

  const cases = (problem.testCases as unknown as { args: unknown[]; expected: unknown }[]) ?? [];
  const outcome = await executeCode(
    parsed.data.language as CodeLanguage,
    parsed.data.code,
    cases,
    problem.timeLimitMs,
  );

  return NextResponse.json({ outcome });
}
