"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Flame, Trophy, Target, Clock, TrendingUp, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AnalyticsData = {
  totalSolved: number;
  totalProblems: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  topicCounts: Record<string, number>;
  companyCounts: Record<string, number>;
  heatmap: Record<string, number>;
  acceptanceRate: number;
  averageRuntime: number;
  streak: {
    currentStreak: number;
    longestStreak: number;
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
  };
};

function CalendarHeatmap({ heatmap }: { heatmap: Record<string, number> }) {
  const days: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ date: dateStr, count: heatmap[dateStr] ?? 0 });
  }

  function intensity(count: number) {
    if (count === 0) return "bg-muted";
    if (count === 1) return "bg-emerald-200 dark:bg-emerald-900";
    if (count === 2) return "bg-emerald-400 dark:bg-emerald-700";
    if (count <= 4) return "bg-emerald-500 dark:bg-emerald-600";
    return "bg-emerald-700 dark:bg-emerald-500";
  }

  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} solve${day.count !== 1 ? "s" : ""}`}
                className={cn("size-3.5 rounded-sm transition-colors", intensity(day.count))}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="size-3 rounded-sm bg-muted" />
          <div className="size-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
          <div className="size-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
          <div className="size-3 rounded-sm bg-emerald-500 dark:bg-emerald-600" />
          <div className="size-3 rounded-sm bg-emerald-700 dark:bg-emerald-500" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

function BarChart({
  data,
  maxVal,
}: {
  data: { label: string; value: number }[];
  maxVal: number;
}) {
  return (
    <div className="space-y-2">
      {data.length === 0 && (
        <p className="text-xs text-muted-foreground">No data yet</p>
      )}
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-32 truncate text-xs text-muted-foreground" title={item.label}>
            {item.label}
          </span>
          <div className="flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-4 rounded-full bg-primary transition-all"
              style={{ width: `${maxVal > 0 ? (item.value / maxVal) * 100 : 0}%` }}
            />
          </div>
          <span className="w-8 text-right text-xs font-medium tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function CodingAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/coding/analytics")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Failed to load analytics data.
      </div>
    );
  }

  const topicEntries = Object.entries(data.topicCounts)
    .sort((a, b) => b[1] - a[1]);
  const maxTopic = topicEntries.length > 0 ? topicEntries[0][1] : 0;

  const companyEntries = Object.entries(data.companyCounts)
    .sort((a, b) => b[1] - a[1]);
  const maxCompany = companyEntries.length > 0 ? companyEntries[0][1] : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/coding"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Coding Analytics</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <Trophy className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{data.totalSolved}</div>
              <div className="text-xs text-muted-foreground">
                of {data.totalProblems} problems solved
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-blue-500/10 p-2.5">
              <Target className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{data.acceptanceRate}%</div>
              <div className="text-xs text-muted-foreground">acceptance rate</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-orange-500/10 p-2.5">
              <Flame className="size-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{data.streak.currentStreak}</div>
              <div className="text-xs text-muted-foreground">
                day streak (best: {data.streak.longestStreak})
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-violet-500/10 p-2.5">
              <Clock className="size-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{data.averageRuntime}ms</div>
              <div className="text-xs text-muted-foreground">avg runtime</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Solved by Difficulty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Easy</span>
                  <span className="tabular-nums">{data.easySolved}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${data.totalProblems > 0 ? (data.easySolved / data.totalProblems) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Medium</span>
                  <span className="tabular-nums">{data.mediumSolved}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${data.totalProblems > 0 ? (data.mediumSolved / data.totalProblems) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-red-600 dark:text-red-400 font-medium">Hard</span>
                  <span className="tabular-nums">{data.hardSolved}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all"
                    style={{ width: `${data.totalProblems > 0 ? (data.hardSolved / data.totalProblems) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarHeatmap heatmap={data.heatmap} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4" />
              Solved by Topic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={topicEntries.slice(0, 12).map(([label, value]) => ({ label, value }))}
              maxVal={maxTopic}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="size-4" />
              Solved by Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            {companyEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No company data available</p>
            ) : (
              <BarChart
                data={companyEntries.slice(0, 12).map(([label, value]) => ({ label, value }))}
                maxVal={maxCompany}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
