import { aiService } from "@/server/ai";
import type { AIMessage } from "@/server/ai/provider";

export interface MentorContext {
  name?: string | null;
  targetRole?: string | null;
  targetCompany?: string | null;
  readinessScore?: number | null;
  topSkills?: string[];
  weakSkills?: string[];
  completedModules?: string[];
}

const SYSTEM_PROMPT = `You are CareerPilot Mentor, a highly knowledgeable and supportive AI career coach for software engineering students. You are like a personal mentor — warm, insightful, and deeply knowledgeable about:

- Technical interview preparation (DSA, system design, behavioral)
- Resume and portfolio optimization
- GitHub and LinkedIn profile enhancement
- Career path planning and company targeting
- Skill development and learning strategies
- Communication and soft skills
- Industry trends and hiring practices

Your personality:
- Warm and encouraging, but honest
- Give specific, actionable advice (not generic platitudes)
- Use real examples when possible
- Reference the student's own data (scores, skills, gaps) to personalize advice
- When appropriate, suggest specific CareerPilot modules they should use
- Ask follow-up questions to understand their situation better
- Break complex topics into manageable steps

Rules:
- Keep answers concise but thorough (150-300 words unless they ask for detail)
- Always tie advice back to the student's context when available
- Never make up facts about the user — if you don't know, say so
- Use markdown formatting for readability (headers, bullets, bold)
- If they seem frustrated or overwhelmed, acknowledge their feelings and provide encouragement`;

function buildContextBlock(context: MentorContext): string {
  const lines: string[] = ["STUDENT CONTEXT", "---"];
  lines.push(`Name: ${context.name ?? "unknown"}`);
  lines.push(`Target role: ${context.targetRole ?? "not set"}`);
  lines.push(`Target company: ${context.targetCompany ?? "not set"}`);
  lines.push(`Overall readiness: ${context.readinessScore != null ? `${context.readinessScore}/100` : "not measured"}`);
  if (context.topSkills && context.topSkills.length > 0) {
    lines.push(`Strong skills: ${context.topSkills.join(", ")}`);
  }
  if (context.weakSkills && context.weakSkills.length > 0) {
    lines.push(`Skills needing improvement: ${context.weakSkills.join(", ")}`);
  }
  if (context.completedModules && context.completedModules.length > 0) {
    lines.push(`Modules completed: ${context.completedModules.join(", ")}`);
  }
  return lines.join("\n");
}

