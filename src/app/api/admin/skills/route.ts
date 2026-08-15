import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin } from "@/lib/admin-helpers";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const categories = [
  "PROGRAMMING_LANGUAGE",
  "FRAMEWORK",
  "DATABASE",
  "AI_ML",
  "CLOUD",
  "DEVOPS",
  "TOOL",
  "SOFT_SKILL",
  "OTHER",
] as const;

const schema = z.object({
  name: z.string().min(2).max(100),
  category: z.enum(categories),
  description: z.string().max(500).optional().nullable(),
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
    return NextResponse.json({ error: "Invalid skill data" }, { status: 400 });
  }

  try {
    const skill = await prisma.skill.create({
      data: { name: parsed.data.name, category: parsed.data.category, description: parsed.data.description || null },
    });
    return NextResponse.json({ skill }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A skill with this name already exists." }, { status: 409 });
  }
}
