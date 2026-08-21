"use client";

import { useState } from "react";
import { Check, X, Sparkles, Crown, CreditCard, ExternalLink, AlertCircle, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UsageDisplay } from "@/components/subscription/usage-display";
import { CancellationSurvey } from "@/components/subscription/cancellation-survey";

interface PricingPageProps {
  subscription: {
    plan: "FREE" | "PREMIUM";
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  stripeConfigured: boolean;
}

const FREE_FEATURES = [
  { name: "Career profile & goal setting", included: true },
  { name: "Basic skill gap analysis", included: true },
  { name: "5 coding problems per day", included: true },
  { name: "Basic resume review (1/month)", included: true },
  { name: "Community access", included: true },
  { name: "AI-powered mentor", included: false },
  { name: "Unlimited coding problems", included: false },
  { name: "Advanced resume analysis & ATS scoring", included: false },
  { name: "JD matching & analysis", included: false },
  { name: "Mock interviews with AI feedback", included: false },
  { name: "Unlimited job tracker", included: false },
  { name: "Priority support", included: false },
  { name: "Weekly AI career reports", included: false },
];

const PREMIUM_FEATURES = [
  { name: "Career profile & goal setting", included: true },
  { name: "Basic skill gap analysis", included: true },
  { name: "Unlimited coding problems", included: true },
  { name: "Unlimited resume analysis", included: true },
  { name: "Community access", included: true },
  { name: "AI-powered mentor (unlimited)", included: true },
  { name: "Advanced resume analysis & ATS scoring", included: true },
  { name: "JD matching & analysis", included: true },
  { name: "Mock interviews with AI feedback", included: true },
  { name: "Unlimited job tracker", included: true },
  { name: "Priority support", included: true },
  { name: "Weekly AI career reports", included: true },
];

export function PricingPage({ subscription, stripeConfigured }: PricingPageProps) {
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const [annual, setAnnual] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);

  const isPremium = subscription.plan === "PREMIUM";
  const monthlyPrice = 19;
  const annualPrice = 190;
  const displayPrice = annual ? annualPrice : monthlyPrice;
  const displayPeriod = annual ? "/year" : "/month";

