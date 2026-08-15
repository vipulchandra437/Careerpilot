import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin } from "@/lib/admin-helpers";
import { prisma } from "@/lib/db";
import { ApiError, apiOk, toErrorResponse, validateParams } from "@/lib/api";
import { clientIp, recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string() });

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getApiAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await validateParams(paramsSchema, await context.params);

    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill) throw new ApiError(404, "Skill not found");

    await prisma.skill.delete({ where: { id } });
    await recordAudit(admin, "skill.delete", "skill", id, { name: skill.name }, clientIp(request));
    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
