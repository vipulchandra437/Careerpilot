import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// WHY a branded 404 (Next's default is a bare text page): the landing copy and
// dashboard are the app's surfaces, and a missing URL still deserves the same
// warm-paper look plus one obvious way home (DESIGN.md: always a next action).

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-sm font-medium tracking-wide text-primary">404</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-foreground">
          This page doesn&apos;t exist
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The link may be mistyped, or the page moved. Let&apos;s get you back to your dashboard.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/dashboard" className={cn(buttonVariants())}>
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}