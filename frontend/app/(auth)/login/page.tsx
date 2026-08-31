"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { decodeToken } from "@/lib/auth";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(reason === "expired" ? "Your session expired. Please log in again." : "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setError("Invalid email or password");
        return;
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      // Route admins to the console, everyone else to the student dashboard.
      const payload = decodeToken<{ role?: string }>(data.access_token);
      router.push(payload?.role === "admin" ? "/admin" : "/dashboard");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0e17] px-4 py-10">
      {/* Animated gradient mesh backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
      >
        <div className="absolute -top-1/2 -left-1/2 h-[150%] w-[150%] animate-float-slow rounded-full bg-gradient-to-tr from-blue-600/15 via-transparent to-indigo-600/15 blur-[200px]" />
        <div className="absolute -bottom-1/2 -right-1/2 h-[150%] w-[150%] animate-float-slower rounded-full bg-gradient-to-bl from-indigo-600/15 via-transparent to-purple-600/15 blur-[200px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Glassmorphism card */}
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl shadow-black/50">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Welcome Back
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Sign in to continue to Career Platform
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-300 backdrop-blur">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email field */}
            <div>
              <label htmlFor="email" className="block mb-1.5 text-sm font-medium text-slate-200">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-10 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
                  disabled={loading}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block mb-1.5 text-sm font-medium text-slate-200">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-10 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
                  disabled={loading}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-blue-400 underline-offset-2 transition-colors hover:text-blue-300 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/50 hover:brightness-110 active:translate-y-0 active:scale-[0.98] active:shadow-md disabled:pointer-events-none disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight
                    aria-hidden="true"
                    className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  />
                </>
              )}
            </button>

            {/* Register link */}
            <p className="text-center text-sm text-slate-400">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-blue-400 underline-offset-2 transition-colors hover:text-blue-300 hover:underline"
              >
                Register
              </Link>
            </p>
          </form>
        </div>
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="relative flex min-h-screen items-center justify-center bg-[#0a0e17] px-4 py-10">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          <p>Loading...</p>
        </div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}