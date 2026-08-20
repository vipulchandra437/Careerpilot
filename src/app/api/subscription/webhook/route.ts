import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { constructWebhookEvent, isStripeConfigured } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await constructWebhookEvent(rawBody, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error("Webhook signature verification failed", { error: message });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        logger.info("Unhandled webhook event type", { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("Webhook handler error", { type: event.type }, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) {
    logger.warn("Checkout session missing userId metadata", { sessionId: session.id });
    return;
  }

  const subscriptionId = session.subscription as string | null;
  const customerId = session.customer as string | null;

  const subscriptionData: Record<string, unknown> = {
    plan: "PREMIUM",
    status: "ACTIVE",
  };

  if (subscriptionId) {
    subscriptionData.stripeSubscriptionId = subscriptionId;
  }
  if (customerId) {
    subscriptionData.stripeCustomerId = customerId;
  }

  await prisma.subscription.upsert({
    where: { userId },
    update: subscriptionData,
    create: {
      userId,
      plan: "PREMIUM",
      status: "ACTIVE",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
    },
  });

  logger.info("Checkout completed - upgraded to premium", { userId, sessionId: session.id });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    logger.warn("Subscription update missing userId metadata", { subscriptionId: subscription.id });
    return;
  }

  const status = mapStripeStatus(subscription.status);
  const item = subscription.items.data[0];
  const periodStart = item?.current_period_start;
  const periodEnd = item?.current_period_end;

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      status,
      stripePriceId: item?.price?.id ?? null,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      plan: status === "ACTIVE" ? "PREMIUM" : "FREE",
    },
    create: {
      userId,
      plan: status === "ACTIVE" ? "PREMIUM" : "FREE",
      status,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: item?.price?.id ?? null,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  logger.info("Subscription updated", { userId, status, subscriptionId: subscription.id });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    logger.warn("Subscription deleted missing userId metadata", { subscriptionId: subscription.id });
    return;
  }

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan: "FREE",
      status: "CANCELLED",
      stripeSubscriptionId: null,
      stripePriceId: null,
      cancelAtPeriodEnd: false,
    },
    create: {
      userId,
      plan: "FREE",
      status: "CANCELLED",
    },
  });

  logger.info("Subscription deleted - downgraded to free", { userId, subscriptionId: subscription.id });
}

function mapStripeStatus(
  stripeStatus: string,
): "ACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIALING" {
  switch (stripeStatus) {
    case "active":
      return "ACTIVE";
    case "canceled":
    case "unpaid":
      return "CANCELLED";
    case "past_due":
      return "PAST_DUE";
    case "trialing":
      return "TRIALING";
    default:
      return "ACTIVE";
  }
}
