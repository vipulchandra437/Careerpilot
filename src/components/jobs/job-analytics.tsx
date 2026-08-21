"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Job } from "./job-card";

type JobAnalyticsProps = {
  jobs: Job[];
};

const STATUS_ORDER: Job["status"][] = ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"];

const STATUS_CONFIG: Record<Job["status"], { label: string; color: string }> = {
  SAVED: { label: "Saved", color: "#a1a1aa" },
  APPLIED: { label: "Applied", color: "#3b82f6" },
  INTERVIEW: { label: "Interview", color: "#eab308" },
  OFFER: { label: "Offer", color: "#22c55e" },
  REJECTED: { label: "Rejected", color: "#ef4444" },
};

function parseSalary(salary: string | null): number | null {
  if (!salary) return null;
  const cleaned = salary.replace(/[^0-9.k]/gi, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  if (salary.toLowerCase().includes("k")) return num * 1000;
  if (num < 1000) return num * 1000;
  return num;
}

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function JobAnalytics({ jobs }: JobAnalyticsProps) {
  const stats = useMemo(() => {
    const byStatus = STATUS_ORDER.map((status) => ({
      status,
      count: jobs.filter((j) => j.status === status).length,
    }));

    const total = jobs.length;
    const applied = jobs.filter((j) => j.appliedAt).length;
    const responded = jobs.filter((j) => j.status === "INTERVIEW" || j.status === "OFFER" || j.status === "REJECTED").length;
    const responseRate = applied > 0 ? ((responded / applied) * 100).toFixed(1) : "0";

    const responseTimes: number[] = [];
    for (const job of jobs) {
      if (job.appliedAt && job.status !== "SAVED") {
        const days = daysBetween(job.appliedAt, job.updatedAt);
        if (days >= 0) responseTimes.push(days);
      }
    }
    const avgResponseTime = responseTimes.length > 0
      ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1)
      : "—";

    const salaryJobs = jobs
      .filter((j) => j.status === "APPLIED" || j.status === "INTERVIEW" || j.status === "OFFER")
      .map((j) => ({ job: j, salary: parseSalary(j.salary) }))
      .filter((j) => j.salary !== null) as { job: Job; salary: number }[];

    const salaryRanges = [
      { label: "<$50k", min: 0, max: 50000, count: 0 },
      { label: "$50k-$80k", min: 50000, max: 80000, count: 0 },
      { label: "$80k-$120k", min: 80000, max: 120000, count: 0 },
      { label: "$120k-$160k", min: 120000, max: 160000, count: 0 },
      { label: "$160k+", min: 160000, max: Infinity, count: 0 },
    ];
    for (const { salary } of salaryJobs) {
      const range = salaryRanges.find((r) => salary >= r.min && salary < r.max);
      if (range) range.count++;
    }

    const companyCounts: Record<string, number> = {};
    for (const job of jobs) {
      if (job.company) {
        const name = job.company.trim();
        companyCounts[name] = (companyCounts[name] || 0) + 1;
      }
    }
    const topCompanies = Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const timeline: Record<string, { saved: number; applied: number; total: number }> = {};
    for (const job of jobs) {
      const key = getMonthKey(job.createdAt);
      if (!timeline[key]) timeline[key] = { saved: 0, applied: 0, total: 0 };
      timeline[key].total++;
      if (job.appliedAt) {
        const appliedKey = getMonthKey(job.appliedAt);
        if (!timeline[appliedKey]) timeline[appliedKey] = { saved: 0, applied: 0, total: 0 };
        timeline[appliedKey].applied++;
      }
    }
    const timelineData = Object.entries(timeline)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({ month, ...data }));

    let conicGradientParts: string[] = [];
    let cumulativePercent = 0;
    for (const item of byStatus) {
      if (item.count === 0) continue;
      const slicePercent = (item.count / total) * 100;
      conicGradientParts.push(
        `${STATUS_CONFIG[item.status].color} ${cumulativePercent}% ${cumulativePercent + slicePercent}%`
      );
      cumulativePercent += slicePercent;
    }

    return { byStatus, total, applied, responseRate, avgResponseTime, salaryRanges, topCompanies, timelineData, conicGradient: conicGradientParts.join(", ") };
  }, [jobs]);

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">Add some jobs to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Response Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.responseRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.applied} applied · {stats.total} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Avg. Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.avgResponseTime}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.avgResponseTime !== "—" ? "days" : "no data yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">
              across {stats.topCompanies.length} companies
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Applications by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div
                className="size-36 shrink-0 rounded-full"
                style={{
                  background: stats.conicGradient
                    ? `conic-gradient(${stats.conicGradient})`
                    : `conic-gradient(#a1a1aa 0% 100%)`,
                }}
              />
              <div className="space-y-2">
                {stats.byStatus.map((item) => (
                  <div key={item.status} className="flex items-center gap-2 text-sm">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_CONFIG[item.status].color }}
                    />
                    <span className="min-w-[70px] text-muted-foreground">
                      {STATUS_CONFIG[item.status].label}
                    </span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Companies</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No company data yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.topCompanies.map(([company, count]) => {
                  const maxCount = stats.topCompanies[0][1];
                  const widthPercent = (count / maxCount) * 100;
                  return (
                    <div key={company} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate">{company}</span>
                        <span className="text-muted-foreground ml-2">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Salary Range Distribution (Applied+)</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.salaryRanges.every((r) => r.count === 0) ? (
            <p className="text-sm text-muted-foreground">No salary data available.</p>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {stats.salaryRanges.map((range) => {
                const maxCount = Math.max(...stats.salaryRanges.map((r) => r.count), 1);
                const heightPercent = (range.count / maxCount) * 100;
                return (
                  <div key={range.label} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-medium">{range.count}</span>
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-md bg-primary/80 transition-all"
                        style={{ height: `${heightPercent}%`, minHeight: range.count > 0 ? "4px" : "0" }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{range.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {stats.timelineData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Application Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {stats.timelineData.map((item) => {
                const maxTotal = Math.max(...stats.timelineData.map((t) => t.total), 1);
                const totalHeight = (item.total / maxTotal) * 100;
                const appliedHeight = maxTotal > 0 ? (item.applied / maxTotal) * 100 : 0;
                return (
                  <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-medium">{item.total}</span>
                    <div className="w-full flex-1 flex items-end relative">
                      <div
                        className="w-full rounded-t-md bg-muted transition-all"
                        style={{ height: `${totalHeight}%`, minHeight: item.total > 0 ? "4px" : "0" }}
                      />
                      <div
                        className="absolute bottom-0 w-full rounded-t-md bg-primary transition-all"
                        style={{ height: `${appliedHeight}%`, minHeight: item.applied > 0 ? "4px" : "0" }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {item.month.slice(2)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" /> Applied
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-muted" /> Created
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
