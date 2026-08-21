"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import {
  Mic2,
  Loader2,
  Send,
  Flag,
  CheckCircle2,
  MessageSquareText,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Timer,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/score-ring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

type Company = { id: string; name: string; jobRoles: { id: string; title: string }[] };
type RecentInterview = {
  id: string;
  type: string;
  difficulty: string;
  status: string;
  score: number | null;
  createdAt: string;
};

type Evaluation = {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
};

type QuestionReport = {
  question: string;
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  timeSpent: number | null;
};

type Report = {
  totalScore: number;
  grade: string;
  questionCount: number;
  perQuestion: QuestionReport[];
  strengths: string[];
  improvements: string[];
  type: string;
  difficulty: string;
  timeAnalysis: {
    avgTimePerQuestion: number | null;
    totalTime: number | null;
    fastestQuestion: { question: string; time: number } | null;
    slowestQuestion: { question: string; time: number } | null;
  };
  typeBreakdown: {
    strongest: { type: string; avgScore: number } | null;
    weakest: { type: string; avgScore: number } | null;
    byType: Record<string, { total: number; count: number }>;
  };
  recommendations: string[];
};

const TYPES = [
  { value: "HR", label: "HR Interview" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "BEHAVIORAL", label: "Behavioral" },
  { value: "SYSTEM_DESIGN", label: "System Design" },
  { value: "AI_ML", label: "AI/ML" },
];

const TIME_LIMITS: Record<string, number> = {
  HR: 60,
  TECHNICAL: 90,
  BEHAVIORAL: 120,
  SYSTEM_DESIGN: 120,
  AI_ML: 90,
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function TimerDisplay({
  remaining,
  total,
  isRunning,
}: {
  remaining: number;
  total: number;
  isRunning: boolean;
}) {
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const radius = 22;
  const stroke = 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color =
    remaining <= 10
      ? "var(--destructive, #ef4444)"
      : remaining <= 30
        ? "var(--chart-3, #f59e0b)"
        : "var(--primary)";

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center" style={{ width: 52, height: 52 }}>
        <svg width={52} height={52} className="-rotate-90">
          <circle
            cx={26}
            cy={26}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          <circle
            cx={26}
            cy={26}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            stroke={color}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color, fontSize: remaining <= 10 ? 11 : 12 }}
          >
            {formatTime(remaining)}
          </span>
        </div>
      </div>
    </div>
  );
}

