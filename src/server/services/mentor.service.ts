import { aiService } from "@/server/ai";
import type { AIMessage } from "@/server/ai/provider";
import { logger } from "@/lib/logger";

export interface MentorContext {
  name?: string | null;
  targetRole?: string | null;
  targetCompany?: string | null;
  readinessScore?: number | null;
  topSkills?: string[];
  weakSkills?: string[];
  completedModules?: string[];
  codingStats?: { totalSolved?: number; streak?: number; acceptanceRate?: number } | null;
  resumeScore?: number | null;
  interviewScore?: number | null;
  recentActivity?: string[];
}

const SYSTEM_PROMPT = `You are CareerPilot Mentor, an expert AI career coach for software engineering students. You combine the depth of a senior engineering manager with the empathy of a personal mentor.

## Your Role
You help CS students navigate their career journey — from skill development to landing their dream job. You know the hiring landscape, interview processes, and what separates strong candidates from average ones.

## Personality
- Conversational and warm, but not overly casual
- Direct and specific — never give vague or generic advice
- Data-driven — reference the student's actual scores, skills, and gaps when available
- Encouraging without being patronizing
- Honest — if something needs work, say so constructively

## Communication Style
- Use natural, flowing prose like a knowledgeable colleague
- Structure longer responses with clear sections using markdown (headers, bullets, bold)
- Keep responses concise by default (2-4 paragraphs), but go deeper when asked
- Use specific examples, numbers, and actionable steps
- Ask clarifying questions when the request is ambiguous
- Occasionally use analogies to make complex ideas accessible

## What You Know About the Student
You receive their context including:
- Name, target role, target company
- Readiness score and category breakdown
- Strong skills and skills needing improvement
- Coding stats (problems solved, streak, acceptance rate)
- Resume and interview scores
- Recent activity on CareerPilot

Use this data proactively. Don't ask them to tell you things you already know.

## Topics You Cover
- **Interview prep**: DSA strategies, system design frameworks, behavioral STAR method, mock interview tips
- **Resume & cover letters**: ATS optimization, quantified achievements, tailoring for companies
- **Coding practice**: Study plans, pattern-based learning, time/space complexity analysis
- **Skill development**: Gap analysis, learning prioritization, resource recommendations
- **Career strategy**: Company targeting, application timing, networking, referral strategies
- **GitHub & LinkedIn**: Profile optimization, project presentation, contribution strategies
- **Communication**: Interview delivery, reducing fillers, structuring answers
- **Mindset**: Dealing with rejection, imposter syndrome, maintaining momentum

## Rules
- Always ground advice in the student's actual data when available
- Never fabricate information — if you don't know something specific, say so
- If they ask about something outside career prep (e.g., cooking recipes), politely redirect to career topics
- For code-related questions, provide concrete code examples when helpful
- When they seem stuck, help them break the problem into smaller steps
- If they express frustration, acknowledge it first, then provide a path forward`;

function buildContextBlock(context: MentorContext): string {
  const lines: string[] = [];
  lines.push("## Student Profile");
  lines.push(`- Name: ${context.name ?? "Not set"}`);
  lines.push(`- Target role: ${context.targetRole ?? "Not set"}`);
  lines.push(`- Target company: ${context.targetCompany ?? "Not set"}`);
  lines.push(`- Readiness score: ${context.readinessScore != null ? `${context.readinessScore}/100` : "Not measured yet"}`);

  if (context.topSkills && context.topSkills.length > 0) {
    lines.push(`- Strong skills: ${context.topSkills.join(", ")}`);
  }
  if (context.weakSkills && context.weakSkills.length > 0) {
    lines.push(`- Skills to improve: ${context.weakSkills.join(", ")}`);
  }
  if (context.codingStats) {
    const s = context.codingStats;
    const parts: string[] = [];
    if (s.totalSolved != null) parts.push(`${s.totalSolved} problems solved`);
    if (s.streak != null) parts.push(`${s.streak} day streak`);
    if (s.acceptanceRate != null) parts.push(`${s.acceptanceRate}% acceptance`);
    if (parts.length > 0) lines.push(`- Coding: ${parts.join(", ")}`);
  }
  if (context.resumeScore != null) lines.push(`- Resume score: ${context.resumeScore}/100`);
  if (context.interviewScore != null) lines.push(`- Interview score: ${context.interviewScore}/100`);
  if (context.completedModules && context.completedModules.length > 0) {
    lines.push(`- Completed modules: ${context.completedModules.join(", ")}`);
  }
  if (context.recentActivity && context.recentActivity.length > 0) {
    lines.push(`- Recent activity: ${context.recentActivity.join("; ")}`);
  }

  return lines.join("\n");
}

