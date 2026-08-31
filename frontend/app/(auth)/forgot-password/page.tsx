"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0e17] px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
      >
        <div className="absolute -top-1/2 -left-1/2 h-[150%] w-[150%] animate-float-slow rounded-full bg-gradient-to-tr from-blue-600/15 via-transparent to-indigo-600/15 blur-[200px]" />
        <div className="absolute -bottom-1/2 -right-1/2 h-[150%] w-[150%] animate-float-slower rounded-full bg-gradient-to-bl from-indigo-600/15 via-transparent to-purple-600/15 blur-[200px]" />
      </div>

      <div className="relative w-full max-w-md">
        <style>{` 
          .animate-float-slow { animation: floatSlow 14s ease-in-out infinite; }
          .animate-float-slower { animation: floatSlower 18s ease-in-out infinite; }

          @keyframes floatSlow {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(40px, -30px) scale(1.05); }
          }

          @keyframes floatSlower {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-30px, 40px) scale(1.1); }
          }

          @media (prefers-reduced-motion: reduce) {
            .animate-float-slow, .animate-float-slower { animation: none; }
          }
        `}</style>
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl shadow-black/50">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Reset Password
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Enter your email to receive a reset link
            </p>
          </div>

          {submitted ? (
            <>
              <p className="text-sm text-slate-300 text-center">
                If an account exists for <span className="font-medium">{email}</span>, a password
                reset link will be sent there.
              </p>
              <Link
                href="/login"
                className="mt-6 block rounded-xl text-center text-sm font-medium text-blue-300 hover:text-blue-200 hover:underline"
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <p className="mb-6 text-sm text-slate-400 text-center">
                Password reset emails are coming in a later phase.
              </p>
              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email) setSubmitted(true);
                }}
              >
                <div>
                  <label htmlFor="email" className="block mb-1.5 text-sm font-medium text-slate-200">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-10 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:brightness-110"
                >
                  Send reset link
                </button>
              </form>
              <Link
                href="/login"
                className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}