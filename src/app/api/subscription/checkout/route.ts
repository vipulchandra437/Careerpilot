import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { isStripeConfigured, createCheckoutSession } from "@/lib/stripe";
import { apiError, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function POST() {
  const user = await requireUser();
  try {
    if (!isStripeConfigured()) {
      return apiError(
        "Stripe is not configured. Add your Stripe keys to the .env file to enable subscriptions.",
        503,
      );
    }

    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
    if (!priceId || priceId === "price_placeholder") {
      return apiError(
        "Stripe price is not configured. Set STRIPE_PREMIUM_PRICE_ID in your environment variables.",
        503,
      );
    }

    const url = await createCheckoutSession(user.id, user.email, priceId);

    return NextResponse.json({ url });
  } catch (error) {
    return toErrorResponse(error);
  }
}
