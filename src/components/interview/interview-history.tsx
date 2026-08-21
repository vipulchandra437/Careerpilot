"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import {
  Loader2,
  TrendingUp,
  BarChart3,
  Filter,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type InterviewEntry = {
  id: string;
  type: string;
  difficulty: string;
  score: number | null;
  company: string | null;
  createdAt: string;
  questionCount: number;
  perQuestion: { question: string; score: number }[];
  avgTimePerQuestion: number | null;
};

const TYPE_FILTERS = [
  { value: "ALL", label: "All Types" },
  { value: "HR", label: "HR" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "BEHAVIORAL", label: "Behavioral" },
  { value: "SYSTEM_DESIGN", label: "System Design" },
  { value: "AI_ML", label: "AI/ML" },
];

const TYPE_BADGE_COLORS: Record<string, string> = {
  HR: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  TECHNICAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  BEHAVIORAL: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  SYSTEM_DESIGN: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  AI_ML: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function formatTimeShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function TrendChart({ interviews }: { interviews: InterviewEntry[] }) {
  const scored = [...interviews]
    .filter((i) => i.score != null)
    .reverse()
    .slice(-15);
  if (scored.length < 2) return null;

  const maxScore = 100;
  const width = 400;
  const height = 120;
  const padX = 24;
  const padY = 12;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const points = scored.map((s, i) => ({
    x: padX + (i / (scored.length - 1)) * plotW,
    y: padY + plotH - ((s.score ?? 0) / maxScore) * plotH,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padY + plotH} L ${points[0].x} ${padY + plotH} Z`;

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[500px]">
        {yTicks.map((tick) => {
          const y = padY + plotH - (tick / maxScore) * plotH;
          return (
            <g key={tick}>
              <line x1={padX} y1={y} x2={padX + plotW} y2={y} className="stroke-border" strokeWidth={0.5} strokeDasharray="4,4" />
              <text x={padX - 4} y={y + 3} className="fill-muted-foreground" fontSize={8} textAnchor="end">
                {tick}
              </text>
            </g>
          );
        })}
        <path d={areaD} className="fill-primary/10" />
        <path d={pathD} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} className="fill-primary" />
        ))}
      </svg>
    </div>
  );
}

export function InterviewHistory() {
  const [interviews, setInterviews] = useState<InterviewEntry[]>([]);
  const [averagesByType, setAveragesByType] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("ALL");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/interview/history");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load history");
        setInterviews(data.interviews);
        setAveragesByType(data.averagesByType);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered =
    typeFilter === "ALL"
      ? interviews
      : interviews.filter((i) => i.type === typeFilter);

  const totalInterviews = interviews.length;
  const overallAvg =
    totalInterviews > 0
      ? Math.round(
          interviews.reduce((s, i) => s + (i.score ?? 0), 0) / totalInterviews,
        )
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (interviews.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm font-medium">No interviews completed yet</p>
          <p className="text-xs text-muted-foreground">
            Complete your first interview to see your history and trends here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold">{totalInterviews}</div>
            <div className="text-xs text-muted-foreground">Total Interviews</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold">{overallAvg}</div>
            <div className="text-xs text-muted-foreground">Average Score</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-3xl font-bold">
              {Object.keys(averagesByType).length}
            </div>
            <div className="text-xs text-muted-foreground">Interview Types</div>
          </CardContent>
        </Card>
      </div>

      {Object.keys(averagesByType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average Score by Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {Object.entries(averagesByType)
              .sort(([, a], [, b]) => b - a)
              .map(([t, avg]) => (
                <div key={t} className="flex items-center gap-3">
                  <Badge className={`w-28 justify-center text-xs ${TYPE_BADGE_COLORS[t] ?? ""}`} variant="secondary">
                    {t.replaceAll("_", " ")}
                  </Badge>
                  <div className="flex-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${avg}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold tabular-nums">{avg}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {totalInterviews >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4" /> Score Progression
            </CardTitle>
            <CardDescription>Your score trend over recent interviews</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart interviews={interviews} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Interview History</CardTitle>
            <CardDescription>{filtered.length} interviews</CardDescription>
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "ALL")}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-1.5 size-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTERS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Avg Time</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <Badge className={`text-xs ${TYPE_BADGE_COLORS[i.type] ?? ""}`} variant="secondary">
                      {i.type.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{i.difficulty}</TableCell>
                  <TableCell className="text-xs">{i.company ?? "—"}</TableCell>
                  <TableCell>
                    <span className={`text-sm font-semibold ${
                      (i.score ?? 0) >= 80 ? "text-emerald-600" :
                      (i.score ?? 0) >= 60 ? "text-blue-600" :
                      (i.score ?? 0) >= 40 ? "text-amber-600" :
                      "text-red-600"
                    }`}>
                      {i.score ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{i.questionCount}</TableCell>
                  <TableCell className="text-xs">
                    {i.avgTimePerQuestion != null ? (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatTimeShort(i.avgTimePerQuestion)}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(i.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
