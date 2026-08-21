"use client";

import { TrendingUp, Code2, Mic2, MessageSquareText, FolderGit2, Activity, Trophy, Target } from "lucide-react";
import { formatDateTime, scoreColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProgressChart } from "@/components/dashboard/progress-chart";
import { ScoreRing } from "@/components/ui/score-ring";
import { RadarChart } from "@/components/ui/radar-chart";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "@/server/scoring/score-engine";

type Milestone = {
  label: string;
  achieved: boolean;
  date: string | null;
};

type Props = {
  overall: number;
  bandLabel: string;
  dailyTrend: { date: string; score: number }[];
  categories: { key: string; label: string; score: number; latestScore: number | null }[];
  counts: { submissionsAccepted: number; interviews: number; communications: number; projects: number };
  recentEvents: { type: string; score: number; createdAt: string }[];
};

export function ProgressView({ overall, bandLabel, dailyTrend, categories, counts, recentEvents }: Props) {
  const radarData = CATEGORY_KEYS.map((key) => {
    const cat = categories.find((c) => c.key === key);
    return {
      key,
      label: CATEGORY_LABELS[key],
      value: cat?.score ?? 0,
    };
  });

  const milestones: Milestone[] = [
    { label: "First resume analyzed", achieved: categories.find((c) => c.key === "RESUME")?.latestScore != null, date: null },
    { label: "Coding score above 50", achieved: (categories.find((c) => c.key === "CODING")?.score ?? 0) >= 50, date: null },
    { label: "Mock interview completed", achieved: counts.interviews > 0, date: null },
    { label: "Communication analyzed", achieved: counts.communications > 0, date: null },
    { label: "Project tracked", achieved: counts.projects > 0, date: null },
    { label: "Overall score above 70", achieved: overall >= 70, date: null },
    { label: "All categories above 50", achieved: categories.every((c) => c.score >= 50), date: null },
    { label: "Overall score above 85", achieved: overall >= 85, date: null },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-6">
            <ScoreRing value={overall} size={150} color={scoreColor(overall)} sublabel="/ 100" />
            <Badge variant="secondary">{bandLabel}</Badge>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="size-4" /> Readiness over time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyTrend.length > 0 ? (
              <ProgressChart data={dailyTrend} height={190} />
            ) : (
              <p className="flex h-[190px] items-center justify-center text-sm text-muted-foreground">
                Run analyses and assessments to see your score trend.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Category Radar
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center pt-2">
            <RadarChart data={radarData} size={260} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Code2 className="size-5 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold">{counts.submissionsAccepted}</p>
                <p className="text-xs text-muted-foreground">Accepted solutions</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Mic2 className="size-5 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold">{counts.interviews}</p>
                <p className="text-xs text-muted-foreground">Mock interviews</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <MessageSquareText className="size-5 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold">{counts.communications}</p>
                <p className="text-xs text-muted-foreground">Speech analyses</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <FolderGit2 className="size-5 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold">{counts.projects}</p>
                <p className="text-xs text-muted-foreground">Projects tracked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category detail</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {categories.map((c) => {
            const diff = c.latestScore != null ? c.score - c.latestScore : 0;
            return (
              <div key={c.key} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{c.label}</span>
                  <div className="flex items-center gap-2">
                    {diff !== 0 && c.latestScore != null && (
                      <span className={`text-xs font-medium ${diff > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {diff > 0 ? "+" : ""}{diff}
                      </span>
                    )}
                    <span className="text-sm font-bold">{c.score}</span>
                  </div>
                </div>
                <Progress value={c.score} />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {c.latestScore != null ? `Latest recorded: ${c.latestScore}` : "No recorded events yet"}
                  </p>
                  <div
                    className="h-1.5 w-12 rounded-full"
                    style={{ backgroundColor: scoreColor(c.score) }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4 text-amber-500" /> Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {milestones.map((m) => (
              <div
                key={m.label}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${m.achieved ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30" : ""}`}
              >
                <div className={`flex size-6 shrink-0 items-center justify-center rounded-full ${m.achieved ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900" : "bg-muted text-muted-foreground"}`}>
                  {m.achieved ? (
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <Target className="size-3" />
                  )}
                </div>
                <span className={m.achieved ? "font-medium" : "text-muted-foreground"}>{m.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-muted-foreground" /> Recent score events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet — complete an assessment to get started.</p>
          ) : (
            recentEvents.map((e, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{e.type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</p>
                </div>
                <span className="font-bold">{e.score}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
