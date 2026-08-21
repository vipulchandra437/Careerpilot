"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { scoreColor } from "@/lib/utils";
import {
  GitCompareArrows,
  Sparkles,
  X,
  Check,
  Minus,
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

type Analysis = {
  id: string;
  title: string;
  company: string | null;
  matchScore: number | null;
  requiredSkills: unknown;
  preferredSkills: unknown;
  missingSkills: unknown;
  createdAt: string;
};

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  return [];
}

export function BatchComparison({ analyses }: { analyses: Analysis[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selected = useMemo(
    () => analyses.filter((a) => selectedIds.includes(a.id)),
    [analyses, selectedIds],
  );

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3
          ? [...prev, id]
          : prev,
    );
  }

  const analysis = useMemo(() => {
    if (selected.length < 2) return null;

    const allRequired = selected.map((a) =>
      new Set(toStringArray(a.requiredSkills).map((s) => s.toLowerCase())),
    );
    const allPreferred = selected.map((a) =>
      new Set(toStringArray(a.preferredSkills).map((s) => s.toLowerCase())),
    );

    const allRequiredSkills = new Set<string>();
    const allPreferredSkills = new Set<string>();
    allRequired.forEach((s) => s.forEach((x) => allRequiredSkills.add(x)));
    allPreferred.forEach((s) => s.forEach((x) => allPreferredSkills.add(x)));

    const commonRequired = [...allRequiredSkills].filter((skill) =>
      allRequired.every((set) => set.has(skill)),
    );

    const uniquePerJd = selected.map((a, idx) => {
      const own = allRequired[idx];
      const others = allRequired.filter((_, i) => i !== idx);
      return [...own].filter((skill) => !others.some((s) => s.has(skill)));
    });

    const avgScore =
      selected.reduce((sum, a) => sum + (a.matchScore ?? 0), 0) /
      selected.length;

    const bestIdx = selected.reduce(
      (best, a, i) =>
        (a.matchScore ?? 0) > (selected[best].matchScore ?? 0) ? i : best,
      0,
    );

    return {
      allRequiredSkills: [...allRequiredSkills].sort(),
      allPreferredSkills: [...allPreferredSkills].sort(),
      commonRequired,
      uniquePerJd,
      avgScore: Math.round(avgScore),
      bestIdx,
    };
  }, [selected]);

  function navigateOptimize(a: Analysis) {
    const params = new URLSearchParams({ jdId: a.id, title: a.title });
    if (a.company) params.set("company", a.company);
    router.push(`/jd-analysis?tab=optimize&${params.toString()}`);
  }

  if (analyses.length < 2) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <GitCompareArrows className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            You need at least 2 saved JD analyses to compare. Analyze more job
            descriptions to unlock comparison.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select 2–3 job descriptions</CardTitle>
          <CardDescription>
            Choose which analyses to compare side by side. Click a card to
            select, click again to deselect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {analyses.map((a) => {
              const isSelected = selectedIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggle(a.id)}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="mt-0.5">
                    {isSelected ? (
                      <div className="size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="size-2.5" />
                      </div>
                    ) : (
                      <div className="size-4 rounded-full border border-muted-foreground/30" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.company ?? "Unknown"}
                    </p>
                    <div
                      className="mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-bold tabular-nums"
                      style={{
                        color: scoreColor(a.matchScore ?? 0),
                        backgroundColor: `color-mix(in srgb, ${scoreColor(a.matchScore ?? 0)} 12%, transparent)`,
                      }}
                    >
                      {Math.round(a.matchScore ?? 0)}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedIds.length > 0 && selectedIds.length < 2 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Select at least {2 - selectedIds.length} more to compare.
            </p>
          )}
        </CardContent>
      </Card>

      {analysis && selected.length >= 2 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Side-by-side comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Metric</TableHead>
                    {selected.map((a) => (
                      <TableHead key={a.id}>
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[140px]">
                            {a.title}
                          </span>
                          {a.id === selected[analysis.bestIdx].id && (
                            <Badge variant="default" className="shrink-0 text-[10px] px-1">
                              Best
                            </Badge>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Company</TableCell>
                    {selected.map((a) => (
                      <TableCell key={a.id}>
                        {a.company ?? "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Match Score</TableCell>
                    {selected.map((a) => (
                      <TableCell key={a.id}>
                        <span
                          className="font-bold tabular-nums"
                          style={{ color: scoreColor(a.matchScore ?? 0) }}
                        >
                          {Math.round(a.matchScore ?? 0)}%
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Required Skills</TableCell>
                    {selected.map((a) => (
                      <TableCell key={a.id}>
                        <div className="flex flex-wrap gap-1">
                          {toStringArray(a.requiredSkills).map((s) => (
                            <Badge
                              key={s}
                              variant={
                                analysis.commonRequired.includes(s.toLowerCase())
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Preferred Skills</TableCell>
                    {selected.map((a) => (
                      <TableCell key={a.id}>
                        <div className="flex flex-wrap gap-1">
                          {toStringArray(a.preferredSkills).map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px]">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Missing Skills</TableCell>
                    {selected.map((a) => (
                      <TableCell key={a.id}>
                        <div className="flex flex-wrap gap-1">
                          {toStringArray(a.missingSkills).map((s) => (
                            <Badge
                              key={s}
                              variant="destructive"
                              className="text-[10px]"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Common required skills
                </CardTitle>
                <CardDescription>
                  Skills that appear in all {selected.length} selected JDs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysis.commonRequired.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No skills are common across all selected JDs.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.commonRequired.map((s) => (
                      <Badge key={s} variant="default" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Unique skills per JD
                </CardTitle>
                <CardDescription>
                  Skills requested only by one of the selected JDs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selected.map((a, idx) => (
                  <div key={a.id}>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {a.title}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.uniquePerJd[idx].length === 0 ? (
                        <span className="text-[10px] text-muted-foreground">
                          None unique
                        </span>
                      ) : (
                        analysis.uniquePerJd[idx].map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {s}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recommendation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Based on your match scores, we recommend prioritizing{" "}
                <span className="font-semibold text-foreground">
                  {selected[analysis.bestIdx].title}
                </span>
                {selected[analysis.bestIdx].company &&
                  ` at ${selected[analysis.bestIdx].company}`}
                {" "}with a{" "}
                <span
                  className="font-bold"
                  style={{
                    color: scoreColor(selected[analysis.bestIdx].matchScore ?? 0),
                  }}
                >
                  {Math.round(selected[analysis.bestIdx].matchScore ?? 0)}%
                </span>{" "}
                match score.
              </p>
              {analysis.commonRequired.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Focus on the common required skills (
                  {analysis.commonRequired.slice(0, 3).join(", ")}
                  {analysis.commonRequired.length > 3 &&
                    ` +${analysis.commonRequired.length - 3} more`}
                  ) to improve your chances across all roles.
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => navigateOptimize(selected[analysis.bestIdx])}
                >
                  <Sparkles className="mr-1.5 size-3.5" />
                  Optimize for Best Match
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
