"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { GitHubIcon } from "@/components/icons/brand-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/score-ring";

type Analysis = {
  username: string;
  score: number;
  profileData: {
    name: string | null;
    avatarUrl: string | null;
    bio: string | null;
    location: string | null;
    company: string | null;
    followers: number;
    following: number;
    publicRepos: number;
    url: string;
  };
  repos: {
    name: string;
    description: string | null;
    url: string;
    language: string | null;
    stars: number;
    forks: number;
  }[];
  breakdown: { profile: number; repos: number; activity: number };
  strengths: string[];
  recommendations: string[];
};

type Past = { id: string; username: string; score: number; createdAt: string };

export function GitHubAnalyzer({ analyses }: { analyses: Past[] }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!username.trim()) {
      toast.error("Enter a GitHub username.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/github/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed.");
        return;
      }
      setResult(data.analysis);
      toast.success("GitHub profile analyzed");
    } catch {
      setError("Could not reach the analyzer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analyze a GitHub profile</CardTitle>
          <CardDescription>
            Public data only. Unauthenticated requests are rate-limited (60/hour).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">GitHub username</Label>
            <div className="flex gap-2">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. octocat"
                onKeyDown={(e) => e.key === "Enter" && analyze()}
              />
              <Button onClick={analyze} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <GitHubIcon className="size-4" />}
                Analyze
              </Button>
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Avatar className="size-9">
                <AvatarImage src={result.profileData.avatarUrl ?? undefined} />
                <AvatarFallback>{(result.profileData.name ?? result.username)[0]}</AvatarFallback>
              </Avatar>
              <span>{result.profileData.name ?? result.username}</span>
              <Badge variant="secondary">@{result.username}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-8">
              <ScoreRing value={result.score} label="GitHub score" size={130} />
              <div className="min-w-56 flex-1 space-y-2">
                <div className="text-sm text-muted-foreground">
                  {result.profileData.bio ?? "No bio yet."}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">{result.profileData.followers} followers</Badge>
                  <Badge variant="outline">{result.profileData.following} following</Badge>
                  <Badge variant="outline">{result.profileData.publicRepos} public repos</Badge>
                  {result.profileData.location && (
                    <Badge variant="outline">{result.profileData.location}</Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-3 text-sm font-semibold">Breakdown</h3>
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-sm"><span>Profile ({result.breakdown.profile})</span><span className="text-muted-foreground">30%</span></div>
                  <Progress value={Math.min(100, result.breakdown.profile)} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-sm"><span>Repositories ({result.breakdown.repos})</span><span className="text-muted-foreground">40%</span></div>
                  <Progress value={Math.min(100, result.breakdown.repos)} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-sm"><span>Activity ({result.breakdown.activity})</span><span className="text-muted-foreground">30%</span></div>
                  <Progress value={Math.min(100, result.breakdown.activity)} />
                </div>
              </div>
            </div>

            <Separator />

            {result.repos.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Top repositories</h3>
                <div className="space-y-2">
                  {result.repos.map((r) => (
                    <div key={r.name} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium">{r.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{r.description ?? "No description"}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        {r.language && <Badge variant="secondary">{r.language}</Badge>}
                        <span>★ {r.stars}</span>
                        <span>⑂ {r.forks}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {result.strengths.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Strengths</h3>
                <ul className="space-y-1.5">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.recommendations.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Recommendations</h3>
                <ol className="list-decimal space-y-1.5 pl-5">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{r}</li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {analyses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous analyses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analyses.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                <div className="text-sm">
                  <div className="font-medium">@{a.username} — {a.score}</div>
                  <div className="text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</div>
                </div>
                <Sparkles className="size-4 text-muted-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
