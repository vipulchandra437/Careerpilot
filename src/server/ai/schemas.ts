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
