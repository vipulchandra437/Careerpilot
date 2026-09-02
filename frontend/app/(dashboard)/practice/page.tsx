"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
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
  stderr: string;
  elapsed_ms: number;
}

const cardClass =
  "rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl";

const primaryBtn =
  "btn-primary focus-ring !px-4 !py-2 !text-sm disabled:opacity-50";

const runBtn =
  "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-50";

const codeEditorClass =
  "w-full min-h-[26rem] flex-1 resize-y rounded-xl border border-white/10 bg-[#0d1220] p-4 font-mono text-sm text-emerald-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-600";

function PracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [challenge, setChallenge] = useState<{
    id: string;
    title: string;
    prompt: string;
    function_signature: string;
    starter_code: string;
    difficulty: string;
    skill: string;
    expected_time_complexity: string | null;
  } | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [lastPassed, setLastPassed] = useState<boolean | null>(null);
  const [milestoneMarked, setMilestoneMarked] = useState(false);

  const skill = searchParams.get("skill") || "python";
  // Difficulty is adaptive (PRD §6.3): resolved server-side from the user's
  // ChallengeProgress for this skill (2 correct -> up, 2 incorrect -> down).
  // Any URL-provided difficulty param is ignored — the system owns the level.
  const difficulty = "adaptive";
  const targetRoleId = searchParams.get("targetRoleId") || "";
  const milestoneId = searchParams.get("milestoneId") || "";

  const generateChallenge = useCallback(async () => {
    setGenerating(true);
    setError("");
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch("/api/challenges/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skill,
          difficulty,
          target_role_id: targetRoleId,
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
        setChallenge(data);
        setCode(data.starter_code || "");
      } else {
        setError(data.detail || "Failed to generate challenge");
      }
    } catch {
      setError("Network error");
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }, [skill, difficulty, targetRoleId, milestoneId, router]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    if (skill && targetRoleId) {
      generateChallenge();
    } else {
      setError("Missing skill or target role parameters.");
      setLoading(false);
    }
  }, [generateChallenge, skill, targetRoleId, router]);

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

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0e17] text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-[24rem] w-[24rem] rounded-full bg-blue-600/15 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-[24rem] w-[24rem] rounded-full bg-indigo-600/15 blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-7xl p-6 sm:p-8">
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
              <h1 className="text-2xl font-bold tracking-tight">
                {challenge?.title || "Coding Practice"}
              </h1>
              <p className="text-sm text-slate-400">
                {challenge
                  ? `${challenge.skill} • ${challenge.difficulty} • challenge`
                  : "Practice your skill gaps"}
              </p>
            </div>
          </div>
          {challenge && (
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => runCode(false)} disabled={running} className={runBtn}>
                {running ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run
                  </>
                )}
              </button>
              <button onClick={() => runCode(true)} disabled={running} className={primaryBtn}>
                {running ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-300 backdrop-blur">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-red-400" />
            <p>{error}</p>
          </div>
        )}

        {generating && !challenge ? (
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Generating a challenge for {skill}...</p>
          </div>
        ) : !challenge ? (
          <div className={`${cardClass} text-center py-12`}>
            <Target className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No challenge available</h3>
            <p className="text-sm text-slate-400 mb-6">
              {error || "Add skill and target role parameters to generate a challenge."}
            </p>
            <button onClick={() => router.back()} className={runBtn}>
              Go back
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Problem prompt — left/top (mobile stacks on top per DESIGN §2.5) */}
            <div className="flex flex-col gap-6">
              <section className={cardClass}>
                <div className="mb-4 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-400" />
                  <h2 className="text-lg font-semibold">Problem</h2>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200">
                  {challenge.prompt}
                </pre>
                {challenge.expected_time_complexity && (
                  <p className="mt-4 text-xs text-slate-400">
                    Target: {challenge.expected_time_complexity}
                  </p>
                )}
              </section>

              <section className={cardClass}>
                <div className="mb-4 flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-indigo-400" />
                  <h2 className="text-lg font-semibold">Signature</h2>
                </div>
                <pre className="whitespace-pre-wrap rounded-xl bg-[#0d1220] p-4 font-mono text-sm text-emerald-200">
                  {challenge.function_signature}
                </pre>
              </section>

              {milestoneMarked && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300 backdrop-blur">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <p>Challenge passed — linked roadmap milestone marked complete.</p>
                </div>
              )}
            </div>

            {/* Editor + feedback — right/bottom */}
            <div className="flex flex-col gap-6">
              <section className={cardClass}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Solution</h2>
                  <span className="text-xs text-slate-500">Python 3</span>
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  className={codeEditorClass}
                  placeholder="# Write your solution here"
                  aria-label="Code editor"
                />
              </section>

              {results && (
                <section className={cardClass}>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                      Results
                      {lastPassed !== null && (
                        <span className={`ml-2 text-sm ${lastPassed ? "text-emerald-400" : "text-red-400"}`}>
                          {passedCount}/{results.length} passed
                        </span>
                      )}
                    </h2>
                  </div>
                  <ul className="space-y-2">
                    {results.map((t, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"
                      >
                        {t.timed_out ? (
                          <Clock className="mt-0.5 h-4 w-4 text-yellow-400" />
                        ) : t.passed ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 text-red-400" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-200">
                            {t.name || `Test ${i + 1}`}
                            {t.timed_out ? " — timed out" : t.passed ? " — passed" : " — failed"}
                          </p>
                          {!t.passed && !t.timed_out && t.stdout !== undefined && t.stdout !== "" && (
                            <pre className="mt-1 max-h-24 overflow-auto rounded-md bg-black/30 p-2 font-mono text-xs text-slate-400">
                              {t.stdout.slice(0, 500)}
                            </pre>
                          )}
                          {t.stderr && t.stderr !== "" && (
                            <pre className="mt-1 max-h-24 overflow-auto rounded-md bg-black/30 p-2 font-mono text-xs text-red-400">
                              {t.stderr.slice(0, 500)}
                            </pre>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
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
        <main className="relative flex min-h-screen items-center justify-center bg-[#0a0e17] p-8">
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
