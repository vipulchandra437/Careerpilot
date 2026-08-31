"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  Route,
  Sparkles,
  Quote,
} from "lucide-react";

interface Turn {
  id: string;
  role: "interviewer" | "student";
  content: string;
  order_index: number;
}

interface FeedbackItem {
  turn_id: string;
  category: "clarity" | "structure" | "conciseness";
  quote: string;
  comment: string;
}

interface Feedback {
  clarity_score: number;
  structure_notes: string;
  conciseness_notes: string;
  referenced_turn_ids: string[];
  feedback_items: FeedbackItem[];
}

const cardClass =
  "rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl";

const categoryColor: Record<string, { chip: string; dot: string }> = {
  clarity: { chip: "border-blue-500/40 bg-blue-950/40 text-blue-300", dot: "bg-blue-400" },
  structure: { chip: "border-emerald-500/40 bg-emerald-950/40 text-emerald-300", dot: "bg-emerald-400" },
  conciseness: { chip: "border-amber-500/40 bg-amber-950/40 text-amber-300", dot: "bg-amber-400" },
};

function InterviewFeedbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId") || "";

  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const turnRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const ensureFeedback = useCallback(async () => {
    // Feedback is generated lazily: try GET, and if not generated yet, create it.
    const token = localStorage.getItem("access_token");
    let res = await fetch(`/api/interviews/${sessionId}/feedback`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      localStorage.removeItem("access_token");
      router.push("/login?reason=expired");
      return null;
    }
    if (res.status === 404) {
      setGenerating(true);
      res = await fetch(`/api/interviews/${sessionId}/feedback`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setGenerating(false);
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Could not load feedback");
      return null;
    }
    const data = await res.json();
    setFeedback(data.feedback);
    return data.feedback;
  }, [sessionId, router]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    if (!sessionId) {
      setError("Missing interview session.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/interviews/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          localStorage.removeItem("access_token");
          router.push("/login?reason=expired");
          return;
        }
        if (!res.ok) {
          setError("Interview session not found.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setTranscript(data.transcript);
        await ensureFeedback();
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, router, ensureFeedback]);

  const jumpToTurn = (turnId: string) => {
    const node = turnRefs.current.get(turnId);
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      setActiveTurnId(turnId);
    }
  };

  if (loading || generating) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-[#0a0e17] p-8">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>{generating ? "Analyzing your answers…" : "Loading feedback…"}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#0a0e17] text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-[24rem] w-[24rem] rounded-full bg-blue-600/15 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-[24rem] w-[24rem] rounded-full bg-indigo-600/15 blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-4xl p-4 sm:p-8">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/mock-interview")}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Interview Feedback</h1>
              <p className="text-sm text-slate-400">Click a note to jump to the exact answer it quotes</p>
            </div>
          </div>
          {feedback && (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-slate-300">Clarity</span>
              <span className="text-lg font-bold text-white">{feedback.clarity_score}</span>
              <span className="text-xs text-slate-500">/5</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Transcript — above (DESIGN §2.7) */}
        <section className={`${cardClass} mb-6`}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <ChevronDown className="h-5 w-5 text-blue-400" />
            Transcript
          </h2>
          <div className="flex flex-col gap-4">
            {transcript.map((t) => (
              <div
                key={t.id}
                ref={(node) => {
                  turnRefs.current.set(t.id, node);
                }}
                className={`rounded-xl border p-4 transition-colors duration-300 ${
                  activeTurnId === t.id
                    ? "border-blue-500/60 bg-blue-950/30 ring-2 ring-blue-500/20"
                    : "border-white/10 bg-white/[0.02]"
                } ${t.role === "interviewer" ? "" : "border-indigo-500/20"}`}
                id={`turn-${t.id}`}
              >
                <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${t.role === "interviewer" ? "text-blue-400" : "text-indigo-400"}`}>
                  {t.role === "interviewer" ? "Interviewer" : "You"}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{t.content}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feedback — below, with turn links (DESIGN §2.7) */}
        {feedback && (
          <section className={`${cardClass} mb-6`}>
            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              Notes from your interviewer
            </h2>
            <p className="mb-6 text-xs text-slate-500">
              Every note links to the exact answer it&apos;s about — click to jump. Quotes are verbatim from your transcript.
            </p>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-400">Structure</p>
                <p className="text-sm leading-relaxed text-slate-300">{feedback.structure_notes}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-400">Conciseness</p>
                <p className="text-sm leading-relaxed text-slate-300">{feedback.conciseness_notes}</p>
              </div>
            </div>

            <ul className="space-y-3">
              {feedback.feedback_items.map((item, i) => (
                <li key={i}>
                  <button
                    onClick={() => jumpToTurn(item.turn_id)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition-colors hover:border-blue-500/40 hover:bg-white/[0.04]"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`${categoryColor[item.category].dot} h-2 w-2 rounded-full`} />
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold capitalize ${categoryColor[item.category].chip}`}>
                        {item.category}
                      </span>
                      <span className="ml-auto text-xs text-slate-500">Jump to answer ↓</span>
                    </div>
                    <p className="mb-1 flex items-start gap-1.5 text-sm italic text-slate-300">
                      <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                      &ldquo;{item.quote}&rdquo;
                    </p>
                    <p className="text-sm text-slate-200">{item.comment}</p>
                  </button>
                </li>
              ))}
            </ul>

            {/* CTA — roadmap hook (DESIGN §2.7) */}
            <div className="mt-8 flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 p-5 text-center">
              <Route className="h-6 w-6 text-blue-400" />
              <p className="text-sm text-slate-300">
                Want to close this gap? Add related items to your roadmap.
              </p>
              <button
                onClick={() => router.push("/roadmap")}
                className="mt-1 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:brightness-110"
              >
                See my roadmap
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function InterviewFeedbackPage() {
  return (
    <Suspense
      fallback={
        <main className="relative flex min-h-screen items-center justify-center bg-[#0a0e17] p-8">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Loading feedback...</p>
          </div>
        </main>
      }
    >
      <InterviewFeedbackContent />
    </Suspense>
  );
}