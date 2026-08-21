"use client";

import { useState, useEffect } from "react";
import { BarChart3, Clock, CheckCircle2, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type LearningLogEntry = {
  skillName: string;
  minutes: number;
  date: string;
};

function BarChart({ data, maxVal }: { data: { label: string; value: number }[]; maxVal: number }) {
  return (
    <div className="space-y-2">
      {data.length === 0 && (
        <p className="text-xs text-muted-foreground">No data yet</p>
      )}
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-28 truncate text-xs text-muted-foreground" title={item.label}>
            {item.label}
          </span>
          <div className="flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-4 rounded-full bg-primary transition-all"
              style={{ width: `${maxVal > 0 ? (item.value / maxVal) * 100 : 0}%` }}
            />
          </div>
          <span className="w-12 text-right text-xs font-medium tabular-nums">
            {item.value >= 60 ? `${Math.floor(item.value / 60)}h ${item.value % 60}m` : `${item.value}m`}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RoadmapAnalytics({
  totalTasks,
  completedTasks,
  durationWeeks,
  createdAt,
}: {
  roadmapId: string;
  totalTasks: number;
  completedTasks: number;
  durationWeeks: number;
  createdAt: string;
}) {
  const [logData, setLogData] = useState<{ totalMinutes: number; bySkill: Record<string, number>; logs: LearningLogEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetch("/api/learning/log")
      .then((r) => r.json())
      .then((d) => { setLogData(d); setLoading(false); })
      .catch(() => setLoading(false));

    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const roadmapStart = new Date(createdAt).getTime();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const currentWeek = Math.floor((now - roadmapStart) / msPerWeek) + 1;
  const elapsedWeeks = Math.min(currentWeek, durationWeeks);
  const expectedPct = Math.round((elapsedWeeks / durationWeeks) * 100);
  const isAhead = progressPct >= expectedPct;

  const avgTasksPerWeek = elapsedWeeks > 0 ? completedTasks / elapsedWeeks : 0;
  const remainingTasks = totalTasks - completedTasks;
  const weeksToComplete = avgTasksPerWeek > 0 ? Math.ceil(remainingTasks / avgTasksPerWeek) : durationWeeks;
  const estimatedEndDate = new Date(now + weeksToComplete * msPerWeek);

  const totalHours = logData ? Math.floor(logData.totalMinutes / 60) : 0;
  const totalMins = logData ? logData.totalMinutes % 60 : 0;

  const skillEntries = logData
    ? Object.entries(logData.bySkill)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
    : [];
  const maxSkillTime = skillEntries.length > 0 ? skillEntries[0][1] : 0;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekActivity: { day: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLogs = logData?.logs.filter((l) => l.date.slice(0, 10) === dateStr) ?? [];
    const dayMins = dayLogs.reduce((sum, l) => sum + l.minutes, 0);
    weekActivity.push({ day: `${dayNames[d.getDay()]} ${d.getDate()}`, minutes: dayMins });
  }
  const maxDayMins = Math.max(...weekActivity.map((d) => d.minutes), 1);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <CheckCircle2 className="size-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{completedTasks}/{totalTasks}</div>
              <div className="text-xs text-muted-foreground">tasks completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-violet-500/10 p-2.5">
              <Clock className="size-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {totalHours}h {totalMins}m
              </div>
              <div className="text-xs text-muted-foreground">total logged</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <TrendingUp className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold flex items-center gap-1">
                {progressPct}%
                {isAhead ? (
                  <Badge variant="default" className="text-xs bg-emerald-600">on track</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">behind</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">progress (expected: {expectedPct}%)</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-amber-500/10 p-2.5">
              <Calendar className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {estimatedEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
              <div className="text-xs text-muted-foreground">est. completion</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="size-4" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tasks completed</span>
            <span className="font-medium">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-3" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Week {Math.min(currentWeek, durationWeeks)} of {durationWeeks}</span>
            <span>{remainingTasks} tasks remaining</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Time Spent per Skill</CardTitle>
          </CardHeader>
          <CardContent>
            {skillEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No time logged yet. Start logging your study time!</p>
            ) : (
              <BarChart
                data={skillEntries.map(([label, value]) => ({ label, value }))}
                maxVal={maxSkillTime}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">This Week&apos;s Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {weekActivity.map((day) => (
                <div key={day.day} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-muted-foreground">{day.day}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-4 rounded-full bg-primary transition-all"
                      style={{ width: `${maxDayMins > 0 ? (day.minutes / maxDayMins) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs tabular-nums">
                    {day.minutes > 0 ? `${day.minutes}m` : "-"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
