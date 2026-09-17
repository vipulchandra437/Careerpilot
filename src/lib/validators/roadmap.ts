import { z } from "zod";

// WHY loose defaults on every LLM-emitted field (same pattern as github/practice
// validators): generation is unreliable; defaults let a partially-malformed
// response still yield a usable plan rather than a dead 422. The ONLY hard
// requirement is at least one milestone with one task so the UI has something.

const focusAreaSchema = z.object({
  skill: z.string().default(""),
  reason: z.string().default(""),
  weeks: z.number().int().min(1).max(12).default(1),
});

export const milestoneSchema = z.object({
  week: z.number().int().min(1).max(12),
  goal: z.string().default(""),
  tasks: z.array(z.string()).min(1).default([]),
  resource: z.string().default(""),
  // WHY a controlled enum, not free text: the UI must know which pages a task
  // links to (practice sandbox vs interview mode). Unknown values fall back to
  // no link rather than breaking a chip.
  linksTo: z.enum(["practice", "interview", ""]).default(""),
});

export const roadmapResponseSchema = z.object({
  focusAreas: z.array(focusAreaSchema).default([]),
  milestones: z.array(milestoneSchema).min(1).default([]),
});

// WHY completedIdx is a flat list of indices into the concatenation of all
// milestones' tasks (milestones[0].tasks, then milestones[1].tasks, ...):
// checkboxes write one number per task — no nested structure needed, and the
// UI derives "is this task done" with a set lookup. The barrel of valid indices
// must be monotonic no-op tolerant: a corrupt index (e.g. after regeneration a
// task vanishes) is filtered by the UI, never crashes it.
export const completedIdxSchema = z.object({
  completedIdx: z.array(z.number().int().min(0)).default([]),
});

export const roadmapWireSchema = z.object({
  id: z.string(),
  content: roadmapResponseSchema,
  completedIdx: z.array(z.number().int().min(0)).default([]),
  createdAt: z.string(),
});
export type RoadmapWire = z.infer<typeof roadmapWireSchema>;

// WHY a discriminated union for the API contract: after async-ification, GET no
// longer answers "a roadmap or null" — it answers a lifecycle state, and only
// "ready" carries a roadmap. Discriminated on `status`, the union forces the
// client to handle every state and never lets a "generate" path see a partial
// plan (a pending row's content is a {} placeholder, unusable until ready).
export const roadmapStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("none") }),
  z.object({ status: z.literal("pending") }),
  z.object({ status: z.literal("failed"), error: z.string().optional() }),
  z.object({ status: z.literal("ready"), roadmap: roadmapWireSchema }),
]);
export type RoadmapState = z.infer<typeof roadmapStateSchema>;

// WHY loose defaults on every LLM-emitted field (same pattern as github/practice
// validators): generation is unreliable; defaults let a partially-malformed
// response still yield a usable plan rather than a dead 422. The ONLY hard
// requirement is at least one milestone with one task so the UI has something.
export type RoadmapContent = z.infer<typeof roadmapResponseSchema>;
export type RoadmapMilestone = z.infer<typeof milestoneSchema>;
export type RoadmapCompletedInput = z.infer<typeof completedIdxSchema>;