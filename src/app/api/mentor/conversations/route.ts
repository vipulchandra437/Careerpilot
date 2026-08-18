import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { toErrorResponse, validateBody } from "@/lib/api";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().max(200).optional(),
});

export async function GET() {
  const user = await requireUser();
  try {
    const conversations = await prisma.mentorConversation.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const data = await validateBody(request, createSchema);

    const conversation = await prisma.mentorConversation.create({
      data: {
        userId: user.id,
        title: data.title ?? "New conversation",
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    return NextResponse.json(conversation);
  } catch (error) {
    return toErrorResponse(error);
  }
}
