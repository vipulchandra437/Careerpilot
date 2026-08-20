import { prisma } from "@/lib/db";
import { type PlanType, type SubscriptionStatus } from "@prisma/client";

export interface SubscriptionPlan {
  plan: PlanType;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface PlanFeatures {
  name: string;
  included: boolean;
  limits?: string;
}

export async function getUserSubscription(userId: string): Promise<SubscriptionPlan> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      plan: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  if (subscription) {
    return subscription;
  }

  const created = await prisma.subscription.create({
    data: { userId },
    select: {
      plan: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  return created;
}

export async function isPremium(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });

  return subscription?.plan === "PREMIUM" && subscription?.status === "ACTIVE";
}

export function getSubscriptionPlan(userId: string): Promise<SubscriptionPlan> {
  return getUserSubscription(userId);
}

const FREE_FEATURES: PlanFeatures[] = [
  { name: "Career profile & goal setting", included: true },
  { name: "Basic skill gap analysis", included: true },
  { name: "Coding problems", included: true, limits: "5 per day" },
  { name: "Basic resume review", included: true, limits: "1 analysis/month" },
  { name: "Community access", included: true },
  { name: "AI-powered mentor", included: false },
  { name: "Advanced resume analysis & ATS scoring", included: false },
  { name: "JD matching & analysis", included: false },
  { name: "Mock interviews with AI feedback", included: false },
  { name: "Unlimited coding problems", included: false },
  { name: "Job tracker (unlimited)", included: false },
  { name: "Priority support", included: false },
  { name: "Weekly AI career reports", included: false },
];

const PREMIUM_FEATURES: PlanFeatures[] = [
  { name: "Career profile & goal setting", included: true },
  { name: "Basic skill gap analysis", included: true },
  { name: "Coding problems", included: true, limits: "Unlimited" },
  { name: "Basic resume review", included: true, limits: "Unlimited" },
  { name: "Community access", included: true },
  { name: "AI-powered mentor", included: true, limits: "Unlimited conversations" },
  { name: "Advanced resume analysis & ATS scoring", included: true },
  { name: "JD matching & analysis", included: true },
  { name: "Mock interviews with AI feedback", included: true },
  { name: "Unlimited coding problems", included: true },
  { name: "Job tracker (unlimited)", included: true },
  { name: "Priority support", included: true },
  { name: "Weekly AI career reports", included: true },
];

export function getPlanFeatures(plan: PlanType): PlanFeatures[] {
  return plan === "PREMIUM" ? PREMIUM_FEATURES : FREE_FEATURES;
}
