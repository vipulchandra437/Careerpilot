import { z } from "zod";

// WHY a loose schema (not strict): LLM output is inherently unreliable — it may
// omit optional fields, return null instead of [], or nest objects differently.
// A loose schema with defaults means "partial success" still saves something useful
// rather than discarding the entire parse. The UI handles empty arrays gracefully.

// WHY a null-tolerant array builder (not just .default([])): LLMs frequently emit null
// for optional arrays (e.g. "skills": null) — but z.array().default([]) only rescues
// *undefined* (a missing key), null would fail the whole parse. Mapping null -> [] keeps
// partial LLM success valid, which is exactly the loose-schema intent this file documents.


const maybeArray = <T extends z.ZodType>(item: T) =>
  z.preprocess((v: unknown) => (v == null ? [] : v), z.array(item).default([]));

const educationSchema = z
  .object({
    institution: z.string().default(""),
    degree: z.string().default(""),
    year: z.string().default(""),
  })
  .passthrough(); // tolerate extra keys the LLM might add

const projectSchema = z
  .object({
    name: z.string().default(""),
    description: z.string().default(""),
    tech: z.array(z.string()).default([]),
  })
  .passthrough();

const experienceSchema = z
  .object({
    company: z.string().default(""),
    role: z.string().default(""),
    duration: z.string().default(""),
    description: z.string().default(""),
  })
  .passthrough();

export const parsedResumeSchema = z
  .object({
    name: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    education: maybeArray(educationSchema),
    skills: maybeArray(z.string()),
    projects: maybeArray(projectSchema),
    experience: maybeArray(experienceSchema),
    weaknesses: maybeArray(z.string()),
  })
  .passthrough();

export type ParsedResume = z.infer<typeof parsedResumeSchema>;

// WHY a separate schema for route params: validates the [id] segment before any
// DB query, preventing injection-style issues and giving a clean 400 on bad input.
 
export const parseRequestSchema = z.object({
  // WHY cuid: resume IDs are Prisma cuids. A stricter shape check catches junk
  // path segments (e.g. "abc") BEFORE a DB query, so clients get a clean
  // structured error instead of a raw Prisma 500.
  id: z.string().cuid("Resume ID is invalid"),
});