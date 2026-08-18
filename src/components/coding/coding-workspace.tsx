"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Play, CheckCircle2, XCircle, Loader2, Search, Bookmark, Flame, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const Editor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

type ProblemSummary = {
  id: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topics: string[];
  companies: string[];
  solved: boolean;
  bestRatio: number;
};

type ProblemDetail = {
  id: string;
  title: string;
  description: string;
  constraints: string[];
  examples: { input: string; output: string; explanation?: string }[];
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topics: string[];
  starterCode: { python: string; javascript: string };
  timeLimitMs: number;
  expectedComplexity: string | null;
};

type RunResult = {
  passed: number;
  total: number;
  results: { ok: boolean; got: unknown; expected: unknown; error?: string }[];
  compileError?: string;
  runtimeError?: string;
  timedOut: boolean;
  runtimeMs: number;
};

type SubmitResult = {
  status: string;
  passed: number;
  total: number;
  compileError?: string;
  runtimeError?: string;
  timedOut: boolean;
  runtimeMs: number;
  aiFeedback?: { verdict: string; feedback: string; suggestions: string[] } | null;
};

type StreakData = {
  currentStreak: number;
  longestStreak: number;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalSubmissions: number;
  acceptanceRate: number;
};

const DIFF_COLORS: Record<string, string> = {
  EASY: "text-emerald-600 dark:text-emerald-400",
  MEDIUM: "text-amber-600 dark:text-amber-400",
  HARD: "text-red-600 dark:text-red-400",
};

function starterFor(problem: ProblemDetail | null, language: string) {
  if (!problem) return "";
  return problem.starterCode[language as "python" | "javascript"] ?? "";
}

