"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  Play,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Code2,
  Target,
  Layers,
} from "lucide-react";

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
  const [language, setLanguage] = useState(searchParams.get("language") || "all");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [lastPassed, setLastPassed] = useState<boolean | null>(null);
  const [milestoneMarked, setMilestoneMarked] = useState(false);

  const targetRoleId = searchParams.get("targetRoleId") || "";
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
      if (res.ok) setChallenges((await res.json()).challenges || []);
    } catch { /* list is optional */ }
  }, [skillInput, difficultyFilter, language]);

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

  const generateChallenge = useCallback(async () => {
    setGenerating(true); setError(""); setResults(null); setLastPassed(null); setMilestoneMarked(false);
    const token = localStorage.getItem("access_token");
    const genLang = language === "all" ? "python" : language;
    try {
      const res = await fetch("/api/challenges/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ skill: skillInput.trim() || "python", difficulty: "adaptive", language: genLang, target_role_id: targetRoleId || null, roadmap_milestone_id: milestoneId || null }),
      });
      if (res.status === 401) { localStorage.removeItem("access_token"); router.push("/login?reason=expired"); return; }
      const data = await res.json();
      if (res.ok) { setChallenge(data); setCode(data.starter_code || ""); void loadChallenges(); }
      else setError(data.detail || "Failed to generate challenge");
    } catch { setError("Network error"); }
    finally { setGenerating(false); setLoading(false); }
  }, [skillInput, language, targetRoleId, milestoneId, router, loadChallenges]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/login"); return; }
    if (initRef.current) return;
    initRef.current = true;
    void loadChallenges(searchParams.get("skill") || "", "all", "all");
    if (challengeIdParam) { void openChallenge(challengeIdParam); return; }
    setLoading(false);
  }, [challengeIdParam, loadChallenges, openChallenge, router, searchParams]);

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
  const statusIcon = (s: ChallengeSummary["status"]) => s === "solved" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : s === "attempted" ? <Clock className="h-4 w-4 text-amber-400" /> : <div className="h-4 w-4 rounded-full border border-white/20" />;
  const filtered = challenges.filter((c) => difficultyFilter === "all" || c.difficulty === difficultyFilter);
  const counts = { all: challenges.length, beginner: challenges.filter(c=>c.difficulty==="beginner").length, intermediate: challenges.filter(c=>c.difficulty==="intermediate").length, advanced: challenges.filter(c=>c.difficulty==="advanced").length };

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-[24rem] w-[24rem] rounded-full bg-brand-600/15 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-[24rem] w-[24rem] rounded-full bg-indigo-600/15 blur-[100px]" />
      </div>
      <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/5" aria-label="Back"><ChevronLeft className="h-5 w-5" /></button>
            <div><h1 className="text-2xl font-bold tracking-tight">Coding Practice</h1><p className="text-sm text-slate-400">LeetCode-style problem browser and editor</p></div>
          </div>
          {challenge && <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => runCode(false)} disabled={running} className={runBtn}>{running ? <><Loader2 className="h-4 w-4 animate-spin" />Running...</> : <><Play className="h-4 w-4" />Run</>}</button>
            <button onClick={() => runCode(true)} disabled={running} className={primaryBtn}>{running ? <><Loader2 className="h-4 w-4 animate-spin" />Running...</> : <><Send className="h-4 w-4" />Submit</>}</button>
          </div>}
        </div>

        {error && <div className="alert alert-error mb-4 animate-fade-in"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p></div>}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
          <aside className={`${cardClass} flex max-h-[calc(100vh-10rem)] flex-col !p-0 overflow-hidden`}>
            <div className="border-b border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between"><h2 className="font-semibold">Problem List</h2><span className="text-xs text-slate-500">{challenges.length} problems</span></div>
              <div className="flex gap-2">{([["all","All"],["beginner","Easy"],["intermediate","Medium"],["advanced","Hard"]] as const).map(([k,l]) => (
                <button key={k} onClick={() => setDifficultyFilter(k)} className={`rounded-full px-3 py-1 text-xs font-medium border ${difficultyFilter===k ? "border-brand-400/40 bg-brand-500/15 text-white" : "border-white/10 text-slate-400 hover:text-white"}`}>
                  {l} <span className={k==="beginner"?"text-emerald-400":k==="intermediate"?"text-amber-400":k==="advanced"?"text-red-400":"text-slate-500"}>{counts[k]}</span>
                </button>
              ))}</div>
              <div className="flex gap-2">
                <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="Search topic..." className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none" />
                <button onClick={() => void loadChallenges()} className={runBtn}>Search</button>
              </div>
              <div className="flex gap-2">
                <select value={language} onChange={(e) => { const v = e.target.value; setLanguage(v); void loadChallenges(undefined, undefined, v); }} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none">
                  <option value="all">All languages</option><option value="python">Python 3</option><option value="javascript">JavaScript</option><option value="java">Java</option><option value="cpp">C++</option>
                </select>
                <button onClick={() => void generateChallenge()} disabled={generating} className={primaryBtn}>{generating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}</button>
              </div>
            </div>
            <div className="overflow-auto">
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_5.5rem] px-4 py-2 text-xs text-slate-500 border-b border-white/5"><span>Status</span><span>Title</span><span>Difficulty</span></div>
              {filtered.length === 0 ? <p className="p-4 text-sm text-slate-500">No problems in this filter.</p> : filtered.map((c, i) => (
                <button key={c.id} onClick={() => void openChallenge(c.id)} className={`grid w-full grid-cols-[2.5rem_minmax(0,1fr)_5.5rem] items-center px-4 py-3 text-left border-b border-white/5 hover:bg-white/5 ${challenge?.id === c.id ? "bg-brand-500/10" : ""}`}>
                  <span>{statusIcon(c.status)}</span>
                  <span className="min-w-0"><span className="mr-2 text-xs text-slate-500">{i + 1}.</span><span className="truncate text-sm text-slate-200">{c.title}</span><span className="block text-xs text-slate-500 truncate">{c.skill}</span></span>
                  <span className={`text-sm font-medium ${diffTone(c.difficulty)}`}>{diffLabel(c.difficulty)}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0">
            {loading && !challenge ? (
              <div className="flex items-center gap-3 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /><p>Loading challenge...</p></div>
            ) : !challenge ? (
              <div className={`${cardClass} py-12 text-center`}><Target className="mx-auto mb-4 h-12 w-12 text-slate-500" /><h3 className="mb-2 text-xl font-semibold">Pick a problem</h3><p className="text-sm text-slate-400">Select a problem from the list, or generate a new one for your skill gap.</p></div>
            ) : (
              <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                <div className="flex flex-col gap-4">
                  <section className={cardClass}>
                    <div className="mb-3 flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">{challenge.title}</h2><span className={`text-sm font-medium ${diffTone(challenge.difficulty)}`}>{diffLabel(challenge.difficulty)}</span><span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">{challenge.skill}</span><span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">{challenge.language}</span></div>
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200">{challenge.prompt}</pre>
                    {challenge.expected_time_complexity && <p className="mt-4 text-xs text-slate-400">Target: {challenge.expected_time_complexity}</p>}
                  </section>
                  <section className={cardClass}>
                    <div className="mb-3 flex items-center gap-2"><Code2 className="h-4 w-4 text-indigo-400" /><h2 className="font-semibold">Signature</h2></div>
                    <pre className="whitespace-pre-wrap rounded-xl bg-[#0d1220] p-4 font-mono text-sm text-emerald-200">{challenge.function_signature}</pre>
                  </section>
                  {milestoneMarked && <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4 text-emerald-400" /><p>Challenge passed — linked roadmap milestone marked complete.</p></div>}
                </div>

                <div className="flex flex-col gap-4">
                  <section className={cardClass}>
                    <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Code</h2><span className="text-xs text-slate-500">{({python:"Python 3",javascript:"JavaScript (Node.js)",java:"Java",cpp:"C++"} as Record<string,string>)[challenge.language] || challenge.language}</span></div>
                    <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} className={codeEditorClass} placeholder="# Write your solution here" aria-label="Code editor" />
                  </section>
                  {results && <section className={cardClass}>
                    <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Test Results {lastPassed !== null && <span className={`ml-2 text-sm ${lastPassed ? "text-emerald-400" : "text-red-400"}`}>{passedCount}/{results.length} passed</span>}</h2></div>
                    <ul className="space-y-2">{results.map((t, i) => (
                      <li key={i} className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                        <div className="flex items-start gap-3">{t.timed_out ? <Clock className="mt-0.5 h-4 w-4 text-yellow-400" /> : t.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" /> : <XCircle className="mt-0.5 h-4 w-4 text-red-400" />}
                          <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-200">{t.name || `Test ${i + 1}`} {t.timed_out ? "— timed out" : t.passed ? "— passed" : "— failed"}</p>
                            {!t.passed && !t.timed_out && <div className="mt-1 space-y-1">{t.stdout !== undefined && t.stdout !== "" && <pre className="max-h-24 overflow-auto rounded-md bg-black/30 p-2 font-mono text-xs text-slate-400"><span className="text-slate-500">stdout: </span>{t.stdout.slice(0, 500)}</pre>}{t.expected && <pre className="max-h-24 overflow-auto rounded-md bg-black/30 p-2 font-mono text-xs text-emerald-400/80"><span className="text-slate-500">expected: </span>{t.expected.slice(0, 500)}</pre>}</div>}
                            {t.stderr && t.stderr !== "" && <pre className="mt-1 max-h-24 overflow-auto rounded-md bg-black/30 p-2 font-mono text-xs text-red-400">{t.stderr.slice(0, 500)}</pre>}
                          </div></div>
                      </li>
                    ))}</ul>
                  </section>}
                </div>
              </div>
            )}
          </div>
        </div>
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
