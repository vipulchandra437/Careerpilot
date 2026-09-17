import { parsedResumeSchema } from "@/lib/validators/resume";
import { builderContentSchema, emptyBuilderContent } from "@/lib/validators/builder";

// WHY explicit mapping: parsed data permits extra LLM keys; builder JSON must not.
export function seedBuilderContent(value: unknown) {
  const parsed = parsedResumeSchema.safeParse(value);
  if (!parsed.success) return null;
  const data = parsed.data;
  const result = builderContentSchema.safeParse({
    ...emptyBuilderContent(),
    contact: { name: data.name, email: data.email, phone: data.phone,
      links: Array.isArray(data.links) ? data.links.filter((link): link is string => typeof link === "string") : [] },
    summary: typeof data.summary === "string" ? data.summary : "",
    education: data.education.map(({ institution, degree, year }) => ({ institution, degree, year })),
    skills: data.skills,
    projects: data.projects.map(({ name, description, tech }) => ({ name, description, tech })),
    experience: data.experience.map(({ company, role, duration, description }) => ({ company, role, duration, description })),
  });
  // WHY reject rather than truncate: silently losing accomplishments is worse than asking for a correction.
  return result.success ? result.data : null;
}
