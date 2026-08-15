"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, FileText, Link2, FolderGit2, Mic2, BarChart3, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Area = {
  key: string;
  label: string;
  score: number;
  href: string;
  detail: string;
};

type Readiness = {
  score: number;
  summary: string;
  areas: Area[];
};

type Stats = {
  resumeCount: number;
  projectCount: number;
  interviewCount: number;
  resumeScore: number | null;
  linkedinScore: number | null;
};

const features = [
  { href: "/resume", label: "Resume", icon: FileText, countKey: "resumeCount" as const, scoreKey: "resumeScore" as const, desc: "Score & improve" },
  { href: "/linkedin", label: "LinkedIn", icon: Link2, countKey: null, scoreKey: "linkedinScore" as const, desc: "Profile review" },
  { href: "/projects", label: "Projects", icon: FolderGit2, countKey: "projectCount" as const, scoreKey: null, desc: "Catalog & analyze" },
  { href: "/interview", label: "Interview", icon: Mic2, countKey: "interviewCount" as const, scoreKey: null, desc: "Practice & prep" },
];

export function DashboardContent({
  stats,
  readiness,
  userName,
}: {
  stats: Stats;
  readiness: Readiness;
  userName: string;
}) {
  const completed = useMemo(() => {
    let count = 0;
    if (stats.resumeCount > 0 && stats.resumeScore != null) count++;
    if (stats.linkedinScore != null) count++;
    if (stats.projectCount > 0) count++;
    if (stats.interviewCount > 0) count++;
    return count;
  }, [stats]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {userName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track your job-search readiness across every asset.</p>
      </div>

      <Card className="bg-primary text-primary-foreground">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-medium opacity-80">
              <BarChart3 className="size-4" /> Company readiness
            </p>
            <p className="text-3xl font-bold">{readiness.score}/100</p>
            <p className="max-w-md text-sm opacity-90">{readiness.summary}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm opacity-90">
              <div>{completed}/4 areas complete</div>
              <Progress value={(completed / 4) * 100} className="mt-1 w-40" />
            </div>
            <Button variant="secondary" render={<Link href={readiness.areas.some((a) => a.score < 70) ? [...readiness.areas].sort((a, b) => a.score - b.score)[0].href : "/interview"} />}>
              Improve lowest area <ArrowRight className="ml-1 size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Breakdown</h2>
        {readiness.areas.map((area) => (
          <Card key={area.key}>
            <CardContent className="flex items-center justify-between gap-4 pt-6">
              <div className="space-y-1">
                <p className="text-sm font-medium">{area.label}</p>
                <p className="text-xs text-muted-foreground">{area.detail}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold">{area.score}</span>
                <div className="w-24">
                  <Progress value={area.score} />
                </div>
                {area.score >= 70 && <CheckCircle2 className="size-4 text-green-600" />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your assets</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const count = f.countKey ? stats[f.countKey] : null;
            const score = f.scoreKey ? stats[f.scoreKey] : null;
            return (
              <Link key={f.href} href={f.href}>
                <Card className="h-full transition-colors hover:border-primary/50">
                  <CardHeader className="pb-2">
                    <f.icon className="size-5 text-muted-foreground" />
                    <CardTitle className="mt-2 text-base">{f.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                      {count != null && <p className="text-xs text-muted-foreground">{count} saved</p>}
                      {score != null ? (
                        <p className="text-sm font-semibold">Score: {score}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not scored yet</p>
                      )}
                    </div>
                    <Sparkles className="size-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
