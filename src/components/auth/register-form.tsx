"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

import { AuthBanner } from "@/components/auth/auth-banner";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema } from "@/lib/validators/auth";

type Field = "name" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<Field, string>>;

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // WHY validate per-field on blur: one source of truth (the shared schema) picks
  // out exactly which field the user just left, so the error lives next to the input.
  function validateField(field: Field) {
    const parsed = registerSchema.safeParse({ name, email, password, confirmPassword });
    const message = parsed.success
      ? undefined
      : parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBanner(null);

    const parsed = registerSchema.safeParse({
      name: name.trim(),
      email,
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "name" || field === "email" || field === "password" || field === "confirmPassword") {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
            const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsed.data.name,
          email: parsed.data.email,
          password: parsed.data.password,
        }),
      });

      if (res.status === 409) {
        setBanner("An account with this email already exists. Try logging in instead.");
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setBanner(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      // WHY auto sign-in: friction kills conversion. The register endpoint
      // already created the bcrypt hash, so we can authenticate with the same
      // credentials immediately.
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setBanner("Account created, but we couldn't sign you in automatically. Try logging in manually.");
        setSubmitting(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setBanner("Could not reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {banner ? <AuthBanner message={banner} linkHref="/login" linkLabel="Log in instead" /> : null}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Alex Johnson"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => validateField("name")}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
          className={fieldErrors.name ? "border-destructive focus-visible:ring-destructive" : undefined}
        />
        {fieldErrors.name ? (
          <p id="name-error" className="text-sm text-destructive">{fieldErrors.name}</p>
        ) : null}
      </div>

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
          className={fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : undefined}
        />
        {fieldErrors.email ? (
          <p id="email-error" className="text-sm text-destructive">{fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onBlur={() => validateField("password")}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
          className={fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : undefined}
        />
        {fieldErrors.password ? (
          <p id="password-error" className="text-sm text-destructive">{fieldErrors.password}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Re-type your password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          onBlur={() => validateField("confirmPassword")}
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
          aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
          className={fieldErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : undefined}
        />
        {fieldErrors.confirmPassword ? (
          <p id="confirmPassword-error" className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Signing you up…" : "Create account"}
      </Button>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>or continue with</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton callbackUrl="/dashboard" />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
          Log in
        </Link>
      </p>
    </form>
  );
}

