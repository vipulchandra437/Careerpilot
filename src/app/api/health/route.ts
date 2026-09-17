import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";

// WHY public: uptime monitors and the Vercel dashboard probe this without a
// session. It answers the smallest honest signal — the app is up AND its
// database is reachable. A 503 means "deployed but degraded".

// WHY force-dynamic: a health check must never be statically cached at build
// time (it's meant to probe the RUNNING instance).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("health check: database unreachable:", (err as Error).message);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}