"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ArrowRight, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreRing } from "@/components/ui/score-ring";

type GapItem = {
  skillId: string;
  skillName: string;
  skillCategory: string;
  importance: string;
  requiredRating: number;
  currentRating: number;
  status: string;
  reason: string;
  recommendedAction: string;
  estimatedEffort: string;
};

const importanceLabel = (v: string) => {
  if (v === "ESSENTIAL") return "Essential";
  if (v === "IMPORTANT") return "Important";
  return "Nice to have";
};

export function SkillGapsView({
  coverage,
  targetRole,
  targetCompany,
  items,
  onAssessSkill,
}: {
  coverage: number;
  targetRole: string | null;
  targetCompany: string | null;
  items: GapItem[];
  onAssessSkill?: (skillId: string) => void;
}) {
  const [filter, setFilter] = useState("ALL");
  const filtered = items.filter((i) => {
    if (filter === "GAPS") return i.status !== "STRONG";
    if (filter === "STRONG") return i.status === "STRONG";
    return true;
  });

  const missing = items.filter((i) => i.status === "MISSING").length;
  const needsWork = items.filter((i) => i.status === "NEEDS_IMPROVEMENT" || i.status === "GOOD").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-2 pt-6">
            <ScoreRing value={coverage} size={130} label="coverage" />
            <p className="text-xs text-muted-foreground">Weighted skill coverage vs target role</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {targetRole ? `Requirements for ${targetRole}${targetCompany ? ` at ${targetCompany}` : ""}` : "No target role set"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-xs text-muted-foreground">Total skills required</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-bold text-amber-600">{missing}</p>
              <p className="text-xs text-muted-foreground">Missing entirely</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-bold text-orange-600">{needsWork}</p>
              <p className="text-xs text-muted-foreground">Below target</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {!targetRole && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle className="size-8 text-amber-500" />
            <p className="text-sm text-muted-foreground">
              Set a career goal to see which skills you still need to build.
            </p>
            <Button nativeButton={false} render={<Link href="/career-goal" />}>
              Set career goal <ArrowRight className="ml-2 size-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-0">
          <Tabs value={filter} onValueChange={(v) => setFilter(v ?? "ALL")}>
            <TabsList>
              <TabsTrigger value="ALL">All</TabsTrigger>
              <TabsTrigger value="GAPS">Gaps</TabsTrigger>
              <TabsTrigger value="STRONG">Strong</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No skills in this view.</p>
          ) : (
            filtered.map((item) => (
              <div key={item.skillId} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.skillName}</p>
                      <Badge variant={item.importance === "ESSENTIAL" ? "default" : item.importance === "IMPORTANT" ? "secondary" : "outline"}>
                        {importanceLabel(item.importance)}
                      </Badge>
                      <Badge variant={item.status === "STRONG" ? "outline" : item.status === "MISSING" ? "destructive" : "secondary"}>
                        {item.status === "STRONG" ? (
                          <CheckCircle2 className="mr-1 size-3 text-emerald-500" />
                        ) : item.status === "MISSING" ? (
                          <AlertTriangle className="mr-1 size-3" />
                        ) : null}
                        {item.status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">You</span>
                    <div className="w-20">
                      <Progress value={(item.currentRating / 5) * 100} />
                    </div>
                    <span className="font-medium">{item.currentRating}/5</span>
                    <span className="text-muted-foreground">needs {item.requiredRating}/5</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>→ {item.recommendedAction}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.estimatedEffort}</Badge>
                    {onAssessSkill && item.status !== "STRONG" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => onAssessSkill(item.skillId)}
                      >
                        <Zap className="mr-1 size-3" />
                        Assess
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
