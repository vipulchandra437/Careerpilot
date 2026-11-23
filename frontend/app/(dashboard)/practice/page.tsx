"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2, Play, Send, CheckCircle2, XCircle, Clock, AlertTriangle, Code2 } from "lucide-react";

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="rounded-md p-2 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Back"><ChevronLeft className="h-5 w-5" /></button>
            <div><h1 className="text-xl font-semibold tracking-tight">Problemset</h1><p className="text-xs text-slate-500">Practice coding problems</p></div>
          </div>
          <div className="flex items-center gap-2">
            <select value={language} onChange={(e) => { const v = e.target.value; setLanguage(v); void loadChallenges(undefined, undefined, v); }} className="rounded-md border border-white/10 bg-[#262626] px-3 py-1.5 text-sm text-slate-200 focus:outline-none">
              <option value="all">All Languages</option><option value="python">Python3</option><option value="javascript">JavaScript</option><option value="java">Java</option><option value="cpp">C++</option>
            </select>
            <button onClick={() => void generateChallenge()} disabled={generating} className="rounded-md bg-[#2cbb5d] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#32c766] disabled:opacity-50">{generating ? "Generating..." : "Generate"}</button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div>}

        <div className="grid grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:border xl:border-white/10 xl:rounded-lg overflow-hidden min-h-[calc(100vh-11rem)]">
          <aside className="flex flex-col border-b xl:border-b-0 xl:border-r border-white/10 bg-[#1a1a1a]">
            <div className="border-b border-white/10 p-3 space-y-3">
              <div className="flex flex-wrap gap-2">{([["all","All Topics"],...topics.filter(t=>t!=="all").map(t=>[t,t])] as [string,string][]).slice(0,8).map(([k,l]) => (
                <button key={k} onClick={() => setTopicFilter(k)} className={`rounded-full px-3 py-1 text-xs ${topicFilter===k ? "bg-white text-black" : "bg-[#303030] text-slate-300 hover:bg-[#3a3a3a]"}`}>{l}</button>
              ))}
                {topics.length > 9 && <select value={topicFilter} onChange={(e)=>setTopicFilter(e.target.value)} className="rounded-full bg-[#303030] px-3 py-1 text-xs text-slate-300 focus:outline-none"><option value="all">More</option>{topics.filter(t=>t!=="all").map(t=><option key={t} value={t}>{t}</option>)}</select>}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex rounded-md bg-[#262626] p-0.5">{([["all","All"],["beginner","Easy"],["intermediate","Med."],["advanced","Hard"]] as const).map(([k,l]) => (
                  <button key={k} onClick={() => setDifficultyFilter(k)} className={`px-3 py-1 text-xs rounded ${difficultyFilter===k ? "bg-[#3e3e3e] text-white" : "text-slate-400 hover:text-slate-200"}`}><span className={k==="beginner"?"text-emerald-400":k==="intermediate"?"text-amber-400":k==="advanced"?"text-red-400":""}>{l}</span></button>
                ))}</div>
                <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as typeof statusFilter)} className="rounded-md bg-[#262626] px-2 py-1.5 text-xs text-slate-300 focus:outline-none"><option value="all">Status</option><option value="solved">Solved</option><option value="attempted">Attempted</option><option value="unsolved">Todo</option></select>
                <div className="flex-1 min-w-[10rem] flex gap-2"><input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter") void loadChallenges(); }} placeholder="Search questions" className="w-full rounded-md bg-[#262626] px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none" /><button onClick={() => void loadChallenges()} className="rounded-md bg-[#262626] px-3 py-1.5 text-sm text-slate-300 hover:bg-[#333]">Search</button></div>
              </div>
            </div>
            <div className="overflow-auto flex-1">
              <div className="grid grid-cols-[3rem_minmax(0,1fr)_6rem] px-4 py-2 text-xs text-slate-500 border-b border-white/10"><span>Status</span><span>Title</span><span className="text-right">Difficulty</span></div>
              {filtered.length === 0 ? <p className="p-8 text-sm text-slate-500 text-center">No questions found.</p> : filtered.map((c, i) => (
                <button key={c.id} onClick={() => void openChallenge(c.id)} className={`grid w-full grid-cols-[3rem_minmax(0,1fr)_6rem] items-center px-4 py-2.5 text-left hover:bg-[#2a2a2a] ${challenge?.id === c.id ? "bg-[#2a2a2a]" : i % 2 === 1 ? "bg-[#262626]" : ""}`}>
                  <span className="flex items-center">{statusIcon(c.status)}</span>
                  <span className="min-w-0 pr-3"><span className="text-sm text-slate-200">{i + 1}. {c.title}</span></span>
                  <span className={`text-right text-sm ${diffTone(c.difficulty)}`}>{diffLabel(c.difficulty)}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0 bg-[#1a1a1a] flex flex-col">
            {loading && !challenge ? (
              <div className="flex flex-1 items-center justify-center gap-3 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /><p>Loading...</p></div>
            ) : !challenge ? (
              <div className="flex flex-1 flex-col items-center justify-center text-slate-500 p-8"><Code2 className="mb-3 h-10 w-10 opacity-40" /><p className="text-sm">Select a question to view details</p></div>
            ) : (
              <>
                <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0"><div className="flex items-center gap-2"><h2 className="font-medium text-slate-100 truncate">{challenge.title}</h2><span className={`text-xs ${diffTone(challenge.difficulty)}`}>{diffLabel(challenge.difficulty)}</span></div><div className="text-xs text-slate-500 mt-0.5">{challenge.skill} • {({python:"Python3",javascript:"JavaScript",java:"Java",cpp:"C++"} as Record<string,string>)[challenge.language] || challenge.language}</div></div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => runCode(false)} disabled={running} className="rounded-md bg-[#3e3e3e] px-3 py-1.5 text-sm text-slate-200 hover:bg-[#4a4a4a] disabled:opacity-50 inline-flex items-center gap-1.5">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Run</button>
                    <button onClick={() => runCode(true)} disabled={running} className="rounded-md bg-[#2cbb5d] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#32c766] disabled:opacity-50 inline-flex items-center gap-1.5">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Submit</button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  <section><pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-300">{challenge.prompt}</pre>{challenge.expected_time_complexity && <p className="mt-3 text-xs text-slate-500">Target: {challenge.expected_time_complexity}</p>}</section>
                  <section><div className="text-xs font-medium text-slate-400 mb-2">Signature</div><pre className="whitespace-pre-wrap rounded-md bg-[#262626] p-3 font-mono text-xs text-slate-200">{challenge.function_signature}</pre></section>
                  <section className="flex-1 flex flex-col"><div className="text-xs font-medium text-slate-400 mb-2">Code</div><textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} className="w-full min-h-[20rem] flex-1 resize-y rounded-md border border-white/10 bg-[#262626] p-3 font-mono text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-white/20" aria-label="Code editor" /></section>
                  {milestoneMarked && <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"><CheckCircle2 className="inline h-4 w-4 mr-2" />Passed — roadmap milestone marked complete.</div>}
                  {results && <section><div className="text-xs font-medium text-slate-400 mb-2">Testcase {lastPassed !== null && <span className={lastPassed ? "text-emerald-400" : "text-red-400"}>{passedCount}/{results.length} passed</span>}</div><div className="space-y-2">{results.map((t, i) => (
                    <div key={i} className="rounded-md bg-[#262626] p-3 text-sm"><div className="flex items-center gap-2">{t.timed_out ? <Clock className="h-4 w-4 text-yellow-400" /> : t.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}<span className="text-slate-300">{t.name || `Case ${i + 1}`}</span><span className="text-xs text-slate-500 ml-auto">{t.timed_out ? "Timed out" : t.passed ? "Accepted" : "Wrong Answer"}</span></div>
                    {!t.passed && !t.timed_out && <div className="mt-2 space-y-1 text-xs font-mono">{t.stdout !== undefined && t.stdout !== "" && <div><div className="text-slate-500">Output</div><pre className="bg-[#1a1a1a] p-2 rounded text-slate-300 overflow-auto">{t.stdout.slice(0,500)}</pre></div>}{t.expected && <div><div className="text-slate-500">Expected</div><pre className="bg-[#1a1a1a] p-2 rounded text-slate-300 overflow-auto">{t.expected.slice(0,500)}</pre></div>}</div>}
                    {t.stderr && <pre className="mt-2 text-xs font-mono bg-[#1a1a1a] p-2 rounded text-red-400 overflow-auto">{t.stderr.slice(0,500)}</pre>}</div>
                  ))}</div></section>}
                </div>
              </>
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
