import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const paramsSchema = z.object({ roadmapId: z.string(), taskId: z.string() });

export async function PUT(_request: Request, context: { params: Promise<{ roadmapId: string; taskId: string }> }) {
  const user = await requireUser();
  const { roadmapId, taskId } = paramsSchema.parse(await context.params);

  const roadmap = await prisma.learningRoadmap.findFirst({
    where: { id: roadmapId, profile: { userId: user.id } },
  });
  if (!roadmap) return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });

  const task = await prisma.roadmapTask.findFirst({ where: { id: taskId, roadmapId } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const updated = await prisma.roadmapTask.update({
    where: { id: taskId },
    data: { completed: !task.completed, completedAt: task.completed ? null : new Date() },
  });

  return NextResponse.json({ completed: updated.completed });
}
