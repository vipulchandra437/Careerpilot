import { z } from "zod";

// WHY a loose schema (not strict): LLM output is inherently unreliable — it may
// omit optional fields, return null instead of [], or nest objects differently.
// A loose schema with defaults means "partial success" still saves something useful
// rather than discarding the entire analysis.

const strengthSchema = z
  .object({
    title: z.string().default(""),
    detail: z.string().default(""),
  })
  .passthrough();

const weaknessSchema = z
  .object({
    issue: z.string().default(""),
    why_it_matters: z.string().default(""),
    fix: z.string().default(""),
  })
  .passthrough();

const sectionFeedbackSchema = z
  .object({
    section: z.string().default(""),
    feedback: z.string().default(""),
    rating: z.enum(["good", "ok", "poor"]).default("ok"),
  })
  .passthrough();

export const analysisResultSchema = z
  .object({
    // WHY clamp scores in validation: LLM may return out-of-range numbers.
    // We coerce to valid 0-100 range rather than rejecting the whole response.
    overallScore: z.number().int().min(0).max(100).default(0),
    atsScore: z.number().int().min(0).max(100).default(0),
    summary: z.string().default(""),
    strengths: z.array(strengthSchema).default([]),
    weaknesses: z.array(weaknessSchema).default([]),
    sectionFeedback: z.array(sectionFeedbackSchema).default([]),
    missingSections: z.array(z.string()).default([]),
    actionItems: z.array(z.string()).default([]),
  })
  .passthrough();

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
