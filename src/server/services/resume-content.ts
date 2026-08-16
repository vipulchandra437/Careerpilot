import { z } from "zod";
import type { ResumeAnalysisResult } from "@/server/ai/schemas";

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

/**
 * Deterministic resume analysis used when the AI provider is unavailable or
 * fails, so the analyzer always returns a result (matching the fallback pattern
 * of the other analyzers).
 */
export function deterministicAnalyzeResume(
  resumeText: string,
  targetCompany?: string,
  targetRole?: string,
): ResumeAnalysisResult {
  const lower = resumeText.toLowerCase();
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const missingSkills: string[] = [];
  const recommendations: string[] = [];

  const keywordBank = [
    "python", "javascript", "typescript", "react", "node", "java",
    "c++", "sql", "postgres", "mongodb", "aws", "docker", "git",
    "rest", "api", "graphql", "machine learning", "tensorflow",
    "pytorch", "data", "testing", "linux",
  ];
  const found = keywordBank.filter((k) => lower.includes(k));
  const keywordScore = Math.min(100, Math.round((found.length / keywordBank.length) * 100) + 20);

  const hasNumbers = /\d+%|\$\d+|\d+\s*(users|customers|requests|queries|downloads|installs|tests|stars)/i.test(resumeText);
  const hasActionVerbs = /\b(built|developed|led|improved|reduced|increased|shipped|designed|implemented|managed|launched)\b/i.test(lower);
  const lineCount = resumeText.split(/\n+/).filter((l) => l.trim()).length;

  let contentScore = 25;
  if (hasNumbers) {
    contentScore += 30;
    strengths.push("Achievements are quantified with numbers.");
  } else {
    recommendations.push("Quantify achievements with metrics (%, user counts, scale).");
  }
  if (hasActionVerbs) {
    contentScore += 30;
    strengths.push("Bullets use strong action verbs.");
  } else {
    recommendations.push("Start bullets with action verbs: built, led, improved, shipped.");
  }
  if (lineCount >= 20) {
    contentScore += 15;
    strengths.push("Good level of detail across sections.");
  } else if (lineCount >= 10) {
    contentScore += 5;
  }
  if (lineCount < 8) weaknesses.push("Resume is very short — expand your experience and projects.");
  contentScore = Math.min(100, contentScore);

  let atsScore = 20;
  for (const s of ["experience", "education", "skills", "projects", "summary", "certifications"]) {
    if (lower.includes(s)) atsScore += 13;
  }
  if (found.length >= 6) atsScore += 12;
  else if (found.length >= 3) atsScore += 5;
  atsScore = Math.min(100, atsScore);

  let companyMatchScore = 40;
  if (targetCompany && lower.includes(targetCompany.toLowerCase())) companyMatchScore += 30;
  if (targetRole) {
    const roleWords = targetRole.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const hits = roleWords.filter((w) => lower.includes(w)).length;
    if (hits >= 2) companyMatchScore += 30;
    else if (hits === 1) companyMatchScore += 10;
  }
  companyMatchScore = Math.min(100, companyMatchScore);

  const overallScore = Math.min(100, Math.round((atsScore + contentScore + keywordScore + companyMatchScore) / 4));

  if (found.length >= 6) strengths.push("Strong coverage of in-demand technical keywords.");
  else if (found.length >= 3) strengths.push("Reasonable technical keyword coverage.");
  else weaknesses.push("Limited technical keywords for ATS screening.");

  if (found.length < 6) {
    missingSkills.push("Add more role-relevant keywords (frameworks, tools, cloud) to your skills section.");
  }

  if (strengths.length === 0) strengths.push("You have a resume to build on — a great start.");
  if (weaknesses.length === 0) weaknesses.push("Room to sharpen impact language and structure.");
  if (recommendations.length === 0) recommendations.push("Tighten each bullet to focus on measurable impact.");
  if (missingSkills.length === 0) missingSkills.push("Continue adding depth to your skill keywords as you learn.");

  return {
    overallScore,
    atsScore,
    contentScore,
    keywordScore,
    companyMatchScore,
    strengths,
    weaknesses,
    missingSkills,
    recommendations,
  };
}
