"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mic2, Loader2, Send, Flag, CheckCircle2, MessageSquareText } from "lucide-react";
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

type Report = {
  totalScore: number;
  questionCount: number;
  perQuestion: { question: string; score: number }[];
  strengths: string[];
  improvements: string[];
  type: string;
  difficulty: string;
};

const TYPES = [
  { value: "HR", label: "HR Interview" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "BEHAVIORAL", label: "Behavioral" },
  { value: "SYSTEM_DESIGN", label: "System Design" },
  { value: "AI_ML", label: "AI/ML" },
];

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
          questionCount: 5,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start interview");
      setInterview(data.interview);
      setAnswers({});
      setEvaluations({});
      setCurrent(0);
      setReport(null);
      toast.success("Interview started");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start interview");
    } finally {
      setStarting(false);
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
    setEvaluating(true);
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

  function next() {
    if (!interview) return;
    if (current < interview.questions.length - 1) setCurrent((c) => c + 1);
  }

  function prev() {
    if (current > 0) setCurrent((c) => c - 1);
  }

  async function finish() {
    if (!interview) return;
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
            <CardTitle>Interview complete</CardTitle>
            <CardDescription>
              {interview.type.replaceAll("_", " ")} · {interview.difficulty}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <ScoreRing value={report.totalScore} label="Score" size={130} />
              <div className="flex-1 space-y-2">
                <div className="text-sm">
                  <span className="font-semibold">{report.questionCount}</span> questions answered
                </div>
                <div className="text-sm font-medium">
                  {report.totalScore >= 80
                    ? "Excellent performance!"
                    : report.totalScore >= 60
                      ? "Good job — solid interview."
                      : report.totalScore >= 40
                        ? "Decent start. Focus on the suggestions below."
                        : "Keep practicing — use the feedback below."}
                </div>
              </div>
            </div>
            <Separator />
            {report.strengths.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Strengths</h3>
                <ul className="space-y-1.5">
                  {report.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {report.improvements.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Improvements</h3>
                <ul className="space-y-1.5">
                  {report.improvements.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                  ))}
                </ul>
              </div>
            )}
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Per-question breakdown</h3>
              {report.perQuestion.map((q, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{q.question}</span>
                  <span className="font-semibold">{q.score}</span>
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
    const progress = ((answered + (current < interview.questions.length ? 1 : 0)) / interview.questions.length) * 100;
    const done = evaluations[question.id] !== undefined;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Question {current + 1} of {interview.questions.length}</CardTitle>
              <CardDescription>{interview.type.replaceAll("_", " ")} · {interview.difficulty}</CardDescription>
            </div>
            <Badge variant="secondary">{answered}/{interview.questions.length} answered</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} />
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
              placeholder="Type your answer here…"
              disabled={done}
            />
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" onClick={prev} disabled={current === 0 || done}>
                Previous
              </Button>
              {done ? (
                <Button onClick={next} disabled={current === interview.questions.length - 1}>
                  Next question
                </Button>
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
                {answered}/{interview.questions.length} answered — answers you submit are saved.
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
            Choose a format and optional target company for a tailored practice session.
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
                  <div className="text-muted-foreground">{new Date(i.createdAt).toLocaleDateString()}</div>
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
