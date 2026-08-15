import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin } from "@/lib/admin-helpers";
import { prisma } from "@/lib/db";
import { ApiError, apiOk, toErrorResponse, validateBody, validateParams } from "@/lib/api";
import { clientIp, recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string() });
const weightsSchema = z.record(z.string(), z.number().min(0).max(100));

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getApiAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await validateParams(paramsSchema, await context.params);
    const weights = await validateBody(request, weightsSchema);

    const role = await prisma.jobRole.findUnique({ where: { id } });
    if (!role) throw new ApiError(404, "Job role not found");

    const current = (role.weights as Record<string, number>) ?? {};
    const merged = { ...current, ...weights };

    const updated = await prisma.jobRole.update({
      where: { id },
      data: { weights: merged as unknown as object },
    });
    await recordAudit(admin, "jobRole.weights.update", "jobRole", id, { weights }, clientIp(request));

    return NextResponse.json({ id: updated.id, weights: updated.weights });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getApiAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await validateParams(paramsSchema, await context.params);

    const role = await prisma.jobRole.findUnique({ where: { id } });
    if (!role) throw new ApiError(404, "Job role not found");

    await prisma.jobRole.delete({ where: { id } });
    await recordAudit(admin, "jobRole.delete", "jobRole", id, { title: role.title }, clientIp(request));
    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