function deterministicReply(message: string, context: MentorContext): string {
  const text = message.toLowerCase().trim();
  const name = context.name?.split(" ")[0] ?? "there";
  const role = context.targetRole ?? "a software engineering role";

  // Greetings
  if (/^(hello|hi|hey|namaste|sup|what'?s up|hola|yo)\b/.test(text)) {
    const scoreLine = context.readinessScore != null
      ? ` Your current readiness score is **${context.readinessScore}/100**.`
      : "";
    return `Hey **${name}**! 👋 Welcome back. I'm your career mentor, and I'm here to help you land that dream job.${scoreLine}\n\nHere's what I can help with:\n- **Resume strategy** — optimize for ATS and hiring managers\n- **Interview prep** — technical, behavioral, and system design\n- **Coding practice** — DSA tips and problem-solving strategies\n- **Skill gaps** — what to learn next for ${role}\n- **Career planning** — company targeting and roadmaps\n- **GitHub / LinkedIn** — profile optimization\n\nWhat would you like to work on today?`;
  }

  // Farewell
  if (/^(bye|goodbye|see ya|good night|gn|talk later|ttyl)\b/.test(text)) {
    return `Great chatting, **${name}**! Remember: consistency beats intensity. Even 30 minutes of focused practice daily adds up fast. Come back anytime — I'm always here to help you prepare for **${role}**. Good luck! 💪`;
  }

  // Thanks
  if (/thank|thanks|thx|awesome|great|perfect|helpful|got it|makes sense/.test(text)) {
    return `You're welcome, **${name}**! Small daily reps compound into big results. Keep showing up for yourself. If you have more questions about **${role}**, resumes, interviews, or anything else — I'm right here.`;
  }

  // Resume
  if (/resume|cv|cover letter|portfolio/.test(text)) {
    return `Great question about resumes! Here's a structured approach:\n\n**1. ATS Optimization**\n- Use standard section headers (Experience, Education, Skills)\n- Include keywords from the job description naturally\n- Avoid tables, images, and fancy formatting that ATS can't parse\n\n**2. Content Quality**\n- Every bullet should start with a strong action verb + measurable outcome\n- Example: "Reduced API response time by 40% by implementing Redis caching"\n- Aim for 3-5 bullets per role, focusing on impact\n\n**3. Tailoring**\n- Customize your resume for each application\n- Mirror the language of the job posting\n\nRun the **Resume Analyzer** module on CareerPilot — it gives you an ATS score, keyword coverage, and specific fixes. After updating, re-run it to track improvement.\n\nWould you like tips on a specific section?`;
  }

  // Interviews
  if (/interview|mock|behavio|hr round|hr\b|behavioral|system design/.test(text)) {
    const isBehavioral = /behavio|hr\b|hr round/.test(text);
    const isSystemDesign = /system design/.test(text);

    if (isSystemDesign) {
      return `**System Design Interview Prep** 🏗️\n\nSystem design interviews test your ability to architect scalable systems. Here's how to prepare:\n\n**Framework to follow:**\n1. **Clarify requirements** (5 min) — ask about scale, constraints, read vs write heavy\n2. **High-level design** (10 min) — draw the major components and data flow\n3. **Deep dive** (15 min) — focus on the interviewer's area of interest\n4. **Bottlenecks & scale** (5 min) — discuss caching, sharding, load balancing\n\n**Key topics to master:**\n- URL shortener, rate limiter, chat system\n- Database design (SQL vs NoSQL, indexing)\n- Caching strategies (Redis, CDN)\n- Message queues and event-driven architecture\n\nStart with simple systems and add complexity. Practice explaining trade-offs out loud — that's what interviewers evaluate.\n\nWant me to walk through a specific system design problem?`;
    }

    if (isBehavioral) {
      return `**Behavioral Interview Mastery** 🎯\n\nBehavioral questions reveal how you handle real situations. Use the **STAR method**:\n\n- **S**ituation: Set the scene (1-2 sentences)\n- **T**ask: What was your responsibility?\n- **A**ction: What did YOU specifically do? (This is the bulk)\n- **R**esult: What was the measurable outcome?\n\n**Must-practice questions:**\n- "Tell me about a time you disagreed with a teammate"\n- "Describe a project that failed and what you learned"\n- "How do you handle tight deadlines?"\n- "Tell me about your greatest achievement"\n\n**Pro tips:**\n- Keep answers to 60-90 seconds\n- Always end with a quantifiable result\n- Prepare 5-6 stories that cover teamwork, conflict, leadership, failure, and initiative\n\nTake a **Mock Behavioral Interview** in CareerPilot's Interview module — you'll get scored feedback on your responses. Practice once a week and track your improvement.`;
    }

    return `**Technical Interview Prep** ⚡\n\nHere's your game plan:\n\n**1. DSA Foundations (most important)**\n- Master arrays, strings, hash maps, trees, graphs, and dynamic programming\n- Focus on recognizing **patterns** over memorizing solutions\n- Aim for 2 problems daily in the Coding module\n\n**2. Problem-Solving Framework**\n- Listen → Clarify → Plan → Code → Test → Optimize\n- Talk through your thought process — interviewers value communication\n\n**3. Common Mistakes to Avoid**\n- Jumping into code before discussing approach\n- Ignoring edge cases (empty input, single element, overflow)\n- Not analyzing time/space complexity at the end\n\n**4. Practice Strategy**\n- Do 1 Easy + 1 Medium daily (consistency > volume)\n- After solving, check if there's a better approach\n- Revisit problems you solved 1 week ago without looking at your solution\n\nUse the **Mock Interview** module in CareerPilot for timed sessions with AI feedback. Target: comfortable with Medium-level problems in under 25 minutes.`;
  }

  // Coding / DSA
  if (/cod|dsa|leetcode|problem|data struct|algorithm/.test(text)) {
    return `**Coding Practice Strategy** 💻\n\nConsistency beats cramming. Here's the optimal approach:\n\n**Daily Routine (45-60 min):**\n- 1 Easy problem (warm-up, 10 min)\n- 1 Medium problem (core practice, 25 min)\n- Review yesterday's problem from memory (10 min)\n\n**Pattern-Based Learning:**\n- **Week 1-2:** Arrays, Strings, Two Pointers\n- **Week 3-4:** Hash Maps, Sliding Window\n- **Week 5-6:** Trees, BFS/DFS\n- **Week 7-8:** Dynamic Programming basics\n- **Ongoing:** Graphs, Greedy, Backtracking\n\n**Key Principles:**\n- Don't just solve — **understand** why the approach works\n- Always analyze time and space complexity\n- If stuck for 15 min, read the hint, then try again\n- Revisit solved problems after 3 and 7 days\n\nUse the **Coding module** on CareerPilot to track your progress. Your Coding score improves as you consistently solve problems — aim for 12+ accepted submissions to establish a reliable baseline.\n\nWant advice on a specific topic or problem type?`;
  }

  // Skills / Gaps
  if (/skill|gap|missing|learn|study|what.*learn|priorit/.test(text)) {
    const weakList = context.weakSkills && context.weakSkills.length > 0
      ? `\n\nBased on your profile, I see these areas need attention: **${context.weakSkills.join(", ")}**`
      : "";
    return `**Skill Gap Analysis & Learning Plan** 📚\n\nHere's how to prioritize what to learn:${weakList}\n\n**Priority Framework:**\n1. **ESSENTIAL skills first** — these are non-negotiable for your target role\n2. **HIGH-GAP items** — large difference between your current and required level\n3. **Quick wins** — skills you're close to mastering with minimal effort\n\n**Learning Strategy:**\n- Pick ONE skill gap at a time\n- Take a structured course + build a small project\n- Add the project to your portfolio and update your resume\n- Reassess your gap rating\n\n**Recommended approach:**\n- Open the **Skill Gaps** page on CareerPilot for your personalized gap analysis\n- Follow the **Learning Roadmap** which breaks this into weekly tasks\n- After learning, update your skill ratings so the roadmap recalibrates\n\nWhat skill are you thinking about focusing on? I can help you create a specific plan.`;
  }

  // Roadmap / Plan / Schedule
  if (/roadmap|plan|schedule|study plan|weekly|daily plan/.test(text)) {
    return `**Study Planning & Roadmap** 🗺️\n\nYour **Learning Roadmap** on CareerPilot is your personalized weekly plan. Here's how to get the most from it:\n\n**Weekly Rhythm:**\n- **Mon/Wed/Fri:** Coding practice (1-2 problems per session)\n- **Tue/Thu:** Skill gap learning (courses, tutorials, projects)\n- **Saturday:** Mock interview or communication practice\n- **Sunday:** Review progress, update roadmap, set next week's goals\n\n**Time Management:**\n- Track your available study hours per week in your profile\n- The roadmap adapts to your schedule — more hours = more tasks\n- Aim to complete ~70% of weekly tasks; perfection leads to burnout\n\n**Accountability:**\n- Mark tasks complete as you go — it builds momentum\n- Check your Coding Streak to stay motivated\n- Regenerate the roadmap when your priorities or skill levels change\n\n**Pro tip:** If you're feeling overwhelmed, focus on just the top 2-3 tasks. Consistent partial progress beats sporadic perfection.\n\nNeed help restructuring your plan or want to focus on a specific area?`;
  }

  // GitHub
  if (/github|repo|repository|open source|contribut/.test(text)) {
    return `**GitHub Profile Optimization** 🐙\n\nRecruiters spend **6 seconds** scanning a GitHub profile. Make those seconds count:\n\n**Profile Essentials:**\n- Professional profile photo + clear bio ("Software Engineer | CS @ University | Passionate about [domain]")\n- Pin your 6 best repositories\n- Green contribution graph (consistency matters more than volume)\n\n**Repository Best Practices:**\n- Every repo needs a README: what it does, how to set it up, screenshots/demo\n- Use meaningful commit messages\n- Include a LICENSE file\n- Write clean, documented code\n\n**Standout Strategies:**\n- Contribute to open source (even documentation counts)\n- Build projects that solve real problems, not just tutorials\n- Show progression: early projects → later projects should show growth\n\nRun the **GitHub Analyzer** module on CareerPilot — it scores your profile and gives specific recommendations. Most students see a 15-20 point improvement after following the suggestions.\n\nWant specific advice on your repositories or profile?`;
  }

  // LinkedIn
  if (/linkedin|networking|connection|professional.*network/.test(text)) {
    return `**LinkedIn Optimization** 🔗\n\nLinkedIn is your professional first impression. Here's how to stand out:\n\n**Headline (most important!):**\n- Don't just put "Student" — use: "Software Engineer | React & Node.js | Open to Opportunities"\n- Include target role keywords for recruiter search\n\n**About Section:**\n- 3-4 short paragraphs\n- First line: who you are and what you're looking for\n- Include technical keywords naturally\n- End with a call to action: "Let's connect!"\n\n**Experience & Projects:**\n- Every bullet: action verb + what you built + measurable result\n- Add media (screenshots, demos, links)\n\n**Activity:**\n- Post 1-2 times per week about what you're learning\n- Comment thoughtfully on posts in your target field\n- Connect with recruiters and engineers at target companies\n\nPaste your profile into the **LinkedIn Analyzer** module — you'll get a scored review with specific fixes. Most profiles jump 20+ points with basic optimizations.\n\nWhat part of LinkedIn would you like help with?`;
  }

  // Readiness / Progress / Score
  if (/readiness|score|how.*doing|progress|am i ready/.test(text)) {
    if (context.readinessScore != null) {
      let level = "just getting started";
      if (context.readinessScore >= 80) level = "in great shape";
      else if (context.readinessScore >= 60) level = "making solid progress";
      else if (context.readinessScore >= 40) level = "building a foundation";

      return `**Your Readiness: ${context.readinessScore}/100** 📊\n\nYou're **${level}**, ${name}! Here's how to improve:\n\n**Quick wins:**\n- Run the Resume Analyzer for instant feedback\n- Complete a Mock Interview to benchmark your communication\n- Add a few projects with proper READMEs\n\n**Bigger impact:**\n- Close your top skill gaps (check the Skill Gaps page)\n- Solve 2 coding problems daily for 2 weeks\n- Optimize your LinkedIn headline and About section\n\n**Strategy:**\n- Your Career Report shows exactly which category weighs most for ${role} — focus there first\n- The highest-weighted weakness is your #1 priority\n- Small improvements in weak areas compound quickly\n\nCheck the **Progress dashboard** to see category-level breakdowns. Want me to help you prioritize what to tackle first?`;
    }
    return `**Your Readiness Score**\n\nYour readiness score hasn't been measured yet, **${name}**. It's computed from your activity across CareerPilot modules.\n\n**To get your score:**\n1. Upload and analyze your resume\n2. Solve a few coding problems\n3. Take a mock interview\n4. Log your communication practice\n\nOnce you've done these, your **Career Report** will show:\n- Overall readiness score (0-100)\n- Category breakdown (Resume, Coding, Interview, etc.)\n- Personalized recommendations for ${role}\n\nStart with whatever you have ready — even a draft resume. Every data point helps build a more accurate picture of where you stand.`;
  }

  // Communication
  if (/communication|speak|fluen|accent|nervous|public speak|presentation/.test(text)) {
    return `**Communication Skills for Engineers** 🗣️\n\nStrong communication separates good engineers from great ones. Here's how to level up:\n\n**Common Issues:**\n- Filler words ("um", "uh", "like") — sounds unconfident\n- Speaking too fast when nervous\n- Going off-track instead of structuring answers\n\n**Practice Plan:**\n1. Record yourself explaining a project (2 min)\n2. Count fillers — target: under 1 per 30 seconds\n3. Aim for 120-140 wpm (calm and clear)\n4. Practice the STAR method for behavioral answers\n\n**Interview Communication:**\n- Think before you speak (2-3 seconds is fine)\n- Use structure: "There are three approaches..." then enumerate\n- Always summarize your thinking before coding\n\n**Daily Practice:**\n- Explain something technical to a friend or rubber duck\n- Record a 1-minute "elevator pitch" about yourself\n- Practice with the **Communication Analyzer** on CareerPilot weekly\n\nTrack your filler count and words-per-minute over time — improvement is usually visible within 2-3 weeks of consistent practice.`;
  }

  // Company targeting / Career planning
  if (/which (company|role)|target|goal|choose|career path|which company|company.*target/.test(text)) {
    return `**Career Planning & Company Targeting** 🎯\n\nChoosing the right target is half the battle:\n\n**Step 1: Self-Assessment**\n- What technologies do you enjoy working with?\n- What's your experience level? (Entry / Intermediate / Experienced)\n- Do you prefer startups (broad impact) or large companies (specialization)?\n\n**Step 2: Research Companies**\n- Check their tech stack — does it match your skills?\n- Look at recent engineering blogs and open-source projects\n- Check Glassdoor for interview difficulty and culture\n\n**Step 3: Strategic Application**\n- Target 3-5 companies at similar difficulty levels\n- Set your primary target on the **Career Goal** page\n- The Company Readiness page shows the exact weighted breakdown for that role\n\n**Step 4: Gap Analysis**\n- Company Readiness shows where you fall short for each specific company\n- Close gaps that have the highest impact on readiness score\n- Tailor your resume and prep for each company's priorities\n\nPick a company that plays to your strengths, then use CareerPilot to close the specific gaps. Want help evaluating a specific company or role?`;
  }

  // Career report
  if (/career report|report|recommendation|what should i do/.test(text)) {
    return `**Using Your Career Report** 📋\n\nYour Career Report is your personalized action plan. Here's how to use it:\n\n**The Report Shows:**\n- Overall readiness score weighted by your target role\n- Category scores (Resume, Coding, Interview, Communication, etc.)\n- Specific, prioritized recommendations\n\n**How to Act on It:**\n1. **Read the top 3 recommendations** — these have the highest impact\n2. **Do one recommendation per day** — don't try to fix everything at once\n3. **Re-generate after major changes** — new skills, completed projects, etc.\n\n**Common Pattern:**\n- Most students find Resume and Coding scores have the biggest room for improvement\n- Communication is often overlooked but can be the differentiator\n- Company-specific readiness shows exactly what that company values most\n\n**Follow-up Questions to Ask Yourself:**\n- "Which category has the lowest score and highest weight?"\n- "What can I improve this week that would move the needle most?"\n- "Am I spreading too thin across modules or going deep on one?"\n\nWould you like help interpreting specific parts of your report?`;
  }

  // Emotional / overwhelmed / frustrated
  if (/overwhelm|frustrat|stressed|anxious|worried|hard|difficult|stuck|burnout|burn out|can'?t do|give up/.test(text)) {
    return `Hey **${name}**, I hear you — and it's completely normal to feel this way. Career prep is a marathon, not a sprint. 💙\n\n**Here's what helps:**\n- **Break it down:** Don't think about "everything I need to do." Focus on just ONE small thing today\n- **Celebrate small wins:** Solved a problem? Good. Updated your resume? Progress. It all counts\n- **Rest is productive:** Your brain consolidates learning during rest. Take breaks without guilt\n- **You're further than you think:** Compare yourself to where YOU were a month ago, not to others\n\n**Immediate action (pick one):**\n- Solve one Easy problem on the Coding module (10 min)\n- Read through your Career Report for one actionable step\n- Take a 15-minute walk and come back refreshed\n\n**Remember:** Every senior engineer started exactly where you are. The fact that you're here, working on this, already puts you ahead of most people who just think about it.\n\nWhat's the ONE thing stressing you most? Let's tackle just that.`;
  }

  // Follow-up / clarification questions
  if (/how|what|why|when|where|which|can you|could you|tell me more|explain|elaborate|example|detail/.test(text)) {
    return `Great question! Let me break this down for you.\n\n**Here's my approach for you:**\n\nSince I want to give you the most relevant answer, can you tell me a bit more about:\n\n1. **What specifically** are you trying to improve right now?\n2. **What's your timeline** — are you applying soon or building up gradually?\n3. **What have you already tried** that hasn't worked?\n\nIn the meantime, here are some **general principles** that apply broadly:\n- Focus on your **biggest gap** first (highest impact)\n- Build **proof of work** (projects, contributions, certifications)\n- Practice **consistently** rather than intensively\n- Get **feedback early and often** — don't polish in isolation\n\nThe CareerPilot modules are designed to give you structured feedback on each area. Which one are you most curious about?`;
  }

  // Default / catch-all
  return `Thanks for your message, **${name}**! I want to make sure I give you the most helpful advice.\n\n**Here's what I can help with for ${role}:**\n\n1. **Resume** — ATS optimization, content strategy, tailoring for companies\n2. **Interviews** — technical (DSA, system design), behavioral (STAR method)\n3. **Coding** — study plans, pattern-based learning, problem-solving strategies\n4. **Skills** — gap analysis, learning priorities, roadmap guidance\n5. **GitHub / LinkedIn** — profile optimization, project presentation\n6. **Career Planning** — company targeting, readiness assessment\n7. **Communication** — interview delivery, reducing fillers, confidence\n\nAlso check out:\n- **Progress Dashboard** — see your category scores\n- **Career Report** — personalized action plan\n- **Learning Roadmap** — weekly study schedule\n\nWhat area would you like to dive into? Just tell me what you're working on and I'll give you specific, actionable advice.`;
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

      const recentHistory = conversation_history.slice(-20);

      const messages: AIMessage[] = [
        { role: "system", content: systemMessage },
        ...recentHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: message },
      ];

      const reply = await aiService.chat(messages, { maxTokens: 1500 });
      if (reply.trim()) return reply.trim();
    } catch {
      // fall through to deterministic replies
    }
  }
  return deterministicReply(message, context);
}
