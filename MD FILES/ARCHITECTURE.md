# ARCHITECTURE.md — HireReady

## Overview
Single Next.js app. One language (TypeScript). One deploy target (Vercel). No microservices.

## Tech Stack
- Next.js 14+ (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui
- Prisma + SQLite (dev) → Postgres free tier (production)
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

## Data Models (Prisma)
User:    id, name, email(unique), hashedPassword?, createdAt
Resume:  id, userId(FK), fileName, rawText, parsedData(JSON?), analysisResult(JSON?), createdAt, updatedAt
InterviewSession (added Phase 4): id, userId, resumeId, transcript(JSON), score?, createdAt

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
- File uploads: max 5MB, PDF/text only, sanitized filenames
- Auth required (middleware) for all /dashboard and /api routes except /login, /register, /

## Deployment
- Dev: localhost + SQLite (./dev.db)
- Production: Vercel free tier + Postgres free tier
- Env vars in .env.local (gitignored); .env.example is the template