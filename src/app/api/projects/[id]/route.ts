import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ApiError, apiOk, toErrorResponse, validateParams } from "@/lib/api";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string() });

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  try {
    const { id } = await validateParams(paramsSchema, await context.params);

    const project = await prisma.project.findFirst({ where: { id, userId: user.id } });
    if (!project) throw new ApiError(404, "Project not found");

    await prisma.project.delete({ where: { id } });
    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
