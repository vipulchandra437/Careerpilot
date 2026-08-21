"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { scoreColor } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type TrendsData = {
  topSkills: { skill: string; count: number }[];
  scoreTrend: { date: string; score: number }[];
  averageScore: number | null;
  totalAnalyses: number;
  missingInDemand: { skill: string; count: number }[];
};

function BarChartInline({
  data,
  maxCount,
}: {
  data: { skill: string; count: number }[];
  maxCount: number;
}) {
  const max = maxCount || 1;
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.skill} className="flex items-center gap-3">
          <span className="w-[120px] truncate text-xs text-right text-muted-foreground">
            {item.skill}
          </span>
          <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
            <div
              className="h-full rounded bg-primary transition-all"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
          <span className="w-8 text-xs font-mono text-muted-foreground tabular-nums">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function ScoreTrendLine({
  data,
}: {
  data: { date: string; score: number }[];
}) {
  if (data.length < 2) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">
        Need at least 2 data points to show a trend line.
      </p>
    );
  }

  const width = 500;
  const height = 120;
  const padding = { top: 10, right: 20, bottom: 20, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minScore = Math.max(0, Math.min(...data.map((d) => d.score)) - 10);
  const maxScore = Math.min(100, Math.max(...data.map((d) => d.score)) + 10);

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y =
      padding.top +
      chartH -
      ((d.score - minScore) / (maxScore - minScore)) * chartH;
    return { x, y, score: d.score, date: d.date };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[500px]"
      >
        {[0, 25, 50, 75, 100].map((tick) => {
          const y =
            padding.top +
            chartH -
            ((tick - minScore) / (maxScore - minScore)) * chartH;
          if (y < padding.top || y > padding.top + chartH) return null;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="var(--border)"
                strokeWidth={0.5}
                strokeDasharray="4 2"
              />
              <text
                x={padding.left - 6}
                y={y}
                textAnchor="end"
                dominantBaseline="central"
                className="fill-muted-foreground text-[9px]"
              >
                {tick}
              </text>
            </g>
          );
        })}

        <path
          d={pathD}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="var(--primary)"
            stroke="var(--background)"
            strokeWidth={2}
          />
        ))}
      </svg>
    </div>
  );
}

export function SkillTrends() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchTrends() {
    setLoading(true);
    try {
      const res = await fetch("/api/jd-analyze/trends");
      if (!res.ok) {
        toast.error("Failed to load trends.");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load trends.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTrends();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.totalAnalyses === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <BarChart3 className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Analyze at least one job description to see skill demand trends.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = data.topSkills[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Analyses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {data.totalAnalyses}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Avg Match Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.averageScore != null ? (
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: scoreColor(data.averageScore) }}
              >
                {data.averageScore}%
              </p>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Unique Skills Seen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {data.topSkills.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="size-4" />
                Top In-Demand Skills
              </CardTitle>
              <CardDescription>
                Most frequently requested skills across your saved JDs
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={fetchTrends}
              disabled={loading}
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <BarChartInline data={data.topSkills.slice(0, 10)} maxCount={maxCount} />
        </CardContent>
      </Card>

      {data.scoreTrend.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4" />
              Match Score Trend
            </CardTitle>
            <CardDescription>
              How your match scores have changed over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreTrendLine data={data.scoreTrend} />
          </CardContent>
        </Card>
      )}

      {data.missingInDemand.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4" />
              Most In-Demand Skills You&apos;re Missing
            </CardTitle>
            <CardDescription>
              High-frequency skills from JDs that aren&apos;t in your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.missingInDemand.map((item) => (
                <div
                  key={item.skill}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="text-[10px]">
                      Missing
                    </Badge>
                    <span className="text-sm font-medium">{item.skill}</span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Required in {item.count} JD{item.count > 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
