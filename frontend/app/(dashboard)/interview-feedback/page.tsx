"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { redirectExpired } from "@/lib/auth";
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
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  question_scores: { turn_id: string; score: number; justification: string }[];
  weak_topics: { topic: string; confidence: number; evidence: string }[];
  structure_notes: string;
  conciseness_notes: string;
  referenced_turn_ids: string[];
  feedback_items: FeedbackItem[];
  remedial_actions: {
    topic: string;
    skill?: string;
    created: boolean;
    challenge_id: string | null;
    milestone_id?: string | null;
    status?: string | null;
  }[];
}


const cardClass = "card p-6";

const categoryColor: Record<string, { chip: string; dot: string }> = {
  clarity: { chip: "border-brand-300 bg-brand-50 text-brand-700", dot: "bg-brand-400" },
  structure: { chip: "border-emerald-500/40 bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
  conciseness: { chip: "border-amber-500/40 bg-amber-50 text-amber-700", dot: "bg-amber-400" },
};

function InterviewFeedbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId") || "";
  const milestoneIdParam = searchParams.get("milestoneId") || "";

  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [targetRoleId, setTargetRoleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const turnRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const milestoneMarkedRef = useRef(false);

  const ensureFeedback = useCallback(async () => {
    // Feedback is generated lazily: try GET, and if not generated yet, create it.
    const token = localStorage.getItem("access_token");
    let res = await fetch(`/api/interviews/${sessionId}/feedback`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      redirectExpired((path) => router.push(path));
      return null;
    }
    if (res.status === 404) {
      setGenerating(true);
      res = await fetch(`/api/interviews/${sessionId}/feedback`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setGenerating(false);
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login?reason=expired");
        return null;
      }
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

  const markMilestoneDone = useCallback(async () => {
    // The roadmap stage is completed by the backend after this interview's
    // feedback exists, not by a local progress toggle.
    if (!milestoneIdParam || milestoneMarkedRef.current) return;
    milestoneMarkedRef.current = true;
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/roadmap/milestones/${encodeURIComponent(milestoneIdParam)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (res.status === 401) {
        redirectExpired((path) => router.push(path));
        milestoneMarkedRef.current = false;
        return;
      }
      if (!res.ok) {
        milestoneMarkedRef.current = false;
        setError("Could not mark this roadmap milestone complete.");
      }
    } catch {
      milestoneMarkedRef.current = false;
      setError("Could not mark this roadmap milestone complete.");
    }
  }, [milestoneIdParam, router]);

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
          redirectExpired((path) => router.push(path));
          return;
        }
        if (!res.ok) {
          setError("Interview session not found.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setTranscript(data.transcript);
        setTargetRoleId(data.session?.target_role_id || "");
        const loadedFeedback = await ensureFeedback();
        if (loadedFeedback) await markMilestoneDone();
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, router, ensureFeedback, markMilestoneDone]);

  const jumpToTurn = (turnId: string) => {
    const node = turnRefs.current.get(turnId);
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      setActiveTurnId(turnId);
    }
  };

  if (loading || generating) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-canvas p-8">
        <div className="flex items-center gap-3 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>{generating ? "Analyzing your answers…" : "Loading feedback…"}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-canvas text-ink">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-[24rem] w-[24rem] rounded-full bg-brand-100/60 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-[24rem] w-[24rem] rounded-full bg-indigo-100/60 blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-4xl p-4 sm:p-8">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/mock-interview")}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-soft hover:text-ink"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Interview Feedback</h1>
              <p className="text-sm text-muted">Click a note to jump to the exact answer it quotes</p>
            </div>
          </div>
          {feedback && (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-soft/70 px-4 py-2">
              <Sparkles className="h-4 w-4 text-brand-600" />
              <span className="text-sm text-muted">Clarity</span>
              <span className="text-lg font-bold text-ink">{feedback.clarity_score}</span>
              <span className="text-xs text-muted">/5</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Transcript — above (DESIGN §2.7) */}
        <section className={`${cardClass} mb-6`}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <ChevronDown className="h-5 w-5 text-brand-600" />
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
                    ? "border-brand-400 bg-brand-50 ring-2 ring-brand-500/20"
                    : "border-line bg-soft/60"
                } ${t.role === "interviewer" ? "" : "border-indigo-200"}`}
                id={`turn-${t.id}`}
              >
                <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${t.role === "interviewer" ? "text-brand-600" : "text-indigo-700"}`}>
                  {t.role === "interviewer" ? "Interviewer" : "You"}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{t.content}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feedback — below, with turn links (DESIGN §2.7) */}
        {feedback && (
          <section className={`${cardClass} mb-6`}>
            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-indigo-700" />
              Notes from your interviewer
            </h2>
            <p className="mb-6 text-xs text-muted">
              Every note links to the exact answer it&apos;s about — click to jump. Quotes are verbatim from your transcript.
            </p>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-brand-500/20 bg-brand-50/60 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700">Overall score</p>
                <p className="text-3xl font-bold text-ink">{feedback.overall_score}<span className="text-sm text-muted">/5</span></p>
              </div>
              <div className="rounded-xl border border-line bg-soft/60 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Structure</p>
                <p className="text-sm leading-relaxed text-muted">{feedback.structure_notes}</p>
              </div>
              <div className="rounded-xl border border-line bg-soft/60 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Conciseness</p>
                <p className="text-sm leading-relaxed text-muted">{feedback.conciseness_notes}</p>
              </div>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-soft/60 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Strengths</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted">{feedback.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div className="rounded-xl border border-line bg-soft/60 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Weak topics</p>
                <ul className="space-y-2 text-sm text-muted">{feedback.weak_topics.map((item) => <li key={item.topic}><span className="font-medium text-ink">{item.topic}</span><span className="ml-2 text-xs text-muted">confidence {item.confidence}/5</span><br /><span className="text-xs text-muted">{item.evidence}</span></li>)}</ul>
              </div>
            </div>

            <div className="mb-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Per-question scores</p>
              {feedback.question_scores.map((item) => <button key={item.turn_id} onClick={() => jumpToTurn(item.turn_id)} className="w-full rounded-lg border border-line bg-soft/60 p-3 text-left text-sm text-muted hover:border-brand-300"><span className="font-semibold text-ink">{item.score}/5</span><span className="ml-3">{item.justification}</span></button>)}
            </div>

            {feedback.remedial_actions.length > 0 && (
              <div className="mb-6 rounded-xl border border-brand-500/20 bg-brand-50/60 p-4">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
                  <Route className="h-4 w-4" /> Keep practicing these gaps
                </p>
                <ul className="space-y-2">
                  {feedback.remedial_actions.map((item) => {
                    const skill = item.skill || item.topic;
                    const canPractice = !!item.challenge_id && !!skill && !!targetRoleId;
                    return (
                      <li key={item.topic} className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-medium text-ink">{item.topic}</span>
                        {item.created ? (
                          <span className="text-xs text-emerald-700">added to roadmap</span>
                        ) : (
                          <span className="text-xs text-muted">not on roadmap</span>
                        )}
                        <button
                          onClick={() => {
                            if (canPractice) {
                              const params = new URLSearchParams({ skill, targetRoleId });
                              if (item.challenge_id) params.set("challengeId", item.challenge_id);
                              if (item.milestone_id) params.set("milestoneId", item.milestone_id);
                              router.push(`/practice?${params.toString()}`);
                            } else {
                              router.push(`/roadmap${targetRoleId ? `?role=${encodeURIComponent(targetRoleId)}` : ""}`);
                            }
                          }}
                          className="btn-primary focus-ring ml-auto !h-auto !px-3 !py-1.5 text-xs"
                        >
                          {canPractice ? "Practice this" : "See roadmap"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <ul className="space-y-3">
              {feedback.feedback_items.map((item, i) => (
                <li key={i}>
                  <button
                    onClick={() => jumpToTurn(item.turn_id)}
                    className="w-full rounded-xl border border-line bg-soft/60 p-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/60"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`${categoryColor[item.category].dot} h-2 w-2 rounded-full`} />
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold capitalize ${categoryColor[item.category].chip}`}>
                        {item.category}
                      </span>
                      <span className="ml-auto text-xs text-muted">Jump to answer ↓</span>
                    </div>
                    <p className="mb-1 flex items-start gap-1.5 text-sm italic text-muted">
                      <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                      &ldquo;{item.quote}&rdquo;
                    </p>
                    <p className="text-sm text-muted">{item.comment}</p>
                  </button>
                </li>
              ))}
            </ul>

            {/* CTA — roadmap hook (DESIGN §2.7) */}
            <div className="mt-8 flex flex-col items-center gap-2 rounded-xl border border-dashed border-line p-5 text-center">
              <Route className="h-6 w-6 text-brand-600" />
              <p className="text-sm text-muted">
                {feedback.remedial_actions.length > 0
                  ? "Your weak topics are on the roadmap as practice challenges — see them any time."
                  : "Want to close this gap? Add related items to your roadmap."}
              </p>
              <button
                onClick={() => router.push(targetRoleId ? `/roadmap?role=${encodeURIComponent(targetRoleId)}` : "/roadmap")}
                className="btn-primary focus-ring mt-1 !px-5 !py-2 h-auto"
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
        <main className="relative flex min-h-screen items-center justify-center bg-canvas p-8">
          <div className="flex items-center gap-3 text-muted">
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