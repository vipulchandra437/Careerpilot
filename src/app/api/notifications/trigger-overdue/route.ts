import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { apiOk, toErrorResponse, validateBody } from "@/lib/api";
import { triggerOverdueTask } from "@/lib/notification-triggers";

export const runtime = "nodejs";

const schema = z.object({
  roadmapId: z.string(),
  taskTitle: z.string(),
  roadmapTitle: z.string(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const data = await validateBody(request, schema);

    const roadmap = await prisma.learningRoadmap.findFirst({
      where: {
        id: data.roadmapId,
        profile: { userId: user.id },
      },
      select: { id: true },
    });
    if (!roadmap) return apiOk();

    triggerOverdueTask(user.id, data.taskTitle, data.roadmapTitle).catch(() => {});
    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
