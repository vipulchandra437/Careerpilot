"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared shell for public legal/documentation pages (Privacy, Terms).
 * Keeps a consistent dark-glass look with the auth pages and centers the prose.
 * `"use client"` because the `<style jsx>` block (styled-jsx) is client-only —
 * Next forbids importing styled-jsx from a Server Component and the build fails
 * without this directive.
 */
export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0e17] px-4 py-12">
      {/* Animated gradient mesh backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-blue-600/30 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-indigo-600/25 blur-3xl animate-float-slower" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e17] via-[#0d1524] to-[#0a0e17]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(59,130,246,0.12)_1px,transparent_0)] [background-size:32px_32px]" />
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold text-blue-400 transition-colors hover:text-blue-300 hover:underline"
          >
            ← Back to home
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-12">
          <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm text-slate-400">Last updated: {updated}</p>
          <div className="prose-invert mt-8 space-y-6 leading-relaxed text-slate-300">
            {children}
          </div>
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
