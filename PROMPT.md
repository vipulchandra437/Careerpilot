# PROMPT.md — Master Build Prompt for AI Coding Agent

Paste this as the first message to your coding agent once AGENTS.md, MEMORY.md, PRD.md, architecture.md, RULES.md, PHASE.md, and DESIGN.md are all in the project root.

---

You are building a commercial, production-grade AI-assisted career development platform for computer science students, intended for sale — not a demo or classroom project. Before writing any code, read MEMORY.md, PRD.md, architecture.md, DESIGN.md, and RULES.md in this repo — they are the source of truth for scope, data model, tech stack, and constraints, and each has been written with concrete detail (schemas, acceptance criteria, task checklists), not just high-level bullets. Follow PHASE.md's per-phase task checklist as the build order. Do not start a later phase before the current phase's exit criteria are demonstrably met (a passing test, a working screen, a sample output — not "it looks done").

## Project in one sentence

An AI-assisted career platform for CS students — powered by OpenRouter LLMs — that analyzes resume/GitHub/LinkedIn profiles, identifies skill gaps against a target role, generates a personalized roadmap, and lets students practice through AI-generated coding challenges and mock interviews with communication feedback, plus an admin console to manage it all.

## Locked decisions (do not re-litigate — build against them; full detail in MEMORY.md's decisions table)

- **Backend:** FastAPI (Python 3.11+), async throughout.
- **Frontend:** Next.js + Tailwind CSS + shadcn/ui, responsive from the first screen.
- **v1 target buyer:** individual students (B2C, self-serve signup). Architecture stays multi-tenancy-ready (architecture.md §6) but do not build B2B/white-label UI or admin features in v1.
- **Pricing model:** hybrid — a small free tier plus credit packs for coding challenges, mock interviews, and roadmap regeneration (PHASE.md Phase 6). Instrument every LLM call with user ID, feature, model, and token cost from Phase 0 — do not treat metering as something to add later.

## Bar for "production-grade, sellable" — a standard for every phase, not a one-time checklist

- Real error handling and input validation everywhere a user or an LLM response touches the system — never assume a well-formed response from OpenRouter or a clean file from a user upload.
- Every LLM call goes through `backend/ai/orchestrator.py` (architecture.md §5.1, RULES.md §1). No feature service imports the OpenRouter SDK directly — this single rule is what keeps model swaps and cost control possible later.
- Security constraints in RULES.md §2 are absolute: sandboxed code execution, encrypted GitHub tokens never logged, server-side (not frontend-only) admin role checks.
- Every LLM-dependent feature ships with the small evaluation set described in RULES.md §4 before being marked done — this is how you tell "the prompt regressed" from "the output is just different."
- Secrets via environment variables only, `.env` gitignored, verified in Phase 0.

## How to handle ambiguity

- If something is genuinely undecided and blocks progress — and it's not already covered by the locked decisions above or MEMORY.md's decisions table — stop and ask me. Do not silently guess on anything touching data model, security, or pricing.
- If you make an implementation decision not already documented (a specific library choice, a schema addition), add one row to MEMORY.md's "Decisions Locked In" table before moving on.
- Prefer the simplest implementation that meets a phase's exit criteria over a more "impressive" one — this ships faster and is easier for me to review, and PHASE.md's checklists are written to be achievable simply.

## Workflow

- Work one phase at a time, in the exact order in PHASE.md, working through that phase's checklist item by item.
- At the end of each phase: summarize what was built, show how each exit criterion was demonstrated (which test passed, which screen works, what sample output looked like), flag anything you had to assume, and stop for my review before starting the next phase.
- Definition of done for any single feature: matches its user story and acceptance criteria in PRD.md, follows every applicable RULES.md constraint, has the required test/eval coverage (RULES.md §4), and is reachable through the actual screen described in DESIGN.md — not just callable via API.
- Commit at the end of each completed phase task using the format in RULES.md §6 (`[Phase N] short description`), so progress can be rolled back cleanly if a later phase needs a redo.
- If you hit a RULES.md constraint that seems to conflict with a PRD.md requirement, RULES.md wins — flag the conflict to me rather than quietly picking one.

---

Start with Phase 0 from PHASE.md, task by task.
