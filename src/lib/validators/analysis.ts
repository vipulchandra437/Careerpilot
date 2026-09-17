import { z } from "zod";

// WHY a loose schema (not strict): LLM output is inherently unreliable — it may
// omit optional fields, return null instead of [], or nest objects differently.
// A loose schema with defaults means "partial success" still saves something useful
// rather than discarding the entire analysis.



// WHY clamp not reject: LLMs drift slightly out of range (e.g. a 104 or -3). A bare
// .min/.max would reject the WHOLE analysis over one glitchy number — but the intent
// documented below is to salvage partial LLM success. The preprocess coerces into the
// valid 0-100 int band BEFORE validation runs, so out-of-range numbers become
// valid instead of failing the parse.



const boundedScore = z.preprocess(
  (v: unknown) => {
    // WHY accept null + numeric strings: the LLM slips occasionally — null or a
    // stringified number ("87") shouldn't fail the whole analysis. Garbage strings
    // become undefined so the schema's .default(0) supplies a safe zero.
    if (v == null) return undefined;
    const raw = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
    if (typeof raw !== "number" || Number.isNaN(raw)) return undefined;
    return Math.min(100, Math.max(0, Math.round(raw)));
  },
  z.number().int().min(0).max(100).default(0)
);

// WHY a null-tolerant array builder: LLMs frequently emit null for optional arrays — the
// .default([]) only rescues a missing key. Mapping null -> [] keeps partial LLM success valid.

 
const maybeArray = <T extends z.ZodType>(item: T) =>
  z.preprocess((v: unknown) => (v == null ? [] : v), z.array(item).default([]));



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
    // WHY clamp scores in validation: LLM may return out-of-range numbers; boundedScore coerces
    overallScore: boundedScore,
    atsScore: boundedScore,
    summary: z.string().default(""),
    strengths: maybeArray(strengthSchema),
    weaknesses: maybeArray(weaknessSchema),
    sectionFeedback: maybeArray(sectionFeedbackSchema),
    missingSections: maybeArray(z.string()),
    actionItems: maybeArray(z.string()),
  })
  .passthrough();

export type AnalysisResult = z.infer<typeof analysisResultSchema>;