function QuestionNav({
  questions,
  current,
  evaluations,
  flagged,
  onSelect,
  onToggleFlag,
}: {
  questions: { id: string; prompt: string; order: number }[];
  current: number;
  evaluations: Record<string, Evaluation>;
  flagged: Set<string>;
  onSelect: (i: number) => void;
  onToggleFlag: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {questions.map((q, i) => {
        const answered = evaluations[q.id] !== undefined;
        const isCurrent = i === current;
        const isFlagged = flagged.has(q.id);
        return (
          <button
            key={q.id}
            onClick={() => onSelect(i)}
            className={`
              relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all
              ${isCurrent ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2" : answered ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-muted text-muted-foreground hover:bg-muted/80"}
            `}
            title={q.prompt.slice(0, 60)}
          >
            {i + 1}
            {isFlagged && (
              <Flag className="absolute -right-1 -top-1 size-3 fill-orange-500 text-orange-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function StarMethodCard() {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" />
        }
      >
        <Target className="size-3.5" />
        STAR Method Guide
        {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Structure your answer using STAR
          </p>
          <div className="grid gap-2.5 text-sm">
            <div className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">S</span>
              <div>
                <div className="font-medium">Situation</div>
                <div className="text-xs text-muted-foreground">Set the context — when and where did this happen?</div>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-purple-100 text-xs font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">T</span>
              <div>
                <div className="font-medium">Task</div>
                <div className="text-xs text-muted-foreground">What was your responsibility or the challenge?</div>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">A</span>
              <div>
                <div className="font-medium">Action</div>
                <div className="text-xs text-muted-foreground">What specific steps did you take?</div>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">R</span>
              <div>
                <div className="font-medium">Result</div>
                <div className="text-xs text-muted-foreground">What was the outcome? Use numbers if possible.</div>
              </div>
            </div>
          </div>
          <div className="rounded-md bg-background p-3 text-xs text-muted-foreground border">
            <span className="font-medium text-foreground">Example format:</span>{" "}
            &quot;In my previous role (S), I was tasked with reducing page load time (T). I implemented code splitting and lazy loading (A), which reduced load time by 40% (R).&quot;
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const styles: Record<string, string> = {
    A: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400",
    B: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400",
    C: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400",
    D: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400",
    F: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-sm font-bold ${styles[grade] ?? styles.C}`}>
      {grade}
    </span>
  );
}

function ScoreBar({ score, maxScore = 100 }: { score: number; maxScore?: number }) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold tabular-nums">{score}</span>
    </div>
  );
}

export function InterviewWorkspace({
  companies,
  recent,
}: {
  companies: Company[];
  recent: RecentInterview[];
}) {
  const [type, setType] = useState("TECHNICAL");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [companyId, setCompanyId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [starting, setStarting] = useState(false);
  const [interview, setInterview] = useState<{
    id: string;
    type: string;
    difficulty: string;
    questions: { id: string; prompt: string; order: number }[];
  } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [current, setCurrent] = useState(0);
  const [evaluating, setEvaluating] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());

  const [timeRemaining, setTimeRemaining] = useState(90);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartTime = useRef<number>(Date.now());
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});

  const totalTimeForType = TIME_LIMITS[type] ?? 90;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerRunning(false);
  }, []);

  const startTimer = useCallback(
    (seconds: number) => {
      stopTimer();
      setTimeRemaining(seconds);
      setTimerRunning(true);
      questionStartTime.current = Date.now();
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimerRunning(false);
            toast.error("Time's up! Auto-submitting your answer.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stopTimer],
  );

  useEffect(() => {
    if (timeRemaining === 0 && timerRunning === false && interview) {
      const question = interview.questions[current];
      if (question && !evaluations[question.id]) {
        const text = answers[question.id]?.trim();
        if (text) {
          submitAnswer();
        } else {
          setAnswers((prev) => ({ ...prev, [question.id]: "[Auto-submitted: Time expired]" }));
          submitAnswerWithText("[Auto-submitted: Time expired]");
        }
      }
    }
  }, [timeRemaining, timerRunning, interview, current, evaluations, answers]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (interview) {
      const q = interview.questions[current];
      if (q && evaluations[q.id]) {
        stopTimer();
      } else if (interview) {
        startTimer(totalTimeForType);
      }
    }
  }, [current, interview, evaluations, totalTimeForType, startTimer, stopTimer]);

  async function start() {
    setStarting(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          difficulty,
          companyId: companyId || undefined,
          jobRoleId: roleId || undefined,
          questionCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start interview");
      setInterview(data.interview);
      setAnswers({});
      setEvaluations({});
      setCurrent(0);
      setReport(null);
      setFlagged(new Set());
      setQuestionTimes({});
      toast.success("Interview started");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start interview");
    } finally {
      setStarting(false);
    }
  }

  async function submitAnswerWithText(text: string) {
    if (!interview) return;
    const question = interview.questions[current];
    if (!text) {
      toast.error("Write an answer first.");
      return;
    }
    setEvaluating(true);
    stopTimer();
    const elapsed = Math.round((Date.now() - questionStartTime.current) / 1000);
    setQuestionTimes((prev) => ({ ...prev, [question.id]: (prev[question.id] ?? 0) + elapsed }));
    try {
      const res = await fetch(`/api/interview/${interview.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, answer: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit answer");
      setEvaluations((prev) => ({ ...prev, [question.id]: data.evaluation }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit answer");
    } finally {
      setEvaluating(false);
    }
  }

  async function submitAnswer() {
    if (!interview) return;
    const question = interview.questions[current];
    const text = answers[question.id]?.trim();
    if (!text) {
      toast.error("Write an answer first.");
      return;
    }
    await submitAnswerWithText(text);
  }

  function next() {
    if (!interview) return;
    if (current < interview.questions.length - 1) setCurrent((c) => c + 1);
  }

  function prev() {
    if (current > 0) setCurrent((c) => c - 1);
  }

  function toggleFlag(id: string) {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function finish() {
    if (!interview) return;
    stopTimer();
    setFinishing(true);
    try {
      const res = await fetch(`/api/interview/${interview.id}/finish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to finish interview");
      setReport(data.interview.report);
      toast.success("Interview completed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to finish interview");
    } finally {
      setFinishing(false);
    }
  }

  if (report && interview) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Interview Report</CardTitle>
                <CardDescription>
                  {interview.type.replaceAll("_", " ")} · {interview.difficulty}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <GradeBadge grade={report.grade} />
                <ScoreRing value={report.totalScore} label="Score" size={110} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{report.questionCount}</div>
                <div className="text-xs text-muted-foreground">Questions</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">
                  {report.timeAnalysis.avgTimePerQuestion != null ? formatTime(report.timeAnalysis.avgTimePerQuestion) : "—"}
                </div>
                <div className="text-xs text-muted-foreground">Avg Time / Q</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">
                  {report.timeAnalysis.totalTime != null ? formatTime(report.timeAnalysis.totalTime) : "—"}
                </div>
                <div className="text-xs text-muted-foreground">Total Time</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Score Breakdown</h3>
              <div className="space-y-2.5">
                {report.perQuestion.map((q, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        Q{i + 1}: {q.question}
                      </span>
                      {q.timeSpent != null && (
                        <span className="ml-2 shrink-0 text-muted-foreground">
                          {formatTime(q.timeSpent)}
                        </span>
                      )}
                    </div>
                    <ScoreBar score={q.score} />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {report.typeBreakdown.strongest && report.typeBreakdown.weakest && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <TrendingUp className="size-3.5" /> Strongest Area
                  </div>
                  <div className="text-sm font-medium">{report.typeBreakdown.strongest.type}</div>
                  <div className="text-xs text-muted-foreground">
                    Avg score: {report.typeBreakdown.strongest.avgScore}/100
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-orange-600">
                    <TrendingDown className="size-3.5" /> Weakest Area
                  </div>
                  <div className="text-sm font-medium">{report.typeBreakdown.weakest.type}</div>
                  <div className="text-xs text-muted-foreground">
                    Avg score: {report.typeBreakdown.weakest.avgScore}/100
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Improvement Recommendations</h3>
              <ul className="space-y-1.5">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            {report.strengths.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Strengths</h3>
                  <ul className="space-y-1.5">
                    {report.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {report.improvements.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Areas for Improvement</h3>
                <ul className="space-y-1.5">
                  {report.improvements.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Per-Question Detail</h3>
              {report.perQuestion.map((q, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{q.question}</p>
                    <span className="shrink-0 text-sm font-bold">{q.score}/100</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{q.feedback}</p>
                  {q.strengths.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {q.strengths.map((s, j) => (
                        <Badge key={j} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  )}
                  {q.improvements.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {q.improvements.map((s, j) => (
                        <Badge key={j} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setInterview(null);
                  setReport(null);
                }}
              >
                Start a new interview
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (interview) {
    const question = interview.questions[current];
    const answered = Object.keys(evaluations).length;
    const progress = (answered / interview.questions.length) * 100;
    const done = evaluations[question.id] !== undefined;
    const isBehavioral = interview.type === "BEHAVIORAL";

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">
                  Question {current + 1} of {interview.questions.length}
                </CardTitle>
                <TimerDisplay
                  remaining={timeRemaining}
                  total={totalTimeForType}
                  isRunning={timerRunning}
                />
              </div>
              <Badge variant="secondary">
                <Flag className="mr-1 size-3" />
                {flagged.size} flagged
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <QuestionNav
                questions={interview.questions}
                current={current}
                evaluations={evaluations}
                flagged={flagged}
                onSelect={setCurrent}
                onToggleFlag={toggleFlag}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{interview.type.replaceAll("_", " ")} · {interview.difficulty}</span>
              <span>{answered}/{interview.questions.length} answered</span>
            </div>
            <Progress value={progress} />
          </CardHeader>
          <CardContent className="space-y-4">
            {isBehavioral && <StarMethodCard />}

            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MessageSquareText className="size-3.5" /> Question
              </div>
              <p className="text-base font-medium">{question.prompt}</p>
            </div>

            <Textarea
              value={answers[question.id] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
              rows={7}
              placeholder={isBehavioral ? "Use the STAR method: Situation, Task, Action, Result..." : "Type your answer here..."}
              disabled={done}
            />

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={prev} disabled={current === 0}>
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFlag(question.id)}
                  className={flagged.has(question.id) ? "text-orange-500" : "text-muted-foreground"}
                >
                  <Flag className="size-4" />
                  {flagged.has(question.id) ? "Unflag" : "Flag"}
                </Button>
              </div>
              {done ? (
                <div className="flex items-center gap-2">
                  <Button onClick={next} disabled={current === interview.questions.length - 1}>
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              ) : (
                <Button onClick={submitAnswer} disabled={evaluating}>
                  {evaluating ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Submit answer
                </Button>
              )}
            </div>

            {done && (
              <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-emerald-500" />
                  <span className="text-sm font-semibold">Score: {evaluations[question.id].score}/100</span>
                </div>
                <p className="text-sm text-muted-foreground">{evaluations[question.id].feedback}</p>
                {evaluations[question.id].strengths.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {evaluations[question.id].strengths.map((s, i) => (
                      <Badge key={i} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {answered}/{interview.questions.length} answered
              </div>
              <Button variant="default" onClick={finish} disabled={finishing}>
                {finishing ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" />}
                Finish interview
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Set up your interview</CardTitle>
          <CardDescription>
            Configure your practice session for a tailored experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Interview type</Label>
              <Select value={type} onValueChange={(v) => setType(v ?? "TECHNICAL")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v ?? "MEDIUM")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Company (optional)</Label>
              <Select value={companyId} onValueChange={(v) => { setCompanyId(v ?? ""); setRoleId(""); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Any company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role (optional)</Label>
              <Select value={roleId} onValueChange={(v) => setRoleId(v ?? "")} disabled={!companyId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={companyId ? "Select role" : "Choose a company first"} />
                </SelectTrigger>
                <SelectContent>
                  {companies.find((c) => c.id === companyId)?.jobRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Number of questions</Label>
              <span className="text-sm font-semibold tabular-nums">{questionCount}</span>
            </div>
            <Slider
              value={[questionCount]}
              onValueChange={(v) => setQuestionCount(Array.isArray(v) ? v[0] ?? 5 : v)}
              min={3}
              max={10}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3</span>
              <span>10</span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            <Clock className="size-4 shrink-0" />
            <span>
              Time per question:{" "}
              <span className="font-semibold text-foreground">{formatTime(TIME_LIMITS[type] ?? 90)}</span>
              {type === "HR" && " (60s — HR questions are concise)"}
              {type === "TECHNICAL" && " (90s — technical answers need depth)"}
              {type === "BEHAVIORAL" && " (120s — STAR answers take time)"}
              {type === "SYSTEM_DESIGN" && " (120s — design questions are complex)"}
              {type === "AI_ML" && " (90s — ML concepts require explanation)"}
            </span>
          </div>

          <div className="flex items-center justify-end">
            <Button onClick={start} disabled={starting}>
              {starting ? <Loader2 className="size-4 animate-spin" /> : <Mic2 className="size-4" />}
              Start interview
            </Button>
          </div>
        </CardContent>
      </Card>

      {recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent interviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                <div className="text-sm">
                  <div className="font-medium">{i.type.replaceAll("_", " ")} · {i.difficulty}</div>
                  <div className="text-muted-foreground">{formatDate(i.createdAt)}</div>
                </div>
                <Badge variant={i.status === "COMPLETED" ? (i.score && i.score >= 70 ? "default" : "secondary") : "outline"}>
                  {i.status === "COMPLETED" ? `${i.score}/100` : i.status.toLowerCase().replaceAll("_", " ")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
