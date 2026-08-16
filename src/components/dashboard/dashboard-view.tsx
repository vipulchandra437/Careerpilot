"use client";

import Link from "next/link";
import { ArrowRight, Target, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/score-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressChart } from "@/components/dashboard/progress-chart";

export interface DashboardAction {
  title: string;
  description: string;
  href: string;
  reason: string;
}

export interface DashboardGap {
  skillName: string;
  status: string;
  currentRating: number;
  requiredRating: number;
}

export interface DashboardData {
  userName: string;
  overall: number;
  scores: Record<string, number>;
  targetCompany: string | null;
  targetRole: string | null;
  attempted: number;
  accepted: number;
  strengths: { label: string; score: number }[];
  weakest: { label: string; score: number }[];
  gaps: DashboardGap[];
  actions: DashboardAction[];
  scoreHistory: { date: string; score: number }[];
}

const scoreColor = (score: number) => {
  if (score >= 85) return "var(--chart-1)";
  if (score >= 70) return "var(--chart-2)";
  if (score >= 50) return "var(--chart-3)";
  return "var(--chart-5)";
};

export function DashboardView({ data }: { data: DashboardData }) {
  const hasTarget = Boolean(data.targetCompany && data.targetRole);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {data.userName.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">Here&apos;s where your career preparation stands.</p>
        </div>
        {!hasTarget && (
          <Button render={<Link href="/career-goal" />}>
            Set career goal <ArrowRight className="ml-2 size-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Where am I */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Career Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <ScoreRing
              value={data.overall}
              size={150}
              color={scoreColor(data.overall)}
              sublabel="/ 100"
            />
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary">
                <TrendingUp className="mr-1 size-3" /> {data.attempted} attempted · {data.accepted} solved
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Where do I want to go */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="size-4" /> Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasTarget ? (
              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-bold">{data.targetCompany}</p>
                  <p className="text-sm text-muted-foreground">{data.targetRole}</p>
                </div>
                <div className="flex items-center gap-4">
                  <ScoreRing value={data.overall} size={84} stroke={8} color={scoreColor(data.overall)} label="ready" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Company readiness</p>
                    <p>Estimated from your current profile.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" render={<Link href="/readiness" />}>
                  View full breakdown
                </Button>
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-3 text-center">
                <Target className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Pick a company and role to start measuring readiness.
                </p>
                <Button size="sm" render={<Link href="/career-goal" />}>
                  Choose a target
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Am I improving */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {data.scoreHistory.length > 0 ? (
              <ProgressChart data={data.scoreHistory} />
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <p>No progress recorded yet.</p>
                <p className="text-xs">Complete assessments to see your score trend.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category scores */}
      <Card>
        <CardHeader>
          <CardTitle>Category scores</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(data.scores).map(([key, value]) => (
            <div key={key} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium capitalize">
                  {key.replace("_", " ")}
                </span>
                <span className="text-sm font-bold">{value}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: scoreColor(value) }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* What is stopping me */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-amber-500" /> Top skill gaps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.gaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No critical gaps found. {hasTarget ? "Great job covering your target role's skills!" : "Set a career goal to see skill gaps."}
              </p>
            ) : (
              data.gaps.slice(0, 4).map((gap) => (
                <div key={gap.skillName} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{gap.skillName}</p>
                    <p className="text-xs text-muted-foreground">
                      {gap.status === "MISSING"
                        ? "Not started"
                        : gap.status === "NEEDS_IMPROVEMENT"
                          ? `At ${gap.currentRating}/5, needs ${gap.requiredRating}/5`
                          : `Near target (${gap.currentRating}/${gap.requiredRating})`}
                    </p>
                  </div>
                  <Badge
                    variant={
                      gap.status === "MISSING"
                        ? "destructive"
                        : gap.status === "NEEDS_IMPROVEMENT"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {gap.status === "MISSING"
                      ? "Missing"
                      : gap.status === "NEEDS_IMPROVEMENT"
                        ? "Below target"
                        : "Close"}
                  </Badge>
                </div>
              ))
            )}
            {data.gaps.length > 0 && (
              <Button variant="outline" size="sm" render={<Link href="/skill-gaps" />}>
                View all skill gaps
              </Button>
            )}
          </CardContent>
        </Card>

        {/* What should I do now */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4 text-emerald-500" /> Recommended next actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up. Take an assessment or explore your roadmap next.
              </p>
            ) : (
              data.actions.map((action, i) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Strengths */}
      <Card>
        <CardHeader>
          <CardTitle>Top strengths</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {data.strengths.map((s) => (
            <Badge key={s.label} variant="outline" className="px-3 py-1.5">
              <CheckCircle2 className="mr-1 size-3 text-emerald-500" />
              {s.label}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
