import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { getOptionalUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  const user = await getOptionalUser();
  if (user) redirect("/dashboard");

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Log in to continue your career preparation.
        </p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
