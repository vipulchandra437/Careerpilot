/**
 * CareerPilot API client — talks to the REAL Next.js backend that owns every
 * /api/* route and the auth cookies.
 *
 * WHY relative paths: in dev Vite proxies /api → localhost:3000 and in prod
 * Next serves the built SPA and /api from the same origin, so the browser only
 * ever talks to its own origin — cookies (HttpOnly auth cookie included) and
 * CORS just work.
 */

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

type ApiErrorBody = { error?: string; code?: string };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const err = (body ?? {}) as ApiErrorBody;
    const statusByCode: Record<string, number> = {
      UNAUTHORIZED: 401,
      NOT_FOUND: 404,
    };
    const code = err.code ?? `HTTP_${response.status}`;
    const message =
      err.error ??
      (code === "UNAUTHORIZED"
        ? "Please log in to continue."
        : `Request failed (${response.status}).`);
    throw new ApiError(message, code, statusByCode[code] ?? response.status);
  }

  return body as T;
}

// ─── Auth (NextAuth v4 credentials); /api/register is separate by design ───

export type SessionUser = { name?: string | null; email?: string | null; id?: string };
export type Session = { user?: SessionUser | null; expires?: string };

export async function getCsrfToken(): Promise<string> {
  const res = await fetch("/api/auth/csrf", { credentials: "include" });
  if (!res.ok) throw new ApiError("Could not reach the server.", "CSRF_FAILED", res.status);
  const body = (await res.json()) as { csrfToken?: string };
  return body.csrfToken ?? "";
}

export async function login(email: string, password: string): Promise<void> {
  const csrfToken = await getCsrfToken();
  const res = await fetch("/api/auth/callback/credentials", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, email, password, json: "true" }),
  });
  const body = (await res.json().catch(() => null)) as { error?: string; url?: string } | null;
  if (!res.ok || body?.error) {
    const code = body?.error ?? "CREDENTIALS_FAILED";
    const message =
      code === "CredentialsSignin"
        ? "Email or password is incorrect."
        : code.startsWith("LOCKOUT_")
          ? code.slice("LOCKOUT_".length)
          : "Could not sign you in. Please try again.";
    throw new ApiError(message, code, res.status);
  }
}

export async function register(input: { name: string; email: string; password: string }): Promise<void> {
  await request<{ ok: boolean }>("/api/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function signOut(): Promise<void> {
  const csrfToken = await getCsrfToken();
  await fetch("/api/auth/signout", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, json: "true" }),
  });
}

export async function getSession(): Promise<Session> {
  const res = await fetch("/api/auth/session", { credentials: "include" });
  if (!res.ok) return {};
  return (await res.json()) as Session;
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return Boolean(session.user?.id || session.user?.email);
}

// ─── Readiness ───

export type ReadinessBreakdown = {
  resume: { score: number | null; weight: number };
  interview: { score: number | null; weight: number };
};

export type ReadinessSnapshot = {
  at: string;
  resumeScore: number | null;
  interviewScore: number | null;
  readiness: number;
  level: "needs-work" | "getting-there" | "interview-ready";
  label: string | null;
};

export type Readiness = {
  readiness: number;
  level: "needs-work" | "getting-there" | "interview-ready";
  label: string | null;
  breakdown: ReadinessBreakdown;
  resumeScore: number | null;
  interviewScore: number | null;
  resumesParsed: number;
  interviewsCompleted: number;
  latestInterviewScore: number | null;
  actions: string[];
  history: ReadinessSnapshot[];
};

export const readinessApi = {
  get: () => request<Readiness>("/api/readiness"),
};

// ─── Resume analyzer + uploader ───

export type ResumeListItem = {
  id: string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
};

export type ResumeDetail = ResumeListItem & {
  rawText: string;
  parsedData: Record<string, unknown> | null;
  analysisResult: Record<string, unknown> | null;
};

export type AnalysisResult = {
  overallScore?: number;
  atsScore?: number;
  summary?: string;
  strengths?: { title?: string; detail?: string }[];
  weaknesses?: { issue?: string; why_it_matters?: string; fix?: string }[];
  sectionFeedback?: { section?: string; feedback?: string; rating?: "good" | "ok" | "poor" }[];
  actionItems?: string[];
};

