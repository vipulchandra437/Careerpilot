import { z } from "zod";
import { aiService } from "@/server/ai";

export interface LinkedInResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

function deterministicResult(profileText: string): LinkedInResult {
  const text = profileText;
  const lower = text.toLowerCase();
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  const sections = [
    { name: "experience", weight: 25 },
    { name: "education", weight: 15 },
    { name: "skills", weight: 20 },
    { name: "summary", weight: 15 },
    { name: "certification", weight: 5 },
  ];

  let score = 20;
  for (const s of sections) {
    if (lower.includes(s.name) || /\b(worked|intern|engineer|developer|lead|project|built|designed)\b/.test(lower)) {
      score += s.weight;
    }
  }

  const hasNumbers = /\d+%|\d+ users|\d+ customers|\d+ [a-z]+/.test(text);
  const hasResults = /\b(increased|reduced|improved|led|built|shipped|launched|scaled)\b/.test(lower);
  if (hasNumbers) { score += 10; strengths.push("You quantify results with metrics."); }
  else recommendations.push("Add numbers to achievements — metrics make experience credible.");

  if (hasResults) { score += 10; strengths.push("You use strong action verbs."); }
  else recommendations.push("Start bullets with action verbs: built, led, launched, improved, scaled.");

  if (text.split(/\n+/).filter((l) => l.trim()).length < 5) {
    weaknesses.push("The profile looks thin — add your experience, education, and skills sections.");
    recommendations.push("Copy/paste your full LinkedIn profile text, not just a headline.");
  } else if (text.length < 400) {
    weaknesses.push("Profile is short for a competitive search.");
    recommendations.push("Expand each role with 3-4 bullet points focused on impact.");
  } else {
    strengths.push("Good amount of detail for a strong profile.");
  }

  score = Math.min(95, score);
  if (strengths.length === 0) strengths.push("You provided a profile to work from — a great start.");
  if (recommendations.length === 0) recommendations.push("Keep your profile up to date with your latest work.");

  return { score, strengths, weaknesses, recommendations };
}

const SYSTEM = `You are a LinkedIn profile coach for early-career candidates. Evaluate the candidate's profile text. Respond in JSON only:
{"score": 0-100, "strengths": ["..."], "weaknesses": ["..."], "recommendations": ["..."]}
Consider headline, summary, experience impact, education, skills, and keywords for their target field.`;

export async function analyzeLinkedIn(profileText: string): Promise<LinkedInResult> {
  if (aiService.isConfigured()) {
    try {
      const result = await aiService.generateStructured(
        z.object({
          score: z.number().int().min(0).max(100),
          strengths: z.array(z.string()),
          weaknesses: z.array(z.string()),
          recommendations: z.array(z.string()),
        }),
        [
          { role: "system", content: SYSTEM },
          { role: "user", content: `LinkedIn profile text:\n${profileText}` },
        ],
      );
      return result;
    } catch {
      // fall through
    }
  }
  return deterministicResult(profileText);
}
