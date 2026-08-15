import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin } from "@/lib/admin-helpers";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
  industry: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
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
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid company data" }, { status: 400 });
  }

  try {
    const company = await prisma.company.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        industry: parsed.data.industry || null,
        description: parsed.data.description || null,
      },
    });
    return NextResponse.json({ company }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Company name or slug already exists." }, { status: 409 });
  }
}
