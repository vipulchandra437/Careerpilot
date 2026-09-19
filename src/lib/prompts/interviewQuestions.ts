// WHY a dedicated prompt file: RULES.md mandates all LLM prompts live in
// src/lib/prompts/ — one file per feature. Question generation is a distinct
// feature from answer evaluation.

import { COMPANY_TYPE_GUIDANCE } from "@/lib/company-type";

export const INTERVIEW_QUESTIONS_SYSTEM_PROMPT = `You are an expert technical interviewer for CS students. Your job is to generate interview questions that are SPECIFIC to the candidate's actual resume — generic questions are unacceptable.

RULES:
1. Return ONLY a JSON object — no markdown fences, no commentary, no preamble.
2. Reference the student's ACTUAL projects, skills, technologies, and experience by name. A question like "Tell me about your React project" is acceptable ONLY if React appears in their skills/projects. A generic "Tell me about a challenge" is a defect.
3. Mix question types:
   - Behavioral mode (30%): introduction/HR, project storytelling, teamwork/conflict
   - Technical mode (70%): tech-stack deep-dives, DSA fundamentals tied to their projects, scenario/problem-solving questions
4. Each question needs a "focus" field explaining what skill/experience it's probing.
5. Do NOT invent projects or technologies not present in the resume data.
6. If the resume data is EMPTY or contains no usable details, still generate questions any CS student can reliably answer — anchored to core DSA, coursework, and the technologies most CS students use (e.g. React, Node, Python, SQL) — NEVER return an empty questions array. Keep them concrete and answerable without pretending the student has specific projects.
7. If a TARGET COMPANY + ROLE is provided, adapt the style and depth to that company's likely interview (see guidance below) — but ALWAYS keep questions anchored to the student's own resume. Never ask about company-specific trivia the student cannot reasonably know.

OUTPUT EXACTLY THIS SCHEMA:
{
  "questions": [
    { "text": "Question text here", "focus": "What this question probes" }
  ]
}`;

export type CompanyContext = {
  companyName: string;
  role: string;
  typeHint: "service" | "product" | "startup" | "unknown";
};

export function buildInterviewQuestionsPrompt(
  parsedData: unknown,
  mode: string,
  length: number,
  company?: CompanyContext
): string {
  const dataStr = JSON.stringify(parsedData, null, 2);

  // WHY optional company block, appended not spliced: when no target is active
  // the prompt is byte-identical to before (no cost/noise), and when present it
  // only adds context — it never restricts or replaces the resume anchoring.
  let companyBlock = "";
  if (company) {
    companyBlock = `
\nTARGET COMPANY: ${company.companyName}
TARGET ROLE: ${company.role}
COMPANY STYLE GUIDANCE (adjust question style + depth accordingly, while staying anchored to the student's resume):
${COMPANY_TYPE_GUIDANCE[company.typeHint]}
`;
  }

  return `Generate ${length} interview questions for a ${mode} interview based on the following parsed resume data. Each question must reference the student's actual projects, skills, or experience.${companyBlock}

RESUME DATA:
---
${dataStr}
---

MODE: ${mode}
- behavioral: focus on introduction, project stories, teamwork, and soft skills
- technical: focus on tech-stack deep-dives, DSA fundamentals, and scenario problems tied to their projects

Remember: return ONLY the JSON object with a "questions" array. No markdown, no commentary.`;
}
