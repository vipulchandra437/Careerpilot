import { requireUser } from "@/lib/auth-helpers";
import { getUserSubscription } from "@/server/subscription";
import { isStripeConfigured } from "@/lib/stripe";
import { PricingPage } from "@/components/subscription/pricing-page";

export const metadata = { title: "Subscription" };

export default async function SubscriptionPage() {
  const user = await requireUser();
  const subscription = await getUserSubscription(user.id);

  return (
    <PricingPage
      subscription={{
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      }}
      stripeConfigured={isStripeConfigured()}
    />
  );
}
