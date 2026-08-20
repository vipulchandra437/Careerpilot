import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin } from "@/lib/admin-helpers";
import { prisma } from "@/lib/db";
import { ApiError, toErrorResponse, validateBody } from "@/lib/api";
import { clientIp, recordAudit } from "@/lib/audit";

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
  try {
    const data = await validateBody(request, schema);

    let skill;
    try {
      skill = await prisma.skill.create({
        data: { name: data.name, category: data.category, description: data.description || null },
      });
    } catch (e) {
      if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
        throw new ApiError(409, "A skill with this name already exists.");
      }
      throw e;
    }
    await recordAudit(admin, "skill.create", "skill", skill.id, { name: skill.name }, clientIp(request));
    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
