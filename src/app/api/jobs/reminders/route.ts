import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  try {
    const jobs = await prisma.job.findMany({
      where: {
        userId: user.id,
        followUpDate: { not: null },
      },
      orderBy: { followUpDate: "asc" },
    });

    return NextResponse.json({
      jobs: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        salary: j.salary,
        status: j.status,
        followUpDate: j.followUpDate?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
