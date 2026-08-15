import { ReadinessResult } from "@/server/scoring/readiness.service";
import { SkillAssessmentItem } from "@/server/scoring/skills";
import { CategoryScores } from "@/server/scoring/score-engine";

export interface RecommendedAction {
  title: string;
  description: string;
  href: string;
  priority: number;
  reason: string;
}

const SKILL_ACTION_MAP: Record<string, { title: string; description: string; href: string }> = {
  "Data Structures": {
    title: "Solve 10 medium DSA problems",
    description: "Build consistent problem-solving reps in the Coding module.",
    href: "/coding",
  },
  Algorithms: {
    title: "Practice algorithmic patterns",
    description: "Focus on two-pointers, sliding window, and dynamic programming.",
    href: "/coding",
  },
  "System Design": {
    title: "Complete system design fundamentals",
    description: "Study scalability, databases, caching, and load balancing basics.",
    href: "/roadmap",
  },
  AWS: {
    title: "Learn core AWS services",
    description: "Focus on EC2, S3, Lambda, and RDS for cloud fundamentals.",
    href: "/roadmap",
  },
  Azure: {
    title: "Learn core Azure services",
    description: "Focus on compute, storage, and AI services relevant to your target role.",
    href: "/roadmap",
  },
  Docker: {
    title: "Practice containerization with Docker",
    description: "Containerize a sample service to learn images, volumes, and networking.",
    href: "/roadmap",
  },
  Kubernetes: {
    title: "Learn Kubernetes basics",
    description: "Understand pods, deployments, services, and autoscaling.",
    href: "/roadmap",
  },
  "Machine Learning": {
    title: "Strengthen machine learning fundamentals",
    description: "Review supervised learning, evaluation metrics, and bias-variance.",
    href: "/roadmap",
  },
  "Deep Learning": {
    title: "Build deep learning expertise",
    description: "Study neural network architectures and training practices.",
    href: "/roadmap",
  },
  "Large Language Models": {
    title: "Learn LLM application development",
    description: "Understand transformers, prompting, fine-tuning, and RAG pipelines.",
    href: "/roadmap",
  },
  Communication: {
    title: "Improve interview communication",
    description: "Practice structuring answers with the STAR method in a mock interview.",
    href: "/interview",
  },
  "Prompt Engineering": {
    title: "Practice prompt engineering",
    description: "Learn effective prompt patterns and tool-augmented prompting.",
    href: "/roadmap",
  },
  RAG: {
    title: "Build a RAG application",
    description: "Implement retrieval-augmented generation with a document corpus.",
    href: "/projects",
  },
  SQL: {
    title: "Sharpen SQL skills",
    description: "Practice joins, aggregations, and window functions.",
    href: "/coding",
  },
};

/** Deterministic, profile-driven recommended next actions (not AI-generated). */
export function getRecommendedActions(
  readiness: ReadinessResult,
  gaps: SkillAssessmentItem[],
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  // 1. Top gaps drive the priority list.
  for (const gap of gaps) {
    if (gap.status === "STRONG") continue;
    const mapped = SKILL_ACTION_MAP[gap.skillName];
    if (mapped) {
      actions.push({
        ...mapped,
        priority: gap.priority,
        reason: `${gap.skillName} is ${gap.status === "MISSING" ? "missing" : gap.status === "NEEDS_IMPROVEMENT" ? "below target" : "close to target"} (${gap.currentRating}/${gap.requiredRating} required).`,
      });
    }
  }

  // 2. Weak category scores.
  const scores: CategoryScores = readiness.scores;
  if (scores.RESUME < 70) {
    actions.push({
      title: "Analyze your resume",
      description: "Get an ATS and keyword score, then fix the weakest sections.",
      href: "/resume",
      priority: 1,
      reason: `Resume score is ${scores.RESUME}.`,
    });
  }
  if (scores.CODING < 60) {
    actions.push({
      title: "Establish your coding baseline",
      description: "Take the coding assessment to get a measurable starting score.",
      href: "/coding",
      priority: 2,
      reason: `Coding score is ${scores.CODING}.`,
    });
  }
  if (scores.INTERVIEW < 60) {
    actions.push({
      title: "Take one technical mock interview",
      description: "Practice a real interview with adaptive AI feedback.",
      href: "/interview",
      priority: 3,
      reason: `Interview score is ${scores.INTERVIEW}.`,
    });
  }
  if (scores.COMMUNICATION < 60) {
    actions.push({
      title: "Complete a communication analysis",
      description: "Record an answer and get fluency, clarity, and structure feedback.",
      href: "/communication",
      priority: 4,
      reason: `Communication score is ${scores.COMMUNICATION}.`,
    });
  }
  if (scores.PROJECTS < 60) {
    actions.push({
      title: "Analyze a project for quality feedback",
      description: "Get a project score and concrete improvement suggestions.",
      href: "/projects",
      priority: 4,
      reason: `Project score is ${scores.PROJECTS}.`,
    });
  }
  if (scores.GITHUB < 60) {
    actions.push({
      title: "Run the GitHub analyzer",
      description: "Understand how recruiters read your profile and what to fix.",
      href: "/github",
      priority: 4,
      reason: `GitHub score is ${scores.GITHUB}.`,
    });
  }

  // Dedupe by title.
  const seen = new Set<string>();
  const unique = actions.filter((a) => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });

  return unique.sort((a, b) => a.priority - b.priority).slice(0, 5);
}
