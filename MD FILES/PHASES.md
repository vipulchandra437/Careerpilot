# PHASES.md — CareerPilot Build Phases

## Rule: Finish Phase N completely before opening N+1.

## PHASE 1 — Foundation (accounts + resume pipeline)
BUILD: Next.js skeleton, Auth.js, Prisma (User, Resume), landing/login/register,
dashboard, resume upload (PDF/text, 5MB max), LLM parse to JSON, resume detail view.
DONE WHEN: signup → upload resume → see parsed JSON displayed cleanly.

## PHASE 2 — Resume Analysis Intelligence
ADD: analysis endpoint (strengths, weaknesses + fixes, missing sections,
ATS score 0-100, section feedback). New prompt file: resumeAnalysis.ts.
DONE WHEN: a stranger's resume gets genuinely useful, specific advice.

## PHASE 3 — Resume Builder
ADD: structured form editor (education/skills/projects/experience) → live preview
→ PDF export via react-pdf or similar. Templates: classic + modern (Phase 7 polish).
DONE WHEN: user fills forms → downloads polished PDF.

## PHASE 4 — Mock Interviewer (crown jewel)
4a TEXT: interview session (new model: InterviewSession), questions generated FROM
parsed resume, answer → evaluate → follow-up, end summary with per-answer feedback.
4b VOICE: Web Speech API (SpeechRecognition + speechSynthesis). Browser-native, free.
DONE WHEN: a 10-question interview completes with per-answer feedback.

## PHASE 4.5 — Readiness Scoreboard
COMBINE: resume score + interview performance → one Hire Readiness Score (0-100)
with breakdown per area and top-3 action items.

## PHASE 5 — Target Company + Profile Extras
- Target company picker → interview style adapts to that company
- GitHub analysis (public API — repo quality, activity)
- LinkedIn: manual profile export first (API is restrictive)
- Coding tests: sandboxed JS execution (isolated runner, timeout, no fs/net)

## PHASE 6 — Roadmap + Mentor Bot
- Roadmap generator: weaknesses → 12-week study plan (weekly goals)
- Mentor chatbot: context-aware (knows resume, scores, roadmap)
- Shareable progress card ("Readiness 74→91")

**STATUS: DEPLOYED — live at https://hireready-beige.vercel.app (production).**
Phase 6 code (roadmap + mentor) is complete and verified. The full deployment is
EXECUTED and verified: `prisma/schema.prisma` is `provider="postgresql"` with
`directUrl`, `.env` holds the pooled `DATABASE_URL` + direct `DIRECT_URL`,
`prisma db push` succeeded against the real Neon project, Vercel project `hireready`
is linked and live (production alias `hireready-beige`), all env vars set, and a
final production smoke passed: health 200, register 201, login 200, `/dashboard` and
all feature pages 200 (incl. `/dashboard/resume/[id]` after a real TXT upload).
Known remaining production risks: Google OAuth keys not configured (register/login
use email+password only) and the shared dev Neon branch (prod branch recommended
before real users). LLM features verified end-to-end on prod (2026-09-09).

## PHASE 7 — Deploy + First Users
Deploy Vercel → real database → invite first 10 students → collect feedback →
fix what breaks → weekly iteration.

**STATUS: LIVE — deployed to Vercel production (`https://hireready-beige.vercel.app`)
on 2026-09-09. Database is live on Neon. All features (incl. full LLM matrix) verified
on prod. Remaining for first users: Google OAuth prod callback (+ keys), separate prod
Neon branch, then invite the first students.**