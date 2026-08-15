import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin } from "@/lib/admin-helpers";
import { prisma } from "@/lib/db";
import { ApiError, apiOk, toErrorResponse, validateBody, validateParams } from "@/lib/api";
import { clientIp, recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string() });
const bodySchema = z.object({ role: z.enum(["STUDENT", "ADMIN"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getApiAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await validateParams(paramsSchema, await context.params);
    if (id === admin.id) {
      throw new ApiError(400, "You cannot change your own role.");
    }
    const data = await validateBody(request, bodySchema);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, "User not found");

    const updated = await prisma.user.update({ where: { id }, data: { role: data.role } });
    await recordAudit(admin, "user.role.change", "user", id, { from: user.role, to: data.role }, clientIp(request));
    return NextResponse.json({ id: updated.id, role: updated.role });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getApiAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await validateParams(paramsSchema, await context.params);
    if (id === admin.id) {
      throw new ApiError(400, "You cannot delete your own account.");
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, "User not found");

    await prisma.user.delete({ where: { id } });
    await recordAudit(admin, "user.delete", "user", id, { email: user.email }, clientIp(request));
    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
