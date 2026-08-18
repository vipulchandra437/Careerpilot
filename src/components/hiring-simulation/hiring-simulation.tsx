"use client";

import { useState } from "react";
import { Briefcase, CheckCircle2, XCircle, ArrowRight, ArrowLeft, Clock } from "lucide-react";
import { scoreColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/ui/score-ring";
import { readinessBand } from "@/server/scoring/score-engine";

type Stage = {
  id: string;
  title: string;
  description: string;
  score: number;
  evidence: Record<string, { score: number; present: boolean }>;
  passThreshold: number;
};

function stageVerdict(stage: Stage): "PASS" | "FAIL" {
  return stage.score >= stage.passThreshold ? "PASS" : "FAIL";
}

export function HiringSimulation({
  overall,
  targetRole,
  targetCompany,
  stages,
}: {
  overall: number;
  targetRole: string;
  targetCompany: string;
  stages: Stage[];
}) {
  const [index, setIndex] = useState(0);
  const stage = stages[index];
  const verdicts = stages.map(stageVerdict);
  const passed = verdicts.filter((v) => v === "PASS").length;
  const band = readinessBand(overall);

  const finalVerdict =
    passed === stages.length ? "HIRE" : passed >= stages.length - 1 ? "WAITLIST" : "REJECT";

  return (
    <div className="space-y-6">
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div>
            <p className="text-sm font-medium opacity-80">{targetRole} · {targetCompany}</p>
            <p className="text-2xl font-bold">Predicted outcome: {finalVerdict}</p>
          </div>
          <div className="text-sm opacity-90">
            <p className="flex items-center gap-2">
              <Clock className="size-4" /> {passed}/{stages.length} stages passed
            </p>
            <p className="mt-1">Overall readiness {overall}/100 ({band.label})</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{stage.title}</p>
              <p className="text-sm text-muted-foreground">{stage.description}</p>
            </div>
            <Badge variant={stageVerdict(stage) === "PASS" ? "secondary" : "destructive"}>
              {stageVerdict(stage)}
            </Badge>
          </div>

          <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <ScoreRing value={stage.score} size={130} color={scoreColor(stage.score)} label={`threshold ${stage.passThreshold}`} />
            <div className="w-full flex-1 space-y-3">
              {Object.entries(stage.evidence).map(([label, e]) => (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      {label}
                      {!e.present && <Badge variant="outline" className="text-[10px]">not started</Badge>}
                    </span>
                    <span className="font-medium">{e.score}</span>
                  </div>
                  <Progress value={e.score} />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          <ArrowLeft className="mr-2 size-4" /> Previous
        </Button>
        <div className="flex gap-2">
          {stages.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              className={`size-2.5 rounded-full transition-colors ${i === index ? "bg-primary" : i < index ? "bg-primary/40" : "bg-muted-foreground/30"}`}
              aria-label={s.title}
            />
          ))}
        </div>
        {index < stages.length - 1 ? (
          <Button onClick={() => setIndex(index + 1)}>
            Next <ArrowRight className="ml-2 size-4" />
          </Button>
        ) : (
          <Button onClick={() => setIndex(0)}>
            <Briefcase className="mr-2 size-4" /> Restart
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">Stage verdicts</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {stages.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border p-4">
              {stageVerdict(s) === "PASS" ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="size-5 shrink-0 text-red-500" />
              )}
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">Score {s.score} · needs {s.passThreshold}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
