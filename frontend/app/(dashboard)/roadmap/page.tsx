"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  Brain,
  ChevronLeft,
  Clock,
  Code,
  ExternalLink,
  Flag,
  Layers,
  Loader2,
  PlayCircle,
  RefreshCw,
  Search,
  Target,
  Zap,
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

const brand = "#3b6cf6";
const green = "#12a36b";

const statusPills: Record<string, string> = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  not_started: "border-slate-200 bg-slate-100 text-slate-600",
};

const severityText: Record<string, string> = {
  critical: "text-red-600",
  important: "text-amber-600",
  nice_to_have: "text-blue-600",
  none: "text-emerald-600",
};

const actionIcons: Record<string, React.ReactNode> = {
  challenge: <Code className="h-4 w-4" />,
  interview: <Brain className="h-4 w-4" />,
  resource: <BookOpen className="h-4 w-4" />,
};

const lightBtn =
  "focus-ring inline-flex items-center justify-center gap-2 rounded-xl border border-[#e3e8f2] bg-white px-4 py-2 text-sm font-medium text-[#141b2d] transition-colors hover:border-[#b9c9f5] disabled:opacity-50";

const primaryBtn =
  "focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";

const linkClass = "text-sm font-medium text-[#3b6cf6] hover:underline";

// Roles stay admin-managed; these aliases only make natural queries findable.
const roleAliases: Record<string, string[]> = {
  "ml engineer": ["machine learning", "artificial intelligence", "ai", "deep learning"],
  "frontend engineer": ["front end", "web development", "web"],
  "backend engineer": ["back end", "server side"],
  "full stack r": ["r programming", "r language"],
};

const normalizeSearch = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const roleSearchTexts = (role: { name: string }) => [
  normalizeSearch(role.name),
  ...(roleAliases[normalizeSearch(role.name)] || []).map(normalizeSearch),
];

const matchesRole = (role: { name: string }, query: string) => {
  const tokens = normalizeSearch(query).split(" ").filter(Boolean);
  return tokens.length === 0 || roleSearchTexts(role).some((text) => tokens.every((token) => text.includes(token)));
};

function RoadmapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [gapReport, setGapReport] = useState<GapReport | null>(null);
  const [targetRoles, setTargetRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [domainQuery, setDomainQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState(-1);
  const [autofill, setAutofill] = useState<{ id: string; prefix: string } | null>(null);
  const [suppressAutofill, setSuppressAutofill] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [needsAnalysis, setNeedsAnalysis] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  const requestRef = useRef(0);
  const lastFetchedRoleRef = useRef("");
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
    // History updates and roles loading can both trigger the same fetch; an
    // older response must never overwrite the domain currently on screen.
    if (lastFetchedRoleRef.current === roleId) return;
    lastFetchedRoleRef.current = roleId;
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    // A failed load must stay retryable by reselecting the same role.
    const clearRetryGuard = () => {
      if (isCurrent() && lastFetchedRoleRef.current === roleId) lastFetchedRoleRef.current = "";
    };
    setLoading(true);
    setGenerating(false);
    setError("");
    setNeedsAnalysis(false);
    setRoadmap(null);
    setGapReport(null);
    setSelectedLevel(null);
    try {
      const token = localStorage.getItem("access_token");

      const gapRes = await fetch(`/api/gap/report?target_role_id=${encodeURIComponent(roleId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!isCurrent()) return;
      if (gapRes.status === 401) {
        clearRetryGuard();
        localStorage.removeItem("access_token");
        router.push("/login?reason=expired");
        return;
      }
      if (gapRes.status === 404) {
        setNeedsAnalysis(true);
        return;
      }
      if (!gapRes.ok) {
        const err = await gapRes.json().catch(() => ({}));
        clearRetryGuard();
        setError(err.detail || "Could not load your gap report.");
        return;
      }
      const gapData = await gapRes.json();
      setGapReport({
        id: gapData.id,
        target_role_id: gapData.target_role_id,
        target_role_name: gapData.target_role_name || "Unknown",
        gaps: gapData.gaps || [],
      });

      const roadmapRes = await fetch(`/api/roadmap/${gapData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!isCurrent()) return;
      if (roadmapRes.ok) {
        const next = normalizeRoadmap(await roadmapRes.json());
        if (!isCurrent()) return;
        setRoadmap(next);
      } else if (roadmapRes.status === 404) {
        setRoadmap(null);
      } else {
        const err = await roadmapRes.json().catch(() => ({}));
        clearRetryGuard();
        setError(err.detail || "Could not load your roadmap.");
      }
    } catch {
      clearRetryGuard();
      if (isCurrent()) setError("Network error");
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [router]);

  const generateRoadmap = useCallback(async (roleId: string) => {
    if (!gapReport) return;
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    const previousVersion = roadmap?.version;
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
      if (!isCurrent()) return;
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login?reason=expired");
        return;
      }

      if (res.ok) {
        // Regeneration bumps the version even when there are zero milestones,
        // so polling on version avoids a fake 20-second timeout on a no-gap report.
        let attempts = 0;
        while (attempts < 10) {
          await new Promise((r) => setTimeout(r, 2000));
          if (!isCurrent()) return;
          const roadmapRes = await fetch(`/api/roadmap/${gapReport.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!isCurrent()) return;
          if (roadmapRes.ok) {
            const next = normalizeRoadmap(await roadmapRes.json());
            if (!isCurrent()) return;
            setRoadmap(next);
            if (next.version !== previousVersion) break;
          }
          attempts++;
        }
        if (attempts >= 10 && isCurrent()) {
          setError("Generation is taking longer than expected; refresh to check later.");
        }
      } else {
        const err = await res.json().catch(() => ({}));
        if (isCurrent()) setError(err.detail || "Generation failed");
      }
    } catch {
      if (isCurrent()) setError("Network error");
    } finally {
      if (isCurrent()) setGenerating(false);
    }
  }, [router, gapReport, roadmap]);

  const selectDomain = (roleId: string, name?: string) => {
    if (name) setDomainQuery(name);
    setSelectedRoleId(roleId);
    setNeedsAnalysis(false);
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
    const requestedRole = searchParams.get("role");
    if (targetRoles.length === 0) return;
    const roleId = requestedRole || targetRoles[0].id;
    if (requestedRole) {
      setSelectedRoleId(requestedRole);
      const role = targetRoles.find((r) => r.id === requestedRole);
      if (role) setDomainQuery(role.name);
    } else {
      setSelectedRoleId(targetRoles[0].id);
      setDomainQuery(targetRoles[0].name);
    }
    fetchRoadmap(roleId);
  }, [searchParams, targetRoles, fetchRoadmap]);

  const query = domainQuery.trim().toLowerCase();
  const matchingRoles = targetRoles.filter((role) => matchesRole(role, domainQuery));
  const options = query ? matchingRoles : targetRoles;
  const activeMilestone = selectedLevel === null || !roadmap ? null : roadmap.milestones[selectedLevel] ?? null;
  const milestones = roadmap?.milestones ?? [];
  const doneCount = milestones.filter((m) => m.status === "done").length;
  const progress = milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0;
  const hours = milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchIndex(-1);
  };

  const selectLevel = (index: number) => {
    setSelectedLevel(index);
    // On mobile the detail panel sits above the trail, so bring it into view.
    if (window.matchMedia("(max-width: 899px)").matches) {
      window.requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  const acceptDomain = (role: { id: string; name: string }) => {
    setAutofill(null);
    setSuppressAutofill(false);
    closeSearch();
    selectDomain(role.id, role.name);
  };

  const onSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const raw = input.value;
    if (suppressAutofill) {
      setSuppressAutofill(false);
      setAutofill(null);
      setDomainQuery(raw);
      return;
    }
    const q = normalizeSearch(raw);
    const match = q
      ? targetRoles.find((r) => {
          const name = normalizeSearch(r.name);
          return name.startsWith(q) && name !== q;
        })
      : undefined;
    if (match) {
      setDomainQuery(match.name);
      setAutofill({ id: match.id, prefix: raw });
      requestAnimationFrame(() => input.setSelectionRange(raw.length, match.name.length));
    } else {
      setDomainQuery(raw);
      setAutofill(null);
    }
    setSearchOpen(true);
    setSearchIndex(-1);
  };

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      if (autofill) {
        setSuppressAutofill(true);
        setAutofill(null);
      }
      setSearchOpen(true);
      return;
    }
    setSuppressAutofill(false);
    if ((event.key === "Tab" || event.key === "ArrowRight") && autofill && event.currentTarget.selectionStart !== event.currentTarget.selectionEnd) {
      event.preventDefault();
      const role = targetRoles.find((r) => r.id === autofill.id);
      if (role) acceptDomain(role);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!searchOpen) {
        setSearchOpen(true);
        return;
      }
      if (!options.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setSearchIndex((current) => (current < 0 ? (step === 1 ? 0 : options.length - 1) : (current + step + options.length) % options.length));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const role = options[searchIndex >= 0 ? searchIndex : 0];
      if (role) acceptDomain(role);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (autofill) setDomainQuery(autofill.prefix);
      setAutofill(null);
      closeSearch();
    }
  };

  const getSeverityForSkill = (skill: string): string => {
    return gapReport?.gaps.find((g) => g.skill === skill)?.severity || "none";
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-8 text-[#5c6784]">
        <div className="flex items-center gap-3">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          <p>Loading roadmap...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#141b2d]">
      <header className="sticky top-0 z-20 border-b border-[#e3e8f2] bg-white">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-5 py-3 max-[560px]:flex-col max-[560px]:items-stretch">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="h-[30px] w-[30px] rounded-[9px] bg-gradient-to-br from-[#3b6cf6] to-[#7c4dff] shadow-[0_4px_12px_rgba(59,108,246,.28)]" />
            <span className="text-[18px] font-bold tracking-tight">Roadmap</span>
          </div>
          <div className="relative w-full max-w-[440px] max-[560px]:max-w-none">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5c6784]" />
            <input
              value={domainQuery}
              onChange={onSearchChange}
              onKeyDown={onSearchKeyDown}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => window.setTimeout(closeSearch, 140)}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={searchOpen}
              aria-controls="domain-options"
              aria-label="Search domains"
              aria-activedescendant={searchOpen && searchIndex >= 0 ? `domain-option-${options[searchIndex]?.id}` : undefined}
              placeholder="Search a domain, e.g. machine learning"
              className="focus-ring w-full rounded-xl border border-[#e3e8f2] bg-[#f5f7fb] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#3b6cf6] focus:bg-white focus:ring-4 focus:ring-[#3b6cf6]/15"
            />
            {searchOpen && (
              <div
                id="domain-options"
                role="listbox"
                aria-label="Domains"
                onMouseDown={(e) => e.preventDefault()}
                className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[430px] overflow-y-auto rounded-xl border border-[#e3e8f2] bg-white p-1 shadow-[0_18px_46px_rgba(20,27,45,.14)]"
              >
                <p className="px-3 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-[#5c6784]">
                  {query ? "Matching domains" : "All domains"}
                </p>
                {options.map((role, index) => (
                  <button
                    key={role.id}
                    id={`domain-option-${role.id}`}
                    type="button"
                    role="option"
                    aria-selected={searchIndex === index}
                    onClick={() => acceptDomain(role)}
                    className={`block w-full rounded-lg px-3 py-2 text-left transition-colors ${searchIndex === index ? "bg-[#eef3ff]" : "hover:bg-[#eef3ff]"}`}
                  >
                    <span className="block text-sm font-semibold">{role.name}</span>
                    <span className="block text-xs text-[#5c6784]">Personalized milestone roadmap</span>
                  </button>
                ))}
                {!options.length && <p className="px-3 py-2 text-sm text-[#5c6784]">No domain matches. Domains are managed by your admin.</p>}
                <p className="mt-1 border-t border-[#e3e8f2] px-3 py-2 text-[11px] text-[#5c6784]">↑↓ move · Enter select · Tab / → accept · Esc close</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1240px] gap-6 px-5 py-6 min-[900px]:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <button onClick={() => router.back()} className="focus-ring mb-4 inline-flex items-center gap-1 text-sm text-[#5c6784] hover:text-[#3b6cf6]">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {error && (
            <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {roadmap && milestones.length === 0 ? (
            <section className="rounded-2xl border border-[#e3e8f2] bg-white px-6 py-12 text-center">
              <Flag aria-hidden="true" className="mx-auto mb-4 h-12 w-12 text-[#9aa5bd]" />
              <h2 className="mb-2 text-xl font-semibold">No gaps to build a roadmap from</h2>
              <p className="mb-6 text-sm text-[#5c6784]">Your profile currently matches this role. Update your profile or re-run gap analysis, then regenerate.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button onClick={() => generateRoadmap(roadmap.gap_report_id)} disabled={generating} style={{ background: brand }} className={primaryBtn}>
                  {generating ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="h-4 w-4" />}
                  {generating ? "Regenerating..." : "Regenerate"}
                </button>
                <button onClick={() => router.push(`/gap-report?role=${selectedRoleId}`)} className={lightBtn}>Back to Gap Report</button>
              </div>
            </section>
          ) : roadmap ? (
            <>
              <section className="mb-6 flex items-center gap-5 rounded-2xl border border-[#e3e8f2] bg-white p-6 max-[560px]:gap-3.5">
                <div
                  className="relative grid h-[94px] w-[94px] shrink-0 place-items-center rounded-full"
                  style={{ background: `conic-gradient(${brand} ${progress}%, #e8edf7 0)` }}
                  role="img"
                  aria-label={`${progress}% complete`}
                >
                  <span aria-hidden="true" className="absolute inset-[9px] rounded-full bg-white" />
                  <span className="relative z-10 text-[19px] font-extrabold">{progress}%</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-[23px] font-bold tracking-tight max-[560px]:text-[19px]">{gapReport?.target_role_name || "Target Role"}</h1>
                  <p className="text-sm text-[#5c6784]">Version {roadmap.version} · {hours}h estimated</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#5c6784]">
                    <span><b className="block text-base text-[#141b2d]">{milestones.length}</b>stages</span>
                    <span><b className="block text-base text-[#141b2d]">{milestones.length}</b>topics</span>
                    <span><b className="block text-base text-[#141b2d]">{doneCount}</b>completed topics</span>
                  </div>
                </div>
                <button
                  onClick={() => generateRoadmap(roadmap.gap_report_id)}
                  disabled={generating}
                  className={`${lightBtn} ml-auto shrink-0 max-[560px]:ml-0`}
                >
                  {generating ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="h-4 w-4" />}
                  {generating ? "Regenerating..." : "Regenerate"}
                </button>
              </section>

              {milestones.map((milestone, index) => {
                const done = milestone.status === "done";
                const firstUnfinished = milestones.findIndex((m) => m.status !== "done") === index;
                return (
                  <section key={milestone.id} className="relative pb-6 pl-[58px] max-[560px]:pl-12">
                    {index < milestones.length - 1 && (
                      <span aria-hidden="true" className="absolute bottom-0 left-[21px] top-[46px] w-[2px] bg-[#e3e8f2] max-[560px]:left-[18px]" />
                    )}
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-0 grid h-11 w-11 place-items-center rounded-full border-2 bg-white text-sm font-extrabold max-[560px]:h-[38px] max-[560px]:w-[38px]"
                      style={{
                        borderColor: done ? green : milestone.status === "in_progress" ? brand : "#e3e8f2",
                        color: done ? "#fff" : milestone.status === "in_progress" ? brand : "#5c6784",
                        background: done ? green : "#fff",
                        boxShadow: firstUnfinished ? `0 0 0 5px ${brand}24` : undefined,
                      }}
                    >
                      {done ? "✓" : index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => selectLevel(index)}
                      aria-pressed={selectedLevel === index}
                      className={`focus-ring block w-full rounded-xl p-1 text-left transition-colors hover:bg-[#f8faff] ${selectedLevel === index ? "bg-[#f8faff]" : ""}`}
                    >
                      <span className="flex min-h-11 flex-wrap items-center gap-2.5">
                        <span role="heading" aria-level={2} className="text-base font-semibold">{milestone.title}</span>
                        {milestone.estimated_hours != null && (
                          <span className="text-xs text-[#5c6784]"><Clock aria-hidden="true" className="mr-1 inline h-3 w-3" />{milestone.estimated_hours}h</span>
                        )}
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${statusPills[milestone.status]}`}>
                          {milestone.status.replace("_", " ")}
                        </span>
                      </span>
                      <span className="mt-3 flex flex-wrap gap-2.5">
                        <span
                          className={`flex min-w-[190px] max-w-[340px] flex-1 items-start gap-3 rounded-xl border bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#b9c9f5] hover:shadow-md max-[560px]:min-w-full ${selectedLevel === index ? "border-[#3b6cf6] ring-4 ring-[#3b6cf6]/15" : "border-[#e3e8f2]"}`}
                        >
                          <span
                            aria-hidden="true"
                            className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-2 text-xs text-white"
                            style={done ? { background: green, borderColor: green } : { background: "#fff", borderColor: "#c9d2e3" }}
                          >
                            {done ? "✓" : ""}
                          </span>
                          <span className="min-w-0">
                            <strong className="block text-sm">{milestone.linked_gap_skill || "Skill"}</strong>
                            <small className="mt-0.5 block text-xs text-[#5c6784]">{milestone.linked_action_type} · Level {index + 1}</small>
                          </span>
                        </span>
                      </span>
                    </button>
                  </section>
                );
              })}

              {doneCount === milestones.length && (
                <p className="ml-[58px] flex items-center gap-2 rounded-2xl bg-[#141b2d] px-5 py-4 text-center text-sm font-semibold text-white max-[560px]:ml-12">
                  <Flag aria-hidden="true" className="h-4 w-4" /> Goal reached: {gapReport?.target_role_name || "your target role"}
                </p>
              )}

              <div className="mt-8 text-center">
                <button onClick={() => router.push(`/gap-report?role=${selectedRoleId}`)} className={lightBtn}>
                  Back to Gap Report <Zap aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : needsAnalysis ? (
            <section className="rounded-2xl border border-[#e3e8f2] bg-white px-6 py-12 text-center">
              <Target aria-hidden="true" className="mx-auto mb-4 h-12 w-12 text-[#9aa5bd]" />
              <h2 className="mb-2 text-xl font-semibold">Run gap analysis first</h2>
              <p className="mb-6 text-sm text-[#5c6784]">This role has no gap report yet, so there is nothing to build a roadmap from.</p>
              <button onClick={() => router.push(`/gap-report?role=${selectedRoleId}`)} style={{ background: brand }} className={primaryBtn}>
                <Zap aria-hidden="true" className="mr-2 inline h-4 w-4" /> Run gap analysis
              </button>
            </section>
          ) : gapReport ? (
            <section className="rounded-2xl border border-[#e3e8f2] bg-white px-6 py-12 text-center">
              <Flag aria-hidden="true" className="mx-auto mb-4 h-12 w-12 text-[#9aa5bd]" />
              <h2 className="mb-2 text-xl font-semibold">No roadmap generated yet</h2>
              <p className="mb-6 text-sm text-[#5c6784]">Generate a personalized learning roadmap based on your skill gaps.</p>
              <button onClick={() => generateRoadmap(gapReport.id)} disabled={generating} style={{ background: brand }} className={primaryBtn}>
                {generating ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Layers aria-hidden="true" className="h-4 w-4" />}
                {generating ? "Generating..." : "Generate Roadmap"}
              </button>
            </section>
          ) : (
            <section className="rounded-2xl border border-[#e3e8f2] bg-white px-6 py-12 text-center">
              <Target aria-hidden="true" className="mx-auto mb-4 h-12 w-12 text-[#9aa5bd]" />
              <h2 className="mb-2 text-xl font-semibold">Select a target role</h2>
              <p className="text-sm text-[#5c6784]">Choose a role to view or generate your learning roadmap.</p>
            </section>
          )}
        </div>

        <aside ref={detailRef} aria-live="polite" className="order-first rounded-2xl border border-[#e3e8f2] bg-white p-6 min-[900px]:sticky min-[900px]:top-[84px] min-[900px]:order-none">
          {activeMilestone ? (
            <>
              <p className="text-xs font-extrabold uppercase tracking-[.1em]" style={{ color: brand }}>
                Stage {selectedLevel! + 1} · {activeMilestone.estimated_hours ?? 0}h
              </p>
              <h2 className="mt-3 text-[21px] font-bold tracking-tight">{activeMilestone.title}</h2>
              <p className="text-sm text-[#5c6784]">Addresses: {activeMilestone.linked_gap_skill}</p>
              <div className="mt-5">
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[.1em] text-[#5c6784]">What you&apos;ll cover</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  <li className={`font-medium capitalize ${severityText[getSeverityForSkill(activeMilestone.linked_gap_skill)]}`}>
                    Gap severity: {getSeverityForSkill(activeMilestone.linked_gap_skill).replace("_", " ")}
                  </li>
                  <li>Status: {activeMilestone.status.replace("_", " ")}</li>
                  <li>{actionIcons[activeMilestone.linked_action_type]} <span className="capitalize">{activeMilestone.linked_action_type}</span> action</li>
                </ul>
              </div>
              <div className="mt-5 border-t border-[#e3e8f2] pt-4">
                {activeMilestone.linked_action_type === "resource" && (
                  <a href={activeMilestone.linked_action_id} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    <ExternalLink aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" /> Open resource
                  </a>
                )}
                {activeMilestone.linked_action_type === "challenge" && (
                  <button
                    onClick={() => {
                      const params = new URLSearchParams({
                        skill: activeMilestone.linked_gap_skill || "",
                        targetRoleId: selectedRoleId,
                        milestoneId: activeMilestone.id,
                        challengeId: activeMilestone.linked_action_id || "",
                      });
                      router.push(`/practice?${params.toString()}`);
                    }}
                    disabled={activeMilestone.status === "done"}
                    className={linkClass}
                  >
                    <PlayCircle aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
                    {activeMilestone.status === "done" ? "Done" : "Start"}
                  </button>
                )}
                {activeMilestone.linked_action_type === "interview" && (
                  <button
                    onClick={() => {
                      const rawType = activeMilestone.linked_action_id || "";
                      const interviewType = ["technical", "behavioral", "hr"].includes(rawType) ? rawType : "behavioral";
                      const params = new URLSearchParams({
                        type: interviewType,
                        milestoneId: activeMilestone.id,
                      });
                      router.push(`/mock-interview?${params.toString()}`);
                    }}
                    disabled={activeMilestone.status === "done"}
                    className={linkClass}
                  >
                    <PlayCircle aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
                    {activeMilestone.status === "done" ? "Done" : "Start"}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xs font-extrabold uppercase tracking-[.1em]" style={{ color: brand }}>Topic details</h2>
              <p className="py-7 text-center text-sm text-[#5c6784]">Select a topic on the roadmap to see what you will cover.</p>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

export default function RoadmapPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-8 text-[#5c6784]">
        <div className="flex items-center gap-3">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          <p>Loading...</p>
        </div>
      </main>
    }>
      <RoadmapContent />
    </Suspense>
  );
}
