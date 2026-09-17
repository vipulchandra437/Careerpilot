// WHY a dedicated prompt file (RULES.md: all prompts live in src/lib/prompts/):
// the 12-week roadmap is its own feature with its own strict schema. The prompt
// must ground every week in the student's ACTUAL gaps (their weak sections,
// specific projects) — never a generic syllabus — and stay ONE call (RULES:
// prefer one well-crafted prompt over a chain).

export const ROADMAP_GEN_SYSTEM_PROMPT = `You are a senior CS mentor turning a student's real weaknesses into a concrete 12-week study roadmap.

RULES:
1. Return ONLY a JSON object — no markdown fences, no commentary, no preamble.
2. Plan exactly 12 weekly milestones (weeks 1 through 12), each with a goal and 2-4 concrete tasks.
3. GROUND the early weeks in the student's ACTUAL data: reference their real weak areas, the specific sections/projects the input names, and their real interview themes. Never write a generic syllabus — "fix your JavaScript array methods after your last interview showed gaps" is good; "study data structures" is generic.
4. "focusAreas" lists the 2-4 skills the plan is built around, each with why it matters given their data and roughly how many of the 12 weeks it spans.
5. "resource" per milestone: one real, free resource (course / docs / article / tool) a student can actually open.
6. "linksTo": "practice" when the milestone's tasks are largely hands-on coding drills (the student has a sandboxed coding-practice page), "interview" when it includes interview drills, else "".
7. Keep tasks actionable and reviewable — each task must be completable in that week, and the goal must say what "done" looks like.
8. Tone: encouraging, "your progress" framing. No harsh judgment.

OUTPUT EXACTLY THIS SCHEMA:
{
  "focusAreas": [
    { "skill": "skill name", "reason": "why, tied to their data", "weeks": 3 }
  ],
  "milestones": [
    { "week": 1, "goal": "what week 1 achieves", "tasks": ["task 1", "task 2", "task 3"], "resource": "free resource name/url", "linksTo": "practice" }
  ]
}`;

export function buildRoadmapGenPrompt(overview: {
  readinessScore: number | null;
  readinessLevel: string | null;
  weaknesses: string[];
  actionItems: string[];
  interviewThemes: string[];
  target: { companyName: string; role: string } | null;
}): string {
  return `Here is the student's current picture. Design the 12-week roadmap against THIS data.

READINESS: ${overview.readinessScore == null ? "not computed yet (no full analysis/interview)" : `${overview.readinessScore}/100 (${overview.readinessLevel})`}
TARGET COMPANY: ${overview.target ? `${overview.target.companyName} — ${overview.target.role}` : "none set"}

TOP WEAKNESSES (from their resume analysis):
${overview.weaknesses.length ? overview.weaknesses.map((w) => `- ${w}`).join("\n") : "- none recorded yet"}

TOP ACTION ITEMS (from their resume analysis):
${overview.actionItems.length ? overview.actionItems.map((a) => `- ${a}`).join("\n") : "- none recorded yet"}

LATEST INTERVIEW IMPROVEMENT THEMES:
${overview.interviewThemes.length ? overview.interviewThemes.map((t) => `- ${t}`).join("\n") : "- no interviews yet"}

Week 1-2 MUST directly attack the top weaknesses or action items above (name them). Weave the interview themes into later weeks. Return ONLY the strict JSON schema with 12 milestones.`;
}