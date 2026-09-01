"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, UserPlus } from "lucide-react";

const PASSWORD_MIN_LENGTH = 8;

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function validateEmail(value: string): string {
    if (!value) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address";
    return "";
  }

  function validatePassword(value: string): string {
    if (!value) return "Password is required";
    if (value.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    return "";
  }

  function validateConfirm(value: string): string {
    if (!value) return "Please confirm your password";
    if (value !== password) return "Passwords do not match";
    return "";
  }

  function handleBlur(field: string) {
    const errors: Record<string, string> = { ...fieldErrors };
    if (field === "email") {
      const err = validateEmail(email);
      if (err) errors.email = err; else delete errors.email;
    } else if (field === "password") {
      const err = validatePassword(password);
      if (err) errors.password = err; else delete errors.password;
      if (confirmPassword) {
        const cErr = validateConfirm(confirmPassword);
        if (cErr) errors.confirmPassword = cErr; else delete errors.confirmPassword;
      }
    } else if (field === "confirmPassword") {
      const err = validateConfirm(confirmPassword);
      if (err) errors.confirmPassword = err; else delete errors.confirmPassword;
    }
    setFieldErrors(errors);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    const confirmErr = validateConfirm(confirmPassword);
    const errors: Record<string, string> = {};
    if (emailErr) errors.email = emailErr;
    if (passErr) errors.password = passErr;
    if (confirmErr) errors.confirmPassword = confirmErr;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          setError(`An account with this email already exists — sign in instead`);
        } else {
          setError(data.detail || "Signup failed. Please try again.");
        }
        return;
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      router.push("/dashboard");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "input focus-ring hover:border-white/20 !bg-white/5 !py-3 !pl-11 !pr-11 disabled:pointer-events-none";

  const labelClass = "block text-sm font-medium text-slate-300";

  const iconClass =
    "pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-400";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0e17] px-4 py-10">
      {/* Animated gradient mesh backdrop */}
<div
              aria-hidden="true"
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow-indigo"
            >
        <div className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-blue-600/30 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-indigo-600/25 blur-3xl animate-float-slower" />
        <div className="absolute top-1/3 left-1/2 h-[20rem] w-[20rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl animate-float-slow" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e17] via-[#0d1524] to-[#0a0e17]" />
        {/* subtle grid for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(59,130,246,0.12)_1px,transparent_0)] [background-size:32px_32px]" />
      </div>

      {/* Glass card */}
      <div className="relative w-full max-w-md">
        {/* layered 3D elevation */}
        <div
          aria-hidden="true"
          className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-brand-500/40 via-indigo-500/30 to-cyan-500/30 blur-2xl opacity-70"
        />
        <form
          onSubmit={handleSubmit}
          className="relative space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-10"
        >
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-600/40">
              <UserPlus aria-hidden="true" className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Create account
            </h1>
            <p className="text-sm text-slate-400">
              Join Career Platform and start your journey
            </p>
          </div>

          {/* Error banner (styled, still readable) */}
          {error && (
            <div
              role="alert"
              className="alert alert-error animate-fade-in"
            >
              <span aria-hidden="true" className="mt-0.5">!</span>
              <span>
                {error}
                {error.includes("already exists") && (
                  <Link href="/login" className="block mt-1 font-semibold underline underline-offset-2">
                    Sign in here
                  </Link>
                )}
              </span>
            </div>
          )}

          {/* Email field */}
          <div className="space-y-2">
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <div className="group relative">
              <Mail aria-hidden="true" className={iconClass} />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur("email")}
                className={inputClass}
              />
            </div>
            {fieldErrors.email && (
              <p role="alert" className="text-xs text-red-400">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <div className="group relative">
              <Lock aria-hidden="true" className={iconClass} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur("password")}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-200"
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="h-5 w-5" />
                ) : (
                  <Eye aria-hidden="true" className="h-5 w-5" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p role="alert" className="text-xs text-red-400">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Confirm password field */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className={labelClass}>
              Confirm Password
            </label>
            <div className="group relative">
              <Lock aria-hidden="true" className={iconClass} />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => handleBlur("confirmPassword")}
                className={inputClass}
              />
            </div>
            {fieldErrors.confirmPassword && (
              <p role="alert" className="text-xs text-red-400">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary focus-ring w-full !py-3 disabled:pointer-events-none disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight
                  aria-hidden="true"
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                />
              </>
            )}
          </button>

          {/* Login link */}
          <p className="text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-400 underline-offset-2 transition-colors hover:text-blue-300 hover:underline"
            >
              Sign in
            </Link>
          </p>

          {/* Legal links */}
          <p className="border-t border-white/10 pt-5 text-center text-xs text-slate-500">
            By creating an account you agree to our{" "}
            <Link
              href="/terms"
              className="font-semibold text-slate-300 underline-offset-2 transition-colors hover:text-white hover:underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-semibold text-slate-300 underline-offset-2 transition-colors hover:text-white hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      </div>

      <style jsx>{`
        @keyframes floatSlow {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -20px); }
        }
        @keyframes floatSlower {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-25px, 15px); }
        }
        .animate-float-slow { animation: floatSlow 14s ease-in-out infinite; }
        .animate-float-slower { animation: floatSlower 18s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .animate-float-slow, .animate-float-slower { animation: none; }
        }
      `}</style>
    </main>
  );
}