  async function handleCheckout(priceId?: string) {
    setLoading("checkout");
    try {
      const body: Record<string, unknown> = {};
      if (priceId) body.priceId = priceId;
      if (annual) body.interval = "year";
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function handlePortal() {
    setLoading("portal");
    try {
      const res = await fetch("/api/subscription/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to open portal");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Choose Your Plan
        </h1>
        <p className="mt-2 text-muted-foreground">
          Unlock your full career potential with CareerPilot Premium
        </p>
      </div>

      {!stripeConfigured && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 pt-4">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Stripe is not configured yet
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                To enable subscriptions, add your Stripe keys to the <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900">.env</code> file:
                <code className="mt-1 block rounded bg-amber-100 px-2 py-1 dark:bg-amber-900">
                  STRIPE_SECRET_KEY=sk_test_...<br />
                  STRIPE_PUBLISHABLE_KEY=pk_test_...<br />
                  STRIPE_WEBHOOK_SECRET=whsec_...<br />
                  STRIPE_PREMIUM_PRICE_ID=price_...
                </code>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isPremium && subscription.status === "TRIALING" && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardContent className="flex items-center gap-3 pt-4">
            <Tag className="size-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Free trial active
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Your trial gives you full Premium access. {subscription.currentPeriodEnd && <>Expires {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.</>}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isPremium && (
        <UsageDisplay />
      )}

      <div className="flex items-center justify-center gap-3">
        <span className={cn("text-sm", !annual && "font-medium text-foreground")}>Monthly</span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          onClick={() => setAnnual(!annual)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
            annual ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
              annual ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
        <span className={cn("text-sm", annual && "font-medium text-foreground")}>
          Annual
          <Badge variant="secondary" className="ml-1.5 text-xs">
            Save 17%
          </Badge>
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <PricingCard
          title="Free"
          price="$0"
          period="forever"
          features={FREE_FEATURES}
          currentPlan={!isPremium}
          onAction={undefined}
          actionLabel=""
          loading={false}
          stripeConfigured={stripeConfigured}
        />
        <PricingCard
          title="Premium"
          price={`$${displayPrice}`}
          period={displayPeriod}
          features={PREMIUM_FEATURES}
          currentPlan={isPremium}
          onAction={isPremium ? handlePortal : () => handleCheckout()}
          actionLabel={isPremium ? "Manage Subscription" : "Subscribe Now"}
          loading={isPremium ? loading === "portal" : loading === "checkout"}
          stripeConfigured={stripeConfigured}
          highlighted
          cancelAtPeriodEnd={isPremium ? subscription.cancelAtPeriodEnd : false}
          periodEnd={isPremium ? subscription.currentPeriodEnd : null}
          onCancelClick={isPremium ? () => setShowSurvey(true) : undefined}
        />
      </div>

      {showSurvey && (
        <div className="flex justify-center">
          <CancellationSurvey
            onSubmitted={() => setShowSurvey(false)}
            onCancel={() => setShowSurvey(false)}
          />
        </div>
      )}

      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold">Feature Comparison</h2>
        <Card>
          <CardContent className="overflow-x-auto pt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left font-medium text-muted-foreground">Feature</th>
                  <th className="pb-3 text-center font-medium text-muted-foreground">Free</th>
                  <th className="pb-3 text-center font-medium text-muted-foreground">Premium</th>
                </tr>
              </thead>
              <tbody>
                {FREE_FEATURES.map((feature) => (
                  <tr key={feature.name} className="border-b last:border-0">
                    <td className="py-3 pr-4">{feature.name}</td>
                    <td className="py-3 text-center">
                      {feature.included ? (
                        <Check className="mx-auto size-4 text-green-600" />
                      ) : (
                        <X className="mx-auto size-4 text-muted-foreground/40" />
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <Check className="mx-auto size-4 text-green-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PricingCard({
  title,
  price,
  period,
  features,
  currentPlan,
  onAction,
  actionLabel,
  loading,
  stripeConfigured,
  highlighted = false,
  cancelAtPeriodEnd = false,
  periodEnd = null,
  onCancelClick,
}: {
  title: string;
  price: string;
  period: string;
  features: Array<{ name: string; included: boolean }>;
  currentPlan: boolean;
  onAction?: () => void;
  actionLabel: string;
  loading: boolean;
  stripeConfigured: boolean;
  highlighted?: boolean;
  cancelAtPeriodEnd?: boolean;
  periodEnd?: string | null;
  onCancelClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        "relative flex flex-col",
        highlighted && "ring-2 ring-primary",
      )}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
            <Sparkles className="size-3" />
            Best Value
          </Badge>
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {highlighted ? (
            <Sparkles className="size-5 text-amber-500" />
          ) : (
            <Crown className="size-5 text-muted-foreground" />
          )}
          {title}
        </CardTitle>
        <div className="mt-2">
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-muted-foreground">{period}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <ul className="mb-6 flex-1 space-y-2.5">
          {features.map((feature) => (
            <li key={feature.name} className="flex items-start gap-2">
              {feature.included ? (
                <Check className="mt-0.5 size-4 shrink-0 text-green-600" />
              ) : (
                <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" />
              )}
              <span
                className={cn(
                  "text-sm",
                  !feature.included && "text-muted-foreground",
                )}
              >
                {feature.name}
              </span>
            </li>
          ))}
        </ul>
        <div className="space-y-2">
          {currentPlan ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5 rounded-lg border bg-muted/50 py-2 text-sm font-medium text-muted-foreground">
                <Crown className="size-4" />
                Current Plan
              </div>
              {onCancelClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-destructive"
                  onClick={onCancelClick}
                >
                  Cancel Subscription
                </Button>
              )}
            </div>
          ) : onAction ? (
            <Button
              className="w-full"
              variant={highlighted ? "default" : "outline"}
              onClick={onAction}
              disabled={loading || (!stripeConfigured && !currentPlan)}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Loading...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {title === "Premium" && !currentPlan ? (
                    <CreditCard className="size-4" />
                  ) : (
                    <ExternalLink className="size-4" />
                  )}
                  {actionLabel}
                </span>
              )}
            </Button>
          ) : null}
          {cancelAtPeriodEnd && periodEnd && (
            <p className="text-center text-xs text-muted-foreground">
              Cancels on {new Date(periodEnd).toLocaleDateString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
