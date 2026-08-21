import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { validateBody, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

const logSchema = z.object({
  skillName: z.string().min(1).max(100),
  minutes: z.number().int().min(1).max(480),
  taskId: z.string().optional(),
  note: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const body = await validateBody(request, logSchema);

    const log = await prisma.learningLog.create({
      data: {
        userId: user.id,
        skillName: body.skillName,
        minutes: body.minutes,
        taskId: body.taskId ?? null,
        note: body.note ?? null,
      },
    });

    return NextResponse.json({ log });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(request: Request) {
  const user = await requireUser();
  try {
    const { searchParams } = new URL(request.url);
    const skillName = searchParams.get("skill");

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const logs = await prisma.learningLog.findMany({
      where: {
        userId: user.id,
        date: { gte: weekStart },
        ...(skillName ? { skillName } : {}),
      },
      orderBy: { date: "desc" },
    });

    const totalMinutes = logs.reduce((sum, l) => sum + l.minutes, 0);

    const bySkill: Record<string, number> = {};
    for (const log of logs) {
      bySkill[log.skillName] = (bySkill[log.skillName] ?? 0) + log.minutes;
    }

    return NextResponse.json({
      logs,
      totalMinutes,
      bySkill,
      weekStart: weekStart.toISOString(),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
