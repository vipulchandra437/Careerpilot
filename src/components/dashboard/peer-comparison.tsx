"use client";

import { Users, TrendingUp } from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_KEYS, type CategoryKey } from "@/server/scoring/score-engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type ComparisonData = {
  averages: Record<string, number>;
  topDeciles: Record<string, number>;
  userScores: Record<string, number>;
  percentile: number;
  totalUsers: number;
};

function getPercentileBadge(p: number) {
  if (p >= 90) return "default" as const;
  if (p >= 70) return "secondary" as const;
  return "outline" as const;
}

export function PeerComparison({ data }: { data: ComparisonData }) {
  const p = data.percentile;
  const message =
    p >= 90
      ? "Outstanding! You're in the top tier of candidates."
      : p >= 70
        ? "Great progress. You're ahead of most peers."
        : p >= 50
          ? "Solid foundation. Keep building to reach the top half."
          : "Just getting started. Focus on consistent improvement.";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4" /> Peer Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <TrendingUp className="size-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">Top {100 - p}%</span>
              <Badge variant={getPercentileBadge(p)}>
                {p >= 90 ? "Top performer" : p >= 70 ? "Above average" : p >= 50 ? "Average" : "Building up"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{message}</p>
          </div>
          <span className="text-xs text-muted-foreground">{data.totalUsers} users</span>
        </div>

        <div className="space-y-3">
          {CATEGORY_KEYS.map((key) => {
            const user = data.userScores[key] ?? 0;
            const avg = data.averages[key] ?? 0;
            const top = data.topDeciles[key] ?? 0;
            const isAboveAvg = user > avg;

            return (
              <div key={key} className="rounded-lg border px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {CATEGORY_LABELS[key as CategoryKey]}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isAboveAvg ? "text-emerald-600" : "text-amber-600",
                    )}
                  >
                    {isAboveAvg ? "Above avg" : "Below avg"}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] text-muted-foreground">You</span>
                    <div className="flex-1">
                      <Progress value={user} />
                    </div>
                    <span className="w-8 text-right text-xs font-bold">{user}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] text-muted-foreground">Avg</span>
                    <div className="flex-1">
                      <Progress value={avg} className="[&_[data-slot=progress-indicator]]:bg-muted-foreground/40" />
                    </div>
                    <span className="w-8 text-right text-xs text-muted-foreground">{avg}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] text-muted-foreground">Top 10%</span>
                    <div className="flex-1">
                      <Progress value={top} className="[&_[data-slot=progress-indicator]]:bg-emerald-500/60" />
                    </div>
                    <span className="w-8 text-right text-xs text-muted-foreground">{top}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
