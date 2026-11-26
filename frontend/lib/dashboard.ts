// Static catalog for the student dashboard. Scores and statuses never live here.

export const FEATURE_KEYS = [
  "resume-analysis",
  "resume-builder",
  "mock-interviewer",
  "coding-tests",
  "target-company",
  "profile-analysis",
  "roadmap",
  "mentor-chat",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type FeatureStatus = "planned" | "in_progress" | "complete";

export interface FeatureDefinition {
  key: FeatureKey;
  name: string;
  description: string;
  href: string;
  group?: "resume" | "interview";
  hint: string;
}

export const FEATURES: readonly FeatureDefinition[] = [
  {
    key: "resume-analysis",
    name: "Resume upload and analysis",
    description: "See how your resume reads to recruiters and ATS tools.",
    href: "/resume-analyzer",
    group: "resume",
    hint: "Upload your resume to get your first score.",
  },
  {
    key: "resume-builder",
    name: "Resume builder",
    description: "Turn your profile into a clean, shareable resume.",
    href: "/resume-builder",
    group: "resume",
    hint: "Open the builder and export your first resume.",
  },
  {
    key: "mock-interviewer",
    name: "Mock interviewer",
    description: "Practise answering questions out loud, at your own pace.",
    href: "/mock-interview",
    group: "interview",
    hint: "Try a mock interview to start your readiness score.",
  },
  {
    key: "coding-tests",
    name: "Coding tests",
    description: "Solve short challenges tied to the skills you want to grow.",
    href: "/practice",
    hint: "Solve a coding challenge to log your first practice session.",
  },
  {
    key: "target-company",
    name: "Target company",
    description: "Pick the roles and companies you want to work towards.",
    href: "/career-target",
    hint: "Choose a career target so we can tailor your next steps.",
  },
  {
    key: "profile-analysis",
    name: "LinkedIn and GitHub analysis",
    description: "Bring in your public profiles to round out your picture.",
    href: "/profile",
    hint: "Add your LinkedIn or GitHub details on your profile.",
  },
  {
    key: "roadmap",
    name: "Roadmap",
    description: "Follow a simple path from your current skills to your goal.",
    href: "/roadmap",
    hint: "Open your roadmap and start the first milestone.",
  },
  {
    key: "mentor-chat",
    name: "Mentor chatbot",
    description: "Ask a career question whenever you need a second opinion.",
    href: "/mentor",
    hint: "Ask your mentor chatbot one career question.",
  },
];

export interface FeatureView extends FeatureDefinition {
  score: number;
  status: FeatureStatus;
}

export const STATUS_LABELS: Record<FeatureStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  complete: "Complete",
};

export interface WeeklyDay {
  date: string;
  label: string;
  count: number;
}

export interface DashboardData {
  readiness: number;
  resumeScore: number;
  interviewScore: number;
  features: FeatureView[];
  weeklyPractice: WeeklyDay[];
}

export interface NextStep {
  title: string;
  text: string;
  href: string;
  cta: string;
}

export function suggestNextStep(features: readonly FeatureView[]): NextStep {
  const next = features.find((feature) => feature.status !== "complete") ?? features[0];
  return {
    title: next.name,
    text: next.hint,
    href: next.href,
    cta: next.status === "in_progress" ? "Continue" : "Start",
  };
}

/** Calendar dates (YYYY-MM-DD) for the last 7 days in the user's timezone. */
export function lastSevenDays(timeZone: string): string[] {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = today.split("-").map(Number);
  return Array.from({ length: 7 }, (_, index) =>
    new Date(Date.UTC(year, month - 1, day - (6 - index), 12)).toISOString().slice(0, 10)
  );
}
