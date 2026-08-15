"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Play, CheckCircle2, XCircle, Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const loadProblem = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setProblemId(id);
    setRunResult(null);
    setSubmitResult(null);
    try {
      const res = await fetch(`/api/coding/problems/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load problem");
      setProblem(data.problem);
      setCode(starterFor(data.problem, language));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load problem");
    } finally {
      setLoadingDetail(false);
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

  const selected = problems.find((p) => p.id === problemId);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-base">Problems</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {problems.map((p) => (
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
                </div>
                <div className={cn("text-xs font-medium", DIFF_COLORS[p.difficulty])}>
                  {p.difficulty}
                  {p.bestRatio > 0 && p.bestRatio < 100 ? ` · ${p.bestRatio}%` : ""}
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
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