function deterministicReply(message: string, context: MentorContext): string {
  const text = message.toLowerCase().trim();
  const name = context.name?.split(" ")[0] ?? "there";
  const role = context.targetRole ?? "a software engineering role";
  const company = context.targetCompany ?? "your target company";

  // Greetings
  if (/^(hello|hi|hey|namaste|sup|what'?s up|hola|yo)\b/.test(text)) {
    const scoreLine = context.readinessScore != null
      ? ` Your readiness score is **${context.readinessScore}/100**.`
      : "";
    const weakLine = context.weakSkills && context.weakSkills.length > 0
      ? ` I notice ${context.weakSkills.slice(0, 2).join(" and ")} could use some attention.`
      : "";
    return `Hey ${name}!${scoreLine}${weakLine}\n\nI'm here to help you prepare for **${role}** at **${company}**. What would you like to work on?\n\n- Interview prep (technical, behavioral, system design)\n- Resume optimization\n- Coding practice strategy\n- Skill gap analysis\n- Career planning`;
  }

  // Farewell
  if (/^(bye|goodbye|see ya|good night|gn|talk later|ttyl)\b/.test(text)) {
    return `Goodbye, ${name}! Remember — consistency beats intensity. Even 30 minutes of focused practice daily adds up fast. Come back anytime.`;
  }

  // Thanks
  if (/thank|thanks|thx|awesome|great|perfect|helpful|got it|makes sense/.test(text)) {
    return `You're welcome, ${name}! Small daily reps compound into big results. What else can I help with?`;
  }

  // Resume
  if (/resume|cv|cover letter|portfolio/.test(text)) {
    const resumeTip = context.resumeScore != null
      ? `\n\nYour current resume score is **${context.resumeScore}/100**. `
      : "\n\n";
    return `Here's what makes a strong resume:${resumeTip}\n\n**1. ATS Optimization**\n- Standard section headers (Experience, Education, Skills)\n- Keywords from the job description woven in naturally\n- Clean formatting — no tables, images, or columns\n\n**2. Content Quality**\n- Every bullet: action verb + what you built + measurable result\n- Example: "Reduced API response time by 40% by implementing Redis caching"\n- 3-5 bullets per role, focused on impact\n\n**3. Tailoring**\n- Customize for each application\n- Mirror the language of the job posting\n\nTry the **Resume Analyzer** in CareerPilot for an instant ATS score and specific fixes. Want tips on a specific section?`;
  }

  // Interviews
  if (/interview|mock|behavio|hr round|hr\b|behavioral|system design/.test(text)) {
    if (/system design/.test(text)) {
      return `**System Design Prep**\n\nFramework to follow:\n1. **Clarify requirements** (5 min) — scale, constraints, read vs write heavy\n2. **High-level design** (10 min) — major components and data flow\n3. **Deep dive** (15 min) — the interviewer's area of interest\n4. **Bottlenecks** (5 min) — caching, sharding, load balancing\n\nKey topics: URL shortener, rate limiter, chat system, news feed, payment system.\n\nStart simple, add complexity. Practice explaining trade-offs out loud — that's what interviewers evaluate. Want me to walk through a specific problem?`;
    }
    if (/behavio|hr\b|hr round/.test(text)) {
      return `**Behavioral Interview — STAR Method**\n\n- **S**ituation: Set the scene (1-2 sentences)\n- **T**ask: Your responsibility\n- **A**ction: What YOU specifically did (bulk of the answer)\n- **R**esult: Measurable outcome\n\nPrepare 5-6 stories covering: teamwork, conflict, leadership, failure, initiative.\n\nKeep answers to 60-90 seconds. Always end with a quantifiable result. Try a **Mock Interview** in CareerPilot to practice with AI feedback.`;
    }
    return `**Technical Interview Prep**\n\n**Framework:** Listen → Clarify → Plan → Code → Test → Optimize\n\n**Daily routine:**\n- 1 Easy + 1 Medium problem (consistency > volume)\n- After solving, check if there's a better approach\n- Revisit problems from 1 week ago without looking at solution\n\n**Common mistakes:**\n- Jumping into code before discussing approach\n- Ignoring edge cases\n- Not analyzing time/space complexity at the end\n\nUse the **Mock Interview** module for timed sessions with AI feedback.`;
  }

  // Coding / DSA
  if (/cod|dsa|leetcode|problem|data struct|algorithm/.test(text)) {
    const statsLine = context.codingStats?.totalSolved
      ? ` You've solved **${context.codingStats.totalSolved}** problems so far.`
      : "";
    return `**Coding Practice Strategy**${statsLine}\n\n**Daily Routine (45-60 min):**\n- 1 Easy warm-up (10 min)\n- 1 Medium core practice (25 min)\n- Review yesterday's problem from memory (10 min)\n\n**Pattern-Based Learning:**\n- Weeks 1-2: Arrays, Two Pointers\n- Weeks 3-4: Hash Maps, Sliding Window\n- Weeks 5-6: Trees, BFS/DFS\n- Weeks 7-8: Dynamic Programming basics\n\n**Key principle:** Don't just solve — understand *why* the approach works. Always analyze time and space complexity.\n\nUse the **Coding module** to track progress. Want advice on a specific topic?`;
  }

  // Skills / Gaps
  if (/skill|gap|missing|learn|study|what.*learn|priorit/.test(text)) {
    const weakList = context.weakSkills && context.weakSkills.length > 0
      ? `\n\nBased on your profile, I'd prioritize: **${context.weakSkills.slice(0, 3).join(", ")}**`
      : "";
    return `**Skill Gap Analysis**${weakList}\n\n**Priority Framework:**\n1. ESSENTIAL skills first — non-negotiable for ${role}\n2. HIGH-GAP items — biggest difference between current and required level\n3. Quick wins — skills close to mastery with minimal effort\n\n**Approach:**\n- Pick ONE skill gap at a time\n- Take a structured course + build a small project\n- Add the project to your portfolio and update your resume\n- Reassess your gap rating\n\nCheck the **Skill Gaps** page for your personalized analysis. What skill are you thinking about focusing on?`;
  }

  // GitHub
  if (/github|repo|repository|open source|contribut/.test(text)) {
    return `**GitHub Profile Optimization**\n\nRecruiters spend **6 seconds** scanning a GitHub profile.\n\n**Essentials:**\n- Professional photo + clear bio\n- Pin your 6 best repositories\n- Green contribution graph (consistency > volume)\n\n**Repository quality:**\n- Every repo needs a README: what it does, setup instructions, screenshots\n- Meaningful commit messages\n- Include a LICENSE file\n\n**Stand out:**\n- Contribute to open source (even docs count)\n- Build projects that solve real problems\n- Show progression in project complexity over time\n\nRun the **GitHub Analyzer** module for a scored review with specific fixes.`;
  }

  // LinkedIn
  if (/linkedin|networking|connection|professional.*network/.test(text)) {
    return `**LinkedIn Optimization**\n\n**Headline:** Don't just put "Student" — use: "Software Engineer | React & Node.js | Open to Opportunities"\n\n**About section:**\n- 3-4 short paragraphs\n- First line: who you are + what you're looking for\n- Technical keywords naturally included\n- End with a call to action\n\n**Activity:**\n- Post 1-2 times per week about what you're learning\n- Comment thoughtfully on posts in your field\n- Connect with recruiters at target companies\n\nPaste your profile into the **LinkedIn Analyzer** for a scored review.`;
  }

  // Readiness / Score
  if (/readiness|score|how.*doing|progress|am i ready/.test(text)) {
    if (context.readinessScore != null) {
      let level = "just getting started";
      if (context.readinessScore >= 80) level = "in great shape";
      else if (context.readinessScore >= 60) level = "making solid progress";
      else if (context.readinessScore >= 40) level = "building a foundation";

      return `**Your Readiness: ${context.readinessScore}/100**\n\nYou're **${level}**. Here's how to improve:\n\n**Quick wins:**\n- Run the Resume Analyzer for instant feedback\n- Complete a Mock Interview to benchmark communication\n- Add projects with proper READMEs\n\n**Bigger impact:**\n- Close your top skill gaps\n- Solve 2 coding problems daily for 2 weeks\n- Optimize your LinkedIn headline\n\nCheck the **Progress dashboard** for category-level breakdowns. Want me to help prioritize?`;
    }
    return `Your readiness score hasn't been measured yet. It's computed from your activity across CareerPilot modules.\n\n**To get your score:**\n1. Upload and analyze your resume\n2. Solve a few coding problems\n3. Take a mock interview\n4. Log communication practice`;
  }

  // Career planning
  if (/which (company|role)|target|goal|choose|career path|which company|company.*target/.test(text)) {
    return `**Career Planning**\n\n**Step 1: Self-Assessment**\n- What technologies do you enjoy?\n- Entry, intermediate, or experienced level?\n- Startup (broad impact) or large company (specialization)?\n\n**Step 2: Research**\n- Check the company's tech stack\n- Read engineering blogs\n- Check Glassdoor for interview difficulty\n\n**Step 3: Strategic Application**\n- Target 3-5 companies at similar difficulty\n- Set your primary target on the **Career Goal** page\n- Use Company Readiness to see exact weighted breakdowns\n\n**Step 4: Close Gaps**\n- Focus on skills that have highest impact on readiness score\n- Tailor your resume for each company\n\nPick a company that plays to your strengths. Want help evaluating a specific one?`;
  }

  // Overwhelmed / frustrated
  if (/overwhelm|frustrat|stressed|anxious|worried|hard|difficult|stuck|burnout|burn out|can'?t do|give up/.test(text)) {
    return `Hey ${name}, I hear you — career prep can feel overwhelming. That's completely normal.\n\n**Here's what helps:**\n- **Break it down:** Don't think about everything. Focus on ONE small thing today\n- **Celebrate small wins:** Solved a problem? Updated your resume? It all counts\n- **Rest is productive:** Your brain consolidates learning during rest\n- **You're further than you think:** Compare yourself to where you were a month ago\n\n**Pick one thing right now:**\n- Solve one Easy problem (10 min)\n- Read your Career Report for one actionable step\n- Take a 15-minute walk and come back\n\nEvery senior engineer started where you are. The fact that you're working on this puts you ahead. What's the ONE thing stressing you most?`;
  }

  // Default
  return `Thanks for your message, ${name}. I want to give you the most helpful advice.\n\nCan you tell me more about:\n1. What specifically are you trying to improve?\n2. What's your timeline — applying soon or building up gradually?\n3. What have you already tried?\n\nIn the meantime, here are some **general principles:**\n- Focus on your biggest gap first\n- Build proof of work (projects, contributions)\n- Practice consistently rather than intensively\n- Get feedback early and often\n\nWhich area would you like to dive into?`;
}

export async function mentorReply(
  message: string,
  context: MentorContext,
  conversation_history: Array<{ role: string; content: string }>,
): Promise<string> {
  if (aiService.isConfigured()) {
    try {
      const contextBlock = buildContextBlock(context);
      const systemMessage = `${SYSTEM_PROMPT}\n\n${contextBlock}`;

      const recentHistory = conversation_history.slice(-30);

      const messages: AIMessage[] = [
        { role: "system", content: systemMessage },
        ...recentHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: message },
      ];

      const reply = await aiService.chat(messages, { maxTokens: 2000 });
      if (reply.trim()) return reply.trim();
    } catch (err) {
      logger.warn("Mentor AI failed, using deterministic fallback", {
        reason: err instanceof Error ? err.message : "unknown",
      });
    }
  }
  return deterministicReply(message, context);
}

