import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

let stripeInstance: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "sk_test_placeholder");
}

export function getStripeClient(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in your environment variables.");
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    });
  }
  return stripeInstance;
}

export async function createOrGetStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  const stripe = getStripeClient();

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (subscription?.stripeCustomerId) {
    return subscription.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  await prisma.subscription.upsert({
    where: { userId },
    update: { stripeCustomerId: customer.id },
    create: { userId, stripeCustomerId: customer.id },
  });

  logger.info("Created Stripe customer", { userId, customerId: customer.id });

  return customer.id;
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  priceId: string,
): Promise<string> {
  const stripe = getStripeClient();
  const customerId = await createOrGetStripeCustomer(userId, email);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?canceled=true`,
    metadata: { userId },
    subscription_data: { metadata: { userId } },
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session");
  }

  logger.info("Created checkout session", { userId, sessionId: session.id });

  return session.url;
}

export async function createPortalSession(userId: string): Promise<string> {
  const stripe = getStripeClient();

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (!subscription?.stripeCustomerId) {
    throw new Error("No Stripe customer found for this user");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription`,
  });

  if (!session.url) {
    throw new Error("Failed to create portal session");
  }

  logger.info("Created portal session", { userId });

  return session.url;
}

export async function constructWebhookEvent(
  rawBody: string,
  signature: string,
): Promise<Stripe.Event> {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || webhookSecret === "whsec_placeholder") {
    throw new Error("Stripe webhook secret is not configured");
  }

  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
