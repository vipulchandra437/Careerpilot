import { isPremium } from "@/server/subscription";

export const FEATURE_PREMIUM_MAP: Record<string, boolean> = {
  mentor: false,
  coding: false,
  resume_analysis: true,
  mock_interview: true,
  jd_analysis: true,
};

export function isPremiumFeature(featureName: string): boolean {
  return FEATURE_PREMIUM_MAP[featureName] ?? false;
}

export async function requirePremium(userId: string): Promise<void> {
  const premium = await isPremium(userId);
  if (!premium) {
    throw new Error("PREMIUM_REQUIRED");
  }
}
