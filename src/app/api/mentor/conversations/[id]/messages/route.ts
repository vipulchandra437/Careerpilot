import { NextResponse } from "next/server";

export const maxDuration = 60;
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { computeReadiness } from "@/server/scoring/readiness.service";
import { mentorReplyStream, generateConversationTitle, type MentorContext } from "@/server/services/mentor.service";
import { ApiError, toErrorResponse, validateBody } from "@/lib/api";

export const runtime = "nodejs";

const postSchema = z.object({
  content: z.string().min(1).max(2000),
});

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

    // Save user message
    await prisma.mentorMessage.create({
      data: {
        conversationId: id,
        role: "user",
        content: data.content,
      },
    });

    // Get full conversation history
    const history = await prisma.mentorMessage.findMany({
      where: { conversationId: id },
      select: { role: true, content: true },
      orderBy: { createdAt: "asc" },
    });

    // Build enriched context
    const [profile, readiness, codingSubmissions, latestResume, latestInterview] = await Promise.all([
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
      prisma.codingSubmission.findMany({
        where: { userId: user.id },
        select: { status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.resumeAnalysis.findFirst({
        orderBy: { createdAt: "desc" },
        select: { overallScore: true },
      }),
      prisma.interview.findFirst({
        where: { userId: user.id, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        select: { score: true },
      }),
    ]);

    const totalSolved = codingSubmissions.filter((s) => s.status === "ACCEPTED").length;
    const acceptanceRate = codingSubmissions.length > 0
      ? Math.round((totalSolved / codingSubmissions.length) * 100)
      : null;

    const recentActivity: string[] = [];
    if (codingSubmissions.length > 0) {
      recentActivity.push(`Solved ${totalSolved} coding problems`);
    }
    if (latestResume) {
      recentActivity.push(`Resume score: ${latestResume.overallScore}/100`);
    }
    if (latestInterview) {
      recentActivity.push(`Last interview score: ${latestInterview.score}/100`);
    }

    const context: MentorContext = {
      name: user.name,
      targetRole: profile?.targetJobRole?.title ?? null,
      targetCompany: profile?.targetCompany?.name ?? null,
      readinessScore: readiness.overall,
      topSkills: profile?.studentSkills?.slice(0, 5).map((s) => s.skill.name) ?? [],
      weakSkills: profile?.skillGaps?.map((g) => g.skill.name) ?? [],
      codingStats: {
        totalSolved,
        acceptanceRate: acceptanceRate ?? undefined,
      },
      resumeScore: latestResume?.overallScore ?? null,
      interviewScore: latestInterview?.score ?? null,
      recentActivity,
    };

    // Stream the reply
    const encoder = new TextEncoder();
    let fullReply = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          fullReply = await mentorReplyStream(
            data.content,
            context,
            history.slice(0, -1), // exclude the just-saved user message from history
            (token) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
            },
          );
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, content: fullReply })}\n\n`));
        } catch (err) {
          const errorMsg = "I encountered an error generating a response. Please try again.";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, content: errorMsg })}\n\n`));
          fullReply = errorMsg;
        } finally {
          // Save assistant message to DB
          try {
            await prisma.mentorMessage.create({
              data: {
                conversationId: id,
                role: "assistant",
                content: fullReply,
              },
            });

            // Update conversation title if first message
            if (conversation.title === "New conversation") {
              const newTitle = await generateConversationTitle(data.content);
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
          } catch (dbErr) {
            // Log but don't fail the response
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
