import { z } from "zod";
import { OpenRouterProvider, type AIMessage } from "@/server/ai/provider";
import {
  resumeAnalysisSchema,
  type ResumeAnalysisResult,
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
};
