import { NextResponse } from "next/server";

export const maxDuration = 60;
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { validateBody, toErrorResponse, isAIServiceError, ApiError } from "@/lib/api";
import { aiService } from "@/server/ai/index";

export const runtime = "nodejs";

const studyPlanSchema = z.object({
  skillGaps: z.array(
    z.object({
      skillName: z.string(),
      skillCategory: z.string(),
      currentRating: z.number(),
      requiredRating: z.number(),
      status: z.string(),
      priority: z.number(),
    })
  ),
  availableHoursPerWeek: z.number().min(1).max(80),
  deadline: z.string().optional(),
});

const STUDY_PLAN_SYSTEM_PROMPT = `You are an expert learning strategist for software engineering career preparation. Create personalized weekly study plans based on the student's skill gaps, available time, and deadline.

You always respond with valid JSON only, matching this exact shape:
{
  "totalWeeks": number,
  "overview": "one paragraph summary",
  "weeks": [
    {
      "week": 1,
      "theme": "theme for this week",
      "hoursPlanned": number,
      "milestones": ["milestone1", "milestone2"],
      "skills": [
        {
          "skill": "skill name",
          "hours": number,
          "activities": ["activity1", "activity2"],
          "milestone": "what to achieve this week for this skill"
        }
      ],
      "tip": "a practical tip for this week"
    }
  ]
}

Guidelines:
- Prioritize ESSENTIAL and MISSING skills first
- Distribute hours realistically across the available time
- Include a mix of learning, practice, and project work
- Each week should have 2-4 concrete milestones
- Make milestones measurable (e.g., "Complete 5 coding problems", "Build a small REST API")
- Adapt difficulty based on current rating vs required rating
- Include review weeks for skills that need reinforcement`;

function generateFallbackPlan(skillGaps: Array<{ skillName: string; currentRating: number; requiredRating: number; status: string; priority: number }>, availableHoursPerWeek: number) {
  const gaps = skillGaps.filter((g) => g.status !== "STRONG").sort((a, b) => a.priority - b.priority);
  const totalWeeks = Math.max(4, Math.min(16, Math.ceil(gaps.length * 1.5)));
  const hoursPerSkillPerWeek = Math.max(1, Math.floor(availableHoursPerWeek / Math.max(1, gaps.length)));

  const weeks = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const skillsForWeek = gaps.slice(
      ((w - 1) * gaps.length) / totalWeeks,
      (w * gaps.length) / totalWeeks
    );

    weeks.push({
      week: w,
      theme: skillsForWeek.length > 0 ? `Focus on ${skillsForWeek.map((s) => s.skillName).join(", ")}` : "Review and practice",
      hoursPlanned: availableHoursPerWeek,
      milestones: skillsForWeek.map((s) => `Improve ${s.skillName} from ${s.currentRating}/5 to ${Math.min(5, s.currentRating + 1)}/5`),
      skills: skillsForWeek.map((s) => ({
        skill: s.skillName,
        hours: hoursPerSkillPerWeek,
        activities: [`Study ${s.skillName} fundamentals`, `Complete practice exercises`, `Build a small project`],
        milestone: `Reach ${Math.min(5, s.currentRating + 1)}/5 proficiency`,
      })),
      tip: w % 4 === 0 ? "Take a practice assessment to track progress." : "Review what you learned at the end of each day.",
    });
  }

  return { totalWeeks, overview: `${totalWeeks}-week plan for ${availableHoursPerWeek} hours/week covering ${gaps.length} skill gaps.`, weeks };
}

export async function POST(request: Request) {
  await requireUser();
  const body = await validateBody(request, studyPlanSchema).catch(() => null);
  if (!body) {
    return toErrorResponse(new ApiError(400, "Invalid input"));
  }

  try {
    if (!aiService.isConfigured()) {
      const fallback = generateFallbackPlan(body.skillGaps, body.availableHoursPerWeek);
      return NextResponse.json({ plan: fallback, isAiGenerated: false });
    }

    const skillGapsText = body.skillGaps
      .map(
        (g) =>
          `- ${g.skillName} (${g.skillCategory}): current ${g.currentRating}/5, required ${g.requiredRating}/5, status: ${g.status}, priority: ${g.priority}`
      )
      .join("\n");

    const deadlineText = body.deadline ? `\nDeadline: ${body.deadline}` : "\nNo specific deadline.";

    const messages = [
      { role: "system" as const, content: STUDY_PLAN_SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: `Create a study plan with these parameters:

Available hours per week: ${body.availableHoursPerWeek}
${deadlineText}

Skill gaps (sorted by priority):
${skillGapsText}

Generate a detailed week-by-week study plan.`,
      },
    ];

    const planSchema = z.object({
      totalWeeks: z.number(),
      overview: z.string(),
      weeks: z.array(
        z.object({
          week: z.number(),
          theme: z.string(),
          hoursPlanned: z.number(),
          milestones: z.array(z.string()),
          skills: z.array(
            z.object({
              skill: z.string(),
              hours: z.number(),
              activities: z.array(z.string()),
              milestone: z.string(),
            })
          ),
          tip: z.string(),
        })
      ),
    });

    const plan = await aiService.generateStructured(planSchema, messages);

    return NextResponse.json({ plan, isAiGenerated: true });
  } catch (error) {
    if (isAIServiceError(error)) {
      const fallback = generateFallbackPlan(body.skillGaps, body.availableHoursPerWeek);
      return NextResponse.json({ plan: fallback, isAiGenerated: false });
    }
    return toErrorResponse(error);
  }
}
