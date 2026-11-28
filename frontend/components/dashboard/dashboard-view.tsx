"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDashboardData } from "@/app/actions/dashboard";
import { redirectExpired } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import type { DashboardData } from "@/lib/dashboard";
import { ReadinessCard } from "./readiness-card";
import { StatusDonut } from "./status-donut";
import { WeeklyPractice } from "./weekly-practice";
import { FeatureGrid } from "./feature-grid";
import { NextStepPanel } from "./next-step-panel";

export function DashboardView() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    let active = true;
    void (async () => {
      try {
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const result = await getDashboardData(token, zone);
        if (!active) return;
        if (!result.ok) {
          if (result.reason === "auth") redirectExpired((path) => router.replace(path));
          else setError(true);
          return;
        }
        setData(result.data);
      } catch {
        if (active) setError(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-6 text-center text-muted">
        <div>
          <p>We couldn&apos;t load your dashboard just now.</p>
          <button onClick={() => window.location.reload()} className="btn-primary focus-ring mt-4">
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas text-muted">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand-500 motion-reduce:animate-none" />
          <p>Getting your dashboard ready…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">CareerPilot</p>
        <PageHeader
          title="Welcome back 👋"
          subtitle="Here is where you stand and the one thing to do next."
        />

        <div className="grid gap-4 md:grid-cols-3">
          <ReadinessCard
            score={data.readiness}
            resumeScore={data.resumeScore}
            interviewScore={data.interviewScore}
          />
          <StatusDonut features={data.features} />
          <WeeklyPractice days={data.weeklyPractice} />
        </div>

        <h2 className="mb-4 mt-8 text-lg font-semibold text-ink">Your features</h2>
        <FeatureGrid features={data.features} />

        <div className="mt-8">
          <NextStepPanel features={data.features} />
        </div>
      </div>
    </main>
  );
}
