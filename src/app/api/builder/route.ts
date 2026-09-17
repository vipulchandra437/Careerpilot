import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";
import { builderSaveSchema, builderIdSchema } from "@/lib/validators/builder";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const items = await prisma.builderResume.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(
    items.map((r) => ({
      ...r,
      content: r.content as unknown,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  );
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Something went wrong reading the request. Please try again.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  if (body && typeof body === "object" && "sourceResumeId" in body) {
    const sourceId = builderIdSchema.safeParse((body as Record<string, unknown>).sourceResumeId);
    if (!sourceId.success) {
      return NextResponse.json(
        { error: "Invalid resume ID.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    const sourceResume = await prisma.resume.findUnique({
      where: { id: sourceId.data },
      select: { id: true, userId: true, parsedData: true },
    });
    if (!sourceResume || sourceResume.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Source resume not found.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    if (!sourceResume.parsedData) {
      return NextResponse.json(
        { error: "That resume hasn't been parsed yet. Parse it first.", code: "NOT_PARSED" },
        { status: 400 }
      );
    }

    const { emptyBuilderContent, builderContentSchema } = await import("@/lib/validators/builder");
    const parsedData = sourceResume.parsedData as Record<string, unknown>;
    const seededContent = builderContentSchema.parse({
      ...emptyBuilderContent(),
      contact: {
        name: typeof parsedData.name === "string" ? parsedData.name : "",
        email: typeof parsedData.email === "string" ? parsedData.email : "",
        phone: typeof parsedData.phone === "string" ? parsedData.phone : "",
        links: Array.isArray(parsedData.links) ? parsedData.links.filter((l: unknown) => typeof l === "string") : [],
      },
      summary: typeof parsedData.summary === "string" ? parsedData.summary : "",
      education: Array.isArray(parsedData.education) ? parsedData.education : [],
      skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
      projects: Array.isArray(parsedData.projects) ? parsedData.projects : [],
      experience: Array.isArray(parsedData.experience) ? parsedData.experience : [],
    });

    const title = `${parsedData.name ? String(parsedData.name) + " — Resume" : "Untitled Resume"}`;
    const created = await prisma.builderResume.create({
      data: {
        userId: session.user.id,
        title,
        content: seededContent as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        title: created.title,
        content: created.content as unknown,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  }

  const parsed = builderSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const created = await prisma.builderResume.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title,
      content: parsed.data.content as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json(
    {
      id: created.id,
      title: created.title,
      content: created.content as unknown,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    },
    { status: 201 }
  );
}
