"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Mic, Send, Square, Timer } from "lucide-react";
import { VoiceInterview } from "@/components/interview/VoiceInterview";
import { redirectExpired } from "@/lib/auth";

interface Turn {
  id: string;
  role: "interviewer" | "student";
  content: string;
  order_index: number;
}

const cardClass =
  "card p-5";

function MockInterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "";
  const milestoneIdParam = searchParams.get("milestoneId") || "";

  // Deep links start in "pick" so a failed auto-start still leaves a usable
  // screen; startInterview moves to "chat" only on success.
  const [stage, setStage] = useState<"pick" | "chat">("pick");
  const [type, setType] = useState<string>(initialType || "");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");
  const [showTimer, setShowTimer] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showVoice, setShowVoice] = useState(false);
  const autoStarted = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTimer) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [showTimer]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    // Guard against StrictMode's second mount starting a duplicate session.
    if (!initialType || autoStarted.current) return;
    autoStarted.current = true;
    void startInterview(initialType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialType, router]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [transcript, waiting]);

  if (showVoice) {
    return <VoiceInterview onExit={() => setShowVoice(false)} />;
  }

  const startInterview = async (t: string) => {
    const token = localStorage.getItem("access_token");
    setWaiting(true);
    setError("");
    try {
      const res = await fetch("/api/interviews/sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type: t, target_role_id: null, domain: "sde" }),
      });
      if (res.status === 401) {
        redirectExpired((path) => router.push(path));
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
        redirectExpired((path) => router.push(path));
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setInput("");
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
        redirectExpired((path) => router.push(path));
        setEnding(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setTranscript(data.transcript);
        router.push(`/interview-feedback?sessionId=${sessionId}${milestoneIdParam ? `&milestoneId=${encodeURIComponent(milestoneIdParam)}` : ""}`);
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
    const diff = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
    return `${Math.floor(diff / 60)}:${String(diff % 60).padStart(2, "0")}`;
  };

  return (
    <main className="relative flex min-h-screen flex-col bg-canvas text-ink">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-[24rem] w-[24rem] rounded-full bg-brand-100/60 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-[24rem] w-[24rem] rounded-full bg-indigo-100/60 blur-[100px]" />
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-4 sm:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-soft hover:text-ink"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Mock Interview</h1>
              <p className="text-sm capitalize text-muted">{type || "Choose a round"}</p>
            </div>
          </div>
          {stage === "chat" && (
            <div className="flex items-center gap-3">
              {type === "behavioral" && (
                <button
                  onClick={() => setShowTimer((v) => !v)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    showTimer
                      ? "border-brand-300 bg-brand-50 text-brand-700"
                      : "border-line bg-soft text-muted hover:bg-soft"
                  }`}
                >
                  <Timer className="h-4 w-4" />
                  {showTimer ? elapsed() : "Timer"}
                </button>
              )}
              <button
                onClick={finishInterview}
                disabled={ending}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-soft px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-soft hover:text-ink disabled:pointer-events-none disabled:opacity-50"
              >
                {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                {ending ? "Closing..." : "Finish interview"}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 backdrop-blur">
            {error}
          </div>
        )}

        {stage === "pick" ? (
          <div>
            <button
              type="button"
              onClick={() => setShowVoice(true)}
              className="group card card-hover focus-ring mb-5 flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Mic className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold text-ink">Voice call — new</span>
                  <span className="mt-0.5 block text-sm text-muted">
                    Spoken questions, live browser-only coaching and a post-call report.
                  </span>
                </span>
              </span>
              <span className="text-sm font-semibold text-brand-700 group-hover:text-brand-700">Start voice interview →</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            {/* Chat */}
            <div className={`${cardClass} flex flex-1 flex-col gap-4 overflow-y-auto`} style={{ maxHeight: "calc(100vh - 16rem)" }} role="log" aria-label="Interview transcript">
              {transcript.length === 0 && (
                <div className="flex items-center gap-3 text-muted">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <p>Opening the interview...</p>
                </div>
              )}
              {transcript.map((t) =>
                t.role === "interviewer" ? (
                  <div key={t.id} className="max-w-[85%] self-start">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700">Interviewer</p>
                    <div className="rounded-2xl rounded-tl-sm border border-line bg-soft px-4 py-3 text-sm leading-relaxed text-muted">
                      {t.content}
                    </div>
                  </div>
                ) : (
                  <div key={t.id} className="max-w-[85%] self-end">
                    <p className="mb-1 text-right text-xs font-semibold uppercase tracking-wide text-indigo-700">You</p>
                    <div className="rounded-2xl rounded-tr-sm bg-gradient-brand px-4 py-3 text-sm leading-relaxed text-white shadow-glow-indigo">
                      {t.content}
                    </div>
                  </div>
                )
              )}
              {waiting && (
                <div className="max-w-[85%] self-start">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700">Interviewer</p>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-line bg-soft px-4 py-3">
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
                className="min-h-[3.5rem] flex-1 resize-y rounded-xl border border-line bg-soft/70 px-4 py-3 text-sm text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
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
        <main className="relative flex min-h-screen items-center justify-center bg-canvas p-8">
          <div className="flex items-center gap-3 text-muted">
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