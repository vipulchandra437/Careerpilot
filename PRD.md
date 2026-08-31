# PRD.md — AI-Assisted Career Development Platform

## 1. Overview

An AI-assisted career development platform for computer science students, powered by OpenRouter LLMs. It performs skill gap analysis, generates coding challenges, simulates interviews, and produces personalized career roadmaps — combining resume, LinkedIn, GitHub, and project-level analysis into one system. Built for commercial sale (see PROMPT.md for the production-grade bar this implies).

## 2. Problem Statement

CS students preparing for jobs juggle separate tools for resume review, interview prep, coding practice, and career guidance — none of which talk to each other or reflect what the student has actually built. Generic advice ("learn React") doesn't tell a student how deep their React knowledge needs to go for a specific target role, or what to do first.

## 3. Goals

- One accurate picture of current skill level vs. a target role.
- A concrete, ordered action plan (roadmap) — not a keyword list.
- Practice (coding, interviews, communication) in the same place the gap was found, so progress feeds back into the roadmap automatically.
- Profile analysis (resume/LinkedIn/GitHub/projects) as the single input driving every other feature — no duplicate data entry.

## 4. Non-Goals (Out of Scope for v1)

- Job matching / job board integration
- Salary negotiation or offer analysis
- Employer-facing recruiting tools
- Native mobile apps (responsive web only)
- Audio/video-based communication feedback (text transcript only in v1)

## 5. Target Users

- **Primary:** Final-year / pre-final-year CS students preparing for placements or internships.
- **Secondary:** Early-career developers reskilling or targeting a new specialization.
- **Admin:** Platform owner/moderator managing content, users, and challenge banks.

## 6. Core Features — Detailed Requirements

### 6.1 Skill Assessment & Gap Analysis

**User story:** As a student, I want to see exactly which skills I'm missing for a target role, ranked by importance, so I know what to work on first.

**Input:** parsed resume + optional GitHub connection + selected target role (e.g., "Backend Engineer," "ML Engineer" — from an admin-managed list).
**Process:** extract current skills (regex/keyword pass + LLM inference for context, e.g., "built a REST API in Django" → Django, REST, Python at working-proficiency level) → compare against TargetRoleProfile.required_skills (see architecture.md §3.2 for schema).
**Output:** a GapReport — list of {skill, severity: critical|important|nice_to_have, reason, suggested_resource}.

**Acceptance criteria:**
- Uploading a resume produces a gap report in under 15 seconds (p95).
- Severity levels are explainable — each gap includes a one-sentence "why this matters for [role]," not just a label.
- Re-running the analysis after a GitHub connect updates the report, not duplicates it.

### 6.2 AI Career Roadmap & Reports

**User story:** As a student, I want an ordered plan, not a dump of everything I'm missing, so I don't feel overwhelmed.

**Roadmap** = ordered list of Milestone objects, each tied to one or more gaps, each with an estimated time investment and a linked action (coding challenge, external resource, or "do a mock interview").
**Roadmaps are versioned** — completing milestones re-ranks what's left rather than regenerating from scratch every time (avoids the plan feeling random on every visit).
**Exportable** as a PDF report summarizing: current profile snapshot, gap report, and roadmap.

**Acceptance criteria:** a student can mark a milestone complete and see the roadmap re-order within the same session.

### 6.3 Coding Practice

**User story:** As a student, I want challenges scoped to my actual gaps, not a generic problem bank, so practice time isn't wasted.

- Challenge generation takes {gap_skill, difficulty, target_role} as input to the LLM.
- Difficulty adapts: 2 correct in a row at a difficulty → next challenge steps up; 2 incorrect → steps down.
- Submitted code runs in the sandboxed execution service (architecture.md §5) — never inline.
- Feedback covers: correctness (pass/fail on test cases), time/space complexity estimate, and code quality notes (naming, structure — LLM-generated).

**Acceptance criteria:** a challenge tied to roadmap milestone X, once passed, marks milestone X's linked action complete.

### 6.4 AI Mock Interviews

**User story:** As a student, I want a realistic interview simulation with follow-ups, not a static question list.

- Session types: technical (DSA/system design) and behavioral.
- Adaptive follow-ups: the LLM sees the running transcript and asks a follow-up based on the actual answer (e.g., vague answer → "can you give a specific example?").
- Transcript persisted in full (question, answer, timestamp) for the Communication Feedback module.

**Acceptance criteria:** a session of at least 5 exchanges produces a coherent, non-repetitive line of questioning (verify via the evaluation set in RULES.md §4).

### 6.5 Communication Feedback

**User story:** As a student, I want to know if my answers were clear and well-structured, not just "correct."

- Runs on the interview transcript post-session.
- Feedback dimensions (v1, text-based): clarity, structure (did they use a framework like STAR for behavioral answers?), conciseness (filler/rambling flagged).

**Acceptance criteria:** feedback references specific lines from the transcript, not generic advice ("be more concise" tied to the actual answer that was too long).

### 6.6 Resume, LinkedIn, GitHub & Project Analysis

- **Resume:** PDF/DOCX upload → parsed into {skills[], experience[], education[], projects[]}.
- **GitHub:** OAuth connect → pull repo list, languages used, commit frequency, and run a lightweight code-quality pass on 1–3 selected repos (not the whole account — cost control).
- **LinkedIn:** manual paste/export upload only — no scraping (legal risk, see RULES.md §5).
- All three merge into one ProfileSnapshot (schema in architecture.md §4).

**Acceptance criteria:** if a skill appears in both resume and GitHub activity, it should not be double-counted or contradict itself in the gap report.

### 6.7 Admin Console

- CRUD for TargetRoleProfile (add/edit required skills per role) and the coding-challenge topic bank.
- User management: view accounts, disable/enable, view usage (for credit-based billing, see PROMPT.md).
- Read-only dashboards: signups over time, feature usage by type, LLM cost per feature (ties to metering requirement in RULES.md).

**Acceptance criteria:** an admin can add a brand-new target role and have it usable in gap analysis without a deploy.

### 6.8 Responsive UI

Full feature parity on mobile and desktop — see DESIGN.md §5 for breakpoint behavior.

## 7. Success Metrics

- % of signups who complete a full assessment → roadmap → practice loop within 7 days.
- Roadmap milestone completion rate.
- Self-reported interview confidence before/after mock interview (simple 1–5 in-app survey).
- Free-tier → paid conversion rate (once monetization ships, per PROMPT.md).

## 8. Assumptions & Risks

- LLM output quality depends on prompt design and model choice via OpenRouter — needs the evaluation set referenced in RULES.md §4 before any feature ships.
- LinkedIn scraping has ToS/legal risk — v1 relies on manual import, not automated scraping.
- "Real-time" in feature descriptions means fast/on-demand (<15s), not literal streaming infrastructure.
- GitHub API rate limits apply per connected account — cache repo data, don't re-fetch on every page load.
