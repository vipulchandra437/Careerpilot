"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type Props = {
  signupsLast30: { date: string; count: number }[];
  submissions: { status: string; count: number }[];
  verdicts: { COMPLETED: number; IN_PROGRESS: number; ABORTED: number; avgScore: number | null };
  avgScores: {
    resume: number | null;
    coding: number | null;
    interview: number | null;
    github: number | null;
    linkedin: number | null;
    communication: number | null;
    projects: number | null;
  };
  scoreBreakdown: { type: string; avg: number; count: number }[];
  roleDist: { name: string; count: number }[];
  companyDist: { name: string; count: number }[];
};

const scoreLabel = (v: number | null) => (v == null ? "—" : v.toFixed(1));

export function AnalyticsView({
  signupsLast30,
  submissions,
  verdicts,
  avgScores,
  scoreBreakdown,
  roleDist,
  companyDist,
}: Props) {
  const totalSubmissions = submissions.reduce((sum, s) => sum + s.count, 0);
  const accepted = submissions.find((s) => s.status === "ACCEPTED")?.count ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signups — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={signupsLast30} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(v: string) => v.slice(5)}
                stroke="var(--muted-foreground)"
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
              />
              <Bar dataKey="count" fill="var(--primary)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coding submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-6">
              <div>
                <p className="text-3xl font-bold text-emerald-600">{accepted}</p>
                <p className="text-xs text-muted-foreground">accepted</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{totalSubmissions - accepted}</p>
                <p className="text-xs text-muted-foreground">other</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{totalSubmissions}</p>
                <p className="text-xs text-muted-foreground">total</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {submissions.map((s) => (
                <Badge key={s.status} variant="outline">
                  {s.status.toLowerCase().replace(/_/g, " ")} · {s.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interviews</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              COMPLETED · {verdicts.COMPLETED}
            </Badge>
            <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              IN PROGRESS · {verdicts.IN_PROGRESS}
            </Badge>
            <Badge variant="outline">ABORTED · {verdicts.ABORTED}</Badge>
            <Badge variant="outline">avg score · {verdicts.avgScore == null ? "—" : verdicts.avgScore}</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Average analysis scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            {[
              { label: "Resume", value: avgScores.resume },
              { label: "Coding", value: avgScores.coding },
              { label: "Interview", value: avgScores.interview },
              { label: "GitHub", value: avgScores.github },
              { label: "LinkedIn", value: avgScores.linkedin },
              { label: "Communication", value: avgScores.communication },
              { label: "Projects", value: avgScores.projects },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold">{scoreLabel(s.value)}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score history by type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {scoreBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No score events recorded yet.</p>
            ) : (
              scoreBreakdown.map((s) => (
                <div key={s.type} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{s.type.toLowerCase()}</span>
                  <span>
                    <span className="font-medium">{s.avg.toFixed(1)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{s.count} events</span>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top target roles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {roleDist.length === 0 ? (
                <p className="text-sm text-muted-foreground">No student goals set yet.</p>
              ) : (
                roleDist.map((r) => (
                  <div key={r.name} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground">{r.count} students</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top target companies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {companyDist.length === 0 ? (
                <p className="text-sm text-muted-foreground">No student goals set yet.</p>
              ) : (
                companyDist.map((c) => (
                  <div key={c.name} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground">{c.count} students</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
