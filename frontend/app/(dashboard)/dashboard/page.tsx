"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquareText,
  ArrowRight,
  Map,
  Code2,
  User,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-brand-400" />
          <p>Loading your workspace…</p>
        </div>
      </main>
    );
  }

  const modules = [
    {
      title: "Profile",
      desc: "Connect resume, GitHub & LinkedIn to build your snapshot.",
      href: "/profile",
      icon: User,
    },
    {
      title: "Skill Gap Analysis",
      desc: "See exactly what's missing against your target role.",
      href: "/gap-report",
      icon: Sparkles,
    },
    {
      title: "Roadmap",
      desc: "Your personalized, AI-built path to close the gaps.",
      href: "/roadmap",
      icon: Map,
    },
    {
      title: "Practice Coding",
      desc: "Solve challenges with an AI judge giving live feedback.",
      href: "/practice",
      icon: Code2,
    },
    {
      title: "Mock Interview",
      desc: "Run a technical or behavioral interview round.",
      href: "/mock-interview",
      icon: MessageSquareText,
    },
  ];

  return (
    <main className="min-h-screen bg-surface p-6 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Welcome back 👋"
          subtitle="Continue your path to hire. Everything below is ready when you are."
        />

        {/* Hero CTA */}
        <section className="card relative mb-8 overflow-hidden p-7 sm:p-8">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-brand"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl"
          />
          <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-200">
                <Sparkles className="h-3.5 w-3.5" />
                Start here
              </p>
              <h2 className="mt-4 text-xl font-bold tracking-tight text-white sm:text-2xl">
                Build your profile to unlock AI insights
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-400">
                Upload your resume and connect your sources so we can analyze your
                skill gaps and generate your personalized roadmap.
              </p>
            </div>
            <button
              onClick={() => router.push("/profile")}
              className="btn-primary focus-ring shrink-0"
            >
              Set up profile
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Module grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, i) => {
            const Icon = m.icon;
            return (
              <button
                key={m.href}
                onClick={() => router.push(m.href)}
                className="card card-hover focus-ring group animate-fade-up flex flex-col p-5 text-left"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-300 transition-colors group-hover:bg-brand-500/20">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-semibold text-white">{m.title}</p>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-400">{m.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-300 opacity-0 transition-all group-hover:opacity-100">
                  Open <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}