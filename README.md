# CareerPilot

AI job-hunt copilot for career switchers. Upload a resume, target a company, and
CareerPilot turns your actual background into a readiness score, a 12-week roadmap,
mock interviews, coding challenges, a resume builder, and a personal mentor who
knows your data — all grounded in **your** resume, not generic advice.

## Features

- **Resume Analyzer** — upload a PDF; AI parses it into structured sections and
  scores it against ATS patterns.
- **Readiness Score** — a single number from your resume, interview performance,
  and coding attempts, with a trend line.
- **Target Company** — tell it where you want to go; every downstream tool tunes
  its output to that company and role.
- **12-Week Roadmap** — async-generated plan (with progress tracking) built from
  your resume gaps, interview themes, and target role.
- **Mock Interview** — voice or text, question-by-question, with per-answer
  feedback, follow-ups, and a final summary score.
- **Resume Builder** — structured editor with live preview, PDF export, and
  AI "polish" of individual lines.
- **Coding Practice** — generated challenges with hints and pass/fail attempts.
- **Mentor Chat** — an AI mentor that reads your latest data (never changes your
  scores) and answers on-demand questions.
- **GitHub Analysis** — optional read-only review of your public profile.
- **Journey Map** (`/graphify`) — a 3D interactive visual of the whole path.

## Stack

- Next.js 14 (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL on **Neon** (pooled runtime URL + direct URL for `db push`)
- Auth.js (credentials + Google OAuth)
- Zod validation
- A "Brain" LLM layer (`src/lib/llm.ts`) with a provider fallback chain:
  Groq → Gemini → OpenRouter (`:free`) — all server-side only.

> The `graphify` project's dependency & architecture map is maintained in
> `MD FILES/PROJECT_GRAPH.md`; design system in `MD FILES/DESIGN.md`;
> architecture notes in `MD FILES/ARCHITECTURE.md`.

## Prerequisites

- Node 18+ and npm
- A Postgres database. The schema is `provider = "postgresql"` and is wired for
  **Neon** (free tier). You need two connection strings:
  - `DATABASE_URL` — the **pooled** URL (used by runtime queries)
  - `DIRECT_URL` — the **direct** URL (used by `prisma db push` / migrations)
- API keys (set in `.env`): one or more of `GROQ_API_KEY`, `GEMINI_API_KEY`,
  `OPENROUTER_API_KEY` (the chain falls back), plus `GOOGLE_CLIENT_ID`/`SECRET`
  for Google OAuth (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`).

## Getting Started

```bash
npm install

# 1. Copy the template and fill in your credentials
cp .env.example .env

# 2. Create the database tables (uses DIRECT_URL)
npx prisma db push

# 3. Run the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — development server
- `npm run build` — production build (runs lint + typecheck)
- `npm run start` — serve the production build
- `npm run lint` — eslint
- `npx prisma studio` — browse the database
- `npx prisma db push` — sync schema to the database

## Project Structure

```
src/
├── app/            # Pages + API routes (App Router)
│   ├── api/        # Route Handlers (25 routes)
│   ├── dashboard/  # Protected feature pages
│   └── graphify/   # 3D Journey Map
├── components/     # shadcn + custom components
├── lib/            # LLM brain, prompts/, validators/ (zod)
├── server/         # Server-only DB helpers + context
└── middleware.ts   # Auth guard for /dashboard/**
prisma/
└── schema.prisma   # Postgres schema
```

## Security & Operations

- All LLM keys and secrets live in `.env` (gitignored) — never committed.
- `.env.example` is the only tracked env template.
- Auth required for every feature page and every `/api` route (except the
  intentionally public `/api/health`) — checked at both middleware and route level.
- Uploads: PDF/text only, max 5MB, sanitized filenames.
- Health check: `GET /api/health` returns 200/503 without auth.
