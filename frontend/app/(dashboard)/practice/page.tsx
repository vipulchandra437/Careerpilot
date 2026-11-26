"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2, Play, Send, CheckCircle2, XCircle, Clock, AlertTriangle, Code2 } from "lucide-react";
import { recordFeatureProgress } from "@/app/actions/dashboard";

interface TestResult {
  name: string;
  passed: boolean;
  timed_out: boolean;
  exit_code: number | null;
  stdout: string;
  expected?: string;
  stderr: string;
  elapsed_ms: number;
}

interface ChallengeSummary {
  id: string;
  skill: string;
  difficulty: string;
  language: string;
  title: string;
  status: "solved" | "attempted" | "unsolved";
}

const cardClass = "card";

const primaryBtn =
  "btn-primary focus-ring !px-4 !py-2 !text-sm disabled:opacity-50";

const runBtn =
  "btn-secondary focus-ring !px-4 !py-2 !text-sm disabled:pointer-events-none disabled:opacity-50";

const codeEditorClass =
  "w-full min-h-[26rem] flex-1 resize-y rounded-xl border border-white/10 bg-[#0d1220] p-4 font-mono text-sm text-emerald-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 placeholder:text-slate-600";

function PracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [challenge, setChallenge] = useState<{
    id: string; title: string; prompt: string; function_signature: string; starter_code: string;
    difficulty: string; skill: string; language: string; expected_time_complexity: string | null;
  } | null>(null);
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);
  const [skillInput, setSkillInput] = useState(searchParams.get("skill") || "");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "beginner" | "intermediate" | "advanced">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "solved" | "attempted" | "unsolved">("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [language, setLanguage] = useState(searchParams.get("language") || "all");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [lastPassed, setLastPassed] = useState<boolean | null>(null);
  const [milestoneMarked, setMilestoneMarked] = useState(false);

  const milestoneId = searchParams.get("milestoneId") || "";
  const challengeIdParam = searchParams.get("challengeId") || "";
  const initRef = useRef(false);

  const loadChallenges = useCallback(async (skill?: string, diff?: string, lang?: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const qs = new URLSearchParams();
    const s = (skill ?? skillInput).trim();
    const d = diff ?? difficultyFilter;
    const l = lang ?? language;
    if (s) qs.set("skill", s);
    if (d && d !== "all") qs.set("difficulty", d);
    if (l && l !== "all") qs.set("language", l);
    try {
      const res = await fetch(`/api/challenges${qs.toString() ? `?${qs}` : ""}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { localStorage.removeItem("access_token"); router.push("/login?reason=expired"); return; }
      if (!res.ok) { setError("Could not load questions. Please refresh the page."); return; }
      setChallenges((await res.json()).challenges || []);
    } catch { setError("Could not load questions. Please refresh the page."); }
  }, [skillInput, difficultyFilter, language, router]);

  const openChallenge = useCallback(async (id: string) => {
    setLoading(true); setError(""); setResults(null); setLastPassed(null); setMilestoneMarked(false);
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`/api/challenges/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { localStorage.removeItem("access_token"); router.push("/login?reason=expired"); return; }
      const data = await res.json();
      if (res.ok) { setChallenge(data); setCode(data.starter_code || ""); }
      else setError(data.detail || "Failed to load challenge");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [router]);

  const openRoadmapChallenge = useCallback(async (id: string) => {
    setLoading(true); setError(""); setResults(null); setLastPassed(null); setMilestoneMarked(false);
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`/api/challenges/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { localStorage.removeItem("access_token"); router.push("/login?reason=expired"); return; }
      if (res.ok) {
        const data = await res.json();
        setChallenge(data); setCode(data.starter_code || "");
        return;
      }
      // Roadmap fallback milestones carry slugs, not persisted challenge IDs.
      const skill = searchParams.get("skill") || "";
      const milestone = searchParams.get("milestoneId") || "";
      if (res.status !== 404 || !skill || !milestone) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Could not open this practice challenge");
        return;
      }
      const genRes = await fetch("/api/challenges/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          skill,
          difficulty: "adaptive",
          language: "python",
          target_role_id: searchParams.get("targetRoleId") || null,
          roadmap_milestone_id: milestone,
        }),
      });
      const data = await genRes.json().catch(() => ({}));
      if (!genRes.ok) { setError(data.detail || "Could not generate a practice challenge"); return; }
      setChallenge(data); setCode(data.starter_code || "");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [router, searchParams]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/login"); return; }
    if (initRef.current) return;
    initRef.current = true;
    void loadChallenges(searchParams.get("skill") || "", "all", "all");
    if (challengeIdParam) { void openRoadmapChallenge(challengeIdParam); return; }
    setLoading(false);
  }, [challengeIdParam, loadChallenges, openRoadmapChallenge, router, searchParams]);

  const runCode = useCallback(async (submit: boolean) => {
    if (!challenge) return;
    setRunning(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const endpoint = submit
        ? `/api/challenges/${challenge.id}/submit`
        : `/api/challenges/${challenge.id}/run`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          roadmap_milestone_id: milestoneId || null,
        }),
      });
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login?reason=expired");
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setResults(data.tests || []);
        setLastPassed(!!data.passed);
        if (submit) {
          const tests: TestResult[] = data.tests || [];
          const score = data.passed
            ? 100
            : Math.round((tests.filter((test) => test.passed).length / (tests.length || 1)) * 100);
          void recordFeatureProgress(token || "", {
            featureKey: "coding-tests",
            score,
            status: data.passed ? "complete" : "in_progress",
          });
        }
        if (submit && data.milestone_marked_done) {
          setMilestoneMarked(true);
        }
      } else {
        // e.g. 503 sandbox unavailable — surface cleanly, never execute here.
        setError(data.detail || "Sandbox error");
      }
    } catch {
      setError("Network error");
    } finally {
      setRunning(false);
    }
  }, [challenge, code, milestoneId, router]);

  const passedCount = results?.filter((t) => t.passed).length || 0;
  const diffLabel = (d: string) => d === "beginner" ? "Easy" : d === "intermediate" ? "Medium" : "Hard";
  const diffTone = (d: string) => d === "beginner" ? "text-emerald-400" : d === "intermediate" ? "text-amber-400" : "text-red-400";
  const statusIcon = (s: ChallengeSummary["status"]) => s === "solved" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : s === "attempted" ? <div className="h-4 w-4 rounded-full border-2 border-amber-400/70" /> : <div className="h-4 w-4 rounded-full border border-white/20" />;
  const topics = ["all", ...Array.from(new Set(challenges.map((c) => c.skill).filter(Boolean))).sort((a, b) => a.localeCompare(b))];
  const filtered = challenges.filter((c) =>
    (difficultyFilter === "all" || c.difficulty === difficultyFilter) &&
    (topicFilter === "all" || c.skill === topicFilter) &&
    (statusFilter === "all" || c.status === statusFilter)
  );
  const counts = { all: challenges.length, beginner: challenges.filter(c=>c.difficulty==="beginner").length, intermediate: challenges.filter(c=>c.difficulty==="intermediate").length, advanced: challenges.filter(c=>c.difficulty==="advanced").length };

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-[24rem] w-[24rem] rounded-full bg-brand-600/15 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-[24rem] w-[24rem] rounded-full bg-indigo-600/15 blur-[100px]" />
      </div>
      <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">Practice Problems</h1>
          <p className="text-sm text-slate-400">Pick a question and start coding.</p>
        </div>

        {error && <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div>}

        {!challenge ? (
          <div className={`${cardClass} !p-0 overflow-hidden`}>
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-4">
              <div className="flex rounded-md bg-white/5 p-0.5">{([["all","All"],["beginner","Easy"],["intermediate","Medium"],["advanced","Hard"]] as const).map(([k,l]) => (
                <button key={k} onClick={() => setDifficultyFilter(k)} className={`px-3 py-1.5 text-xs rounded ${difficultyFilter===k ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"}`}>
                  <span className={k==="beginner"?"text-emerald-400":k==="intermediate"?"text-amber-400":k==="advanced"?"text-red-400":""}>{l}</span>
                </button>
              ))}</div>
              <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 focus:outline-none">
                <option value="all">All Topics</option>
                {topics.filter((t) => t !== "all").map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={language} onChange={(e) => { const v = e.target.value; setLanguage(v); void loadChallenges(undefined, undefined, v); }} className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 focus:outline-none">
                <option value="all">All Languages</option><option value="python">Python 3</option><option value="javascript">JavaScript</option><option value="java">Java</option><option value="cpp">C++</option>
              </select>
              <div className="ml-auto flex gap-2 min-w-[14rem]">
                <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter") void loadChallenges(); }} placeholder="Search questions..." className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none" />
                <button onClick={() => void loadChallenges()} className={runBtn}>Search</button>
              </div>
            </div>
            <div className="overflow-auto">
              <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_8rem_7rem] px-4 py-3 text-xs font-medium text-slate-500 border-b border-white/10">
                <span>Status</span><span>Title</span><span>Topic</span><span className="text-right">Difficulty</span>
              </div>
              {loading ? (
                <div className="flex items-center gap-3 p-6 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading questions...</div>
              ) : filtered.length === 0 ? (
                <p className="p-8 text-sm text-slate-500 text-center">No questions found.</p>
              ) : filtered.map((c, i) => (
                <button key={c.id} onClick={() => void openChallenge(c.id)} className={`grid w-full grid-cols-[3.5rem_minmax(0,1fr)_8rem_7rem] items-center px-4 py-3 text-left border-b border-white/5 hover:bg-white/[0.04] ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}>
                  <span className="flex items-center">{statusIcon(c.status)}</span>
                  <span className="min-w-0 pr-3 text-sm text-slate-200 truncate">{c.title}</span>
                  <span className="text-xs text-slate-400 truncate">{c.skill}</span>
                  <span className={`text-right text-sm ${diffTone(c.difficulty)}`}>{diffLabel(c.difficulty)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={`${cardClass} !p-0 overflow-hidden`}>
            <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => { setChallenge(null); setResults(null); setError(""); }} className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
                <div className="min-w-0"><h2 className="font-medium text-slate-100 truncate">{challenge.title}</h2><div className="text-xs text-slate-500">{challenge.skill} • <span className={diffTone(challenge.difficulty)}>{diffLabel(challenge.difficulty)}</span></div></div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => runCode(false)} disabled={running} className={runBtn}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Run</button>
                <button onClick={() => runCode(true)} disabled={running} className={primaryBtn}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Submit</button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[32rem]">
              <div className="border-b lg:border-b-0 lg:border-r border-white/10 p-4 overflow-auto space-y-4">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-300">{challenge.prompt}</pre>
                {challenge.expected_time_complexity && <p className="text-xs text-slate-500">Target: {challenge.expected_time_complexity}</p>}
                <div><div className="text-xs font-medium text-slate-400 mb-2">Signature</div><pre className="whitespace-pre-wrap rounded-md bg-black/20 p-3 font-mono text-xs text-slate-200">{challenge.function_signature}</pre></div>
                {results && <div><div className="text-xs font-medium text-slate-400 mb-2">Results {lastPassed !== null && <span className={lastPassed ? "text-emerald-400" : "text-red-400"}>{passedCount}/{results.length}</span>}</div><div className="space-y-2">{results.map((t, i) => (
                  <div key={i} className="rounded-md bg-black/20 p-3 text-sm"><div className="flex items-center gap-2">{t.timed_out ? <Clock className="h-4 w-4 text-yellow-400" /> : t.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}<span className="text-slate-300">{t.name || `Case ${i + 1}`}</span><span className="text-xs text-slate-500 ml-auto">{t.timed_out ? "Timed out" : t.passed ? "Accepted" : "Wrong Answer"}</span></div>
                  {!t.passed && !t.timed_out && <div className="mt-2 space-y-1 text-xs font-mono">{t.stdout !== undefined && t.stdout !== "" && <div><div className="text-slate-500">Output</div><pre className="bg-black/20 p-2 rounded text-slate-300 overflow-auto">{t.stdout.slice(0,500)}</pre></div>}{t.expected && <div><div className="text-slate-500">Expected</div><pre className="bg-black/20 p-2 rounded text-slate-300 overflow-auto">{t.expected.slice(0,500)}</pre></div>}</div>}
                  {t.stderr && <pre className="mt-2 text-xs font-mono bg-black/20 p-2 rounded text-red-400 overflow-auto">{t.stderr.slice(0,500)}</pre>}</div>
                ))}</div></div>}
                {milestoneMarked && <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"><CheckCircle2 className="inline h-4 w-4 mr-2" />Passed — roadmap milestone marked complete.</div>}
              </div>
              <div className="p-4 flex flex-col">
                <div className="text-xs font-medium text-slate-400 mb-2">Code <span className="text-slate-500">({({python:"Python 3",javascript:"JavaScript",java:"Java",cpp:"C++"} as Record<string,string>)[challenge.language] || challenge.language})</span></div>
                <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} className={codeEditorClass} aria-label="Code editor" />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <main className="relative flex min-h-screen items-center justify-center bg-surface p-8">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Loading practice...</p>
          </div>
        </main>
      }
    >
      <PracticeContent />
    </Suspense>
  );
}
