"use client";

import Link from "next/link";
import { Printer, CheckCircle2, AlertTriangle, Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/ui/score-ring";
import type { ReportData } from "@/server/services/report.service";

export function ReportView({ report }: { report: ReportData }) {
  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-xs text-muted-foreground">Generated {new Date(report.generatedAt).toLocaleString()}</p>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 size-4" /> Print report
        </Button>
      </div>

      <Card className="bg-primary text-primary-foreground print:bg-primary">
        <CardContent className="flex flex-wrap items-center justify-between gap-6 pt-6">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium opacity-80">
              <Target className="size-4" /> Career Report
            </p>
            <p className="text-3xl font-bold">{report.overall}/100</p>
            <p className="text-sm opacity-90">{report.band}</p>
            <p className="text-sm opacity-80">
              {report.targetRole ?? "No target role"} {report.targetCompany ? `· ${report.targetCompany}` : ""}
            </p>
          </div>
          <ScoreRing value={report.overall} size={140} color="var(--primary-foreground)" sublabel="/ 100" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-5">
          <p className="text-sm text-muted-foreground">{report.summary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4 text-emerald-500" /> Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {report.strengths.map((s) => (
              <Badge key={s.label} variant="outline" className="px-3 py-1.5">{s.label}</Badge>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-amber-500" /> Weaknesses
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {report.weaknesses.length > 0 ? report.weaknesses.map((w) => (
              <Badge key={w.label} variant="destructive" className="px-3 py-1.5">{w.label}</Badge>
            )) : (
              <p className="text-sm text-muted-foreground">No major weaknesses — keep it up!</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category scores</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {report.categoryScores.map((c) => (
            <div key={c.key} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">{c.label}</span>
                <span className="text-sm font-bold">{c.score}</span>
              </div>
              <Progress value={c.score} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top skill gaps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.skillGaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No gaps found.</p>
            ) : (
              report.skillGaps.map((g, i) => (
                <div key={i} className="rounded-lg border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{g.skillName}</span>
                    <Badge variant={g.status === "MISSING" ? "destructive" : "secondary"}>
                      {g.status.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{g.reason}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recommended next steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.recommendedActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">You&apos;re all caught up. Explore the roadmap next.</p>
            ) : (
              report.recommendedActions.map((a, i) => (
                <Link key={i} href={a.href} className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent print:no-underline">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
