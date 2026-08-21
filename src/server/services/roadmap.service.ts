import type { TaskType } from "@prisma/client";
import type { SkillAssessmentItem } from "@/server/scoring/skills";
import { getResourcesForSkill, type LearningResource } from "@/server/learning/resources";
import { clamp } from "@/server/scoring/score-engine";

export interface RoadmapTaskInput {
  title: string;
  description: string;
  type: TaskType;
  week: number;
  resources: LearningResource[];
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

export function generateRoadmap(gaps: SkillAssessmentItem[]): RoadmapInput {
  const prioritized = gaps
    .filter((g) => g.status !== "STRONG")
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 10);

  const skillWeeks = prioritized.length * WEEKS_PER_SKILL;
  const durationWeeks = clamp(FOUNDATION_WEEKS + skillWeeks + 2, 6, 24);

  const phases: RoadmapPhase[] = [];

  const foundationResources = [
    { title: "Data Structures Crash Course", url: "https://www.freecodecamp.org/learn/coding-interview-prep/#data-structures", type: "course" as const, platform: "freeCodeCamp" },
    { title: "CS Fundamentals", url: "https://www.youtube.com/watch?v=8hly31xKli0", type: "video" as const, platform: "YouTube" },
  ];

  const foundation: RoadmapPhase = {
    week: 1,
    title: "Foundation",
    description: "Build consistent daily practice habits across the fundamentals that every interview touches.",
    tasks: [
      { week: 1, type: "DAILY", title: "Solve 2 data structures problems", description: "Work through arrays, strings, and hash maps in the Coding module.", resources: foundationResources },
      { week: 1, type: "DAILY", title: "Review one core computer science concept", description: "Pick topics like time complexity, memory, or REST and explain them out loud.", resources: foundationResources },
      { week: 1, type: "DAILY", title: "Record a 1-minute STAR practice answer", description: "Use the Communication module to track your fluency and fillers.", resources: [
        { title: "STAR Method Guide", url: "https://www.indeed.com/career-advice/interviewing/star-method", type: "article", platform: "Indeed" },
        { title: "Mock Interview Tips", url: "https://www.pramp.com/", type: "practice", platform: "Pramp" },
      ] },
      { week: 1, type: "WEEKLY", title: "Run one full mock interview", description: "Complete a technical or behavioral interview in the Interview module.", resources: [
        { title: "Interview Prep Guide", url: "https://www.levels.fyi/blog/", type: "article", platform: "Levels.fyi" },
        { title: "Mock Interview Practice", url: "https://www.pramp.com/", type: "practice", platform: "Pramp" },
      ] },
    ],
  };
  phases.push(foundation);

  let week = FOUNDATION_WEEKS + 1;
  for (const gap of prioritized) {
    const skillResources = getResourcesForSkill(gap.skillName, gap.skillCategory);
    const effortNote = gap.status === "MISSING" ? "Start from scratch with a structured course, then build." : "Focus on deliberate practice to close the gap.";
    const tasks: RoadmapTaskInput[] = [
      { week, type: "DAILY", title: `Practice ${gap.skillName} daily`, description: `${effortNote} Target: ${gap.requiredRating}/5 proficiency.`, resources: skillResources },
      { week, type: "WEEKLY", title: `Build a small ${gap.skillName} project`, description: "Apply the skill in a real mini-project and add it to your portfolio.", resources: skillResources.filter((r) => r.type === "practice" || r.type === "course") },
      { week, type: "WEEKLY", title: `Self-assess ${gap.skillName}`, description: "Re-rate yourself against the 5-level scale and note what still feels weak.", resources: skillResources.filter((r) => r.type === "article" || r.type === "docs") },
    ];
    phases.push({ week, title: `Master ${gap.skillName}`, description: gap.recommendedAction, tasks });
    week += WEEKS_PER_SKILL;
  }

  phases.push({
    week: durationWeeks - 1,
    title: "Projects & portfolio",
    description: "Turn your learning into evidence — recruiters trust projects over claims.",
    tasks: [
      { week: durationWeeks - 1, type: "WEEKLY", title: "Polish 1-2 standout projects", description: "Add READMEs, screenshots, and quantified outcomes using the Projects analyzer.", resources: [
        { title: "Writing Good READMEs", url: "https://www.freecodecamp.org/news/how-to-write-a-good-readme/", type: "article", platform: "freeCodeCamp" },
        { title: "Portfolio Tips", url: "https://www.youtube.com/watch?v=8o4_JsNJxgI", type: "video", platform: "YouTube" },
      ] },
      { week: durationWeeks - 1, type: "WEEKLY", title: "Update your resume", description: "Re-run the Resume analyzer so it reflects your new skills.", resources: [
        { title: "Resume Writing Guide", url: "https://www.indeed.com/career-advice/resumes-cover-letters/", type: "article", platform: "Indeed" },
        { title: "ATS-Friendly Resume", url: "https://www.youtube.com/watch?v=2pLgI6-yLeo", type: "video", platform: "YouTube" },
      ] },
    ],
  });

  phases.push({
    week: durationWeeks,
    title: "Final sprint",
    description: "Simulate the real process and fix what breaks under pressure.",
    tasks: [
      { week: durationWeeks, type: "DAILY", title: "Take a timed mock interview", description: "Treat it like the real thing — same time limit, no notes.", resources: [
        { title: "Timed Practice", url: "https://www.pramp.com/", type: "practice", platform: "Pramp" },
        { title: "Interview Tips", url: "https://www.levels.fyi/blog/", type: "article", platform: "Levels.fyi" },
      ] },
      { week: durationWeeks, type: "DAILY", title: "Review every gap's recommendations", description: "Re-check the Skill Gaps page and confirm each one is addressed.", resources: [] },
      { week: durationWeeks, type: "WEEKLY", title: "Apply to target roles", description: "Submit your updated resume to 3-5 matching job postings.", resources: [
        { title: "Job Search Strategy", url: "https://www.youtube.com/watch?v=X-QzuC6bBIQ", type: "video", platform: "YouTube" },
        { title: "Application Tracker", url: "https://www.indeed.com/", type: "practice", platform: "Indeed" },
      ] },
    ],
  });

  const missing = prioritized.filter((g) => g.status === "MISSING").length;
  const overview = `${durationWeeks}-week plan focusing on ${missing} missing skill${missing === 1 ? "" : "s"} and ${prioritized.length} total gap${prioritized.length === 1 ? "" : "s"} for your target role. Each week has daily and weekly tasks you can mark complete as you go.`;

  return { durationWeeks, overview, phases };
}

export function flattenRoadmap(phases: RoadmapPhase[]): RoadmapTaskInput[] {
  return phases.flatMap((phase) => phase.tasks);
}
