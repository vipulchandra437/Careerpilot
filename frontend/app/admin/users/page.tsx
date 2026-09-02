"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  Loader2,
  AlertTriangle,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { getAccessToken, clearTokens } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface AdminUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  credit_balance: number;
  github_connected: boolean;
  created_at: string;
}

interface FeatureUsage {
  feature: string;
  calls: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
}

interface UserUsage {
  user_id: string;
  feature_usage: FeatureUsage[];
  total_calls: number;
  total_tokens_in: number;
  total_tokens_out: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, UserUsage>>({});

  const handleUnauthorized = (res: Response) => {
    if (res.status === 401) {
      clearTokens();
      router.push("/login?reason=expired");
      return true;
    }
    return false;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      if (handleUnauthorized(res)) return;
      if (res.status === 403) {
        setError("Admin access required.");
        router.push("/dashboard");
        return;
      }
      if (res.ok) {
        setUsers(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to load users");
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

  const toggleActive = async (u: AdminUser) => {
    setBusyId(u.id);
    setError("");
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${getAccessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.is_active }),
    }).catch(() => null);
    setBusyId(null);
    if (!res) {
      setError("Network error");
      return;
    }
    if (handleUnauthorized(res)) return;
    if (res.status === 403) {
      setError("Admin access required.");
      router.push("/dashboard");
      return;
    }
    if (res.ok) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: !u.is_active } : x)));
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.detail || "Could not update account");
    }
  };

  const toggleUsage = async (u: AdminUser) => {
    if (expanded[u.id]) {
      setExpanded((prev) => {
        const next = { ...prev };
        delete next[u.id];
        return next;
      });
      return;
    }
    setError("");
    const res = await fetch(`/api/admin/users/${u.id}/usage`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    }).catch(() => null);
    if (!res) {
      setError("Network error");
      return;
    }
    if (handleUnauthorized(res)) return;
    if (res.status === 403) {
      setError("Admin access required.");
      router.push("/dashboard");
      return;
    }
    if (res.ok) {
      const data: UserUsage = await res.json();
      setExpanded((prev) => ({ ...prev, [u.id]: data }));
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.detail || "Could not load usage");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-slate-400">
          Manage accounts. Disabled users cannot log in (enforced server-side).
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-red-400" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>Loading users…</p>
        </div>
      ) : users.length === 0 ? (
        <div className="card py-16 text-center text-slate-400">
          No users yet.
        </div>
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">GitHub</th>
                <th className="px-4 py-3">Credits</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => {
                const usage = expanded[u.id];
                return (
                  <Fragment key={u.id}>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleUsage(u)}
                          className="inline-flex items-center gap-1 font-medium hover:text-brand-300"
                        >
                          {usage ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                          {u.email}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{u.role}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                            u.is_active
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
                              : "bg-red-500/15 text-red-300 border-red-500/20"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${u.is_active ? "bg-emerald-400" : "bg-red-400"}`}
                          />
                          {u.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {u.github_connected ? "Connected" : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{u.credit_balance}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.role !== "admin" ? (
                          <button
                            onClick={() => toggleActive(u)}
                            disabled={busyId === u.id}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                              u.is_active
                                ? "border border-red-500/20 text-red-300 hover:bg-red-500/10"
                                : "border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/10"
                            }`}
                          >
                            {busyId === u.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : u.is_active ? (
                              <UserX className="h-3.5 w-3.5" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                            {u.is_active ? "Disable" : "Enable"}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                    {usage && (
                      <tr className="bg-black/20">
                        <td colSpan={7} className="px-4 py-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Usage · {usage.total_calls} calls · {usage.total_tokens_in.toLocaleString()} in /{" "}
                            {usage.total_tokens_out.toLocaleString()} out
                          </p>
                          {usage.feature_usage.length === 0 ? (
                            <p className="text-sm text-slate-500">No LLM usage recorded.</p>
                          ) : (
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="text-slate-500">
                                  <th className="py-1 pr-4">Feature</th>
                                  <th className="py-1 pr-4">Calls</th>
                                  <th className="py-1 pr-4">Tokens in</th>
                                  <th className="py-1 pr-4">Tokens out</th>
                                </tr>
                              </thead>
                              <tbody>
                                {usage.feature_usage.map((f) => (
                                  <tr key={f.feature}>
                                    <td className="py-0.5 pr-4 text-slate-300">{f.feature}</td>
                                    <td className="py-0.5 pr-4 text-slate-400">{f.calls}</td>
                                    <td className="py-0.5 pr-4 text-slate-400">{f.tokens_in.toLocaleString()}</td>
                                    <td className="py-0.5 pr-4 text-slate-400">{f.tokens_out.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
