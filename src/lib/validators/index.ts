// WHY a barrel file: route handlers import multiple schemas from one place
// rather than reaching into individual files. Adding a new schema = one line here.

export { parseRequestSchema, parsedResumeSchema } from "./resume";
export { analysisResultSchema } from "./analysis";
export { interviewStartSchema, interviewAnswerSchema, interviewIdSchema } from "./interview";
export { targetCompanySchema, targetIdSchema } from "./target";
export { githubUsernameSchema, githubAnalysisSchema } from "./github";
export {
  challengeRequestSchema,
  challengeResponseSchema,
  hintRequestSchema,
  attemptRecordSchema,
  PRACTICE_TOPICS,
} from "./practice";
export {
  roadmapResponseSchema,
  milestoneSchema,
  completedIdxSchema,
  roadmapWireSchema,
  roadmapStateSchema,
} from "./roadmap";
export { mentorMessageSchema, mentorReplySchema } from "./mentor";
export type { ParsedResume } from "./resume";
export type { AnalysisResult } from "./analysis";
export type { TargetCompanyInput } from "./target";
export type { GitHubUsernameInput, GitHubAnalysis } from "./github";
export type {
  ChallengeRequest,
  ChallengeResponse,
  HintRequest,
  AttemptRecordInput,
  PracticeTopic,
} from "./practice";
export type {
  RoadmapContent,
  RoadmapMilestone,
  RoadmapCompletedInput,
  RoadmapWire,
  RoadmapState,
} from "./roadmap";
export type { MentorMessageInput, MentorMessage } from "./mentor";
