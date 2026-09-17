import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const resumes = await prisma.resume.findMany({
    where: { userId: session.user.id },
    select: { id: true, fileName: true, parsedData: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const withParsedData = resumes.filter((r) => r.parsedData !== null);

  return NextResponse.json(
    withParsedData.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      parsedData: r.parsedData as unknown,
      createdAt: r.createdAt.toISOString(),
    }))
  );
}
