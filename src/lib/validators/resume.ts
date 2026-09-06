import { z } from "zod";

// WHY a loose schema (not strict): LLM output is inherently unreliable — it may
// omit optional fields, return null instead of [], or nest objects differently.
// A loose schema with defaults means "partial success" still saves something useful
// rather than discarding the entire parse. The UI handles empty arrays gracefully.

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
    education: z.array(educationSchema).default([]),
    skills: z.array(z.string()).default([]),
    projects: z.array(projectSchema).default([]),
    experience: z.array(experienceSchema).default([]),
    weaknesses: z.array(z.string()).default([]),
  })
  .passthrough();

export type ParsedResume = z.infer<typeof parsedResumeSchema>;

// WHY a separate schema for route params: validates the [id] segment before any
// DB query, preventing injection-style issues and giving a clean 400 on bad input.
export const parseRequestSchema = z.object({
  id: z.string().min(1, "Resume ID is required"),
});
