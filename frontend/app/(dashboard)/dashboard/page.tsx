"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareText, ArrowRight } from "lucide-react";

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
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="border rounded-lg p-6 text-center text-gray-500 mb-6">
        <p>Complete onboarding to see your profile and roadmap.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          onClick={() => router.push("/mock-interview")}
          className="group rounded-xl border border-white/10 bg-white/[0.04] p-5 text-left transition-transform hover:-translate-y-0.5"
        >
          <MessageSquareText className="mb-3 h-6 w-6 text-blue-400" />
          <p className="font-semibold text-white">Mock Interview</p>
          <p className="mt-1 text-sm text-slate-400">
            Practice a technical or behavioral round.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm text-blue-300">
            Start <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      </div>
    </main>
  );
}