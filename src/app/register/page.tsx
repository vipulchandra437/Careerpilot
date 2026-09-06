import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Create your account" };

// WHY server page + client form: keeps the page server-rendered; the form owns
// the interactive states (loading, inline errors) as a client island.
export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="font-serif text-xl font-semibold tracking-tight text-foreground"
        >
          HireReady
        </Link>
        <h1 className="mt-10 font-serif text-3xl font-semibold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="mt-2 text-muted-foreground">
          Two minutes now — a clearer job hunt for the rest of the semester.
        </p>
        <div className="mt-8">
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}