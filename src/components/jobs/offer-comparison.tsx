"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Minus } from "lucide-react";
import { type Job } from "./job-card";

type OfferComparisonProps = {
  jobs: Job[];
};

const COMPARE_FIELDS = [
  { key: "company", label: "Company" },
  { key: "location", label: "Location" },
  { key: "salary", label: "Salary" },
  { key: "appliedAt", label: "Applied" },
  { key: "notes", label: "Notes" },
] as const;

export function OfferComparison({ jobs }: OfferComparisonProps) {
  const offers = useMemo(() => jobs.filter((j) => j.status === "OFFER"), [jobs]);
  const [selected, setSelected] = useState<Set<string>>(() => {
    const firstTwo = offers.slice(0, 2).map((j) => j.id);
    return new Set(firstTwo);
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  };

  const selectedOffers = useMemo(
    () => offers.filter((j) => selected.has(j.id)),
    [offers, selected]
  );

  const valuesDiffer = (field: string) => {
    if (selectedOffers.length < 2) return false;
    const vals = selectedOffers.map((j) => {
      if (field === "appliedAt") return j.appliedAt;
      return (j as Record<string, unknown>)[field] ?? "";
    });
    return new Set(vals.map(String)).size > 1;
  };

  const formatValue = (job: Job, field: string) => {
    if (field === "appliedAt") return job.appliedAt ? new Date(job.appliedAt).toLocaleDateString() : "—";
    const val = (job as Record<string, unknown>)[field];
    return val && String(val).trim() ? String(val) : "—";
  };

  if (offers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <CheckCircle2 className="mb-3 size-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No offers yet. Move a job to the Offer column to compare.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Select offers to compare (2-3)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {offers.map((job) => (
              <label
                key={job.id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selected.has(job.id)
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:bg-muted/50"
                } ${selected.size >= 3 && !selected.has(job.id) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Checkbox
                  checked={selected.has(job.id)}
                  onCheckedChange={() => {
                    if (selected.size < 3 || selected.has(job.id)) toggle(job.id);
                  }}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{job.title}</p>
                  <p className="text-xs text-muted-foreground">{job.company ?? "—"}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedOffers.length >= 2 && (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4 text-left text-muted-foreground font-medium">Field</th>
                    {selectedOffers.map((job) => (
                      <th key={job.id} className="py-2 px-4 text-left font-medium">
                        <div className="flex flex-col">
                          <span>{job.title}</span>
                          <span className="text-xs text-muted-foreground">{job.company ?? "—"}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_FIELDS.map((field) => {
                    const differs = valuesDiffer(field.key);
                    return (
                      <tr key={field.key} className="border-b last:border-0">
                        <td className="py-2.5 pr-4 text-muted-foreground font-medium whitespace-nowrap">
                          {field.label}
                        </td>
                        {selectedOffers.map((job) => (
                          <td
                            key={job.id}
                            className={`py-2.5 px-4 whitespace-pre-wrap ${differs ? "bg-primary/5 font-medium" : ""}`}
                          >
                            {formatValue(job, field.key)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Highlighted rows indicate differences between offers.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedOffers.length < 2 && offers.length >= 2 && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          <Minus className="size-4" />
          Select at least 2 offers to compare.
        </div>
      )}
    </div>
  );
}
