import { z } from "zod";

// WHY separate schemas for request and LLM output: the request schema guards the
// API boundary (a username string), while the analysis schema re-validates the
// LLM's JSON so corrupt/hallucinated output can never crash the UI. Both use
// loose defaults (like the resume analysis schema) — partial LLM success still
// saves something useful instead of discarding the whole analysis.

export const githubUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Enter a GitHub username.")
    .max(39, "GitHub usernames are at most 39 characters.")
    // WHY a safe-charset regex: usernames can only be alphanumerics and single
    // hyphens. Enforcing it here both rejects junk input early and stops any
    // path-traversal-style surprises before we ever hit the GitHub API.
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/, "That doesn't look like a valid GitHub username."),
});

const languageEntrySchema = z.object({
  name: z.string().default(""),
  share: z.number().min(0).max(100).default(0),
});

const highlightItemSchema = z.object({
  title: z.string().default(""),
  detail: z.string().default(""),
});

const improvementItemSchema = z.object({
  issue: z.string().default(""),
  suggestion: z.string().default(""),
});

const repoHighlightSchema = z.object({
  name: z.string().default(""),
  why: z.string().default(""),
});

export const githubAnalysisSchema = z.object({
  summary: z.string().default(""),
  languages: z.array(languageEntrySchema).default([]),
  highlights: z.array(highlightItemSchema).default([]),
  improvements: z.array(improvementItemSchema).default([]),
  repoHighlights: z.array(repoHighlightSchema).default([]),
});

export type GitHubUsernameInput = z.infer<typeof githubUsernameSchema>;
export type GitHubAnalysis = z.infer<typeof githubAnalysisSchema>;
