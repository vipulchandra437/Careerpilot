"use server";

import { jwtVerify } from "jose";
import { z } from "zod";
import { prisma } from "@/lib/interview/db";
import { computeDashboardReadiness } from "@/lib/readiness";
import {
  FEATURE_KEYS,
  FEATURES,
  lastSevenDays,
  type DashboardData,
  type FeatureStatus,
  type FeatureView,
} from "@/lib/dashboard";

// The FastAPI JWT lives in localStorage, so the client passes it to this
// server action and the signature is checked again before any query runs.
async function userIdFromToken(token: string): Promise<string | null> {
  const secret = process.env.JWT_SECRET_KEY;
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return payload.type === "access" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

const dashboardSchema = z.object({
  timezone: z.string().min(1).max(64).refine((value) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Unknown timezone"),
});

const progressSchema = z.object({
  featureKey: z.enum(FEATURE_KEYS),
  score: z.number().int().min(0).max(100),
  status: z.enum(["planned", "in_progress", "complete"]),
});

const bounded = (value: number) => Math.min(100, Math.max(0, Math.round(value)));
const mean = (values: number[]) =>
  values.length ? bounded(values.reduce((total, value) => total + value, 0) / values.length) : 0;
const statusOf = (value: string): FeatureStatus =>
  value === "complete" || value === "in_progress" ? value : "planned";

export type DashboardResult =
  | { ok: true; data: DashboardData }
  | { ok: false; reason: "auth" | "data" };

export async function getDashboardData(token: string, timezone: string): Promise<DashboardResult> {
  const userId = await userIdFromToken(token);
  if (!userId) return { ok: false, reason: "auth" };
  const parsed = dashboardSchema.safeParse({ timezone });
  const timeZone = parsed.success ? parsed.data.timezone : "UTC";

  try {
    const [rows, sessions, target] = await Promise.all([
      prisma.featureProgress.findMany({ where: { userId } }),
      prisma.interviewSession.findMany({
        where: { userId },
        select: { startedAt: true, endedAt: true, overallScore: true },
      }),
      prisma.targetPreference.findUnique({ where: { userId }, select: { id: true } }),
    ]);

    const progress = new Map(rows.map((row) => [row.featureKey, row]));
    const resumeScore = mean(
      FEATURES.filter((feature) => feature.group === "resume").map(
        (feature) => progress.get(feature.key)?.score ?? 0
      )
    );
    const finished = sessions.filter(
      (session) =>
        session.endedAt !== null &&
        typeof session.overallScore === "number" &&
        Number.isFinite(session.overallScore)
    );
    const interviewScore = mean(finished.map((session) => (session.overallScore ?? 0) * 10));

    const features: FeatureView[] = FEATURES.map((feature) => {
      if (feature.key === "mock-interviewer") {
        return {
          ...feature,
          score: interviewScore,
          status: finished.length ? "complete" : sessions.length ? "in_progress" : "planned",
        };
      }
      if (feature.key === "target-company" && target) {
        return { ...feature, score: 100, status: "complete" };
      }
      const row = progress.get(feature.key);
      return {
        ...feature,
        score: bounded(row?.score ?? 0),
        status: row ? statusOf(row.status) : "planned",
      };
    });

    const days = lastSevenDays(timeZone);
    const keyFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const counts = new Map(days.map((day) => [day, 0]));
    for (const session of sessions) {
      const key = keyFormatter.format(session.startedAt);
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
    const weeklyPractice = days.map((date) => ({
      date,
      label: weekday.format(new Date(`${date}T12:00:00Z`)),
      count: counts.get(date) ?? 0,
    }));

    return {
      ok: true,
      data: {
        readiness: computeDashboardReadiness({ resumeScore, interviewScore }),
        resumeScore,
        interviewScore,
        features,
        weeklyPractice,
      },
    };
  } catch {
    return { ok: false, reason: "data" };
  }
}

export async function recordFeatureProgress(
  token: string,
  input: { featureKey: string; score: number; status: string }
): Promise<{ ok: boolean }> {
  const userId = await userIdFromToken(token);
  if (!userId) return { ok: false };
  const parsed = progressSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { featureKey, score, status } = parsed.data;
  try {
    await prisma.featureProgress.upsert({
      where: { userId_featureKey: { userId, featureKey } },
      create: { userId, featureKey, score, status },
      update: { score, status },
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
