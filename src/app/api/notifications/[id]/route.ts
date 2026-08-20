import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ApiError, apiOk, toErrorResponse, validateParams, validateBody } from "@/lib/api";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string() });

const patchSchema = z.object({
  read: z.boolean(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  try {
    const { id } = await validateParams(paramsSchema, await context.params);
    const body = await validateBody(request, patchSchema);

    const notification = await prisma.notification.findFirst({
      where: { id, userId: user.id },
    });
    if (!notification) throw new ApiError(404, "Notification not found");

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: body.read },
    });

    return apiOk({ notification: updated });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  try {
    const { id } = await validateParams(paramsSchema, await context.params);

    const notification = await prisma.notification.findFirst({
      where: { id, userId: user.id },
    });
    if (!notification) throw new ApiError(404, "Notification not found");

    await prisma.notification.delete({ where: { id } });
    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
