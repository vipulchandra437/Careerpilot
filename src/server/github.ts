// WHY a server-only GitHub helper (one file = one responsibility): the fetch +
// cache + rate-limit handling is shared by the analysis route and any future
// surface that needs GitHub data. Centralizing it keeps the 24h cache and the
// anonymous rate-limit budget in one place.

import "server-only";

import { askBrain } from "@/lib/llm";
import { githubAnalysisSchema, type GitHubAnalysis } from "@/lib/validators/github";
import {
  GITHUB_ANALYSIS_SYSTEM_PROMPT,
  buildGithubAnalysisPrompt,
} from "@/lib/prompts/githubAnalysis";

// WHY a module-level in-memory cache keyed by username: GitHub's anonymous REST
// API allows only 60 requests/hour per IP, and our LLM analysis has real token
// cost. Caching public results for 24h per username means a student can refresh
// the dashboard without burning either budget. Public data is shared across the
// app, so it is safe to cache it globally rather than per-user. In-memory is
// fine for v1 localhost; a future deployment could swap in Redis/DB cache.
// NOTE: a serverless cold start clears this cache — acceptable for v1 (the
// 60/hr budget still protects us; refresh just refetches once).
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  storedAt: number;
  data: unknown;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): unknown | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.storedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function setCached(key: string, data: unknown) {
  cache.set(key, { storedAt: Date.now(), data });
}

// WHY a dedicated error for rate limits: the route maps this to an amber banner
// (RULES.md + DESIGN.md) instead of a generic failure, so the student knows it's
// a temporary API budget, not a bug.
export class GitHubRateLimitError extends Error {}

const GITHUB_API = "https://api.github.com";

async function fetchJson(url: string, fallback: unknown): Promise<unknown> {
  // WHY githubFetch vs node fetch headers: authless requests get 60/hr; using
  // Node's UA header avoids the API rejecting us as a bare script. The result is
  // still public data only — no OAuth, no credentials (scope: public data).
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "careerpilot" },
  });

  // WHY 403 on the rate-limit path specifically: GitHub returns 403 with
  // X-RateLimit-Remaining: 0 when the anonymous budget is exhausted. Anything
  // else is a real error (404 user not found, etc.).
  if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
    throw new GitHubRateLimitError(
      "GitHub's free API limit for this hour is used up — try again in a bit, or refresh to see the last result."
    );
  }
  if (!res.ok) {
    return fallback;
  }
  try {
    return await res.json();
  } catch {
    return fallback;
  }
}

export interface GitHubDataset {
  username: string;
  // WHY we return shallow, display-ready shapes (not raw GH payloads): the LLM
  // and the UI both need the same distilled facts; keeping one normalized shape
  // avoids the LLM seeing GitHub's huge, noisy repo objects.
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
  analysis: GitHubAnalysis;
}

// WHY the raw fetch and the LLM interpretation are split into two cache keys but
// one function: the raw data may be wanted without a fresh LLM round, yet both
// must share the same 24h window so a refresh doesn't re-run the (costly) LLM
// call. Storing the combined dataset under one username key achieves both.
export async function getGithubDataset(username: string): Promise<GitHubDataset> {
  const cached = getCached(`gh:${username}`);
  if (cached) return cached as GitHubDataset;

  const [profile, reposRaw] = await Promise.all([
    fetchJson(`${GITHUB_API}/users/${username}`, null),
    fetchJson(`${GITHUB_API}/users/${username}/repos?per_page=100&sort=pushed`, []),
  ]);

  // WHY a user-profiles 404 means "no such username" → we give an honest empty
  // profile so the UI shows a clear "user not found" message rather than a crash.
  const p = profile as { name?: string; bio?: string; location?: string; public_repos?: number; followers?: number; following?: number; created_at?: string; message?: string } | null;

  const profileSummary = p?.public_repos != null
    ? {
        name: p.name || username,
        bio: p.bio || "",
        location: p.location || "",
        publicRepos: p.public_repos ?? 0,
        followers: p.followers ?? 0,
        following: p.following ?? 0,
        createdAt: p.created_at || "",
      }
    : null;

  const repoList = (Array.isArray(reposRaw) ? reposRaw : []) as Array<{
    name?: string;
    description?: string;
    language?: string;
    stargazers_count?: number;
    pushed_at?: string;
    fork?: boolean;
  }>;

  const repos = repoList.slice(0, 40).map((r) => ({
    name: r.name || "",
    description: r.description || "",
    language: r.language || "Other",
    stars: r.stargazers_count ?? 0,
    pushedAt: r.pushed_at || "",
    isFork: r.fork ?? false,
  }));

  // Language distribution: count repos per language (weighted by repo count,
  // not lines — simpler and rate-friendly; the LLM frames shares).
  const langCounts: Record<string, number> = {};
  for (const r of repos) {
    const lang = r.language || "Other";
    langCounts[lang] = (langCounts[lang] || 0) + 1;
  }
  const total = repos.length || 1;
  const languages: Record<string, number> = {};
  for (const [lang, count] of Object.entries(langCounts)) {
    languages[lang] = Math.round((count / total) * 100);
  }

  // Try to get an LLM analysis. WHY a graceful fallback: if the LLM is down we
  // still hand back the deterministic raw data so the UI isn't a dead end
  // (DESIGN.md "never dead-end errors"). The analysis fields then render as
  // "analyze again later", NOT as a crash.
  let analysis: GitHubAnalysis = {
    summary: "",
    languages: Object.entries(languages).map(([name, share]) => ({ name, share })),
    highlights: [],
    improvements: [],
    repoHighlights: [],
  };
  try {
    const llmRaw = await askBrain(
      buildGithubAnalysisPrompt(profileSummary, repos),
      GITHUB_ANALYSIS_SYSTEM_PROMPT,
      "github-analysis"
    );
    const cleaned = llmRaw.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as unknown;
      const validated = githubAnalysisSchema.safeParse(parsed);
      if (validated.success && validated.data.summary) {
        analysis = validated.data;
        // WHY merge deterministic language shares into the result: the LLM's
        // language list can be inconsistent; the bars must reflect the actual
        // counted data, so we always override from the deterministic source.
        analysis.languages = Object.entries(languages).map(([name, share]) => ({ name, share }));
      }
    }
  } catch {
    // WHY swallow: LLM interpretation is a value-add; the raw analysis already
    // has the counted language bars, so the page stays useful on failure.
  }

  const dataset: GitHubDataset = {
    username,
    profile: profileSummary,
    languages,
    repos,
    analysis,
  };

  setCached(`gh:${username}`, dataset);
  return dataset;
}

// WHY an explicit expiry surface: lets the route force a refresh (student clicks
// "analyze again" after a rate limit resolves) without waiting out the TTL.
export function clearGithubCache(username: string) {
  cache.delete(`gh:${username}`);
}