export type ParsedResume = {
  name?: string;
  email?: string;
  phone?: string;
  education?: { institution?: string; degree?: string; year?: string }[];
  skills?: string[];
  projects?: { name?: string; description?: string; tech?: string[] }[];
  experience?: { company?: string; role?: string; duration?: string; description?: string }[];
};

export const resumeApi = {
  list: () => request<ResumeListItem[]>("/api/resume"),
  get: (id: string) => request<ResumeDetail>(`/api/resume/${id}`),
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ ok: true; id: string; fileName: string }>("/api/resume/upload", {
      method: "POST",
      body: formData,
    });
  },
  parse: (id: string) =>
    request<{ ok: true; parsed: ParsedResume }>(`/api/resume/${id}/parse`, { method: "POST" }),
  analyze: (id: string) =>
    request<{ ok: true; analysis: AnalysisResult }>(`/api/resume/${id}/analyze`, { method: "POST" }),
  remove: (id: string) => request<{ ok: true }>(`/api/resume/${id}`, { method: "DELETE" }),
};

// ─── Resume builder ───

export type BuilderContent = {
  template: "classic" | "modern";
  paperSize: "a4" | "letter";
  contact: { name: string; email: string; phone: string; links: string[] };
  summary: string;
  education: { institution: string; degree: string; year: string }[];
  skills: string[];
  projects: { name: string; description: string; tech: string[] }[];
  experience: { company: string; role: string; duration: string; description: string }[];
};

export type BuilderResume = {
  id: string;
  title: string;
  content: BuilderContent;
  createdAt: string;
  updatedAt: string;
};

export function emptyBuilderContent(): BuilderContent {
  return {
    template: "classic",
    paperSize: "a4",
    contact: { name: "", email: "", phone: "", links: [] },
    summary: "",
    education: [],
    skills: [],
    projects: [],
    experience: [],
  };
}

