"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, AlertTriangle, Users, Activity, DollarSign, FileText } from "lucide-react";
import { getAccessToken, clearTokens } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface SignupPoint {
  period: string;
  count: number;
}

interface FeatureUsage {
  feature: string;
  calls: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
}

interface UsageSummary {
  total_users: number;
  total_signups_30d: number;
  total_feature_calls: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: number;
  signups_over_time: SignupPoint[];
  feature_usage: FeatureUsage[];
}

const cardClass = "rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl";

export default function AdminUsagePage() {
  const router = useRouter();
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/usage", {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      if (res.status === 401) {
        clearTokens();
        router.push("/login?reason=expired");
        return;
      }
      if (res.status === 403) {
        setError("Admin access required.");
        router.push("/dashboard");
        return;
      }
      if (res.ok) {
        setData(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to load usage");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxSignups = Math.max(1, ...(data?.signups_over_time.map((p) => p.count) ?? [1]));
  const maxFeatureCalls = Math.max(1, ...(data?.feature_usage.map((f) => f.calls) ?? [1]));

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-16 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p>Loading usage…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Usage Dashboard</h1>
        <p className="text-sm text-slate-400">
          Platform activity and LLM usage across all features.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-red-400" />
          <p>{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* KPI cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={cardClass}>
              <Users className="mb-2 h-5 w-5 text-blue-400" />
              <p className="text-xs text-slate-400">Total users</p>
              <p className="text-2xl font-bold">{data.total_users}</p>
            </div>
            <div className={cardClass}>
              <FileText className="mb-2 h-5 w-5 text-emerald-400" />
              <p className="text-xs text-slate-400">Signups (30d)</p>
              <p className="text-2xl font-bold">{data.total_signups_30d}</p>
            </div>
            <div className={cardClass}>
              <Activity className="mb-2 h-5 w-5 text-indigo-400" />
              <p className="text-xs text-slate-400">LLM calls</p>
              <p className="text-2xl font-bold">{data.total_feature_calls.toLocaleString()}</p>
            </div>
            <div className={cardClass}>
              <DollarSign className="mb-2 h-5 w-5 text-yellow-400" />
              <p className="text-xs text-slate-400">LLM cost</p>
              <p className="text-2xl font-bold">${data.total_cost_usd.toFixed(4)}</p>
            </div>
          </div>

          {/* Signups over time (bar chart) */}
          <div className={`${cardClass} mb-6`}>
            <h2 className="mb-4 text-base font-semibold">Signups over time</h2>
            {data.signups_over_time.length === 0 ? (
              <p className="text-sm text-slate-500">No signups recorded yet.</p>
            ) : (
              <div className="flex items-end gap-2" style={{ height: 160 }} role="img" aria-label="Bar chart of signups by month">
                {data.signups_over_time.map((p) => (
                  <div key={p.period} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-400">{p.count}</span>
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-indigo-500"
                      style={{ height: `${Math.max(4, (p.count / maxSignups) * 110)}px` }}
                    />
                    <span className="text-[10px] text-slate-500">{p.period}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feature usage + LLM cost */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className={cardClass}>
              <h2 className="mb-4 text-base font-semibold">Feature usage</h2>
              {data.feature_usage.length === 0 ? (
                <p className="text-sm text-slate-500">No LLM usage recorded yet.</p>
              ) : (
                <div className="space-y-3" role="img" aria-label="Bar chart of LLM calls per feature">
                  {data.feature_usage.map((f) => (
                    <div key={f.feature}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="capitalize text-slate-200">{f.feature}</span>
                        <span className="text-slate-500">
                          {f.calls} calls · {f.tokens_in.toLocaleString()} in / {f.tokens_out.toLocaleString()} out
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-400"
                          style={{ width: `${(f.calls / maxFeatureCalls) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={cardClass}>
              <h2 className="mb-1 text-base font-semibold">LLM cost per feature</h2>
              <p className="mb-4 text-xs text-slate-500">
                Cost metering is not wired yet (orchestrator records $0 cost — Phase 6); showing live
                call/token counts instead of fabricated dollars.
              </p>
              {data.feature_usage.length === 0 ? (
                <p className="text-sm text-slate-500">No usage recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2">Feature</th>
                      <th className="py-2 text-right">Calls</th>
                      <th className="py-2 text-right">Tokens in</th>
                      <th className="py-2 text-right">Tokens out</th>
                      <th className="py-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.feature_usage.map((f) => (
                      <tr key={f.feature}>
                        <td className="py-2 capitalize text-slate-200">{f.feature}</td>
                        <td className="py-2 text-right text-slate-400">{f.calls}</td>
                        <td className="py-2 text-right text-slate-400">{f.tokens_in.toLocaleString()}</td>
                        <td className="py-2 text-right text-slate-400">{f.tokens_out.toLocaleString()}</td>
                        <td className="py-2 text-right text-slate-400">${f.cost_usd.toFixed(4)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-white/10 font-medium">
                      <td className="py-2 text-slate-200">Total</td>
                      <td className="py-2 text-right text-slate-200">
                        {data.feature_usage.reduce((s, f) => s + f.calls, 0)}
                      </td>
                      <td className="py-2 text-right text-slate-200">
                        {data.feature_usage.reduce((s, f) => s + f.tokens_in, 0).toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-slate-200">
                        {data.feature_usage.reduce((s, f) => s + f.tokens_out, 0).toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-slate-200">
                        ${data.feature_usage.reduce((s, f) => s + f.cost_usd, 0).toFixed(4)}
                      </td>
                    </tr>
                  </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
