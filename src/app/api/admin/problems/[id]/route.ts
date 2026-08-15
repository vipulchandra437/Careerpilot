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

    const problem = await prisma.codingProblem.findUnique({ where: { id } });
    if (!problem) throw new ApiError(404, "Problem not found");

    await prisma.codingProblem.delete({ where: { id } });
    await recordAudit(admin, "problem.delete", "problem", id, { title: problem.title }, clientIp(request));
    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
