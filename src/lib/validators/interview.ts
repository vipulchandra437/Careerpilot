import { z } from "zod";

// WHY loose schema for LLM-generated questions: the model may add extra metadata
// or omit optional fields. We accept what we get and normalize in the route.

export const interviewQuestionSchema = z.object({
  text: z.string().default(""),
  focus: z.string().default(""),
});

export const questionsResponseSchema = z.object({
  questions: z.array(interviewQuestionSchema).default([]),
});

export const evaluationResponseSchema = z.object({
  score: z.number().int().min(0).max(10).default(5),
  feedback: z.string().default(""),
  followUp: z.string().default(""),
});

// WHY separate schema for the start request: resumeId is optional (user might
// practice without a resume), but mode and length are required to shape the session.
export const interviewStartSchema = z.object({
  resumeId: z.string().cuid("Invalid resume ID.").optional(),
  mode: z.enum(["behavioral", "technical"]),
  length: z.union([z.literal(5), z.literal(10)]),
});

export const interviewAnswerSchema = z.object({
  answer: z.string().trim().min(1, "Please type an answer before submitting.").max(5000, "Keep your answer under 5,000 characters."),
});

export const interviewIdSchema = z.string().cuid("Invalid session ID.");

export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;
export type QuestionsResponse = z.infer<typeof questionsResponseSchema>;
export type EvaluationResponse = z.infer<typeof evaluationResponseSchema>;
export type InterviewStartInput = z.infer<typeof interviewStartSchema>;
export type InterviewAnswerInput = z.infer<typeof interviewAnswerSchema>;
