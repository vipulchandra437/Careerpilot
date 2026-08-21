"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface UsageEntry {
  feature: string;
  label: string;
  current: number;
  limit: number;
  periodType: string;
}

interface UsageResponse {
  summary: UsageEntry[];
  premium: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  coding_submit: "Coding Submissions",
  resume_analyze: "Resume Analyses",
  interview: "Mock Interviews",
  jd_analyze: "JD Analyses",
  mentor_chat: "Mentor Chat",
};

const PERIOD_SUFFIX: Record<string, string> = {
  daily: "per day",
  monthly: "per month",
};

export function UsageDisplay() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="size-5" />
          Monthly Usage
          {data.premium && (
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs">
              Unlimited
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.summary.map((entry) => {
          const isUnlimited = !isFinite(entry.limit);
          const pct = isUnlimited ? 0 : Math.min((entry.current / entry.limit) * 100, 100);
          const nearlyFull = !isUnlimited && entry.current >= entry.limit * 0.8;
          const exceeded = !isUnlimited && entry.current >= entry.limit;

          return (
            <div key={entry.feature} className="space-y-1.5">
              <Progress value={pct}>
                <ProgressLabel>
                  <span className="text-sm font-medium">
                    {FEATURE_LABELS[entry.feature] ?? entry.label}
                  </span>
                </ProgressLabel>
                <ProgressValue>
                  {(formattedValue) => (
                    isUnlimited ? (
                      <span className="ml-auto text-sm text-green-600">
                        Unlimited
                      </span>
                    ) : (
                      <span className={`ml-auto text-sm text-muted-foreground tabular-nums ${exceeded ? "!text-destructive font-semibold" : nearlyFull ? "!text-amber-600" : ""}`}>
                        {entry.current}/{entry.limit} {PERIOD_SUFFIX[entry.periodType] ?? entry.periodType}
                      </span>
                    )
                  )}
                </ProgressValue>
              </Progress>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
