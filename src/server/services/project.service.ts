import { z } from "zod";
import { aiService } from "@/server/ai";

export interface ProjectInput {
  name: string;
  description?: string | null;
  techStack: string[];
  repoUrl?: string | null;
}

export interface ProjectAnalysisResult {
  score: number;
  categories: { key: string; label: string; score: number }[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

function deterministicResult(project: ProjectInput): ProjectAnalysisResult {
  const desc = (project.description ?? "").toLowerCase();
  const hasMetrics = /\d+%|\d+ users|\d+ ms|\d+ requests|\d+ concurrent|\d+ rps|99\.\d/.test(desc);
  const actionWords = /\b(built|designed|implemented|optimized|reduced|improved|scaled|architected|developed)\b/.test(desc);
  const hasArchitecture = /\b(architecture|api|database|pipeline|monitor|deploy|docker|aws|redis|postgres|frontend|backend)\b/.test(desc);

  let documentation = project.description && project.description.length >= 60 ? 75 : project.description ? 50 : 20;
  if (hasMetrics) documentation += 15;
  if (actionWords) documentation += 10;
  documentation = Math.min(100, documentation);

  const scope = Math.min(100, (project.techStack.length >= 5 ? 80 : project.techStack.length >= 3 ? 60 : 35) + (hasArchitecture ? 15 : 0));
  const presentation = project.repoUrl ? 70 : 30;
  const relevance = Math.min(100, project.techStack.length * 12);

  const categories = [
    { key: "DOCUMENTATION", label: "Documentation & impact", score: documentation },
    { key: "SCOPE", label: "Technical scope", score: scope },
    { key: "PRESENTATION", label: "Presentation", score: presentation },
    { key: "RELEVANCE", label: "Skill relevance", score: relevance },
  ];
  const score = Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (hasMetrics) strengths.push("You quantify the impact of this project with metrics.");
  else recommendations.push("Add metrics: response times, user counts, performance gains (e.g. \"reduced latency by 40%\").");

  if (actionWords) strengths.push("You use strong action verbs to describe your work.");
  else recommendations.push("Start the description with action verbs like \"Built\", \"Designed\", \"Optimized\".");

  if (project.techStack.length >= 3) strengths.push(`Solid tech stack (${project.techStack.join(", ")}).`);
  else recommendations.push("Broaden the tech stack — a project touching frontend, backend, and a database stands out.");

  if (project.repoUrl) strengths.push("You link the repository so recruiters can explore the code.");
  else recommendations.push("Add a public repository link and a live demo if possible.");

  if (!project.description || project.description.length < 60) {
    weaknesses.push("Description is thin — recruiters won't understand the project's value.");
    recommendations.push("Write 3-4 sentences covering the problem, your role, the stack, and the outcome.");
  }

  if (strengths.length === 0) strengths.push("The project has a clear starting point to improve.");
  if (recommendations.length === 0) recommendations.push("Keep iterating — add features, tests, and a README.");

  return { score, categories, strengths, weaknesses, recommendations };
}

const SYSTEM = `You are a technical reviewer evaluating a student project for a job application. Respond in JSON only:
{"score": 0-100, "categories": [{"key":"DOCUMENTATION","label":"Documentation & impact","score":0},{"key":"SCOPE","label":"Technical scope","score":0},{"key":"PRESENTATION","label":"Presentation","score":0},{"key":"RELEVANCE","label":"Skill relevance","score":0}], "strengths": ["..."], "weaknesses": ["..."], "recommendations": ["..."]}`;

export async function analyzeProject(project: ProjectInput): Promise<ProjectAnalysisResult> {
  if (aiService.isConfigured()) {
    try {
      const result = await aiService.generateStructured(
        z.object({
          score: z.number().int().min(0).max(100),
          categories: z.array(
            z.object({ key: z.string(), label: z.string(), score: z.number().int().min(0).max(100) }),
          ),
          strengths: z.array(z.string()),
          weaknesses: z.array(z.string()),
          recommendations: z.array(z.string()),
        }),
        [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Project: ${project.name}\nDescription: ${project.description ?? "none"}\nTech stack: ${project.techStack.join(", ") || "none"}\nRepo: ${project.repoUrl ?? "none"}`,
          },
        ],
      );
      return result;
    } catch {
      // fall through
    }
  }
  return deterministicResult(project);
}
