import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { isStripeConfigured, createPortalSession } from "@/lib/stripe";
import { apiError, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function POST() {
  const user = await requireUser();
  try {
    if (!isStripeConfigured()) {
      return apiError(
        "Stripe is not configured. Add your Stripe keys to the .env file to manage subscriptions.",
        503,
      );
    }

    const url = await createPortalSession(user.id);

    return NextResponse.json({ url });
  } catch (error) {
    return toErrorResponse(error);
  }
}
