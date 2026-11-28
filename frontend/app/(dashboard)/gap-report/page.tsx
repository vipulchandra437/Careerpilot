"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { redirectExpired } from "@/lib/auth";
import {
  ChevronLeft,
  AlertTriangle,
  Loader2,
  Target,
  Brain,
  BookOpen,
  ExternalLink,
  GitBranch,
  Database,
  Globe,
  Code,
  Zap,
  Shield,
  Sparkles,
} from "lucide-react";

interface Gap {
  skill: string;
  severity: "critical" | "important" | "nice_to_have" | "none";
  reason: string;
  suggested_resource: string;
  matched: boolean;
}

interface GapReport {
  id: string;
  snapshot_id: string;
  target_role_id: string;
  target_role_name: string;
  gaps: Gap[];
  created_at: string;
}

interface TargetRole {
  id: string;
  name: string;
}

const cardClass =
  "card p-6 transition-colors";

const cardTitleClass = "text-lg font-semibold text-ink mb-1 flex items-center gap-2";

const mutedText = "text-sm text-muted";

const pillBase = "px-2 py-1 text-xs rounded-full font-medium";

const pillColors: Record<string, string> = {
  critical: "bg-red-500/15 text-red-700 border border-red-500/20",
  important: "bg-yellow-500/15 text-yellow-800 border border-yellow-200",
  nice_to_have: "bg-brand-50 text-brand-700 border border-brand-200",
  none: "bg-emerald-500/15 text-emerald-700 border border-emerald-500/20",
  blue: "bg-brand-50 text-brand-700 border border-brand-200",
};

const primaryBtn =
  "btn-primary focus-ring !px-4 !py-2 !text-sm disabled:opacity-50";

const darkBtn =
  "inline-flex items-center gap-2 rounded-xl border border-line bg-soft px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-soft hover:text-ink";

const linkClass = "text-sm text-brand-700 hover:text-brand-700 transition-colors underline-offset-2 hover:underline";

const severityIcons: Record<string, React.ReactNode> = {
  critical: <Zap className="h-4 w-4 text-red-700" />,
  important: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  nice_to_have: <Sparkles className="h-4 w-4 text-brand-600" />,
  none: <Shield className="h-4 w-4 text-emerald-700" />,
};

const resourceIcons: Record<string, React.ReactNode> = {
  challenge: <Code className="h-4 w-4" />,
  interview: <Brain className="h-4 w-4" />,
  resource: <BookOpen className="h-4 w-4" />,
};

function GapReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [gapReport, setGapReport] = useState<GapReport | null>(null);
  const [targetRoles, setTargetRoles] = useState<TargetRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fetchedRoleRef = useRef("");
  const requestRef = useRef(0);

  const fetchTargetRoles = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/gap/roles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        redirectExpired((path) => router.push(path));
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const roles = Array.isArray(data) ? data : data.roles || [];
        setTargetRoles(roles);
        // No roles means no dependent fetch will run to clear the spinner.
        if (roles.length === 0) setLoading(false);
      } else {
        setError("Failed to load target roles");
        setLoading(false);
      }
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }, [router]);

  const fetchGapReport = useCallback(async (roleId: string) => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    // Never show another role's gaps while this role is loading or failed.
    setSelectedRoleId(roleId);
    setGapReport(null);
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/gap/report?target_role_id=${encodeURIComponent(roleId)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!isCurrent()) return;
      if (res.status === 401) {
        redirectExpired((path) => router.push(path));
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (!isCurrent()) return;
        setGapReport(data);
        setSelectedRoleId(roleId);
      } else {
        const err = await res.json().catch(() => ({}));
        if (isCurrent()) setError(err.detail || "Failed to load gap report");
      }
    } catch {
      if (isCurrent()) setError("Network error");
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [router]);

  const analyzeGap = useCallback(async (roleId: string) => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    setSelectedRoleId(roleId);
    setAnalyzing(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/gap/analyze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target_role_id: roleId }),
      });
      if (!isCurrent()) return;
      if (res.status === 401) {
        redirectExpired((path) => router.push(path));
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (!isCurrent()) return;
        setGapReport(data);
        setSelectedRoleId(roleId);
      } else {
        const err = await res.json();
        if (isCurrent()) setError(err.detail || "Analysis failed");
      }
    } catch {
      if (isCurrent()) setError("Network error");
    } finally {
      if (isCurrent()) setAnalyzing(false);
    }
  }, [router]);

  const uploadResume = useCallback(async (file: File) => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    setUploading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/profile/resume", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      if (!isCurrent()) return;
      if (res.status === 401) {
        redirectExpired((path) => router.push(path));
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (isCurrent()) setError(err.detail || "Resume upload failed");
        return;
      }
      setUploading(false);
      await analyzeGap(selectedRoleId);
    } catch {
      if (isCurrent()) setError("Network error");
    } finally {
      if (isCurrent()) setUploading(false);
    }
  }, [router, selectedRoleId, analyzeGap]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchTargetRoles();
  }, [router, fetchTargetRoles]);

  useEffect(() => {
    // Roles resolve after the deep link; fetch once for the winning role only.
    const roleId = searchParams.get("role") || (targetRoles.length > 0 ? targetRoles[0].id : "");
    if (!roleId || fetchedRoleRef.current === roleId) return;
    fetchedRoleRef.current = roleId;
    fetchGapReport(roleId);
  }, [searchParams, targetRoles, fetchGapReport]);

  if (loading && !gapReport) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-canvas p-8">
        <div className="flex items-center gap-3 text-muted">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas text-ink">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-[24rem] w-[24rem] rounded-full bg-brand-100/60 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-[24rem] w-[24rem] rounded-full bg-indigo-100/60 blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-5xl p-6 sm:p-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 text-muted hover:text-ink hover:bg-soft transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">Skill Gap Report</h1>
              <p className={mutedText}>Analyze gaps for your target role</p>
            </div>
          </div>
          <select
            value={selectedRoleId}
            onChange={(e) => {
              const roleId = e.target.value;
              fetchedRoleRef.current = roleId;
              window.history.replaceState({}, "", `/gap-report?role=${roleId}`);
              fetchGapReport(roleId);
            }}
            className="input focus-ring max-w-full"
          >
            {targetRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 backdrop-blur">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 text-red-700" />
            <p>{error}</p>
          </div>
        )}

        {gapReport ? (
          <>
            <div className={`${cardClass} mb-6`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={cardTitleClass}>
                  <Target aria-hidden="true" className="h-5 w-5 text-brand-600" />
                  Target: {gapReport.target_role_name}
                </h2>
                <button
                  onClick={() => analyzeGap(gapReport.target_role_id)}
                  disabled={analyzing}
                  className={primaryBtn}
                >
                  {analyzing ? (
                    <>
                      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                      Re-analyzing...
                    </>
                  ) : (
                    <>
                      <Brain aria-hidden="true" className="h-4 w-4" />
                      Re-analyze
                    </>
                  )}
                </button>
              </div>
              <p className={mutedText}>
                Based on your merged profile (resume + GitHub + LinkedIn).{" "}
                {gapReport.gaps.filter((g) => g.matched).length} skills present but shallow,{" "}
                {gapReport.gaps.filter((g) => !g.matched).length} skills missing.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {gapReport.gaps.map((gap) => (
                <div
                  key={gap.skill}
                  className={`relative ${cardClass} overflow-hidden ${
                    gap.severity === "critical"
                      ? "border-red-200 shadow-lg shadow-red-500/10"
                      : gap.severity === "important"
                      ? "border-yellow-500/30 shadow-lg shadow-yellow-500/10"
                      : ""
                  }`}
                >
                  <div className="absolute top-0 right-0 m-3">
                    <span className={`${pillBase} ${pillColors[gap.severity]}`}>
                      {gap.severity}
                    </span>
                  </div>

                  <div className="mb-3 flex items-center gap-2">
                    {severityIcons[gap.severity]}
                    <h3 className="text-base font-semibold text-ink capitalize">
                      {gap.skill}
                    </h3>
                    {gap.matched && (
                      <span className={`${pillBase} ${pillColors.blue}`}>Present</span>
                    )}
                  </div>

                  <p className="text-sm text-muted mb-4">{gap.reason}</p>

                  {gap.suggested_resource && (
                    <a
                      href={gap.suggested_resource}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 ${linkClass}`}
                    >
                      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                      <span>View resource</span>
                    </a>
                  )}
                </div>
              ))}
            </div>

            {gapReport.gaps.length === 0 && (
              <div className={`${cardClass} text-center py-12`}>
                <Brain className="h-12 w-12 text-emerald-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No gaps found!</h3>
                <p className={mutedText}>
                  Your profile covers all required skills for this role.
                </p>
              </div>
            )}

            <div className="mt-8 text-center">
              <button
                onClick={() => router.push(`/roadmap?role=${selectedRoleId}`)}
                className={primaryBtn}
              >
                <Target className="h-4 w-4" />
                Generate Roadmap
              </button>
              <p className={mutedText + " mt-2"}>
                Get a personalized learning plan with milestones and resources
              </p>
            </div>
          </>
        ) : (
          <div className={`${cardClass} text-center py-12`}>
            <Target className="h-12 w-12 text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No gap report yet</h3>
            <p className={mutedText + " mb-4"}>
              Select a target role and run an analysis to see your skill gaps.
            </p>
            {error.toLowerCase().includes("no profile snapshot") ? (
              <>
                <label className={`${primaryBtn} cursor-pointer`}>
                  {uploading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                  {uploading ? "Uploading..." : "Upload resume"}
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadResume(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className={mutedText + " mt-3"}>
                  Or <a href="/profile" className={linkClass}>connect GitHub on your profile</a> to build a snapshot.
                </p>
              </>
            ) : (
              <button
                onClick={() => selectedRoleId && analyzeGap(selectedRoleId)}
                className={primaryBtn}
              >
                <Brain className="h-4 w-4" />
                Run Analysis
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function GapReportPage() {
  return (
    <Suspense fallback={
      <main className="relative flex min-h-screen items-center justify-center bg-canvas p-8">
        <div className="flex items-center gap-3 text-muted">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          <p>Loading...</p>
        </div>
      </main>
    }>
      <GapReportContent />
    </Suspense>
  );
}