export const builderApi = {
  list: () => request<BuilderResume[]>("/api/builder"),
  get: (id: string) => request<BuilderResume>(`/api/builder/${id}`),
  create: (title: string, content: BuilderContent) =>
    request<BuilderResume>("/api/builder", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    }),
  createFromSource: (sourceResumeId: string) =>
    request<BuilderResume>("/api/builder", {
      method: "POST",
      body: JSON.stringify({ sourceResumeId }),
    }),
  update: (id: string, title: string, content: BuilderContent) =>
    request<BuilderResume>(`/api/builder/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title, content }),
    }),
  remove: (id: string) => request<{ ok: true }>(`/api/builder/${id}`, { method: "DELETE" }),
  polish: (text: string) =>
    request<{ original: string; improved: string }>("/api/builder/polish", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  seedSources: () => request<{ id: string; fileName: string }[]>("/api/builder/seed"),
};

// ─── Interview ───

export type InterviewMode = "behavioral" | "technical";
export type InterviewLength = 5 | 10;

export type TranscriptTurn = {
  question: string;
  focus: string;
  answer: string | null;
  evaluation: { score: number; feedback: string; followUp?: string } | null;
  followUp: string | null;
  followUpAnswer: string | null;
  followUpEvaluation: { score: number; feedback: string } | null;
};

export type InterviewSession = {
  id: string;
  mode: InterviewMode;
  status: string;
  questionCount: number;
  transcript: TranscriptTurn[];
  createdAt: string;
};

export type InterviewHistoryItem = {
  id: string;
  mode: InterviewMode;
  status: string;
  finalScore: number | null;
  questionCount: number;
  createdAt: string;
};

export const interviewApi = {
  history: () => request<InterviewHistoryItem[]>("/api/interview"),
  start: (input: { mode: InterviewMode; length: InterviewLength; resumeId?: string }) =>
    request<InterviewSession>("/api/interview", { method: "POST", body: JSON.stringify(input) }),
  get: (id: string) => request<InterviewSession>(`/api/interview/${id}`),
  answer: (id: string, answer: string) =>
    request<{
      evaluation: { score: number; feedback: string };
      followUp: string | null;
      nextQuestion: { text: string; focus: string } | null;
      allAnswered: boolean;
    }>(`/api/interview/${id}/answer`, { method: "POST", body: JSON.stringify({ answer }) }),
  finish: (id: string) =>
    request<{ finalScore: number | null; summary: string | null }>(`/api/interview/${id}/finish`, {
      method: "POST",
    }),
};

// ─── Mentor ───

export type MentorMessage = { role: "user" | "mentor"; text: string; at: string };

export const mentorApi = {
  get: () => request<{ messages: MentorMessage[] }>("/api/mentor"),
  send: (message: string) =>
    request<{ reply: string; messages: MentorMessage[] }>("/api/mentor", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};

// ─── Practice / coding ───

export type PracticeTopic = "arrays" | "strings" | "hashmaps" | "recursion" | "sorting" | "two-pointers";
export type PracticeDifficulty = "easy" | "medium" | "hard";

export type Challenge = {
  title: string;
  description: string;
  starterCode: string;
  functionName: string;
  testCases: { input: string; expected: string }[];
};

export const PRACTICE_TOPICS: PracticeTopic[] = [
  "arrays",
  "strings",
  "hashmaps",
  "recursion",
  "sorting",
  "two-pointers",
];

export const practiceApi = {
  challenge: (topic: PracticeTopic, difficulty: PracticeDifficulty) =>
    request<{ ok: true; challenge: Challenge }>("/api/practice/challenge", {
      method: "POST",
      body: JSON.stringify({ topic, difficulty }),
    }),
  attempt: (challengeTitle: string, passed: boolean) =>
    request<{ ok: true }>("/api/practice/attempt", {
      method: "POST",
      body: JSON.stringify({ challengeTitle, passed }),
    }),
  hint: (input: { title: string; description: string; code: string }) =>
    request<{ ok: true; hint: string }>("/api/practice/hint", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

// ─── Target company ───

export type Target = {
  companyName: string;
  role: string;
  notes: string | null;
  style: "service" | "product" | "startup" | "unknown";
};

export const targetApi = {
  get: () => request<{ target: Target | null }>("/api/target"),
  set: (input: { companyName: string; role: string; notes?: string }) =>
    request<{ ok: true; target: Target }>("/api/target", {
      method: "POST",
      body: JSON.stringify({ action: "set", ...input }),
    }),
  clear: () =>
    request<{ ok: true; target: null }>("/api/target", {
      method: "POST",
      body: JSON.stringify({ action: "clear" }),
    }),
};

// ─── GitHub analyzer ───

export type GitHubAnalysis = {
  summary?: string;
  languages?: { name?: string; share?: number }[];
  highlights?: { title?: string; detail?: string }[];
  improvements?: { issue?: string; suggestion?: string }[];
  repoHighlights?: { name?: string; why?: string }[];
};

export const githubApi = {
  analyze: (username: string) =>
    request<{ ok: true; dataset: GitHubAnalysis }>("/api/github", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),
};

// ─── Roadmap ───

export type RoadmapMilestone = {
  week: number;
  goal: string;
  tasks: string[];
  resource: string;
  linksTo?: "practice" | "interview" | "";
};

export type RoadmapWire = {
  id: string;
  content: { focusAreas: { skill: string; reason: string; weeks: number }[]; milestones: RoadmapMilestone[] };
  completedIdx: number[];
  createdAt: string;
};

export type RoadmapState =
  | { status: "none" }
  | { status: "pending" }
  | { status: "failed"; error?: string }
  | { status: "ready"; roadmap: RoadmapWire };

export const roadmapApi = {
  get: () => request<RoadmapState>("/api/roadmap"),
  generate: () => request<{ status: "pending" }>("/api/roadmap", { method: "POST" }),
  setProgress: (completedIdx: number[]) =>
    request<{ ok: true }>("/api/roadmap", {
      method: "PATCH",
      body: JSON.stringify({ completedIdx }),
    }),
};

export { request };