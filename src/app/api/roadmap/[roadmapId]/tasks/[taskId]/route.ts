import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ApiError, toErrorResponse, validateParams } from "@/lib/api";

export const runtime = "nodejs";

const paramsSchema = z.object({ roadmapId: z.string(), taskId: z.string() });

export async function PUT(_request: Request, context: { params: Promise<{ roadmapId: string; taskId: string }> }) {
  const user = await requireUser();
  try {
    const { roadmapId, taskId } = await validateParams(paramsSchema, await context.params);

    const roadmap = await prisma.learningRoadmap.findFirst({
      where: { id: roadmapId, profile: { userId: user.id } },
    });
    if (!roadmap) throw new ApiError(404, "Roadmap not found");

    const task = await prisma.roadmapTask.findFirst({ where: { id: taskId, roadmapId } });
    if (!task) throw new ApiError(404, "Task not found");

    const updated = await prisma.roadmapTask.update({
      where: { id: taskId },
      data: { completed: !task.completed, completedAt: task.completed ? null : new Date() },
    });

    return NextResponse.json({ completed: updated.completed });
  } catch (error) {
    return toErrorResponse(error);
  }
}
