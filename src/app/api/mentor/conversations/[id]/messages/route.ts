import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { computeReadiness } from "@/server/scoring/readiness.service";
import { mentorReply } from "@/server/services/mentor.service";
import { ApiError, toErrorResponse, validateBody } from "@/lib/api";

export const runtime = "nodejs";

const postSchema = z.object({
  content: z.string().min(1).max(2000),
});

function generateTitle(firstMessage: string): string {
  const cleaned = firstMessage.replace(/\n/g, " ").trim();
  if (cleaned.length <= 40) return cleaned;
  const cut = cleaned.slice(0, 40);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + "...";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  try {
    const conversation = await prisma.mentorConversation.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    const messages = await prisma.mentorMessage.findMany({
      where: { conversationId: id },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  try {
    const data = await validateBody(request, postSchema);

    const conversation = await prisma.mentorConversation.findFirst({
      where: { id, userId: user.id },
    });

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    await prisma.mentorMessage.create({
      data: {
        conversationId: id,
        role: "user",
        content: data.content,
      },
    });

    const history = await prisma.mentorMessage.findMany({
      where: { conversationId: id },
      select: { role: true, content: true },
      orderBy: { createdAt: "asc" },
    });

    const [profile, readiness] = await Promise.all([
      prisma.studentProfile.findUnique({
        where: { userId: user.id },
        include: {
          targetCompany: { select: { name: true } },
          targetJobRole: { select: { title: true } },
          studentSkills: {
            include: { skill: { select: { name: true } } },
            orderBy: { rating: "desc" },
          },
          skillGaps: {
            where: { status: { in: ["NEEDS_IMPROVEMENT", "MISSING"] } },
            include: { skill: { select: { name: true } } },
            orderBy: { priority: "asc" },
            take: 5,
          },
        },
      }),
      computeReadiness(user.id),
    ]);

    const context = {
      name: user.name,
      targetRole: profile?.targetJobRole?.title ?? null,
      targetCompany: profile?.targetCompany?.name ?? null,
      readinessScore: readiness.overall,
      topSkills: profile?.studentSkills?.slice(0, 5).map((s) => s.skill.name) ?? [],
      weakSkills: profile?.skillGaps?.map((g) => g.skill.name) ?? [],
    };

    const replyText = await mentorReply(data.content, context, history);

    const assistantMessage = await prisma.mentorMessage.create({
      data: {
        conversationId: id,
        role: "assistant",
        content: replyText,
      },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    if (conversation.title === "New conversation") {
      const newTitle = generateTitle(data.content);
      await prisma.mentorConversation.update({
        where: { id },
        data: { title: newTitle },
      });
    } else {
      await prisma.mentorConversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    return toErrorResponse(error);
  }
}
