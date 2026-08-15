import { z } from "zod";

export const resumeSectionSchema = z.object({
  title: z.string().default(""),
  company: z.string().default(""),
  location: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  description: z.array(z.string()).default([]),
});

export const resumeProjectSchema = z.object({
  name: z.string().default(""),
  description: z.string().default(""),
  technologies: z.array(z.string()).default([]),
  link: z.string().default(""),
});

export const resumeContentSchema = z.object({
  personal: z.object({
    name: z.string().default(""),
    title: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    location: z.string().default(""),
    website: z.string().default(""),
    linkedin: z.string().default(""),
    summary: z.string().default(""),
  }),
  experience: z.array(resumeSectionSchema).default([]),
  education: z.array(resumeSectionSchema).default([]),
  projects: z.array(resumeProjectSchema).default([]),
  skills: z.array(z.string()).default([]),
  certifications: z.array(resumeSectionSchema).default([]),
  languages: z.array(z.string()).default([]),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;

/** Renders structured resume content to a plain-text summary for AI analysis. */
export function resumeToText(content: ResumeContent, maxLength = 12000): string {
  const lines: string[] = [];

  const p = content.personal ?? ({} as ResumeContent["personal"]);
  if (p.name) lines.push(p.name);
  if (p.title) lines.push(p.title);
  const contact = [p.email, p.phone, p.location, p.linkedin, p.website]
    .filter(Boolean)
    .join(" | ");
  if (contact) lines.push(contact);
  if (p.summary) {
    lines.push("SUMMARY");
    lines.push(p.summary);
  }

  if (content.experience?.length) {
    lines.push("EXPERIENCE");
    for (const e of content.experience) {
      lines.push(
        [e.title, e.company, `${e.startDate ?? ""} - ${e.endDate ?? ""}`, e.location]
          .filter(Boolean)
          .join(" | "),
      );
      for (const d of e.description ?? []) lines.push(`- ${d}`);
    }
  }

  if (content.education?.length) {
    lines.push("EDUCATION");
    for (const e of content.education) {
      lines.push(
        [e.title, e.company, `${e.startDate ?? ""} - ${e.endDate ?? ""}`]
          .filter(Boolean)
          .join(" | "),
      );
    }
  }

  if (content.projects?.length) {
    lines.push("PROJECTS");
    for (const pr of content.projects) {
      lines.push(pr.name);
      if (pr.technologies?.length) lines.push(`Tech: ${pr.technologies.join(", ")}`);
      if (pr.description) lines.push(pr.description);
      if (pr.link) lines.push(`Link: ${pr.link}`);
    }
  }

  if (content.skills?.length) {
    lines.push("SKILLS");
    lines.push(content.skills.join(", "));
  }

  if (content.certifications?.length) {
    lines.push("CERTIFICATIONS");
    for (const c of content.certifications) {
      lines.push([c.title, c.company].filter(Boolean).join(" | "));
    }
  }

  if (content.languages?.length) {
    lines.push("LANGUAGES");
    lines.push(content.languages.join(", "));
  }

  const text = lines.join("\n").trim();
  return text.slice(0, maxLength);
}
