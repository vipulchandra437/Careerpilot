import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { version as nextVersion } from "next/package.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HealthState {
  status: "ok" | "degraded";
  timestamp: string;
  uptimeSeconds: number;
  services: {
    database: "ok" | "unavailable";
  };
  executionProvider: string;
  aiProvider: string;
  node: string;
  next: string;
}

export async function GET() {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    // Database is unavailable; the rest of the health payload is still returned.
  }

  const state: HealthState = {
    status: dbOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    services: { database: dbOk ? "ok" : "unavailable" },
    executionProvider: (process.env.EXECUTION_PROVIDER ?? "local").toLowerCase(),
    aiProvider: "openrouter",
    node: process.version,
    next: nextVersion,
  };

  return NextResponse.json(state, { status: dbOk ? 200 : 503 });
}
