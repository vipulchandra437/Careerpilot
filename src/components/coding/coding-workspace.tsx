"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  Bookmark,
  Flame,
  Star,
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  Terminal,
  Sparkles,
  Plus,
  Trash2,
  ArrowUpDown,
  Code2,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  results: { ok: boolean; got: unknown; expected: unknown; input?: unknown; error?: string }[];
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

type SubmissionRecord = {
  id: string;
  language: string;
  status: string;
  passedTests: number;
  totalTests: number;
  runtimeMs: number | null;
  code: string;
  aiFeedback: { verdict: string; feedback: string; suggestions: string[] } | null;
  createdAt: string;
};

type SortOption = "difficulty" | "acceptance" | "recent";

const DIFF_COLORS: Record<string, string> = {
  EASY: "text-emerald-600 dark:text-emerald-400",
  MEDIUM: "text-amber-600 dark:text-amber-400",
  HARD: "text-red-600 dark:text-red-400",
};

const DIFF_BADGE: Record<string, string> = {
  ACCEPTED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  WRONG_ANSWER: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  COMPILE_ERROR: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  RUNTIME_ERROR: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  TIME_LIMIT_EXCEEDED: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  PENDING: "bg-muted text-muted-foreground border-border",
};

function starterFor(problem: ProblemDetail | null, language: string) {
  if (!problem) return "";
  return problem.starterCode[language as "python" | "javascript"] ?? "";
}

