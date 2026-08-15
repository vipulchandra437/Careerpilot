import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string() });

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = paramsSchema.parse(await context.params);

  const problem = await prisma.codingProblem.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      constraints: true,
      examples: true,
      difficulty: true,
      topics: true,
      starterCode: true,
      timeLimitMs: true,
      expectedComplexity: true,
    },
  });

  if (!problem) {
    return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  }

  return NextResponse.json({
    problem: {
      id: problem.id,
      title: problem.title,
      description: problem.description,
      constraints: (problem.constraints as unknown as string[]) ?? [],
      examples: (problem.examples as unknown as { input: string; output: string; explanation?: string }[]) ?? [],
      difficulty: problem.difficulty,
      topics: (problem.topics as unknown as string[]) ?? [],
      starterCode: problem.starterCode as unknown as { python: string; javascript: string },
      timeLimitMs: problem.timeLimitMs,
      expectedComplexity: problem.expectedComplexity,
    },
  });
}
