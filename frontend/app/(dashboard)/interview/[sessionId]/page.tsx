"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Loader2, Sparkles } from "lucide-react";
import { computeReadiness, type ReadinessResult } from "@/lib/readiness";
import type { InterviewReportData, SavedAnswer } from "@/lib/interview/report";

const METRICS = [
  ["clarity", "Clarity"],
  ["structure", "Structure"],
  ["conciseness", "Conciseness"],
  ["confidence", "Confidence"],
  ["eyeContact", "Eye contact"],
  ["pace", "Pace"],
] as const;

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 52;
  const dash = (Math.min(10, Math.max(0, score)) / 10) * circumference;
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32" role="img" aria-label={`Score ${score} out of 10`}>
      <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
      <circle
        cx="60"
        cy="60"
        r="52"
        fill="none"
        stroke="url(#ring)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform="rotate(-90 60 60)"
      />
      <defs>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <text x="60" y="58" textAnchor="middle" fill="white" fontSize="30" fontWeight="700">{score}</text>
      <text x="60" y="78" textAnchor="middle" fill="#94a3b8" fontSize="11">out of 10</text>
    </svg>
  );
}

function QuestionCard({ answer }: { answer: SavedAnswer }) {
  return (
    <details className="card group p-5">
      <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15 text-sm font-semibold text-brand-200">{answer.index + 1}</span>
          <span className="text-sm font-medium text-slate-200">{answer.question}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs font-semibold text-white">{answer.score}/10</span>
          <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="mt-4 border-t border-white/5 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your answer</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{answer.text}</p>
        {answer.metrics.tips.length ? (
          <ul className="mt-4 space-y-1.5">
            {answer.metrics.tips.map((tip) => (
              <li key={tip} className="flex gap-2 text-sm text-amber-200/90"><span aria-hidden="true">•</span>{tip}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-emerald-300">Solid answer — no quick fixes.</p>
        )}
      </div>
    </details>
  );
}

export default function InterviewReportPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const router = useRouter();
  const [report, setReport] = useState<InterviewReportData | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    (async () => {
      try {
        const [detailRes, readinessRes] = await Promise.all([
          fetch(`/api/interview/turn?sessionId=${encodeURIComponent(sessionId)}`, { headers }),
          fetch("/api/readiness", { headers }),
        ]);
        if (detailRes.status === 401 || readinessRes.status === 401) {
          localStorage.removeItem("access_token");
          router.push("/login?reason=expired");
          return;
        }
        if (!detailRes.ok) {
          setError("Report not found for this session.");
          return;
        }
        const detail = (await detailRes.json()) as { report: InterviewReportData };
        setReport(detail.report);
        if (readinessRes.ok) {
          const data = (await readinessRes.json()) as { readiness: ReadinessResult };
          setReadiness(data.readiness);
        } else {
          setReadiness(computeReadiness({ interviewScore: detail.report.overallScore }));
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, sessionId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface text-slate-400">
        <div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin" /> Loading report…</div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-surface text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-[24rem] w-[24rem] rounded-full bg-brand-600/20 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-[24rem] w-[24rem] rounded-full bg-indigo-600/15 blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-6xl p-4 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/mock-interview" className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Interview report</h1>
              <p className="text-sm text-slate-400">Your voice interview, answer by answer</p>
            </div>
          </div>
          <Link href="/mock-interview" className="btn-primary focus-ring !px-4 !py-2 !text-sm">Practice again</Link>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>
        ) : null}

        {report ? (
          <div className="space-y-6">
            <section className="card flex flex-wrap items-center gap-8 p-6">
              <ScoreRing score={report.overallScore} />
              <div className="min-w-[12rem] flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">Verdict</p>
                <h2 className="mt-1 text-3xl font-bold text-white">{report.verdict}</h2>
                <p className="mt-2 text-sm text-slate-400">
                  {report.answers.length} answers · feedback by {report.generatedBy === "rules" ? "local checks" : "AI + local checks"}
                </p>
                {readiness ? (
                  <p className="mt-4 text-sm text-slate-300">
                    Readiness <span className="font-bold text-white">{readiness.score}/100</span>
                    <span className="ml-2 text-xs text-slate-500">
                      interview {readiness.interviewComponent} (60%) · resume {readiness.resumeComponent} (40%)
                      {readiness.coverage === "interview" ? " · analyse your resume to complete this score" : ""}
                    </span>
                  </p>
                ) : null}
              </div>
            </section>

            <section aria-label="Six feedback metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {METRICS.map(([key, label]) => (
                <div key={key} className="card p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{report.metrics[key]}<span className="text-sm text-slate-500">/10</span></p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${report.metrics[key] * 10}%` }} />
                  </div>
                </div>
              ))}
            </section>

            {report.topFixes.length ? (
              <section className="card p-6">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-5 w-5 text-brand-400" /> Top fixes</h2>
                <ul className="space-y-2">
                  {report.topFixes.map((fix) => (
                    <li key={fix} className="flex gap-2 text-sm text-slate-200"><span className="text-amber-300">•</span>{fix}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section aria-label="Answers">
              <h2 className="mb-3 text-lg font-semibold">Your answers</h2>
              <div className="space-y-3">
                {report.answers.map((answer) => <QuestionCard key={answer.index} answer={answer} />)}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
