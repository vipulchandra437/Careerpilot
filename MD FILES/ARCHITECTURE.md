# ARCHITECTURE.md — CareerPilot

## Overview
Single Next.js app. One language (TypeScript). One deploy target (Vercel). No microservices.

## Tech Stack
- Next.js 14+ (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui
- Prisma + Postgres on **Neon** (free tier) — dev AND prod share the same database engine
- Auth.js (credentials + Google OAuth)
- Zod for all input validation

## Directory Structure
src/
├── app/                  # Pages & API routes (App Router)
│   ├── page.tsx          # Landing
│   ├── login/ register/
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── resume/[id]/
│   └── api/
│       ├── resume/upload/     # POST: parse PDF, save
│       └── resume/[id]/parse/ # POST: LLM analysis
├── components/           # UI components (shadcn + custom)
├── lib/
│   ├── llm.ts            # Brain: provider fallback chain
│   ├── prompts/          # All LLM prompt templates live HERE (one file per feature)
│   └── validators/       # Zod schemas
├── server/               # DB access helpers, server-only logic
└── middleware.ts         # Auth protection

## Database (Postgres via Neon)

**Why Neon (not local Postgres):** this machine has no Docker/Postgres, and Neon is the zero-cost serverless Postgres with a built-in pooler endpoint that Vercel serverless functions should use (`...-pooler.` connection string). It needs no local install — dev and prod point at the same kind of database via separate connection strings.

- **Runtime queries use the pooled URL** (`DATABASE_URL`) — required for serverless to multiplex connections.
- **db push / migrations use the direct URL** (`DIRECT_URL`) — bypasses the pool for session/DDL commands. If `DIRECT_URL` is unset, Prisma falls back to `DATABASE_URL` with a warning (fine for a demo-size app).
- **Dev workflow:** one Neon project, two branches — `main` (prod) and a `dev` branch. Point local `.env` at the `dev` branch's pooled URL, run `npx prisma db push`, done. Same engine as prod, so nothing behaves differently after deploy.
- **Alternative (if you later want a local Postgres):** `docker compose up -d` hosting `postgres:16` and point `.env` at `localhost:5432`. Schema and tooling are identical — the choice is only about where Postgres runs.
- Schema is `provider = "postgresql"` (see the WHY in `prisma/schema.prisma`). There are no Prisma enums and no SQLite-only types anywhere, so the model set is fully portable.

## Data Models (Prisma)
User: id, name, email(unique), hashedPassword?, createdAt
Resume: id, userId(FK), fileName, rawText, parsedData(JSON?), analysisResult(JSON?), createdAt, updatedAt
BuilderResume: id, userId(FK), title, content(JSON), createdAt, updatedAt
InterviewSession: id, userId(FK), resumeId?, mode, status, transcript(JSON), finalScore?, summary?, questionCount, createdAt, updatedAt
TargetCompany: id, userId(FK), companyName, role, notes?, active, createdAt, updatedAt
PracticeAttempt: id, userId(FK), challengeTitle, passed, createdAt
Roadmap (Phase 6a): id, userId(FK), content(JSON), completedIdx(JSON), status ("pending"|"ready"|"failed"), attemptStartedAt?, failedAttempts, createdAt, updatedAt
MentorConversation (Phase 6a): id, userId(FK), messages(JSON), createdAt, updatedAt

## LLM Architecture — "The Brain"
- Single server-side module: src/lib/llm.ts
- export askBrain(prompt, systemPrompt) → tries providers in order:
  1. Groq  (fast — interview conversation)
  2. Gemini (long context — resume documents)
  3. OpenRouter `:free` (emergency backup)
- All use OpenAI-compatible chat completions via fetch (no SDKs)
- NEVER call from client components — API keys stay server-side
- Retry-with-backoff on 429; friendly error on final failure

## Security Rules
- All LLM calls server-side only
- Zod-validate every API input
- Auth required for every page: middleware redirects all `/dashboard/**` to `/login`
- Every `/api` route self-checks via `getServerSession` (defense in depth) — except `/api/health`, which is intentionally public
- File uploads: max 5MB, PDF/text only, sanitized filenames

## Deployment
- Dev: local `next dev` + Postgres (Neon dev branch). Same engine as production.
- Production: Vercel (Hobby) + Postgres (Neon free tier)
- Env vars set ONLY in the Vercel dashboard (never in the repo); `.env.example` is the tracked template
- **Serverless timeout / long LLM tasks:** Vercel Hobby caps a function at 60s, but roadmap regeneration can take ~90s. So generation is *async-with-polling*: `POST /api/roadmap` marks the row `pending` and returns 202; the client polls `GET` every 4s, and the GET lazily runs the LLM call *inside* the poll (claimed via `attemptStartedAt`, capped at 3 failed attempts). `export const maxDuration = 60` caps that GET. No external queue needed. (See the WHY comments in `prisma/schema.prisma` and `src/app/api/roadmap/route.ts`.)
- `pdf-parse` (resume upload) is externalized from the webpack bundle (`next.config.mjs`) so Vercel's Node runtime loads it via `require` — this avoids the classic `@napi-rs/canvas` serverless build breakage.
- `/api/health` is public (no auth) so uptime monitors can ping it; every other `/api` route self-checks auth via `getServerSession`.
- Rollback: Vercel instant rollback to the previous production deployment. DB stays forward-compatible (db push adds columns, never destructive) so a rollback never blocks on schema.