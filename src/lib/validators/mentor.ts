import { z } from "zod";

// WHY free-text message validation needs only bound checks: the mentor is a
// conversation (not strict JSON), so the LLM output is a plain string — the only
// server-side contract is a bounded, non-empty prompt and a bounded reply.
export const mentorMessageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export const mentorReplySchema = z.string().trim().min(1).max(4000);

export type MentorMessageInput = z.infer<typeof mentorMessageSchema>;

// WHY Message is shaped once here for both the persisted Json and the client
// wire type: the route appends objects of exactly this shape, and the chat
// component renders them. One source of truth keeps persisted and displayed
// messages identical.
export interface MentorMessage {
  role: "user" | "mentor";
  text: string;
  at: string; // ISO timestamp
}