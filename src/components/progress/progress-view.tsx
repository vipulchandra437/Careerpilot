"use client";

import { TrendingUp, Code2, Mic2, MessageSquareText, FolderGit2, Activity } from "lucide-react";
import { formatDateTime, scoreColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProgressChart } from "@/components/dashboard/progress-chart";
import { ScoreRing } from "@/components/ui/score-ring";

type Props = {
  overall: number;
  bandLabel: string;
  dailyTrend: { date: string; score: number }[];
  categories: { key: string; label: string; score: number; latestScore: number | null }[];
  counts: { submissionsAccepted: number; interviews: number; communications: number; projects: number };
  recentEvents: { type: string; score: number; createdAt: string }[];
};

export function ProgressView({ overall, bandLabel, dailyTrend, categories, counts, recentEvents }: Props) {
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

      <Card>
        <CardHeader>
          <CardTitle>Activity snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Category scores</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {categories.map((c) => (
            <div key={c.key} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">{c.label}</span>
                <span className="text-sm font-bold">{c.score}</span>
              </div>
              <Progress value={c.score} />
              <p className="mt-1 text-xs text-muted-foreground">
                {c.latestScore != null ? `Latest recorded: ${c.latestScore}` : "No recorded events yet"}
              </p>
            </div>
          ))}
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
