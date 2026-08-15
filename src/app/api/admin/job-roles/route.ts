import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin } from "@/lib/admin-helpers";
import { prisma } from "@/lib/db";
import { DEFAULT_WEIGHTS } from "@/server/scoring/score-engine";

export const runtime = "nodejs";

const weightsSchema = z.record(z.string(), z.number().min(0).max(100)).default({});

const schema = z.object({
  companyId: z.string().min(1),
  title: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
  level: z.string().max(50).default("ENTRY"),
  minExperience: z.number().int().min(0).max(50).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  weights: weightsSchema,
});

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
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid role data" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id: parsed.data.companyId } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const weights = { ...DEFAULT_WEIGHTS, ...parsed.data.weights };

  try {
    const role = await prisma.jobRole.create({
      data: {
        companyId: parsed.data.companyId,
        title: parsed.data.title,
        slug: parsed.data.slug,
        level: parsed.data.level,
        minExperience: parsed.data.minExperience ?? null,
        description: parsed.data.description || null,
        weights: weights as unknown as object,
      },
    });
    return NextResponse.json({ role }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A role with this slug already exists for the company." }, { status: 409 });
  }
}
