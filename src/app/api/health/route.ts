import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { version as nextVersion } from "next/package.json";
import { env, envIssues } from "@/lib/env";

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
  configIssues: string[];
}

export async function GET() {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    // Database is unavailable; the rest of the health payload is still returned.
  }

  const issues = envIssues();
  const status: HealthState["status"] = dbOk ? "ok" : "degraded";

  const state: HealthState = {
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    services: { database: dbOk ? "ok" : "unavailable" },
    executionProvider: env.EXECUTION_PROVIDER,
    aiProvider: "openrouter",
    node: process.version,
    next: nextVersion,
    configIssues: issues,
  };

  return NextResponse.json(state, { status: dbOk ? 200 : 503 });
}