function formatTime(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CUSTOM_TESTS_KEY = "careerpilot-custom-tests";

function loadCustomTests(problemId: string): string[] {
  try {
    const raw = localStorage.getItem(`${CUSTOM_TESTS_KEY}:${problemId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomTests(problemId: string, tests: string[]) {
  try {
    localStorage.setItem(`${CUSTOM_TESTS_KEY}:${problemId}`, JSON.stringify(tests.slice(0, 5)));
  } catch {}
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
  const [companyFilter, setCompanyFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("difficulty");
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [dailyChallengeId, setDailyChallengeId] = useState<string | null>(null);
  const [streakData, setStreakData] = useState<StreakData | null>(null);

  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);

  const [customTestInput, setCustomTestInput] = useState("");
  const [customTests, setCustomTests] = useState<string[]>([]);
  const [runningCustom, setRunningCustom] = useState(false);
  const [rightTab, setRightTab] = useState("results");

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
        if (d.challenge?.problem) {
          setDailyChallengeId(d.challenge.problem.id);
        }
      })
      .catch(() => {});
  }, []);

  const allTopics = useMemo(() => {
    const set = new Set<string>();
    for (const p of problems) for (const t of p.topics) set.add(t);
    return Array.from(set).sort();
  }, [problems]);

  const allCompanies = useMemo(() => {
    const set = new Set<string>();
    for (const p of problems) for (const c of p.companies) set.add(c);
    return Array.from(set).sort();
  }, [problems]);

  const filteredProblems = useMemo(() => {
    let list = problems;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.topics.some((t) => t.toLowerCase().includes(q)) ||
          p.companies.some((c) => c.toLowerCase().includes(q)),
      );
    }
    if (difficultyFilter !== "ALL") {
      list = list.filter((p) => p.difficulty === difficultyFilter);
    }
    if (topicFilter !== "ALL") {
      list = list.filter((p) => p.topics.includes(topicFilter));
    }
    if (companyFilter !== "ALL") {
      list = list.filter((p) => p.companies.includes(companyFilter));
    }
    if (sortBy === "acceptance") {
      list = [...list].sort((a, b) => b.bestRatio - a.bestRatio);
    } else if (sortBy === "recent") {
      list = [...list].reverse();
    }
    return list;
  }, [problems, searchQuery, difficultyFilter, topicFilter, companyFilter, sortBy]);

  const loadProblem = useCallback(async (id: string) => {
    requestedRef.current = id;
    setLoadingDetail(true);
    setProblemId(id);
    setRunResult(null);
    setSubmitResult(null);
    setSubmissions([]);
    setExpandedSubmission(null);
    setRightTab("results");
    setCustomTests(loadCustomTests(id));
    setCustomTestInput("");
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
    setRightTab("results");
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
    setRightTab("results");
    try {
      const res = await fetch("/api/coding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId, language, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setSubmitResult(data.submission);
      if (data.submission.status === "ACCEPTED") {
        toast.success("All tests passed!");
      } else {
        toast.info(`Submitted — ${data.submission.status.replace(/_/g, " ")}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function runCustomTest() {
    if (!problemId || !customTestInput.trim()) return;
    let parsed: unknown[];
    try {
      parsed = JSON.parse(customTestInput);
      if (!Array.isArray(parsed)) parsed = [parsed];
    } catch {
      toast.error("Invalid JSON. Provide an array of arguments or a single argument.");
      return;
    }
    setRunningCustom(true);
    setRunResult(null);
    setSubmitResult(null);
    setRightTab("results");
    try {
      const res = await fetch("/api/coding/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId,
          language,
          code,
          customTestCases: [{ args: parsed, expected: null }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Run failed");
      setRunResult(data.outcome);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Custom run failed");
    } finally {
      setRunningCustom(false);
    }
  }

  function saveCustomTest() {
    if (!problemId || !customTestInput.trim()) return;
    if (customTests.length >= 5) {
      toast.error("Maximum 5 custom test cases saved.");
      return;
    }
    const next = [...customTests, customTestInput.trim()];
    setCustomTests(next);
    saveCustomTests(problemId, next);
    toast.success("Custom test case saved.");
  }

  function deleteCustomTest(index: number) {
    if (!problemId) return;
    const next = customTests.filter((_, i) => i !== index);
    setCustomTests(next);
    saveCustomTests(problemId, next);
  }

  async function loadSubmissions() {
    if (!problemId) return;
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/coding/problems/${problemId}/submissions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load submissions");
      setSubmissions(data.submissions ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load submissions");
    } finally {
      setLoadingSubmissions(false);
    }
  }

  function toggleBookmark(id: string) {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selected = problems.find((p) => p.id === problemId);

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card className="flex flex-col lg:max-h-[calc(100vh-10rem)] lg:overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Problems</CardTitle>
            <Link href="/coding/analytics">
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                <BarChart3 className="size-3.5" />
                Analytics
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden px-4 pb-4">
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

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

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

          <Select value={topicFilter} onValueChange={(v) => setTopicFilter(v ?? "ALL")}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Topics</SelectItem>
              {allTopics.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={companyFilter} onValueChange={(v) => setCompanyFilter(v ?? "ALL")}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Companies</SelectItem>
              {allCompanies.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="size-3 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="h-8 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="difficulty">Difficulty</SelectItem>
                <SelectItem value="acceptance">Acceptance Rate</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground">
            {filteredProblems.length} problem{filteredProblems.length !== 1 ? "s" : ""}
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto">
            {filteredProblems.map((p) => (
              <div
                key={p.id}
                tabIndex={0}
                onClick={() => loadProblem(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    loadProblem(p.id);
                  }
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors cursor-pointer",
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
                    {p.companies.length > 0 && (
                      <span className="truncate text-[10px] text-muted-foreground">
                        {p.companies[0]}{p.companies.length > 1 ? ` +${p.companies.length - 1}` : ""}
                      </span>
                    )}
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
              </div>
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
                  <Button size="sm" variant="outline" onClick={run} disabled={running || submitting || runningCustom}>
                    {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                    Run
                  </Button>
                  <Button size="sm" onClick={submit} disabled={running || submitting || runningCustom}>
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

            <Card>
              <Tabs value={rightTab} onValueChange={(v) => {
                setRightTab(v);
                if (v === "submissions" && submissions.length === 0 && problemId) {
                  loadSubmissions();
                }
              }}>
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-0">
                  <TabsList variant="line">
                    <TabsTrigger value="results" className="gap-1.5">
                      <Terminal className="size-3.5" />
                      Console
                    </TabsTrigger>
                    <TabsTrigger value="custom" className="gap-1.5">
                      <Code2 className="size-3.5" />
                      Custom Tests
                    </TabsTrigger>
                    <TabsTrigger value="submissions" className="gap-1.5">
                      <History className="size-3.5" />
                      Submissions
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="gap-1.5">
                      <Sparkles className="size-3.5" />
                      AI Review
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent className="pt-4">
                  <TabsContent value="results">
                    <ConsolePanel runResult={runResult} submitResult={submitResult} running={running} />
                  </TabsContent>
                  <TabsContent value="custom">
                    <CustomTestPanel
                      customTestInput={customTestInput}
                      setCustomTestInput={setCustomTestInput}
                      customTests={customTests}
                      runningCustom={runningCustom}
                      onRunCustom={runCustomTest}
                      onSaveCustom={saveCustomTest}
                      onDeleteCustom={deleteCustomTest}
                      onSelectCustom={(val) => setCustomTestInput(val)}
                    />
                  </TabsContent>
                  <TabsContent value="submissions">
                    <SubmissionsPanel
                      submissions={submissions}
                      loading={loadingSubmissions}
                      expandedId={expandedSubmission}
                      onToggle={(id) => setExpandedSubmission(expandedSubmission === id ? null : id)}
                      onRefresh={loadSubmissions}
                    />
                  </TabsContent>
                  <TabsContent value="ai">
                    <AIPanel submitResult={submitResult} />
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function ConsolePanel({
  runResult,
  submitResult,
  running,
}: {
  runResult: RunResult | null;
  submitResult: SubmitResult | null;
  running: boolean;
}) {
  useEffect(() => {
    const el = document.getElementById("console-scroll");
    if (el) el.scrollTop = el.scrollHeight;
  }, [runResult, submitResult]);

  if (running) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-[#1a1a2e] p-8 font-mono text-sm text-emerald-400">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Running code...
      </div>
    );
  }

  if (!runResult && !submitResult) {
    return (
      <div className="rounded-lg bg-[#1a1a2e] p-6 font-mono text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-emerald-400/70">
          <Terminal className="size-4" />
          <span>$ Ready. Click &quot;Run&quot; to execute your code.</span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="console-scroll"
      className="max-h-[400px] space-y-2 overflow-y-auto rounded-lg bg-[#1a1a2e] p-4 font-mono text-xs"
    >
      {submitResult && (
        <div className="flex items-center gap-2 rounded border px-3 py-2">
          {submitResult.status === "ACCEPTED" ? (
            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
          ) : (
            <XCircle className="size-3.5 shrink-0 text-red-400" />
          )}
          <span className={submitResult.status === "ACCEPTED" ? "text-emerald-400" : "text-red-400"}>
            {submitResult.status.replace(/_/g, " ")}
          </span>
          <span className="text-muted-foreground">
            — {submitResult.passed}/{submitResult.total} tests passed
            {submitResult.runtimeMs > 0 ? ` (${submitResult.runtimeMs}ms)` : ""}
          </span>
        </div>
      )}

      {submitResult?.compileError && (
        <pre className="whitespace-pre-wrap break-all rounded border border-red-800 bg-red-950/30 px-3 py-2 text-red-400">
          {submitResult.compileError}
        </pre>
      )}
      {submitResult?.runtimeError && (
        <pre className="whitespace-pre-wrap break-all rounded border border-red-800 bg-red-950/30 px-3 py-2 text-red-400">
          {submitResult.runtimeError}
        </pre>
      )}

      {runResult && !submitResult && (
        <>
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-muted-foreground">
              {runResult.passed}/{runResult.total} tests passed
            </span>
            <span className="text-muted-foreground">{runResult.runtimeMs}ms</span>
          </div>
          {runResult.compileError && (
            <pre className="whitespace-pre-wrap break-all rounded border border-red-800 bg-red-950/30 px-3 py-2 text-red-400">
              {runResult.compileError}
            </pre>
          )}
          {runResult.runtimeError && (
            <pre className="whitespace-pre-wrap break-all rounded border border-red-800 bg-red-950/30 px-3 py-2 text-red-400">
              {runResult.runtimeError}
            </pre>
          )}
          {runResult.results.map((r, i) => (
            <div
              key={i}
              className={cn(
                "rounded border px-3 py-2",
                r.ok
                  ? "border-emerald-800 bg-emerald-950/20"
                  : "border-red-800 bg-red-950/20",
              )}
            >
              <div className="flex items-center gap-2">
                {r.ok ? (
                  <CheckCircle2 className="size-3 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="size-3 shrink-0 text-red-400" />
                )}
                <span className={r.ok ? "text-emerald-400" : "text-red-400"}>
                  Test {i + 1}
                </span>
              </div>
              {!r.ok && (
                <div className="mt-1.5 space-y-0.5 pl-5 text-muted-foreground">
                  {r.input !== undefined && (
                    <div>
                      <span className="text-muted-foreground/60">Input: </span>
                      <span className="text-white/80">{JSON.stringify(r.input)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground/60">Expected: </span>
                    <span className="text-emerald-400/80">{JSON.stringify(r.expected)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground/60">Got: </span>
                    <span className="text-red-400/80">{JSON.stringify(r.got)}</span>
                  </div>
                  {r.error && (
                    <div className="text-red-400/70">{r.error}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function CustomTestPanel({
  customTestInput,
  setCustomTestInput,
  customTests,
  runningCustom,
  onRunCustom,
  onSaveCustom,
  onDeleteCustom,
  onSelectCustom,
}: {
  customTestInput: string;
  setCustomTestInput: (v: string) => void;
  customTests: string[];
  runningCustom: boolean;
  onRunCustom: () => void;
  onSaveCustom: () => void;
  onDeleteCustom: (i: number) => void;
  onSelectCustom: (val: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Test Input (JSON)
          </span>
          <span className="text-[10px] text-muted-foreground">
            {customTests.length}/5 saved
          </span>
        </div>
        <Textarea
          placeholder={'[1, 2, 3] or {"key": "value"}'}
          value={customTestInput}
          onChange={(e) => setCustomTestInput(e.target.value)}
          className="min-h-[80px] font-mono text-xs"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onRunCustom}
            disabled={runningCustom || !customTestInput.trim()}
            className="gap-1.5"
          >
            {runningCustom ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            Run Custom
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onSaveCustom}
            disabled={!customTestInput.trim()}
            className="gap-1.5"
          >
            <Plus className="size-3.5" />
            Save ({5 - customTests.length} slots left)
          </Button>
        </div>
      </div>

      {customTests.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Saved Tests</span>
          {customTests.map((test, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2"
            >
              <button
                onClick={() => onSelectCustom(test)}
                className="min-w-0 flex-1 text-left font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {test.length > 80 ? test.slice(0, 80) + "..." : test}
              </button>
              <button
                onClick={() => onDeleteCustom(i)}
                className="shrink-0 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionsPanel({
  submissions,
  loading,
  expandedId,
  onToggle,
  onRefresh,
}: {
  submissions: SubmissionRecord[];
  loading: boolean;
  expandedId: string | null;
  onToggle: (id: string) => void;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <History className="mb-2 size-8 opacity-40" />
        <p className="text-sm">No submissions yet for this problem.</p>
        <Button variant="ghost" size="sm" onClick={onRefresh} className="mt-2 text-xs">
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Last {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
        </span>
        <Button variant="ghost" size="sm" onClick={onRefresh} className="h-6 text-xs">
          Refresh
        </Button>
      </div>
      <div className="space-y-1.5">
        {submissions.map((sub) => (
          <div key={sub.id} className="rounded-lg border overflow-hidden">
            <button
              onClick={() => onToggle(sub.id)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
            >
              {expandedId === sub.id ? (
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <Badge
                variant="outline"
                className={cn("text-[10px] shrink-0", DIFF_BADGE[sub.status] ?? DIFF_BADGE.PENDING)}
              >
                {sub.status.replace(/_/g, " ")}
              </Badge>
              <span className="text-xs text-muted-foreground">{sub.language}</span>
              <span className="text-xs text-muted-foreground">
                {sub.passedTests}/{sub.totalTests}
              </span>
              {sub.runtimeMs != null && sub.runtimeMs > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {sub.runtimeMs}ms
                </span>
              )}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {formatTime(sub.createdAt)}
              </span>
            </button>
            {expandedId === sub.id && (
              <div className="border-t bg-muted/20 px-3 py-3 space-y-3">
                {sub.aiFeedback && (
                  <div className="rounded border bg-muted/40 p-3 text-xs space-y-1">
                    <div className="font-semibold text-foreground">
                      AI — {sub.aiFeedback.verdict}
                    </div>
                    <p className="text-muted-foreground">{sub.aiFeedback.feedback}</p>
                    {sub.aiFeedback.suggestions.length > 0 && (
                      <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                        {sub.aiFeedback.suggestions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <div className="rounded bg-[#1a1a2e] p-3 overflow-x-auto">
                  <pre className="font-mono text-[11px] text-white/80 whitespace-pre-wrap break-all">
                    {sub.code}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AIPanel({
  submitResult,
}: {
  submitResult: SubmitResult | null;
}) {
  if (!submitResult) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Sparkles className="mb-2 size-8 opacity-40" />
        <p className="text-sm">Submit your code to receive AI feedback.</p>
      </div>
    );
  }

  if (!submitResult.aiFeedback) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Sparkles className="mb-2 size-8 opacity-40" />
        <p className="text-sm">AI review not available for this submission.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          AI feedback is generated asynchronously and may not always be available.
        </p>
      </div>
    );
  }

  const fb = submitResult.aiFeedback;

  function verdictColor(verdict: string) {
    const v = verdict.toLowerCase();
    if (v.includes("excellent") || v.includes("optimal") || v.includes("great")) {
      return "border-emerald-500/30 bg-emerald-500/5";
    }
    if (v.includes("good") || v.includes("correct")) {
      return "border-blue-500/30 bg-blue-500/5";
    }
    if (v.includes("partial") || v.includes("improve")) {
      return "border-amber-500/30 bg-amber-500/5";
    }
    return "border-muted bg-muted/30";
  }

  return (
    <div className="space-y-4">
      <div className={cn("rounded-lg border p-4 space-y-3", verdictColor(fb.verdict))}>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-violet-500" />
          <span className="font-semibold text-sm">{fb.verdict}</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{fb.feedback}</p>
      </div>

      {fb.suggestions.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Suggestions</span>
          <ul className="space-y-1.5">
            {fb.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 rounded border bg-muted/30 px-3 py-2 text-xs">
                <span className="shrink-0 font-mono text-muted-foreground">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
