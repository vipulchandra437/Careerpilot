import { z } from "zod";
import { OpenRouterProvider, type AIMessage } from "@/server/ai/provider";
import {
  resumeAnalysisSchema,
  jdAnalysisSchema,
  type ResumeAnalysisResult,
  type JDAnalysisResult,
} from "@/server/ai/schemas";

const maxTokens = Number(process.env.AI_MAX_TOKENS ?? 2000);

const provider = new OpenRouterProvider({
  apiKey: process.env.OPENROUTER_API_KEY,
  model: process.env.OPENROUTER_MODEL,
  maxTokens: Number.isFinite(maxTokens) ? maxTokens : 2000,
});

const ANALYSIS_SYSTEM_PROMPT = `You are a senior technical recruiter and resume consultant. You evaluate resumes the way an ATS (Applicant Tracking System) and a hiring manager would. You are strict, specific, and constructive.

You always respond with valid JSON only, matching this exact shape:
{
  "overallScore": 0-100,
  "atsScore": 0-100,
  "contentScore": 0-100,
  "keywordScore": 0-100,
  "companyMatchScore": 0-100,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "missingSkills": ["..."],
  "recommendations": ["..."]
}

Scoring guidance:
- ATS: machine readability, standard section headers, keyword presence.
- Content: quantified achievements, action verbs, conciseness, impact.
- Keyword: coverage of role-relevant technical and soft skills.
- companyMatchScore: how well the resume matches the target company and role (omit relevance if no target given).`;

const JD_SYSTEM_PROMPT = `You are a senior technical recruiter. Analyze the given job description and the candidate's existing skills to produce a structured analysis.

You always respond with valid JSON only, matching this exact shape:
{
  "title": "Job title extracted from the JD (or 'Untitled Position' if not found)",
  "company": "Company name extracted from the JD, or null if not found",
  "requiredSkills": ["skill1", "skill2", ...],
  "preferredSkills": ["skill1", "skill2", ...],
  "matchScore": 0-100,
  "missingSkills": ["skill1", "skill2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...]
}

Scoring guidance:
- matchScore reflects how well the candidate's existing skills cover the required skills of the role.
- requiredSkills: skills explicitly stated as required/mandatory in the JD.
- preferredSkills: skills listed as nice-to-have, preferred, or bonus.
- missingSkills: required skills the candidate does NOT have.
- recommendations: 3-5 actionable steps the candidate should take to become a stronger applicant (e.g., learn a specific technology, build a project, get a certification).`;

export const aiService = {
  isConfigured: () => provider.isConfigured(),

  /** Ask the model for JSON validated against a Zod schema. */
  generateStructured: <T>(schema: z.ZodType<T>, messages: AIMessage[]) =>
    provider.generateStructured(schema, messages),

  /** Ask the model for free-form text (no JSON requirement). */
  chat: (messages: AIMessage[], options?: { maxTokens?: number }) =>
    provider.chat(messages, options),

  async analyzeResume(
    resumeText: string,
    targetCompany?: string,
    targetRole?: string,
  ): Promise<ResumeAnalysisResult> {
    const target =
      targetCompany || targetRole
        ? `\nTarget role: ${targetRole ?? "not specified"}\nTarget company: ${targetCompany ?? "not specified"}`
        : "";

    const messages = [
      { role: "system" as const, content: ANALYSIS_SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: `Analyze this resume${target}:\n\n${resumeText}`,
      },
    ];

    return provider.generateStructured(resumeAnalysisSchema, messages);
  },

  async analyzeJobDescription(
    jdText: string,
    userSkills: string[],
  ): Promise<JDAnalysisResult> {
    const messages = [
      { role: "system" as const, content: JD_SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: `The candidate has these skills: ${userSkills.length > 0 ? userSkills.join(", ") : "none listed"}\n\nJob description:\n\n${jdText}`,
      },
    ];

    return provider.generateStructured(jdAnalysisSchema, messages);
  },
};
