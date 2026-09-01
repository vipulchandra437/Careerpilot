"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  AlertTriangle,
  Loader2,
  Target,
  CheckCircle2,
  Clock,
  ExternalLink,
  PlayCircle,
  Flag,
  ArrowRight,
  Zap,
  Brain,
  BookOpen,
  Code,
  Layers,
  RefreshCw,
} from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  linked_gap_skill: string;
  status: "not_started" | "in_progress" | "done";
  linked_action_type: "challenge" | "interview" | "resource";
  linked_action_id: string;
  order_index: number;
  estimated_hours: number | null;
  created_at: string;
}

interface Roadmap {
  id: string;
  user_id: string;
  gap_report_id: string;
  version: string;
  created_at: string;
  milestones: Milestone[];
}

interface GapReport {
  id: string;
  target_role_id: string;
  target_role_name: string;
  gaps: Array<{
    skill: string;
    severity: string;
  }>;
}

const cardClass =
  "rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition-colors";

const cardTitleClass = "text-lg font-semibold text-white mb-1 flex items-center gap-2";

const mutedText = "text-sm text-slate-400";

const pillBase = "px-2 py-1 text-xs rounded-full font-medium";

const pillColors: Record<string, string> = {
  critical: "bg-red-500/15 text-red-300 border border-red-500/20",
  important: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/20",
  nice_to_have: "bg-blue-500/15 text-blue-300 border border-blue-500/20",
  none: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  gray: "bg-slate-500/15 text-slate-300 border border-slate-500/20",
};

const primaryBtn =
  "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/40 hover:brightness-110 disabled:pointer-events-none disabled:opacity-50";

const darkBtn =
  "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white";

const linkClass = "text-sm text-blue-400 hover:text-blue-300 transition-colors underline-offset-2 hover:underline";

const statusColors: Record<string, string> = {
  done: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  in_progress: "bg-blue-500/15 text-blue-300 border border-blue-500/20",
  not_started: "bg-slate-500/15 text-slate-300 border border-slate-500/20",
};

const actionIcons: Record<string, React.ReactNode> = {
  challenge: <Code className="h-4 w-4" />,
  interview: <Brain className="h-4 w-4" />,
  resource: <BookOpen className="h-4 w-4" />,
};

const severityColors: Record<string, string> = {
  critical: "text-red-400",
  important: "text-yellow-400",
  nice_to_have: "text-blue-400",
  none: "text-emerald-400",
};

function RoadmapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [gapReport, setGapReport] = useState<GapReport | null>(null);
  const [targetRoles, setTargetRoles] = useState<Array<{id: string; name: string}>>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Backend GET /api/roadmap/{id} returns {roadmap: {...}, milestones: [...]}.
  // Normalize to the frontend's Roadmap shape (milestones merged onto roadmap).
  const normalizeRoadmap = (data: any): Roadmap => {
    const base = data.roadmap && data.milestones ? data.roadmap : data;
    const milestones = data.milestones || data.roadmap?.milestones || [];
    return { ...base, milestones };
  };

  const fetchTargetRoles = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/gap/roles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTargetRoles(Array.isArray(data) ? data : data.roles || []);
      }
    } catch {
      // Ignore
    }
  }, []);

  const fetchRoadmap = useCallback(async (roleId: string) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      
      // First get the gap report to find its ID
      const gapRes = await fetch(`/api/gap/report?target_role_id=${encodeURIComponent(roleId)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (gapRes.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login?reason=expired");
        return;
      }
      
      if (gapRes.ok) {
        const gapData = await gapRes.json();
        setGapReport({
          id: gapData.id,
          target_role_id: gapData.target_role_id,
          target_role_name: gapData.target_role_name || "Unknown",
          gaps: gapData.gaps || [],
        });
        
        // Then get the roadmap
        const roadmapRes = await fetch(`/api/roadmap/${gapData.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (roadmapRes.ok) {
          const roadmapData = await roadmapRes.json();
          setRoadmap(normalizeRoadmap(roadmapData));
        } else if (roadmapRes.status === 404) {
          // No roadmap yet - will show generate button
          setRoadmap(null);
        }
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const generateRoadmap = useCallback(async (roleId: string) => {
    if (!gapReport) return;
    setGenerating(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/roadmap/${gapReport.id}/regenerate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login?reason=expired");
        return;
      }
      
      if (res.ok) {
        // Poll for completion
        let attempts = 0;
        while (attempts < 10) {
          await new Promise((r) => setTimeout(r, 2000));
          const roadmapRes = await fetch(`/api/roadmap/${gapReport.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (roadmapRes.ok) {
            const roadmapData = await roadmapRes.json();
            setRoadmap(normalizeRoadmap(roadmapData));
            break;
          }
          attempts++;
        }
      } else {
        const err = await res.json();
        setError(err.detail || "Generation failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setGenerating(false);
    }
  }, [router, gapReport]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchTargetRoles();
  }, [router, fetchTargetRoles]);

  useEffect(() => {
    const roleId = searchParams.get("role");
    if (roleId) {
      setSelectedRoleId(roleId);
      fetchRoadmap(roleId);
    } else if (targetRoles.length > 0) {
      setSelectedRoleId(targetRoles[0].id);
      fetchRoadmap(targetRoles[0].id);
    }
  }, [searchParams, targetRoles, fetchRoadmap]);

  const getSeverityForSkill = (skill: string): string => {
    return gapReport?.gaps.find((g) => g.skill === skill)?.severity || "none";
  };

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-[#0a0e17] p-8">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          <p>Loading roadmap...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0e17] text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-[24rem] w-[24rem] rounded-full bg-blue-600/15 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-[24rem] w-[24rem] rounded-full bg-indigo-600/15 blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-4xl p-6 sm:p-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">Learning Roadmap</h1>
              <p className={mutedText}>Your personalized milestone plan</p>
            </div>
          </div>
          <select
            value={selectedRoleId}
            onChange={(e) => {
              const roleId = e.target.value;
              window.history.replaceState({}, "", `/roadmap?role=${roleId}`);
              fetchRoadmap(roleId);
            }}
            className="max-w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {targetRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-300 backdrop-blur">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 text-red-400" />
            <p>{error}</p>
          </div>
        )}

        {roadmap ? (
          <>
            <div className={`${cardClass} mb-6`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className={cardTitleClass}>
                    <Target aria-hidden="true" className="h-5 w-5 text-blue-400" />
                    {gapReport?.target_role_name || "Target Role"}
                  </h2>
                  <p className={mutedText}>
                    Version {roadmap.version} • {roadmap.milestones.length} milestones •{" "}
                    {roadmap.milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)}h estimated
                  </p>
                </div>
                <button
                  onClick={() => generateRoadmap(roadmap.gap_report_id)}
                  disabled={generating}
                  className={darkBtn}
                >
                  {generating ? (
                    <>
                      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Regenerate
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {roadmap.milestones.map((milestone, index) => {
                const severity = getSeverityForSkill(milestone.linked_gap_skill);
                const isLast = index === roadmap.milestones.length - 1;
                
                return (
                  <div
                    key={milestone.id}
                    className={`relative ${cardClass} group ${!isLast ? "after:absolute after:left-7 after:top-12 after:bottom-0 after:w-0.5 after:bg-gradient-to-b after:from-white/5 after:to-transparent" : ""}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative flex-shrink-0">
                        <div
                          className={`w-3 h-3 rounded-full border-2 ${statusColors[milestone.status]}`}
                        />
                        {!isLast && (
                          <div
                            className={`absolute left-[6px] top-3 bottom-[-24px] w-0.5 ${
                              milestone.status === "done"
                                ? "bg-emerald-500/50"
                                : "bg-white/5"
                            }`}
                          />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-medium ${severityColors[severity]}`}>
                                {severity?.toUpperCase()}
                              </span>
                              {milestone.estimated_hours && (
                                <span className={`${pillBase} ${pillColors.gray}`}>
                                  <Clock className="h-3 w-3 mr-1" />
                                  {milestone.estimated_hours}h
                                </span>
                              )}
                              <span className={`${pillBase} ${statusColors[milestone.status]} capitalize`}>
                                {milestone.status.replace("_", " ")}
                              </span>
                            </div>
                            <h3 className="text-base font-semibold text-white mb-1">
                              {milestone.title}
                            </h3>
                            <p className="text-sm text-slate-400 mb-3">
                              Addresses: <span className="font-medium text-slate-200">{milestone.linked_gap_skill}</span>
                            </p>
                            
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 text-sm text-slate-300">
                                {actionIcons[milestone.linked_action_type]}
                                <span className="capitalize">{milestone.linked_action_type}</span>
                              </span>
                              {milestone.linked_action_type === "resource" && (
                                <a
                                  href={milestone.linked_action_id}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={linkClass}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Open
                                </a>
                              )}
                              {(milestone.linked_action_type === "challenge" || milestone.linked_action_type === "interview") && (
                                <button
                                  onClick={() => {
                                    const params = new URLSearchParams({
                                      skill: milestone.linked_gap_skill || "",
                                      targetRoleId: selectedRoleId,
                                      milestoneId: milestone.id,
                                    });
                                    router.push(`/practice?${params.toString()}`);
                                  }}
                                  className={linkClass}
                                  disabled={milestone.status === "done"}
                                >
                                  <PlayCircle className="h-3.5 w-3.5" />
                                  {milestone.status === "done" ? "Done" : "Start"}
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0 text-right">
                            <span className="text-2xl font-bold text-slate-500">
                              {milestone.order_index + 1}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => router.push(`/gap-report?role=${selectedRoleId}`)}
                className={darkBtn}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Back to Gap Report
              </button>
            </div>
          </>
        ) : gapReport ? (
          <div className={`${cardClass} text-center py-12`}>
            <Flag className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No roadmap generated yet</h3>
            <p className={mutedText} mb-6>
              Generate a personalized learning roadmap based on your skill gaps.
            </p>
            <button
              onClick={() => generateRoadmap(gapReport.id)}
              disabled={generating}
              className={primaryBtn}
            >
              {generating ? (
                <>
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4" />
                  Generate Roadmap
                </>
              )}
            </button>
          </div>
        ) : (
          <div className={`${cardClass} text-center py-12`}>
            <Target className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Select a target role</h3>
            <p className={mutedText} mb-4>
              Choose a role to view or generate your learning roadmap.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function RoadmapPage() {
  return (
    <Suspense fallback={
      <main className="relative flex min-h-screen items-center justify-center bg-[#0a0e17] p-8">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          <p>Loading...</p>
        </div>
      </main>
    }>
      <RoadmapContent />
    </Suspense>
  );
}