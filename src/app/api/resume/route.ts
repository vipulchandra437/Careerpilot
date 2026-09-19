import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";

// WHY a read-only list endpoint: with the old server components gone, the SPA
// needs the user's resume index over HTTP. Reuses the same ownership-scoped
// query the old dashboard used server-side. rawText is omitted (heavy, only
// needed by the detail endpoint).

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  let resumes;
  try {
    resumes = await prisma.resume.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        fileName: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't load your resumes. Please try again.", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    resumes.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  );
}