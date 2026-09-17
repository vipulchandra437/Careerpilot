import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

// WHY server page + client form: the query string (callbackUrl, error) is read
// here and passed down, so the client form needs no useSearchParams/Suspense.
export default function LoginPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string; error?: string };
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="font-serif text-xl font-semibold tracking-tight text-foreground"
        >
          CareerPilot
        </Link>
        <h1 className="mt-10 font-serif text-3xl font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-2 text-muted-foreground">
          Log in to keep building your readiness.
        </p>
        <div className="mt-8">
          <LoginForm
            callbackUrl={searchParams?.callbackUrl}
            initialError={searchParams?.error}
          />
        </div>
      </div>
    </main>
  );
}