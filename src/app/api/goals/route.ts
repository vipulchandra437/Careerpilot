import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { apiError, apiOk, toErrorResponse, validateBody } from "@/lib/api";

export const runtime = "nodejs";

const CATEGORY_KEYS = [
  "RESUME",
  "CODING",
  "INTERVIEW",
  "COMMUNICATION",
  "PROJECTS",
  "GITHUB",
  "LINKEDIN",
  "SKILL_COVERAGE",
];

const goalSchema = z.object({
  category: z.string().min(1),
  targetScore: z.number().min(0).max(100),
  deadline: z.string().datetime().optional().nullable(),
});

export async function GET() {
  const user = await requireUser();
  try {
    const goals = await prisma.careerGoal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const enriched = goals.map((g) => {
      let computedStatus = g.status;
      if (computedStatus === "active" && g.deadline && g.deadline < now) {
        computedStatus = "expired";
      }
      return { ...g, status: computedStatus };
    });

    return apiOk({ goals: enriched });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const body = await validateBody(request, goalSchema);

    if (!CATEGORY_KEYS.includes(body.category)) {
      return apiError("Invalid category");
    }

    const existing = await prisma.careerGoal.findFirst({
      where: {
        userId: user.id,
        category: body.category,
        status: "active",
      },
    });

    if (existing) {
      const updated = await prisma.careerGoal.update({
        where: { id: existing.id },
        data: {
          targetScore: body.targetScore,
          deadline: body.deadline ? new Date(body.deadline) : null,
        },
      });
      return apiOk({ goal: updated });
    }

    const goal = await prisma.careerGoal.create({
      data: {
        userId: user.id,
        category: body.category,
        targetScore: body.targetScore,
        deadline: body.deadline ? new Date(body.deadline) : null,
      },
    });

    return apiOk({ goal });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get("id");
    if (!goalId) return apiError("Missing goal id");

    await prisma.careerGoal.deleteMany({
      where: { id: goalId, userId: user.id },
    });

    return apiOk();
  } catch (error) {
    return toErrorResponse(error);
  }
}
