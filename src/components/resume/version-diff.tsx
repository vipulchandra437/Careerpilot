"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitCompare, Plus, Minus, Equal } from "lucide-react";
import type { ResumeVersion } from "@/components/resume/resume-builder-types";
import type { ResumeContent } from "@/server/actions/resume.actions";

type DiffLine = {
  type: "added" | "removed" | "unchanged";
  field: string;
  value: string;
};

function flattenContent(content: ResumeContent): { field: string; value: string }[] {
  const lines: { field: string; value: string }[] = [];
  const p = content.personal;

  const add = (field: string, value: string) => {
    if (value) lines.push({ field, value });
  };

  add("Personal.Name", p.name);
  add("Personal.Title", p.title);
  add("Personal.Email", p.email);
  add("Personal.Phone", p.phone);
  add("Personal.Location", p.location);
  add("Personal.Website", p.website);
  add("Personal.LinkedIn", p.linkedin);
  add("Personal.Summary", p.summary);

  content.experience.forEach((e, i) => {
    const pre = "Experience." + (i + 1);
    add(pre + ".Title", e.title);
    add(pre + ".Company", e.company);
    add(pre + ".Location", e.location);
    add(pre + ".Dates", (e.startDate || "") + " - " + (e.endDate || ""));
    e.description.forEach((d, j) => add(pre + ".Bullet." + (j + 1), d));
  });

  content.education.forEach((e, i) => {
    const pre = "Education." + (i + 1);
    add(pre + ".Degree", e.title);
    add(pre + ".School", e.company);
    add(pre + ".Dates", (e.startDate || "") + " - " + (e.endDate || ""));
  });

  content.projects.forEach((p, i) => {
    const pre = "Project." + (i + 1);
    add(pre + ".Name", p.name);
    add(pre + ".Description", p.description);
    add(pre + ".Technologies", p.technologies.join(", "));
    add(pre + ".Link", p.link);
  });

  if (content.skills.length) add("Skills", content.skills.join(", "));
  if (content.languages.length) add("Languages", content.languages.join(", "));
  content.certifications.forEach((c, i) => {
    add("Certification." + (i + 1), c.title + " - " + c.company);
  });

  return lines;
}

function computeDiff(oldLines: { field: string; value: string }[], newLines: { field: string; value: string }[]): DiffLine[] {
  const oldMap = new Map(oldLines.map((l) => [l.field, l.value]));
  const newMap = new Map(newLines.map((l) => [l.field, l.value]));
  const allFields = [...new Set([...oldMap.keys(), ...newMap.keys()])].sort();

  const diff: DiffLine[] = [];
  for (const field of allFields) {
    const oldVal = oldMap.get(field);
    const newVal = newMap.get(field);
    if (oldVal === newVal) {
      if (oldVal) diff.push({ type: "unchanged", field, value: oldVal });
    } else {
      if (oldVal) diff.push({ type: "removed", field, value: oldVal });
      if (newVal) diff.push({ type: "added", field, value: newVal });
    }
  }
  return diff;
}

type Props = {
  versions: ResumeVersion[];
};

export function VersionDiff({ versions }: Props) {
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");

  const onLeftChange = useCallback((value: string | null) => {
    setLeftId(value ?? "");
  }, []);

  const onRightChange = useCallback((value: string | null) => {
    setRightId(value ?? "");
  }, []);

  const leftVersion = versions.find((v) => v.id === leftId);
  const rightVersion = versions.find((v) => v.id === rightId);

  const diff = useMemo(() => {
    if (!leftVersion || !rightVersion) return [];
    return computeDiff(
      flattenContent(leftVersion.content),
      flattenContent(rightVersion.content),
    );
  }, [leftVersion, rightVersion]);

  const added = diff.filter((d) => d.type === "added").length;
  const removed = diff.filter((d) => d.type === "removed").length;
  const unchanged = diff.filter((d) => d.type === "unchanged").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <GitCompare className="size-4" />
          Version Diff
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Before</span>
            <Select value={leftId} onValueChange={onLeftChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select version..." />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.title} {v.isPrimary ? "(Primary)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">After</span>
            <Select value={rightId} onValueChange={onRightChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select version..." />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.title} {v.isPrimary ? "(Primary)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {leftId && rightId && (
          <>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Plus className="size-3 text-emerald-600" /> {added} added</span>
              <span className="flex items-center gap-1"><Minus className="size-3 text-red-600" /> {removed} removed</span>
              <span className="flex items-center gap-1"><Equal className="size-3" /> {unchanged} unchanged</span>
            </div>

            {diff.length === 0 ? (
              <p className="text-sm text-muted-foreground">Both versions are identical.</p>
            ) : (
              <div className="max-h-[400px] overflow-auto rounded-lg border">
                {diff.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex border-b px-3 py-1.5 text-xs",
                      line.type === "added" && "bg-emerald-50 dark:bg-emerald-950",
                      line.type === "removed" && "bg-red-50 dark:bg-red-950",
                    )}
                  >
                    <span className="w-24 shrink-0 truncate font-medium text-muted-foreground">{line.field}</span>
                    <span className="flex-1 break-all">
                      {line.type === "added" && <Plus className="mr-1 inline size-3 text-emerald-600" />}
                      {line.type === "removed" && <Minus className="mr-1 inline size-3 text-red-600" />}
                      {line.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
