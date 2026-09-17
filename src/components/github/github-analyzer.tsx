"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AuthBanner } from "@/components/auth/auth-banner";

type Analysis = {
  summary: string;
  languages: { name: string; share: number }[];
  highlights: { title: string; detail: string }[];
  improvements: { issue: string; suggestion: string }[];
  repoHighlights: { name: string; why: string }[];
};

type Dataset = {
  username: string;
  profile: {
    name: string;
    bio: string;
    location: string;
    publicRepos: number;
    followers: number;
    following: number;
    createdAt: string;
  } | null;
  languages: Record<string, number>;
  repos: {
    name: string;
    description: string;
    language: string;
    stars: number;
    pushedAt: string;
    isFork: boolean;
  }[];
  analysis: Analysis;
};

export function GithubAnalyzer() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataset, setDataset] = useState<Dataset | null>(null);

  const run = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; dataset?: Dataset; code?: string };
      if (!res.ok || !data.dataset) {
        setError(data.error ?? "Couldn't analyze that profile. Please try again.");
        return;
      }
      setDataset(data.dataset);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="e.g. torvalds"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <Button onClick={run} disabled={loading || !username.trim()}>
          {loading ? "Analyzing..." : "Analyze"}
        </Button>
      </div>
      {error && <AuthBanner message={error} />}

      {dataset ? (
        <div className="space-y-6">
          {/* Language distribution bars — WHY deterministic bars: the UI shows the
              actually-counted share, not LLM-echoed numbers, keeping it honest. */}
          <section aria-labelledby="langs-heading">
            <h2 id="langs-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Language spread
            </h2>
            <div className="mt-3 space-y-2">
              {Object.entries(dataset.languages).length === 0 ? (
                <p className="text-sm text-muted-foreground">No public repos to sample.</p>
              ) : (
                Object.entries(dataset.languages)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([lang, share]) => (
                    <div key={lang}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-muted-foreground">{lang}</span>
                        <span className="text-foreground">{share}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-violet-600" style={{ width: `${share}%` }} />
                      </div>
                    </div>
                  ))
              )}
            </div>
          </section>

          {dataset.analysis.summary ? (
            <p className="text-sm text-muted-foreground">{dataset.analysis.summary}</p>
          ) : null}

          {/* Highlights */}
          {dataset.analysis.highlights.length > 0 ? (
            <section aria-labelledby="highlights-heading">
              <h2 id="highlights-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Strengths
              </h2>
              <ul className="mt-3 space-y-3">
                {dataset.analysis.highlights.map((h, i) => (
                  <li key={i}>
                    <p className="font-medium text-green-900">{h.title}</p>
                    {h.detail ? <p className="mt-1 text-sm text-green-800">{h.detail}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Improvements — WHY amber card: matches resume-detail pattern for
              actionable, non-alarming improvement feedback (DESIGN.md). */}
          {dataset.analysis.improvements.length > 0 ? (
            <section aria-labelledby="improvements-heading">
              <h2 id="improvements-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                What to improve
              </h2>
              <div className="mt-3 space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                {dataset.analysis.improvements.map((imp, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium text-amber-900">{imp.issue}</p>
                    {imp.suggestion ? <p className="mt-1 text-amber-800">{imp.suggestion}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Top repos */}
          {dataset.repos.length > 0 ? (
            <section aria-labelledby="repos-heading">
              <h2 id="repos-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Top repos
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {dataset.analysis.repoHighlights.length > 0
                  ? dataset.analysis.repoHighlights
                      .map((rh) => ({ repo: dataset.repos.find((r) => r.name === rh.name), why: rh.why }))
                      .filter((x) => x.repo)
                      .map((x, i) => (
                        <li key={i} className="rounded-lg border border-border p-4">
                          <p className="font-medium text-foreground">{x.repo!.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{x.why}</p>
                        </li>
                      ))
                  : dataset.repos.slice(0, 6).map((r) => (
                      <li key={r.name} className="rounded-lg border border-border p-4">
                        <p className="font-medium text-foreground">{r.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {r.language} {r.stars > 0 ? `· ${r.stars}★` : ""}
                        </p>
                        {r.description ? <p className="mt-1 text-sm text-muted-foreground">{r.description}</p> : null}
                      </li>
                    ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
