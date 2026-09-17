"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// WHY a root error boundary (client component, required by Next): a crash on ANY
// page must render this friendly screen instead of a raw server error. No stack
// traces or internals are shown (RULES.md: users never see server internals) —
// Next still logs the real error server-side automatically.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // WHY a digest giveaway: the digest (log id) is how a user can match their
  // report to the server log we already write — a URL path, not stack leak.
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
          <div className="max-w-md rounded-lg border border-border bg-card p-8 text-center">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This is on us, not you. Your data is safe. Try again, or head back to your dashboard.
            </p>
            {error.digest && (
              <p className="mt-3 text-xs text-muted-foreground">Reference: {error.digest}</p>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={reset}>Try again</Button>
              <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}