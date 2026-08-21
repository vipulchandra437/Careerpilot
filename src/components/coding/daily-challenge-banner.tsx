"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Flame, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ChallengeData = {
  challenge: {
    id: string;
    date: string;
    problem: {
      id: string;
      title: string;
      slug: string;
      difficulty: string;
      topics: string[];
    };
    solvedByUser: boolean;
  } | null;
};

type StreakData = {
  currentStreak: number;
  totalSolved: number;
} | null;

const DIFF_COLORS: Record<string, string> = {
  EASY: "text-emerald-600 dark:text-emerald-400",
  MEDIUM: "text-amber-600 dark:text-amber-400",
  HARD: "text-red-600 dark:text-red-400",
};

function getRecentDays(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

export function DailyChallengeBanner() {
  const [data, setData] = useState<ChallengeData | null>(null);
  const [streak, setStreak] = useState<StreakData>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/coding/daily-challenge").then((r) => r.json()),
      fetch("/api/coding/stats").then((r) => r.json()),
    ])
      .then(([challengeData, statsData]) => {
        setData(challengeData);
        if (statsData.streak) {
          setStreak(statsData.streak);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data?.challenge) {
    return null;
  }

  const ch = data.challenge;
  const recentDays = getRecentDays();

  return (
    <Card className="overflow-hidden border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-amber-500/5">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10">
            <Star className="size-6 text-yellow-500 fill-yellow-500" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Daily Challenge</span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px]",
                  ch.solvedByUser
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-orange-500/10 text-orange-700 dark:text-orange-400",
                )}
              >
                {ch.solvedByUser ? "Solved" : "Unsolved"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{ch.problem.title}</p>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-medium", DIFF_COLORS[ch.problem.difficulty] ?? "")}>
                {ch.problem.difficulty}
              </span>
              {streak && (
                <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                  <Flame className="size-3" />
                  {streak.currentStreak} day streak
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {recentDays.map((day) => (
              <div
                key={day}
                className="flex flex-col items-center gap-0.5"
                title={formatDay(day)}
              >
                <span className="text-[9px] text-muted-foreground">
                  {new Date(day + "T00:00:00").toLocaleDateString("en-US", { weekday: "narrow" })}
                </span>
                <div
                  className={cn(
                    "size-2.5 rounded-full",
                    day === ch.date
                      ? ch.solvedByUser
                        ? "bg-emerald-500"
                        : "bg-yellow-500"
                      : "bg-muted",
                  )}
                />
              </div>
            ))}
          </div>

          <Link href={`/coding?problem=${ch.problem.id}`}>
            <Button size="sm" className="gap-1.5">
              {ch.solvedByUser ? "Review" : "Solve Today's Challenge"}
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
