"use client";

import { Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubscriptionBadgeProps {
  plan: "FREE" | "PREMIUM";
  className?: string;
}

export function SubscriptionBadge({ plan, className }: SubscriptionBadgeProps) {
  if (plan === "PREMIUM") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300",
          className,
        )}
      >
        <Sparkles className="size-3" />
        Premium
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <Crown className="size-3" />
      Free
    </span>
  );
}