/** Stream mentor reply token by token. Returns full text when done. */
export async function mentorReplyStream(
  message: string,
  context: MentorContext,
  conversation_history: Array<{ role: string; content: string }>,
  onToken: (token: string) => void,
): Promise<string> {
  if (aiService.isConfigured()) {
    try {
      const contextBlock = buildContextBlock(context);
      const systemMessage = `${SYSTEM_PROMPT}\n\n${contextBlock}`;

      const recentHistory = conversation_history.slice(-30);

      const messages: AIMessage[] = [
        { role: "system", content: systemMessage },
        ...recentHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: message },
      ];

      const reply = await aiService.chatStream(messages, {
        maxTokens: 2000,
        onToken,
      });
      if (reply.trim()) return reply.trim();
    } catch (err) {
      logger.warn("Mentor AI stream failed, using deterministic fallback", {
        reason: err instanceof Error ? err.message : "unknown",
      });
    }
  }
  const fallback = deterministicReply(message, context);
  onToken(fallback);
  return fallback;
}

/** Generate a short conversation title from the first message. */
export async function generateConversationTitle(firstMessage: string): Promise<string> {
  if (aiService.isConfigured()) {
    try {
      const reply = await aiService.chat(
        [
          {
            role: "system",
            content:
              "Generate a short conversation title (max 6 words) that captures the main topic. Reply with ONLY the title, no quotes, no punctuation at the end.",
          },
          { role: "user", content: firstMessage },
        ],
        { maxTokens: 30 },
      );
      const title = reply.trim().replace(/^["']|["']$/g, "");
      if (title.length > 0 && title.length <= 60) return title;
    } catch {
      // fall through
    }
  }
  // Deterministic fallback
  const cleaned = firstMessage.replace(/\n/g, " ").trim();
  if (cleaned.length <= 40) return cleaned;
  const cut = cleaned.slice(0, 40);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + "...";
}
