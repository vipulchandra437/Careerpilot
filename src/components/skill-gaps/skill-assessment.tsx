"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Zap, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface AssessmentState {
  skillId: string;
  skillName: string;
  questions: Question[];
}

interface AnswerState {
  selected: number | null;
  revealed: boolean;
}

export function SkillAssessment({ skillId, skillName, onScoreUpdate }: {
  skillId: string;
  skillName: string;
  onScoreUpdate?: (newRating: number) => void;
}) {
  const [assessment, setAssessment] = useState<AssessmentState | null>(null);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function startAssessment() {
    setLoading(true);
    try {
      const res = await fetch("/api/skills/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to load assessment");
      }
      const data = await res.json();
      setAssessment(data);
      setAnswers(data.questions.map(() => ({ selected: null, revealed: false })));
      setCompleted(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load assessment");
    } finally {
      setLoading(false);
    }
  }

  function selectAnswer(qIndex: number, optionIndex: number) {
    if (answers[qIndex].revealed) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = { ...next[qIndex], selected: optionIndex };
      return next;
    });
  }

  function revealAnswer(qIndex: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = { ...next[qIndex], revealed: true };
      return next;
    });
  }

  function checkAllRevealed() {
    return answers.every((a) => a.revealed);
  }

  async function submitScore() {
    if (!assessment) return;
    setSubmitting(true);
    const correct = answers.filter((a, i) => a.selected === assessment.questions[i].correctIndex).length;
    const total = assessment.questions.length;
    const ratio = correct / total;
    const newRating = Math.max(1, Math.min(5, Math.round(ratio * 5)));

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills: [{ skillId: assessment.skillId, rating: newRating }],
        }),
      });
      if (res.ok) {
        toast.success(`Score updated to ${newRating}/5 based on your assessment!`);
        onScoreUpdate?.(newRating);
      } else {
        toast.success(`You scored ${correct}/${total}. Update your rating manually if needed.`);
      }
    } catch {
      toast.success(`You scored ${correct}/${total}. Update your rating manually if needed.`);
    } finally {
      setSubmitting(false);
      setCompleted(true);
    }
  }

  if (!assessment) {
    return (
      <Button variant="outline" onClick={startAssessment} disabled={loading}>
        <Zap className="mr-1 size-4" />
        {loading ? "Loading..." : "Take Assessment"}
      </Button>
    );
  }

  if (completed) {
    const correct = answers.filter((a, i) => a.selected === assessment.questions[i].correctIndex).length;
    const total = assessment.questions.length;
    const ratio = correct / total;
    const pct = Math.round(ratio * 100);

    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <Trophy className="size-8 text-amber-500" />
          <p className="text-2xl font-bold">{correct}/{total}</p>
          <Progress value={pct} className="w-48" />
          <p className="text-sm text-muted-foreground">
            {pct >= 80 ? "Excellent work!" : pct >= 60 ? "Good effort! Keep practicing." : "Keep learning and try again later."}
          </p>
          <Button variant="outline" onClick={() => { setAssessment(null); setCompleted(false); }}>
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  const allRevealed = checkAllRevealed();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{skillName} Assessment</span>
          <Badge variant="secondary">
            {answers.filter((a) => a.revealed).length}/{assessment.questions.length} answered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {assessment.questions.map((q, qIndex) => (
          <div key={qIndex} className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">
              <span className="text-muted-foreground mr-1">{qIndex + 1}.</span>
              {q.question}
            </p>
            <div className="grid gap-2">
              {q.options.map((opt, oIndex) => {
                const isSelected = answers[qIndex].selected === oIndex;
                const isCorrect = oIndex === q.correctIndex;
                const revealed = answers[qIndex].revealed;

                let icon = null;
                if (revealed) {
                  if (isCorrect) {
                    icon = <CheckCircle2 className="size-4 text-emerald-500" />;
                  } else if (isSelected && !isCorrect) {
                    icon = <XCircle className="size-4" />;
                  }
                }

                return (
                  <button
                    key={oIndex}
                    onClick={() => selectAnswer(qIndex, oIndex)}
                    disabled={revealed}
                    className={`flex items-center gap-2 rounded-md border p-2.5 text-left text-sm transition-colors ${
                      revealed
                        ? isCorrect
                          ? "border-emerald-500 bg-emerald-500/10"
                          : isSelected
                          ? "border-destructive bg-destructive/10"
                          : "opacity-50"
                        : isSelected
                        ? "border-primary bg-primary/10"
                        : "hover:bg-accent"
                    }`}
                  >
                    {icon}
                    <span className="flex-1">{opt}</span>
                    {isSelected && !revealed && (
                      <Badge variant="secondary" className="shrink-0 text-xs">selected</Badge>
                    )}
                  </button>
                );
              })}
            </div>
            {!answers[qIndex].revealed && answers[qIndex].selected !== null && (
              <Button variant="outline" size="sm" onClick={() => revealAnswer(qIndex)}>
                Check Answer
              </Button>
            )}
            {answers[qIndex].revealed && (
              <p className="text-xs text-muted-foreground bg-muted rounded p-2">
                {q.explanation}
              </p>
            )}
          </div>
        ))}

        {allRevealed && (
          <Button onClick={submitScore} disabled={submitting} className="w-full">
            {submitting ? "Saving..." : "Save Score to Profile"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
