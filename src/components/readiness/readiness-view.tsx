"use client";

import Link from "next/link";
import { ArrowRight, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/ui/score-ring";
import { readinessBand } from "@/server/scoring/score-engine";

type BreakdownItem = { key: string; label: string; score: number; weight: number };

export function ReadinessView({
  overall,
  companyName,
  roleTitle,
  level,
  minExperience,
  breakdown,
}: {
  overall: number;
  companyName: string;
  roleTitle: string;
  level: string;
  minExperience: number | null;
  breakdown: BreakdownItem[];
}) {
  const band = readinessBand(overall);
  const sorted = [...breakdown].sort((a, b) => b.weight - a.weight);

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
          {sorted.map((item) => (
            <div key={item.key} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.label}</span>
                  <Badge variant="secondary">{Math.round(item.weight)}% weight</Badge>
                </div>
                <span className="text-sm font-bold">{item.score}</span>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={item.score} className="flex-1" />
                <div className="w-24">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${item.weight}%`, backgroundColor: "var(--chart-4)" }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

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
