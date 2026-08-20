import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { getUserSubscription, getPlanFeatures } from "@/server/subscription";
import { isStripeConfigured } from "@/lib/stripe";
import { toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  try {
    const subscription = await getUserSubscription(user.id);
    const features = getPlanFeatures(subscription.plan);

    return NextResponse.json({
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      features,
      stripeConfigured: isStripeConfigured(),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
