"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { scoreColor } from "@/lib/utils";

type MatchReportData = {
  id?: string;
  title: string;
  company: string | null;
  matchScore: number | null;
  requiredSkills: string[];
  preferredSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  createdAt?: string;
};

export function MatchReport({ data }: { data: MatchReportData }) {
  const score = data.matchScore ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {data.title}
          {data.company && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              at {data.company}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Progress value={score}>
            <ProgressLabel>Match Score</ProgressLabel>
            <ProgressValue />
          </Progress>
          <div className="flex items-center gap-2">
            <div
              className="text-3xl font-bold tabular-nums"
              style={{ color: scoreColor(score) }}
            >
              {Math.round(score)}%
            </div>
          </div>
        </div>

        {data.requiredSkills.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Required Skills
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {data.requiredSkills.map((skill) => (
                <Badge key={skill} variant="default">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.preferredSkills.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Preferred Skills
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {data.preferredSkills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.missingSkills.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Missing Skills
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {data.missingSkills.map((skill) => (
                <Badge key={skill} variant="destructive">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.recommendations.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recommendations
            </h4>
            <ul className="space-y-1">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  • {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
