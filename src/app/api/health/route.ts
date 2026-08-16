import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { version as nextVersion } from "next/package.json";
import { env, envIssues } from "@/lib/env";
import { rateLimiterBackend } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HealthState {
  status: "ok" | "degraded";
  timestamp: string;
  uptimeSeconds: number;
  services: {
    database: "ok" | "unavailable";
    execution: "ok" | "unavailable" | "local";
  };
  executionProvider: string;
  aiProvider: string;
  rateLimiter: "redis" | "memory";
  node: string;
  next: string;
  configIssues: string[];
}

async function checkExecution(): Promise<HealthState["services"]["execution"]> {
  if ((process.env.EXECUTION_PROVIDER ?? "local") === "local") return "local";
  const base = (process.env.PISTON_API_URL ?? "").replace(/\/+$/, "");
  if (!base) return "unavailable";
  try {
    const res = await fetch(`${base}/runtimes`, { signal: AbortSignal.timeout(5000) });
    return res.ok ? "ok" : "unavailable";
  } catch {
    return "unavailable";
  }
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
  const execution = await checkExecution();
  const status: HealthState["status"] =
    dbOk && execution !== "unavailable" ? "ok" : "degraded";

  const state: HealthState = {
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    services: { database: dbOk ? "ok" : "unavailable", execution },
    executionProvider: env.EXECUTION_PROVIDER,
    aiProvider: "openrouter",
    rateLimiter: rateLimiterBackend(),
    node: process.version,
    next: nextVersion,
    configIssues: issues,
  };

  return NextResponse.json(state, { status: state.status === "ok" ? 200 : 503 });
}
