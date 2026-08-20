import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { apiOk, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function PUT() {
  const user = await requireUser();
  try {
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });

    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
