import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { getOptionalUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export const metadata = { title: "Register" };

export default async function RegisterPage() {
  const user = await getOptionalUser();
  if (user) redirect("/dashboard");

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Start your journey to career readiness. It&apos;s free.
        </p>
      </div>
      <RegisterForm />
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Demo accounts (seed data):{" "}
        <Link href="/login" className="underline-offset-2 hover:underline">
          student@careerpilot.dev / student123
        </Link>
      </p>
    </div>
  );
}
