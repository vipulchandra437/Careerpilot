"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";

interface ProfileData {
  name: string;
  email: string;
  bio: string | null;
  location: string | null;
  experienceLevel: string | null;
  skills: number;
  education: boolean;
  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  hasCareerGoal: boolean;
}

const CHECKLIST: { key: keyof ProfileData; label: string; weight: number; check?: (v: unknown) => boolean }[] = [
  { key: "name", label: "Full name", weight: 10, check: (v) => Boolean(v && String(v).length >= 2) },
  { key: "email", label: "Email", weight: 10, check: (v) => Boolean(v) },
  { key: "bio", label: "Bio", weight: 10, check: (v) => Boolean(v && String(v).length > 0) },
  { key: "location", label: "Location", weight: 5, check: (v) => Boolean(v && String(v).length > 0) },
  { key: "experienceLevel", label: "Experience level", weight: 10, check: (v) => Boolean(v) },
  { key: "skills", label: "Skills", weight: 15, check: (v) => Number(v) > 0 },
  { key: "education", label: "Education", weight: 15, check: (v) => Boolean(v) },
  { key: "githubUrl", label: "GitHub URL", weight: 5, check: (v) => Boolean(v && String(v).length > 0) },
  { key: "linkedinUrl", label: "LinkedIn URL", weight: 5, check: (v) => Boolean(v && String(v).length > 0) },
  { key: "portfolioUrl", label: "Portfolio URL", weight: 5, check: (v) => Boolean(v && String(v).length > 0) },
  { key: "hasCareerGoal", label: "Career goal", weight: 10, check: (v) => Boolean(v) },
];

export function ProfileCompleteness({ data }: { data: ProfileData }) {
    const { percentage } = useMemo(() => {
    let total = 0;
    for (const item of CHECKLIST) {
      const val = data[item.key];
      const filled = item.check ? item.check(val) : Boolean(val);
      if (filled) {
        total += item.weight;
      }
    }
    return { percentage: total };
  }, [data]);

  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (percentage / 100) * circumference;
  const tone =
    percentage >= 80 ? "text-emerald-600" : percentage >= 50 ? "text-amber-600" : "text-rose-600";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile completeness</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative inline-flex shrink-0 items-center justify-center">
          <svg width={100} height={100} className="-rotate-90">
            <circle
              cx={50}
              cy={50}
              r={42}
              fill="none"
              strokeWidth={8}
              className="stroke-muted"
            />
            <circle
              cx={50}
              cy={50}
              r={42}
              fill="none"
              strokeWidth={8}
              stroke="currentColor"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={tone}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold">{percentage}%</span>
            <span className="text-[10px] text-muted-foreground">complete</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {percentage < 100 ? (
            <>
              <p className="text-sm font-medium">
                Complete your profile to unlock better recommendations.
              </p>
              <ul className="space-y-1">
                {CHECKLIST.filter((item) => {
                  const val = data[item.key];
                  return !(item.check ? item.check(val) : Boolean(val));
                }).map((item) => (
                  <li key={item.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Circle className="size-3.5 shrink-0" />
                    {item.label}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="size-4 shrink-0" />
              Your profile is complete!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
