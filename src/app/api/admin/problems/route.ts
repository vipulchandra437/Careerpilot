import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin } from "@/lib/admin-helpers";
import { prisma } from "@/lib/db";

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
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("testCases must be valid JSON.");
  }
}

export async function POST(request: Request) {
  const admin = await getApiAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid problem data" }, { status: 400 });
  }

  let testCases: unknown;
  try {
    testCases = parseJsonField(parsed.data.testCases, []);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid JSON" }, { status: 400 });
  }

  try {
    const problem = await prisma.codingProblem.create({
      data: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        description: parsed.data.description,
        constraints: parseJsonField(parsed.data.constraints, []) as object,
        examples: parseJsonField(parsed.data.examples, []) as object,
        difficulty: parsed.data.difficulty,
        topics: parsed.data.topics as unknown as object,
        companies: [] as unknown as object,
        starterCode: {
          python: parsed.data.starterPython ?? "",
          javascript: parsed.data.starterJavascript ?? "",
        } as unknown as object,
        testCases: testCases as object,
        hiddenTestCases: [] as unknown as object,
        timeLimitMs: parsed.data.timeLimitMs,
        expectedComplexity: parsed.data.expectedComplexity || null,
      },
    });
    return NextResponse.json({ problem }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A problem with this title or slug already exists." }, { status: 409 });
  }
}
