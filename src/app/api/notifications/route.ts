import { z } from "zod";
import { NotificationType } from "@prisma/client";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { apiOk, toErrorResponse, validateBody } from "@/lib/api";

export const runtime = "nodejs";

const createSchema = z.object({
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  link: z.string().url().optional(),
});

export async function GET(request: Request) {
  const user = await requireUser();
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const where = {
      userId: user.id,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
    ]);

    return apiOk({ notifications, unreadCount });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const body = await validateBody(request, createSchema);

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: body.type,
        title: body.title,
        body: body.body,
        link: body.link ?? null,
      },
    });

    return apiOk({ notification });
  } catch (error) {
    return toErrorResponse(error);
  }
}