export function CodingWorkspace({ problems }: { problems: ProblemSummary[] }) {
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [problemId, setProblemId] = useState<string | null>(null);
  const [language, setLanguage] = useState<"python" | "javascript">("python");
  const [code, setCode] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");
  const [topicFilter, setTopicFilter] = useState<string>("ALL");
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [dailyChallengeId, setDailyChallengeId] = useState<string | null>(null);
  const [streakData, setStreakData] = useState<StreakData | null>(null);

  const requestedRef = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/coding/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.streak) setStreakData(d.streak);
      })
      .catch(() => {});
    fetch("/api/coding/daily-challenge")
      .then((r) => r.json())
      .then((d) => {
        if (d.challenge?.problem) setDailyChallengeId(d.challenge.problem.id);
      })
      .catch(() => {});
  }, []);

  const allTopics = useMemo(() => {
    const set = new Set<string>();
    for (const p of problems) for (const t of p.topics) set.add(t);
    return Array.from(set).sort();
  }, [problems]);

  const filteredProblems = useMemo(() => {
    let list = problems;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.topics.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (difficultyFilter !== "ALL") {
      list = list.filter((p) => p.difficulty === difficultyFilter);
    }
    if (topicFilter !== "ALL") {
      list = list.filter((p) => p.topics.includes(topicFilter));
    }
    return list;
  }, [problems, searchQuery, difficultyFilter, topicFilter]);

  const loadProblem = useCallback(async (id: string) => {
    requestedRef.current = id;
    setLoadingDetail(true);
    setProblemId(id);
    setRunResult(null);
    setSubmitResult(null);
    try {
      const res = await fetch(`/api/coding/problems/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load problem");
      if (requestedRef.current !== id) return;
      setProblem(data.problem);
      setCode(starterFor(data.problem, language));
    } catch (e) {
      if (requestedRef.current !== id) return;
      toast.error(e instanceof Error ? e.message : "Failed to load problem");
    } finally {
      if (requestedRef.current === id) setLoadingDetail(false);
    }
  }, [language]);

  useEffect(() => {
    if (problems[0]) {
      void Promise.resolve().then(() => loadProblem(problems[0].id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchLanguage(lang: "python" | "javascript") {
    setLanguage(lang);
    if (problem) setCode(starterFor(problem, lang));
  }

  async function run() {
    if (!problemId) return;
    setRunning(true);
    setSubmitResult(null);
    setRunResult(null);
    try {
      const res = await fetch("/api/coding/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId, language, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Run failed");
      setRunResult(data.outcome);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  async function submit() {
    if (!problemId) return;
    setSubmitting(true);
    setRunResult(null);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/coding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId, language, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setSubmitResult(data.submission);
      toast.success(data.submission.status === "ACCEPTED" ? "All tests passed!" : "Submitted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleBookmark(problemId: string) {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(problemId)) next.delete(problemId);
      else next.add(problemId);
      return next;
    });
  }

  const selected = problems.find((p) => p.id === problemId);

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card className="flex flex-col lg:max-h-[calc(100vh-10rem)] lg:overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Problems</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden px-4 pb-4">
          {/* Streak bar */}
          {streakData && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
              <span className="flex items-center gap-1 font-medium text-orange-600 dark:text-orange-400">
                <Flame className="size-3.5" />
                {streakData.currentStreak} day streak
              </span>
              <span className="text-muted-foreground">|</span>
              <span>{streakData.totalSolved} solved</span>
              <span className="text-muted-foreground">|</span>
              <span>{streakData.acceptanceRate}% acc</span>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          {/* Difficulty filters */}
          <div className="flex gap-1">
            {(["ALL", "EASY", "MEDIUM", "HARD"] as const).map((d) => (
              <Button
                key={d}
                size="sm"
                variant={difficultyFilter === d ? "default" : "outline"}
                className="h-7 flex-1 px-1 text-xs"
                onClick={() => setDifficultyFilter(d)}
              >
                {d === "ALL" ? "All" : d.charAt(0) + d.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>

          {/* Topic filter */}
          <Select value={topicFilter} onValueChange={(v) => setTopicFilter(v ?? "ALL")}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Topics</SelectItem>
              {allTopics.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Problem count */}
          <div className="text-xs text-muted-foreground">
            {filteredProblems.length} problem{filteredProblems.length !== 1 ? "s" : ""}
          </div>

          {/* Problem list */}
          <div className="flex-1 space-y-1 overflow-y-auto">
            {filteredProblems.map((p) => (
              <button
                key={p.id}
                onClick={() => loadProblem(p.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  p.id === problemId
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{p.title}</span>
                    {p.solved && <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />}
                    {dailyChallengeId === p.id && (
                      <Star className="size-3.5 shrink-0 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-medium", DIFF_COLORS[p.difficulty])}>
                      {p.difficulty}
                      {p.bestRatio > 0 && p.bestRatio < 100 ? ` · ${p.bestRatio}%` : ""}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(p.id);
                  }}
                  className="shrink-0 p-1 hover:bg-muted rounded"
                >
                  <Bookmark
                    className={cn(
                      "size-3.5",
                      bookmarks.has(p.id) ? "fill-primary text-primary" : "text-muted-foreground",
                    )}
                  />
                </button>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-4">
        {loadingDetail || !problem ? (
          <Card className="min-h-[400px]">
            <CardContent className="space-y-3 pt-6">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{problem.title}</CardTitle>
                  <span className={cn("text-xs font-semibold", DIFF_COLORS[problem.difficulty])}>
                    {problem.difficulty}
                  </span>
                  {problem.expectedComplexity && (
                    <span className="text-xs text-muted-foreground">{problem.expectedComplexity}</span>
                  )}
                  {dailyChallengeId === problem.id && (
                    <Badge variant="secondary" className="gap-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                      <Star className="size-3 fill-current" />
                      Daily Challenge
                    </Badge>
                  )}
                </div>
                <CardDescription className="whitespace-pre-line">
                  {problem.description}
                </CardDescription>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {problem.topics.map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {problem.examples.length > 0 && (
                  <div className="space-y-2">
                    {problem.examples.map((ex, i) => (
                      <div key={i} className="rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs">
                        <div className="text-muted-foreground">Input: {ex.input}</div>
                        <div>Output: {ex.output}</div>
                        {ex.explanation && (
                          <div className="text-muted-foreground">{ex.explanation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {problem.constraints.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {problem.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{selected?.title ?? problem.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={language} onValueChange={(v) => switchLanguage(v as "python" | "javascript")}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={run} disabled={running || submitting}>
                    {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                    Run
                  </Button>
                  <Button size="sm" onClick={submit} disabled={running || submitting}>
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    Submit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[420px] w-full">
                  <Editor
                    height="100%"
                    language={language === "python" ? "python" : "javascript"}
                    value={code}
                    onChange={(v) => setCode(v ?? "")}
                    theme="vs-dark"
                    options={{
                      fontSize: 13,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {(runResult || submitResult) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {submitResult && (
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium",
                        submitResult.status === "ACCEPTED"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
                          : "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
                      )}
                    >
                      {submitResult.status === "ACCEPTED" ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <XCircle className="size-4" />
                      )}
                      <span>
                        {submitResult.status.replaceAll("_", " ")} — {submitResult.passed}/{submitResult.total} tests passed
                        {submitResult.runtimeMs > 0 ? ` (${submitResult.runtimeMs}ms)` : ""}
                      </span>
                    </div>
                  )}
                  {submitResult?.compileError && (
                    <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs text-red-500">
                      {submitResult.compileError}
                    </pre>
                  )}
                  {submitResult?.runtimeError && (
                    <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs text-red-500">
                      {submitResult.runtimeError}
                    </pre>
                  )}
                  {submitResult?.aiFeedback && (
                    <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
                      <div className="font-semibold">AI feedback — {submitResult.aiFeedback.verdict}</div>
                      <p className="text-muted-foreground">{submitResult.aiFeedback.feedback}</p>
                      {submitResult.aiFeedback.suggestions.length > 0 && (
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                          {submitResult.aiFeedback.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {runResult && !submitResult && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span>{runResult.passed}/{runResult.total} tests passed</span>
                        <span className="text-muted-foreground">({runResult.runtimeMs}ms)</span>
                      </div>
                      {runResult.results.map((r, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-start gap-2 rounded-lg border px-3 py-2 font-mono text-xs",
                            r.ok ? "border-emerald-300 bg-emerald-50/50" : "border-red-300 bg-red-50/50",
                          )}
                        >
                          {r.ok ? (
                            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                          ) : (
                            <XCircle className="mt-0.5 size-3.5 shrink-0 text-red-500" />
                          )}
                          <div className="min-w-0 overflow-x-auto">
                            <div>Test {i + 1}</div>
                            {!r.ok && (
                              <div className="text-muted-foreground">
                                got {JSON.stringify(r.got)}{" "}
                                {r.error ? `— ${r.error}` : `expected ${JSON.stringify(r.expected)}`}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {runResult.compileError && (
                        <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs text-red-500">
                          {runResult.compileError}
                        </pre>
                      )}
                      {runResult.runtimeError && (
                        <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs text-red-500">
                          {runResult.runtimeError}
                        </pre>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
