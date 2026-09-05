"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BrainCircuit,
  Code2,
  Users,
  Loader2,
  Send,
  Square,
  Timer,
} from "lucide-react";

interface Turn {
  id: string;
  role: "interviewer" | "student";
  content: string;
  order_index: number;
}

const cardClass =
  "card p-5";

const typeMeta: Record<string, { icon: typeof Code2; title: string; desc: string }> = {
  technical: {
    icon: Code2,
    title: "Technical",
    desc: "DSA and system-design questions. The interviewer goes deeper on whatever you name.",
  },
  behavioral: {
    icon: BrainCircuit,
    title: "Behavioral",
    desc: "STAR-style questions about real experiences. The interviewer presses for concrete situations and outcomes.",
  },
  hr: {
    icon: Users,
    title: "HR",
    desc: "Motivation, collaboration, conflict, ownership, and work-style questions with evidence-based feedback.",
  },
};

const domains = [
  ["sde", "Software engineering"],
  ["web", "Web / full-stack"],
  ["ml_ai", "ML / AI"],
  ["mobile", "Mobile"],
  ["data", "Data"],
  ["systems", "Systems"],
] as const;

function MockInterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "";

  const [stage, setStage] = useState<"pick" | "chat">(initialType ? "chat" : "pick");
  const [type, setType] = useState<string>(initialType || "");
  const [targetRoleId, setTargetRoleId] = useState("");
  const [targetRoles, setTargetRoles] = useState<{ id: string; name: string }[]>([]);
  const [domain, setDomain] = useState("sde");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");
  const [showTimer, setShowTimer] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    if (initialType && stage === "chat" && !sessionId) {
      void startInterview(initialType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetch("/api/gap/roles", { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTargetRoles(Array.isArray(data) ? data : []))
      .catch(() => setTargetRoles([]));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [transcript, waiting]);

  const startInterview = async (t: string) => {
    const token = localStorage.getItem("access_token");
    setWaiting(true);
    setError("");
    try {
      const res = await fetch("/api/interviews/sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type: t, target_role_id: targetRoleId || null, domain }),
      });
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login?reason=expired");
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setType(t);
        setSessionId(data.session.id);
        setStartedAt(data.session.started_at);
        setTranscript(data.transcript);
        setStage("chat");
      } else {
        setError(data.detail || "Could not start the interview");
      }
    } catch {
      setError("Network error");
    } finally {
      setWaiting(false);
    }
  };

  const sendAnswer = async () => {
    const answer = input.trim();
    if (!answer || !sessionId || waiting) return;
    setInput("");
    setWaiting(true);
    setError("");
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`/api/interviews/${sessionId}/answer`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: answer }),
      });
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login?reason=expired");
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setTranscript(data.transcript);
      } else {
        setError(data.detail || "Could not send your answer");
      }
    } catch {
      setError("Network error");
    } finally {
      setWaiting(false);
    }
  };

  const finishInterview = async () => {
    if (!sessionId || ending) return;
    setEnding(true);
    setError("");
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`/api/interviews/${sessionId}/end`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login?reason=expired");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setTranscript(data.transcript);
        router.push(`/interview-feedback?sessionId=${sessionId}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Could not finish the interview");
        setEnding(false);
      }
    } catch {
      setError("Network error");
      setEnding(false);
    }
  };

  const elapsed = () => {
    if (!startedAt) return "0:00";
    const diff = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    return `${Math.floor(diff / 60)}:${String(diff % 60).padStart(2, "0")}`;
  };

  return (
    <main className="relative flex min-h-screen flex-col bg-surface text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-[24rem] w-[24rem] rounded-full bg-brand-600/20 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-[24rem] w-[24rem] rounded-full bg-indigo-600/15 blur-[100px]" />
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-4 sm:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Mock Interview</h1>
              <p className="text-sm capitalize text-slate-400">{type || "Choose a round"}</p>
            </div>
          </div>
          {stage === "chat" && (
            <div className="flex items-center gap-3">
              {type === "behavioral" && (
                <button
                  onClick={() => setShowTimer((v) => !v)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    showTimer
                      ? "border-brand-500/40 bg-brand-500/15 text-brand-200"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <Timer className="h-4 w-4" />
                  {showTimer ? elapsed() : "Timer"}
                </button>
              )}
              <button
                onClick={finishInterview}
                disabled={ending}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-50"
              >
                {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                {ending ? "Closing..." : "Finish interview"}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-300 backdrop-blur">
            {error}
          </div>
        )}

        {stage === "pick" ? (
          <div>
            <div className="card mb-5 grid gap-4 p-5 sm:grid-cols-2">
              <label className="text-sm text-slate-300">
                Target role
                <select value={targetRoleId} onChange={(e) => setTargetRoleId(e.target.value)} className="input mt-2">
                  <option value="">Choose a role (optional)</option>
                  {targetRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
              </label>
              <label className="text-sm text-slate-300">
                CS domain
                <select value={domain} onChange={(e) => setDomain(e.target.value)} className="input mt-2">
                  {domains.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(typeMeta).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <button
                  key={key}
                  onClick={() => startInterview(key)}
                  disabled={waiting}
                  className="group card card-hover focus-ring animate-fade-up p-6 text-left disabled:pointer-events-none disabled:opacity-50"
                >
                  <Icon className="mb-4 h-8 w-8 text-brand-300 transition-colors group-hover:text-brand-200" />
                  <h2 className="mb-1 text-lg font-semibold">{meta.title}</h2>
                  <p className="text-sm text-slate-400">{meta.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-300">
                    {waiting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Starting...
                      </>
                    ) : (
                      "Start interview"
                    )}
                  </span>
                </button>
              );
            })}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            {/* Chat */}
            <div className={`${cardClass} flex flex-1 flex-col gap-4 overflow-y-auto`} style={{ maxHeight: "calc(100vh - 16rem)" }} role="log" aria-label="Interview transcript">
              {transcript.length === 0 && (
                <div className="flex items-center gap-3 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <p>Opening the interview...</p>
                </div>
              )}
              {transcript.map((t) =>
                t.role === "interviewer" ? (
                  <div key={t.id} className="max-w-[85%] self-start">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-300">Interviewer</p>
                    <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.05] px-4 py-3 text-sm leading-relaxed text-slate-200">
                      {t.content}
                    </div>
                  </div>
                ) : (
                  <div key={t.id} className="max-w-[85%] self-end">
                    <p className="mb-1 text-right text-xs font-semibold uppercase tracking-wide text-indigo-400">You</p>
                    <div className="rounded-2xl rounded-tr-sm bg-gradient-brand px-4 py-3 text-sm leading-relaxed text-white shadow-glow-indigo">
                      {t.content}
                    </div>
                  </div>
                )
              )}
              {waiting && (
                <div className="max-w-[85%] self-start">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-300">Interviewer</p>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.05] px-4 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input */}
            <form
              className="mb-16 mt-4 flex items-center gap-3 md:mb-0"
              onSubmit={(e) => {
                e.preventDefault();
                void sendAnswer();
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendAnswer();
                  }
                }}
                disabled={waiting || ending}
                rows={2}
                className="min-h-[3.5rem] flex-1 resize-y rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50"
                placeholder="Type your answer… (Enter to send, Shift+Enter for newline)"
                aria-label="Your answer"
              />
              <button
                type="submit"
                disabled={waiting || ending || !input.trim()}
                className="btn-primary focus-ring h-[3.5rem] !px-5 !py-0 disabled:pointer-events-none disabled:opacity-50"
              >
                {waiting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

export default function MockInterviewPage() {
  return (
    <Suspense
      fallback={
        <main className="relative flex min-h-screen items-center justify-center bg-surface p-8">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Loading interview...</p>
          </div>
        </main>
      }
    >
      <MockInterviewContent />
    </Suspense>
  );
}