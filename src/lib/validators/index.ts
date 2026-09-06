// WHY a barrel file: route handlers import multiple schemas from one place
// rather than reaching into individual files. Adding a new schema = one line here.

export { parseRequestSchema, parsedResumeSchema } from "./resume";
export { analysisResultSchema } from "./analysis";
export type { ParsedResume } from "./resume";
export type { AnalysisResult } from "./analysis";
