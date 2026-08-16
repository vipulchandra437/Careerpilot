import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin } from "@/lib/admin-helpers";
import { prisma } from "@/lib/db";
import { ApiError, toErrorResponse, validateBody } from "@/lib/api";
import { clientIp, recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  title: z.string().min(3).max(200),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  description: z.string().min(10).max(5000),
  constraints: z.string().optional().nullable(),
  examples: z.string().optional().nullable(),
  topics: z.array(z.string()).max(20).default([]),
  expectedComplexity: z.string().max(200).optional().nullable(),
  timeLimitMs: z.number().int().min(500).max(30000).default(4000),
  starterPython: z.string().optional().nullable(),
  starterJavascript: z.string().optional().nullable(),
  testCases: z.string().optional().nullable(),
});

function parseJsonField(value: string | null | undefined, fallback: unknown): unknown {
  if (!value || !value.trim()) return fallback;
  return JSON.parse(value);
}

export async function POST(request: Request) {
  const admin = await getApiAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await validateBody(request, schema);

    let testCases: unknown;
    let constraints: unknown;
    let examples: unknown;
    try {
      testCases = parseJsonField(data.testCases, []);
      constraints = parseJsonField(data.constraints, []);
      examples = parseJsonField(data.examples, []);
    } catch {
      throw new ApiError(400, "testCases, constraints, and examples must be valid JSON.");
    }

    let problem;
    try {
      problem = await prisma.codingProblem.create({
        data: {
          title: data.title,
          slug: data.slug,
          description: data.description,
          constraints: constraints as object,
          examples: examples as object,
          difficulty: data.difficulty,
          topics: data.topics as unknown as object,
          companies: [] as unknown as object,
          starterCode: {
            python: data.starterPython ?? "",
            javascript: data.starterJavascript ?? "",
          } as unknown as object,
          testCases: testCases as object,
          hiddenTestCases: [] as unknown as object,
          timeLimitMs: data.timeLimitMs,
          expectedComplexity: data.expectedComplexity || null,
        },
      });
    } catch {
      throw new ApiError(409, "A problem with this title or slug already exists.");
    }
    await recordAudit(admin, "problem.create", "problem", problem.id, { title: problem.title }, clientIp(request));
    return NextResponse.json({ problem }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
