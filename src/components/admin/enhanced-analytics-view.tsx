"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalStudents: number;
    totalAdmins: number;
    usersThisWeek: number;
    usersThisMonth: number;
  };
  assessments: {
    totalCodingSubmissions: number;
    totalInterviews: number;
    totalResumeAnalyses: number;
    totalGitHubAnalyses: number;
    totalLinkedInAnalyses: number;
    totalCommunicationAnalyses: number;
    totalProjects: number;
    totalProjectAnalyses: number;
  };
  engagement: {
    averageReadinessScore: number;
    averageCodingScore: number;
    averageInterviewScore: number;
    topSkills: { name: string; count: number }[];
    difficultyDistribution: { easy: number; medium: number; hard: number };
  };
  recentActivity: {
    date: string;
    users: number;
    submissions: number;
    analyses: number;
  }[];
}

const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

function OverviewCardsWithData({ data }: { data: AnalyticsData }) {
  const totalAssessments =
    data.assessments.totalCodingSubmissions +
    data.assessments.totalInterviews +
    data.assessments.totalResumeAnalyses +
    data.assessments.totalGitHubAnalyses +
    data.assessments.totalLinkedInAnalyses +
    data.assessments.totalCommunicationAnalyses +
    data.assessments.totalProjectAnalyses;

  const cards = [
    {
      title: "Total Users",
      value: data.overview.totalUsers,
      subtitle: `${data.overview.usersThisWeek} this week · ${data.overview.usersThisMonth} this month`,
    },
    {
      title: "Students vs Admins",
      value: data.overview.totalStudents,
      subtitle: `${data.overview.totalAdmins} admin${data.overview.totalAdmins !== 1 ? "s" : ""}`,
    },
    {
      title: "Total Assessments",
      value: totalAssessments,
      subtitle: "All assessment types combined",
    },
    {
      title: "Avg Readiness Score",
      value: data.engagement.averageReadinessScore,
      subtitle: "Across all students",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{c.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AssessmentBreakdown({ data }: { data: AnalyticsData["assessments"] }) {
  const chartData = [
    { name: "Coding", count: data.totalCodingSubmissions },
    { name: "Interview", count: data.totalInterviews },
    { name: "Resume", count: data.totalResumeAnalyses },
    { name: "GitHub", count: data.totalGitHubAnalyses },
    { name: "LinkedIn", count: data.totalLinkedInAnalyses },
    { name: "Communication", count: data.totalCommunicationAnalyses },
    { name: "Projects", count: data.totalProjectAnalyses },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assessment Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} />
            <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function EngagementMetrics({ data }: { data: AnalyticsData["engagement"] }) {
  const scores = [
    { label: "Readiness", value: data.averageReadinessScore },
    { label: "Coding", value: data.averageCodingScore },
    { label: "Interview", value: data.averageInterviewScore },
  ];

  const diffData = [
    { name: "Easy", value: data.difficultyDistribution.easy },
    { name: "Medium", value: data.difficultyDistribution.medium },
    { name: "Hard", value: data.difficultyDistribution.hard },
  ];
  const hasDiffData = diffData.some((d) => d.value > 0);

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Average Scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {scores.map((s) => (
            <div key={s.label} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-medium">{s.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Difficulty Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {hasDiffData ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={diffData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {diffData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No interviews yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top 5 Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.topSkills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No skills recorded yet.</p>
          ) : (
            data.topSkills.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span>
                  <span className="text-muted-foreground mr-2">#{i + 1}</span>
                  {s.name}
                </span>
                <span className="text-muted-foreground">{s.count} students</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityTimeline({ data }: { data: AnalyticsData["recentActivity"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity — Last 30 Days</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} stroke="var(--muted-foreground)" />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} />
            <Area type="monotone" dataKey="users" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} name="Users" />
            <Area type="monotone" dataKey="submissions" stackId="2" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} name="Submissions" />
            <Area type="monotone" dataKey="analyses" stackId="3" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Analyses" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-9 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-4 w-40 mb-4" />
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-4 w-40 mb-4" />
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-[160px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function EnhancedAnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load analytics (${res.status})`);
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <OverviewCardsWithData data={data} />
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <AssessmentBreakdown data={data.assessments} />
        <ActivityTimeline data={data.recentActivity} />
      </div>
      <EngagementMetrics data={data.engagement} />
    </div>
  );
}
