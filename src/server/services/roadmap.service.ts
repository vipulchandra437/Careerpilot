import type { TaskType } from "@prisma/client";
import type { SkillAssessmentItem } from "@/server/scoring/skills";
import { clamp } from "@/server/scoring/score-engine";

export interface RoadmapTaskInput {
  title: string;
  description: string;
  type: TaskType;
  week: number;
}

export interface RoadmapPhase {
  week: number;
  title: string;
  description: string;
  tasks: RoadmapTaskInput[];
}

export interface RoadmapInput {
  durationWeeks: number;
  overview: string;
  phases: RoadmapPhase[];
}

const FOUNDATION_WEEKS = 2;
const WEEKS_PER_SKILL = 1;

/** Deterministic learning roadmap generated from the student's skill gaps. */
export function generateRoadmap(gaps: SkillAssessmentItem[]): RoadmapInput {
  const prioritized = gaps
    .filter((g) => g.status !== "STRONG")
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 10);

  const skillWeeks = prioritized.length * WEEKS_PER_SKILL;
  const durationWeeks = clamp(FOUNDATION_WEEKS + skillWeeks + 2, 6, 24);

  const phases: RoadmapPhase[] = [];

  const foundation: RoadmapPhase = {
    week: 1,
    title: "Foundation",
    description: "Build consistent daily practice habits across the fundamentals that every interview touches.",
    tasks: [
      { week: 1, type: "DAILY", title: "Solve 2 data structures problems", description: "Work through arrays, strings, and hash maps in the Coding module." },
      { week: 1, type: "DAILY", title: "Review one core computer science concept", description: "Pick topics like time complexity, memory, or REST and explain them out loud." },
      { week: 1, type: "DAILY", title: "Record a 1-minute STAR practice answer", description: "Use the Communication module to track your fluency and fillers." },
      { week: 1, type: "WEEKLY", title: "Run one full mock interview", description: "Complete a technical or behavioral interview in the Interview module." },
    ],
  };
  phases.push(foundation);

  let week = FOUNDATION_WEEKS + 1;
  for (const gap of prioritized) {
    const effortNote = gap.status === "MISSING" ? "Start from scratch with a structured course, then build." : "Focus on deliberate practice to close the gap.";
    const tasks: RoadmapTaskInput[] = [
      { week, type: "DAILY", title: `Practice ${gap.skillName} daily`, description: `${effortNote} Target: ${gap.requiredRating}/5 proficiency.` },
      { week, type: "WEEKLY", title: `Build a small ${gap.skillName} project`, description: "Apply the skill in a real mini-project and add it to your portfolio." },
      { week, type: "WEEKLY", title: `Self-assess ${gap.skillName}`, description: "Re-rate yourself against the 5-level scale and note what still feels weak." },
    ];
    phases.push({ week, title: `Master ${gap.skillName}`, description: gap.recommendedAction, tasks });
    week += WEEKS_PER_SKILL;
  }

  phases.push({
    week: durationWeeks - 1,
    title: "Projects & portfolio",
    description: "Turn your learning into evidence — recruiters trust projects over claims.",
    tasks: [
      { week: durationWeeks - 1, type: "WEEKLY", title: "Polish 1-2 standout projects", description: "Add READMEs, screenshots, and quantified outcomes using the Projects analyzer." },
      { week: durationWeeks - 1, type: "WEEKLY", title: "Update your resume", description: "Re-run the Resume analyzer so it reflects your new skills." },
    ],
  });

  phases.push({
    week: durationWeeks,
    title: "Final sprint",
    description: "Simulate the real process and fix what breaks under pressure.",
    tasks: [
      { week: durationWeeks, type: "DAILY", title: "Take a timed mock interview", description: "Treat it like the real thing — same time limit, no notes." },
      { week: durationWeeks, type: "DAILY", title: "Review every gap's recommendations", description: "Re-check the Skill Gaps page and confirm each one is addressed." },
      { week: durationWeeks, type: "WEEKLY", title: "Apply to target roles", description: "Submit your updated resume to 3-5 matching job postings." },
    ],
  });

  const missing = prioritized.filter((g) => g.status === "MISSING").length;
  const overview = `${durationWeeks}-week plan focusing on ${missing} missing skill${missing === 1 ? "" : "s"} and ${prioritized.length} total gap${prioritized.length === 1 ? "" : "s"} for your target role. Each week has daily and weekly tasks you can mark complete as you go.`;

  return { durationWeeks, overview, phases };
}

/** Flatten phases into the persistent task list. */
export function flattenRoadmap(phases: RoadmapPhase[]): (RoadmapTaskInput & { resources: object })[] {
  return phases.flatMap((phase) => phase.tasks.map((task) => ({ ...task, resources: {} })));
}
