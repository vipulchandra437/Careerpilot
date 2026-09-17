"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

import { AuthBanner } from "@/components/auth/auth-banner";
import { GoogleButton } from "@/components/auth/google-button";
import { LOCKOUT_PREFIX } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/validators/auth";

type Field = "email" | "password";
type FieldErrors = Partial<Record<Field, string>>;

export function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(
    // WHY: redirect-based flows (e.g. a failed Google round-trip) land here with
    // ?error=... — surface that instead of showing an unexplained empty form.
    initialError ? "Email or password is incorrect." : null
  );
  const [submitting, setSubmitting] = useState(false);

  // WHY sanitize: callbackUrl comes from the query string; a crafted link must
  // not bounce users to an external site after sign-in (open-redirect guard).
  const target =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/dashboard";

  // WHY validate the whole schema per blur: one source of truth — the blur just
  // picks the issue that belongs to the field the user left.
  function validateField(field: Field) {
    const parsed = loginSchema.safeParse({ email, password });
    const message = parsed.success
      ? undefined
      : parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "email" || field === "password") errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
      // WHY redirect:false: we own the loading state and the error banner; a full
      // page redirect would flash the Auth.js default screen on every failure.
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      if (!result) {
        setBanner("Could not reach the server. Please try again.");
        setSubmitting(false);
        return;
      }
      if (result.error) {
        // WHY three cases: "CredentialsSignin" is Auth.js's value for a failed
        // password check; our sentinel prefix is the throttle's user-facing
        // lockout notice shipped through the ?error= channel; anything else is
        // an unexpected server error and must NOT be rendered raw (RULES.md —
        // users never see internals).
        if (result.error === "CredentialsSignin") {
          setBanner("Email or password is incorrect.");
        } else if (result.error.startsWith(LOCKOUT_PREFIX)) {
          setBanner(result.error.slice(LOCKOUT_PREFIX.length));
        } else {
          setBanner("Could not sign you in. Please try again.");
        }
        setSubmitting(false);
        return;
      }
      router.push(target);
      router.refresh();
    } catch {
      setBanner("Could not reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {banner ? <AuthBanner message={banner} /> : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@college.edu"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => validateField("email")}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          className={
            fieldErrors.email
              ? "border-destructive focus-visible:ring-destructive"
              : undefined
          }
        />
        {fieldErrors.email ? (
          <p id="email-error" className="text-sm text-destructive">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onBlur={() => validateField("password")}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
          className={
            fieldErrors.password
              ? "border-destructive focus-visible:ring-destructive"
              : undefined
          }
        />
        {fieldErrors.password ? (
          <p id="password-error" className="text-sm text-destructive">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Signing you in…" : "Log in"}
      </Button>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton callbackUrl={target} />

      <p className="text-center text-sm text-muted-foreground">
        New to CareerPilot?{" "}
        <Link
          href="/register"
          className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}