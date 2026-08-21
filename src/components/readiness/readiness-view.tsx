"use client";

import Link from "next/link";
import { ArrowRight, Gauge, TrendingUp, Lightbulb, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/ui/score-ring";
import { RadarChart } from "@/components/ui/radar-chart";
import { readinessBand } from "@/server/scoring/score-engine";

type BreakdownItem = { key: string; label: string; score: number; weight: number };

const CATEGORY_TIPS: Record<string, string[]> = {
  RESUME: [
    "Tailor your resume to match the job description keywords",
    "Quantify achievements with metrics and numbers",
    "Keep it to one page with clear, concise bullet points",
  ],
  CODING: [
    "Practice 2-3 problems daily on platforms like LeetCode",
    "Focus on data structures: arrays, trees, graphs, and dynamic programming",
    "Review and optimize solutions after getting them accepted",
  ],
  INTERVIEW: [
    "Practice the STAR method for behavioral questions",
    "Do mock interviews with peers or online platforms",
    "Review system design patterns for your target level",
  ],
  COMMUNICATION: [
    "Record yourself explaining technical concepts",
    "Practice articulating your thought process out loud",
    "Join speaking clubs or participate in code reviews",
  ],
  PROJECTS: [
    "Build projects that solve real problems",
    "Write comprehensive READMEs with clear documentation",
    "Deploy your projects and include live demo links",
  ],
  GITHUB: [
    "Maintain consistent contribution streaks",
    "Write detailed commit messages and PR descriptions",
    "Contribute to open-source projects in your stack",
  ],
  LINKEDIN: [
    "Get recommendations from professors and managers",
    "Share technical insights and project showcases",
    "Engage with industry content through thoughtful comments",
  ],
  SKILL_COVERAGE: [
    "Review the skill requirements for your target role",
    "Prioritize learning essential skills you're missing",
    "Build projects that demonstrate each required skill",
  ],
};

function getTipIcon(score: number) {
  if (score >= 70) return <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />;
  if (score >= 40) return <AlertTriangle className="size-4 shrink-0 text-amber-600" />;
  return <AlertTriangle className="size-4 shrink-0 text-rose-600" />;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

export function ReadinessView({
  overall,
  companyName,
  roleTitle,
  level,
  minExperience,
  breakdown,
  history,
}: {
  overall: number;
  companyName: string;
  roleTitle: string;
  level: string;
  minExperience: number | null;
  breakdown: BreakdownItem[];
  history?: { score: number; createdAt: string }[];
}) {
  const band = readinessBand(overall);
  const sorted = [...breakdown].sort((a, b) => b.weight - a.weight);
  const radarData = breakdown.map((b) => ({ key: b.key, label: b.label, value: b.score }));

  const topCategories = [...breakdown]
    .sort((a, b) => b.weight - b.score * b.weight / 100 - (a.weight - a.score * a.weight / 100))
    .slice(0, 3)
    .filter((b) => b.score < 70);

  return (
    <div className="space-y-6">
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="flex flex-wrap items-center justify-between gap-6 pt-6">
          <div className="flex items-center gap-6">
            <ScoreRing value={overall} size={140} color="var(--primary-foreground)" sublabel="/ 100" />
            <div className="space-y-2">
              <p className="text-lg font-semibold">{roleTitle}</p>
              <p className="text-sm opacity-80">{companyName}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-primary-foreground text-primary">{level.toLowerCase()}</Badge>
                {minExperience != null && (
                  <Badge variant="secondary" className="bg-primary-foreground text-primary">
                    {minExperience} yr{minExperience === 1 ? "" : "s"} experience
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-primary-foreground/10 px-4 py-3 text-sm">
            <Gauge className="size-4" />
            <span className="opacity-90">{band.label}</span>
          </div>
        </CardContent>
      </Card>

      {radarData.length >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4" />
              Readiness Radar
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Visual overview of your scores across all readiness categories.
            </p>
          </CardHeader>
          <CardContent className="flex justify-center">
            <RadarChart data={radarData} size={320} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            How your score is weighted
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            This role weights each category differently. Fix the categories with the highest weight first.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {sorted.map((item) => {
            const tips = CATEGORY_TIPS[item.key] ?? [];
            return (
              <div key={item.key} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.label}</span>
                    <Badge variant="secondary">{Math.round(item.weight)}% weight</Badge>
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>{item.score}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={item.score} className="flex-1" />
                  <div className="w-24">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, item.weight))}%`, backgroundColor: "var(--chart-4)" }} />
                    </div>
                  </div>
                </div>
                {tips.length > 0 && item.score < 70 && (
                  <div className="space-y-1.5 pt-1">
                    {tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        {getTipIcon(item.score)}
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {topCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="size-4" />
              How to improve
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Focus on these high-impact areas to boost your overall score fastest.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {topCategories.map((cat) => {
              const tips = CATEGORY_TIPS[cat.key] ?? [];
              return (
                <div key={cat.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{cat.label}</p>
                    <p className={`text-xs font-bold ${getScoreColor(cat.score)}`}>
                      Score: {cat.score} / Weight: {Math.round(cat.weight)}%
                    </p>
                  </div>
                  <ul className="space-y-1">
                    {tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1 size-1 shrink-0 rounded-full bg-muted-foreground" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {history && history.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4" />
              Score Trend
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your readiness score over time.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1" style={{ height: 80 }}>
              {history.map((point, i) => {
                const height = Math.max(4, (point.score / 100) * 72);
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-medium tabular-nums">{point.score}</span>
                    <div
                      className="w-full rounded-t-sm bg-primary"
                      style={{ height, minHeight: 4, transition: "height 0.3s ease" }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>Oldest</span>
              <span>Latest</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
          <p className="text-sm text-muted-foreground">
            Want to target a different company or role?
          </p>
          <Button variant="outline" render={<Link href="/career-goal" />}>
            Change target <ArrowRight className="ml-2 size-4" />
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Color legend: bar = category score (0-100) · thin bar = weight in this role&apos;s overall score
      </p>
    </div>
  );
}
