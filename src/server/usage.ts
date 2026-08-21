import { prisma } from "@/lib/db";
import { isPremium } from "@/server/subscription";

export interface FeatureLimit {
  feature: string;
  label: string;
  limit: number;
  periodType: "monthly" | "daily";
}

export interface UsageCheck {
  allowed: boolean;
  current: number;
  limit: number;
}

const FREE_LIMITS: FeatureLimit[] = [
  { feature: "coding_submit", label: "Coding Submissions", limit: 5, periodType: "daily" },
  { feature: "resume_analyze", label: "Resume Analyses", limit: 1, periodType: "monthly" },
  { feature: "interview", label: "Mock Interviews", limit: 3, periodType: "monthly" },
  { feature: "jd_analyze", label: "JD Analyses", limit: 5, periodType: "monthly" },
  { feature: "mentor_chat", label: "Mentor Chat Messages", limit: 10, periodType: "daily" },
];

function getCurrentPeriod(periodType: "monthly" | "daily"): string {
  const now = new Date();
  if (periodType === "monthly") {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function trackUsage(userId: string, feature: string): Promise<void> {
  const limitDef = FREE_LIMITS.find((l) => l.feature === feature);
  const periodType = limitDef?.periodType ?? "monthly";
  const period = getCurrentPeriod(periodType);

  await prisma.usageRecord.upsert({
    where: { userId_feature_period: { userId, feature, period } },
    update: { count: { increment: 1 } },
    create: { userId, feature, count: 1, period },
  });
}

export async function getUsage(userId: string, feature: string): Promise<number> {
  const limitDef = FREE_LIMITS.find((l) => l.feature === feature);
  const periodType = limitDef?.periodType ?? "monthly";
  const period = getCurrentPeriod(periodType);

  const record = await prisma.usageRecord.findUnique({
    where: { userId_feature_period: { userId, feature, period } },
    select: { count: true },
  });

  return record?.count ?? 0;
}

export async function getUsageSummary(
  userId: string,
): Promise<Array<{ feature: string; label: string; current: number; limit: number; periodType: string }>> {
  const premium = await isPremium(userId);

  return Promise.all(
    FREE_LIMITS.map(async (fl) => {
      const current = premium ? 0 : await getUsage(userId, fl.feature);
      return {
        feature: fl.feature,
        label: fl.label,
        current,
        limit: premium ? Infinity : fl.limit,
        periodType: fl.periodType,
      };
    }),
  );
}

export async function checkLimit(userId: string, feature: string): Promise<UsageCheck> {
  const premium = await isPremium(userId);
  if (premium) {
    return { allowed: true, current: 0, limit: Infinity };
  }

  const limitDef = FREE_LIMITS.find((l) => l.feature === feature);
  if (!limitDef) {
    return { allowed: true, current: 0, limit: Infinity };
  }

  const period = getCurrentPeriod(limitDef.periodType);
  const record = await prisma.usageRecord.findUnique({
    where: { userId_feature_period: { userId, feature, period } },
    select: { count: true },
  });

  const current = record?.count ?? 0;
  return {
    allowed: current < limitDef.limit,
    current,
    limit: limitDef.limit,
  };
}
