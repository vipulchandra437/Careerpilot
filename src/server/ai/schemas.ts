import { z } from "zod";

export const resumeAnalysisSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  atsScore: z.number().int().min(0).max(100),
  contentScore: z.number().int().min(0).max(100),
  keywordScore: z.number().int().min(0).max(100),
  companyMatchScore: z.number().int().min(0).max(100).nullable().optional(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missingSkills: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export type ResumeAnalysisResult = z.infer<typeof resumeAnalysisSchema>;

export const jdAnalysisSchema = z.object({
  title: z.string().min(1),
  company: z.string().nullable(),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  matchScore: z.number().min(0).max(100),
  missingSkills: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export type JDAnalysisResult = z.infer<typeof jdAnalysisSchema>;
