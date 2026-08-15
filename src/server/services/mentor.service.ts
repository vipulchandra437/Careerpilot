import { aiService } from "@/server/ai";
import type { AIMessage } from "@/server/ai/provider";

export interface MentorContext {
  name?: string | null;
  targetRole?: string | null;
  targetCompany?: string | null;
  readinessScore?: number | null;
}

const SYSTEM_PROMPT = `You are CareerPilot Mentor, a supportive career coach for students preparing for software engineering roles. You give concise, actionable, honest advice.

Rules:
- Keep answers under ~180 words unless asked for detail.
- Tie advice back to the student's own context when provided (target role, company, readiness).
- Reference CareerPilot modules when relevant: Resume analyzer, Coding practice, Mock Interviews, Communication, GitHub/LinkedIn/Project analyzers, Skill Gaps, Learning Roadmap, Career Report.
- Never invent facts about the user's profile. If you don't know, say so and point them to a module that would tell them.`;

function deterministicReply(message: string, context: MentorContext): string {
  const text = message.toLowerCase();
  const role = context.targetRole ?? "a software engineering role";

  if (/(hello|hi|hey|namaste)\b/.test(text)) {
    return `Hi${context.name ? ` ${context.name}` : ""}! I'm your career mentor. Ask me about resume strategy, interview prep, coding practice, skill gaps, or your learning roadmap. I can also look at your readiness score (currently ${context.readinessScore ?? "not measured yet"}).`;
  }
  if (/resume/.test(text)) {
    return "A strong resume is 40% content and 60% evidence: use the Resume analyzer to get an ATS score and keyword coverage, then rework weak sections. Lead every bullet with an action verb and a number (e.g. \"Reduced load time by 40%\"). After you fix it, re-run the analyzer to see the score move.";
  }
  if (/interview|mock|behavio|hr round|hr\b/.test(text)) {
    return "For mock interviews, use the STAR method: Situation, Task, Action, Result. Keep answers to 60-90 seconds and end with a measurable outcome. Take one technical and one behavioral interview in the Interview module, then review the feedback list and re-take the weakest area.";
  }
  if (/cod|dsa|leetcode|problem|data struct/.test(text)) {
    return "Consistency beats volume: solve 2 problems daily in the Coding module rather than cramming 10 in one sitting. Focus on the patterns your target role weights most. After 12+ accepted problems your Coding score will stabilize into a realistic baseline.";
  }
  if (/skill|gap|missing|learn/.test(text)) {
    return `Your Skill Gaps page lists what ${role} requires versus your current self-assessed ratings. Start with missing ESSENTIAL skills first — each one should get a structured course plus a small project. Then open your Learning Roadmap and mark tasks complete weekly.`;
  }
  if (/roadmap|plan|schedule|study plan/.test(text)) {
    return "Your Learning Roadmap breaks preparation into weekly daily/weekly tasks. Aim to mark ~70% of tasks complete; don't chase perfection. Regenerate it whenever your skill ratings change so it reflects your new level.";
  }
  if (/github|repo|project/.test(text)) {
    return "Recruiters judge GitHub in seconds: a clear bio, READMEs on top projects, and recent commits matter more than follower counts. Run the GitHub and Project analyzers — they turn your repos into an objective score with specific fixes.";
  }
  if (/linkedin/.test(text)) {
    return "LinkedIn is your public first impression. Make sure your headline names the role you want, your about uses keywords from job posts, and every experience bullet has a metric. Paste your profile into the LinkedIn analyzer for a scored review.";
  }
  if (/readiness|score|how.*doing|progress/.test(text)) {
    return context.readinessScore != null
      ? `Your current overall readiness is ${context.readinessScore}/100. Look at the Progress page to see which category drags it down, then fix the highest-weighted weakness first — your Career Report lists the exact recommended next steps.`
      : "Your readiness isn't measured yet. Complete a few modules — Resume analysis, Coding, a Mock Interview, and Communication — and your Career Report will show where you stand.";
  }
  if (/communication|speak|fluen|accent|nervous/.test(text)) {
    return "Nervousness shows up as fillers and pace. Record yourself in the Communication module weekly and track your filler count and words-per-minute. A practical target: under 1 filler per 30 seconds and a calm 120-140 wpm.";
  }
  if (/which (company|role)|target|goal|choose/.test(text)) {
    return "Pick a company that posts roles matching the skills you already have, then set it as your target on the Career Goal page. The Company Readiness page will show you the exact weighted breakdown for that role so you know precisely what to improve.";
  }
  if (/thanks|thank you|awesome|great|perfect/.test(text)) {
    return "You're welcome! Keep showing up consistently — small daily reps compound. I'm here whenever you need direction.";
  }
  return `Here's what I'd focus on for ${role}: (1) set or confirm your target on the Career Goal page, (2) run the analyzers for the assets you've built, and (3) close your top skill gap from the Skill Gaps page. Want me to dig into resumes, coding, interviews, or the roadmap?`;
}

export async function mentorReply(
  message: string,
  context: MentorContext,
  history: AIMessage[],
): Promise<string> {
  if (aiService.isConfigured()) {
    try {
      const contextBlock = `STUDENT CONTEXT\nName: ${context.name ?? "unknown"}\nTarget role: ${context.targetRole ?? "not set"}\nTarget company: ${context.targetCompany ?? "not set"}\nOverall readiness: ${context.readinessScore ?? "not measured"}`;
      const messages: AIMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-8),
        { role: "user", content: `${contextBlock}\n\n---\n\n${message}` },
      ];
      const reply = await aiService.chat(messages);
      if (reply.trim()) return reply.trim();
    } catch {
      // fall through to deterministic replies
    }
  }
  return deterministicReply(message, context);
}
