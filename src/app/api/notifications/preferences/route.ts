import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { apiOk, toErrorResponse, validateBody } from "@/lib/api";

export const runtime = "nodejs";

const updateSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  jobAlerts: z.boolean().optional(),
  learningReminders: z.boolean().optional(),
  interviewReminders: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
  system: z.boolean().optional(),
  quietHoursStart: z.string().nullable().optional(),
  quietHoursEnd: z.string().nullable().optional(),
});

export async function GET() {
  const user = await requireUser();
  try {
    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId: user.id },
    });

    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: { userId: user.id },
      });
    }

    return apiOk({ preferences: prefs });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  const user = await requireUser();
  try {
    const data = await validateBody(request, updateSchema);

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });

    return apiOk({ preferences: prefs });
  } catch (error) {
    return toErrorResponse(error);
  }
}
