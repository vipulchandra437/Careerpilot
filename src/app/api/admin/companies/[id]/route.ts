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

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) throw new ApiError(404, "Company not found");

    await prisma.company.delete({ where: { id } });
    await recordAudit(admin, "company.delete", "company", id, { name: company.name }, clientIp(request));
    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
