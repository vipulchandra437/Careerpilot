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
  Search,
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
  "card p-6 transition-colors";

const cardTitleClass = "text-lg font-semibold text-white mb-1 flex items-center gap-2";

const mutedText = "text-sm text-slate-400";

const pillBase = "px-2 py-1 text-xs rounded-full font-medium";

const pillColors: Record<string, string> = {
  critical: "bg-red-500/15 text-red-300 border border-red-500/20",
  important: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/20",
  nice_to_have: "bg-brand-500/15 text-brand-200 border border-brand-500/25",
  none: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
  gray: "bg-slate-500/15 text-slate-300 border border-slate-600/30",
};

const primaryBtn =
  "btn-primary focus-ring !px-4 !py-2 !text-sm disabled:opacity-50";

const darkBtn =
  "btn-secondary focus-ring !px-4 !py-2 !text-sm";

const linkClass = "text-sm text-brand-300 hover:text-brand-200 transition-colors underline-offset-2 hover:underline";

const statusColors: Record<string, string> = {
  done: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
  in_progress: "bg-brand-500/15 text-brand-200 border border-brand-500/25",
  not_started: "bg-slate-500/15 text-slate-300 border border-slate-600/30",
};

const actionIcons: Record<string, React.ReactNode> = {
  challenge: <Code className="h-4 w-4" />,
  interview: <Brain className="h-4 w-4" />,
  resource: <BookOpen className="h-4 w-4" />,
};

const domainIcons: Record<string, React.ReactNode> = {
  "Backend Engineer": <Code className="h-4 w-4" />,
  "Frontend Engineer": <Layers className="h-4 w-4" />,
  "ML Engineer": <Brain className="h-4 w-4" />,
  "Full-Stack Engineer": <Zap className="h-4 w-4" />,
};

const levelNodeColors: Record<string, string> = {
  done: "bg-emerald-400 text-emerald-950 border-emerald-100",
  in_progress: "bg-amber-400 text-amber-950 border-amber-100",
  not_started: "bg-slate-500 text-white border-slate-300",
};

const severityColors: Record<string, string> = {
  critical: "text-red-400",
  important: "text-yellow-400",
  nice_to_have: "text-brand-400",
  none: "text-emerald-400",
};

function RoadmapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [gapReport, setGapReport] = useState<GapReport | null>(null);
  const [targetRoles, setTargetRoles] = useState<Array<{id: string; name: string}>>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [domainQuery, setDomainQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
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
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login?reason=expired");
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

  const fetchRoadmap = useCallback(async (roleId: string) => {
    setLoading(true);
    setError("");
    // A different domain must never show the previous domain's milestones.
    setRoadmap(null);
    setGapReport(null);
    setSelectedLevel(null);
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
    // Generation replaces milestones in place; their IDs tell us when it is done.
    const previousIds = (roadmap?.milestones || []).map((m) => m.id).join(",");
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
            const next = normalizeRoadmap(await roadmapRes.json());
            setRoadmap(next);
            if (next.milestones.map((m) => m.id).join(",") !== previousIds) break;
          }
          attempts++;
        }
        if (attempts >= 10) {
          setError("Generation is taking longer than expected; refresh to check later.");
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
  }, [router, gapReport, roadmap]);

  const selectDomain = (roleId: string) => {
    setSelectedRoleId(roleId);
    window.history.replaceState({}, "", `/roadmap?role=${roleId}`);
    fetchRoadmap(roleId);
  };

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

  const visibleRoles = targetRoles.filter((role) =>
    role.name.toLowerCase().includes(domainQuery.trim().toLowerCase())
  );
  const activeMilestone =
    selectedLevel === null || !roadmap ? null : roadmap.milestones[selectedLevel] ?? null;
  const milestones = roadmap?.milestones ?? [];
  // A meandering road: nodes snake left/right, joined by a smooth curve.
  const levelOffsets = [0, -70, -120, -70, 0, 70, 120, 70];
  const levelPoints = milestones.map((_, index) => ({
    x: 180 + levelOffsets[index % levelOffsets.length],
    y: 70 + index * 110,
  }));
  const roadHeight = 140 + Math.max(milestones.length - 1, 0) * 110;
  const roadPath = levelPoints.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} 20 L ${point.x} ${point.y}`;
    const previous = levelPoints[index - 1];
    const middleY = (previous.y + point.y) / 2;
    return `${path} C ${previous.x} ${middleY}, ${point.x} ${middleY}, ${point.x} ${point.y}`;
  }, "");

  const getSeverityForSkill = (skill: string): string => {
    return gapReport?.gaps.find((g) => g.skill === skill)?.severity || "none";
  };

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-surface p-8">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          <p>Loading roadmap...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-[24rem] w-[24rem] rounded-full bg-brand-600/20 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-[24rem] w-[24rem] rounded-full bg-indigo-600/15 blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-4xl p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-4">
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

        <section className="mb-8" aria-labelledby="domain-heading">
          <h2 id="domain-heading" className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Choose your domain
          </h2>
          <div className="relative mb-3">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={domainQuery}
              onChange={(e) => setDomainQuery(e.target.value)}
              placeholder="Search domains"
              aria-label="Search domains"
              className="input focus-ring w-full !pl-10"
            />
          </div>
          <div role="group" aria-labelledby="domain-heading" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {visibleRoles.map((role) => {
              const active = role.id === selectedRoleId;
              return (
                <button
                  key={role.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectDomain(role.id)}
                  className={`focus-ring flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "border-brand-400/60 bg-brand-500/15 text-white"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {domainIcons[role.name] ?? <Target aria-hidden="true" className="h-4 w-4" />}
                  <span>{role.name}</span>
                </button>
              );
            })}
          </div>
          {visibleRoles.length === 0 && (
            <p className="mt-3 text-sm text-slate-400">
              No domain matches “{domainQuery}”. Domains are managed by your admin.
            </p>
          )}
        </section>

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
                    <Target aria-hidden="true" className="h-5 w-5 text-brand-400" />
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

            <div className="relative mx-auto mt-4 w-full max-w-md">
              <div className="mb-4 text-center">
                <span className={`${pillBase} ${pillColors.none}`}>START HERE</span>
              </div>
              <div className="relative" style={{ height: roadHeight }}>
                <svg
                  aria-hidden="true"
                  viewBox={`0 0 360 ${roadHeight}`}
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full"
                >
                  <path d={roadPath} fill="none" stroke="#0f172a" strokeWidth="38" strokeLinecap="round" />
                  <path d={roadPath} fill="none" stroke="#f59e0b" strokeWidth="30" strokeLinecap="round" />
                  <path d={roadPath} fill="none" stroke="#fff7ed" strokeWidth="3" strokeDasharray="9 11" strokeLinecap="round" opacity="0.85" />
                </svg>
                {levelPoints.map((point, index) => {
                  const milestone = milestones[index];
                  return (
                    <button
                      key={milestone.id}
                      type="button"
                      onClick={() => setSelectedLevel(index)}
                      aria-pressed={selectedLevel === index}
                      aria-label={`Level ${index + 1}: ${milestone.title}. ${milestone.status.replace("_", " ")}`}
                      style={{ left: `${(point.x / 360) * 100}%`, top: point.y }}
                      className={`focus-ring absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 text-lg font-extrabold shadow-lg transition-transform hover:scale-110 ${levelNodeColors[milestone.status]} ${
                        selectedLevel === index ? "ring-4 ring-brand-300/70" : ""
                      }`}
                    >
                      {milestone.status === "done" ? (
                        <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
                      ) : (
                        index + 1
                      )}
                      <span aria-hidden="true" className="absolute -bottom-4 text-[10px] tracking-widest text-amber-300">
                        {milestone.status === "done"
                          ? "★★★"
                          : milestone.status === "in_progress"
                            ? "★☆☆"
                            : "☆☆☆"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-300">
                <Flag aria-hidden="true" className="h-4 w-4 text-brand-300" />
                Goal: {gapReport?.target_role_name || "your target role"}
              </div>
              {activeMilestone ? (
                <div className={`${cardClass} mt-6`}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className={`text-xs font-semibold uppercase tracking-widest ${severityColors[getSeverityForSkill(activeMilestone.linked_gap_skill)]}`}>
                      Level {(selectedLevel ?? 0) + 1} of {milestones.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedLevel(null)}
                      aria-label="Close level details"
                      className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`${pillBase} ${statusColors[activeMilestone.status]} capitalize`}>
                      {activeMilestone.status.replace("_", " ")}
                    </span>
                    {activeMilestone.estimated_hours && (
                      <span className={`${pillBase} ${pillColors.gray}`}>
                        <Clock className="mr-1 inline h-3 w-3" />
                        {activeMilestone.estimated_hours}h
                      </span>
                    )}
                  </div>
                  <h3 className="mb-1 text-lg font-semibold text-white">{activeMilestone.title}</h3>
                  <p className={`${mutedText} mb-4`}>
                    Addresses: <span className="font-medium text-slate-200">{activeMilestone.linked_gap_skill}</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-sm text-slate-300">
                      {actionIcons[activeMilestone.linked_action_type]}
                      <span className="capitalize">{activeMilestone.linked_action_type}</span>
                    </span>
                    {activeMilestone.linked_action_type === "resource" && (
                      <a href={activeMilestone.linked_action_id} target="_blank" rel="noopener noreferrer" className={linkClass}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open
                      </a>
                    )}
                    {activeMilestone.linked_action_type === "challenge" && (
                      <button
                        onClick={() => {
                          const params = new URLSearchParams({
                            skill: activeMilestone.linked_gap_skill || "",
                            targetRoleId: selectedRoleId,
                            milestoneId: activeMilestone.id,
                          });
                          router.push(`/practice?${params.toString()}`);
                        }}
                        className={linkClass}
                        disabled={activeMilestone.status === "done"}
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        {activeMilestone.status === "done" ? "Done" : "Start"}
                      </button>
                    )}
                    {activeMilestone.linked_action_type === "interview" && (
                      <button
                        onClick={() => router.push("/mock-interview")}
                        className={linkClass}
                        disabled={activeMilestone.status === "done"}
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        {activeMilestone.status === "done" ? "Done" : "Start"}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-6 text-center text-sm text-slate-400">Tap a level on the road to see its details.</p>
              )}
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
            <p className={`${mutedText} mb-6`}>
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
            <p className={`${mutedText} mb-4`}>
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
      <main className="relative flex min-h-screen items-center justify-center bg-surface p-8">
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
