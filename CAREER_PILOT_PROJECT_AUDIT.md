# CareerPilot Project Audit

A beginner-friendly overview of the CareerPilot codebase — what it is, how it's
built, what works, what's dead weight, and what you should pay attention to.


---

## TL;DR — At a Glance

| What | Finding |
|---|---|
| **What it is** | AI "career prep copilot" — resume analysis, mock interviews, coding challenges, readiness score, 12-week roadmap, mentor chatbot. |
| **Architecture** | Two apps: a **Next.js 14 backend** (`src/`) owning API routes + auth + DB, and a **Vite + TanStack Start frontend** (`frontend/`) owning the user UI. |
| **Live in production** | Yes — `https://hireready-beige.vercel.app` (deployed 2026-09-09, verified). |
| **Auth system** | **NextAuth v4** — credentials + Google OAuth, JWT strategy, 30-day sessions. |
| **Dead code surprise** | `better-auth` is installed in `frontend/package.json` but **never used**. All 54 code-search hits are in `frontend/.grok/` docs only. |
| **Tests** | None in the real app (`src/`). |
| **Secrets** | `.env`/`.env.local` contain real credentials but are gitignored (correct). |
| **Git state** | Only `graphify-out/` artifacts untracked — no app code changes. |

---

## 1. High-Level Architecture

The repository contains **two separate applications:**

- **`src/`** — Next.js 14 App Router backend (API server, auth, database, LLM).
  Stripped to backend-only. `src/app/layout.tsx` explicitly comments:
  *"Minimal root layout — the actual UI comes from the frontend"* and
  *"In production, this will be rewritten to the frontend's index.html."*
  No dashboard/login/register pages in `src/app/`.

- **`frontend/`** — Vite + TanStack Start SPA (the real user UI). Uses
  `@tanstack/react-start/plugin/vite` and `@tanstack/react-router`. Builds to
  static files served by Next.js at `/frontend/dist/*` in production.

### Production build chain (root `package.json`)
```
npm run dev            → next dev (backend on :3000)
npm run dev:frontend   → cd frontend && npm run dev (frontend on :8080)
npm run dev:all        → both via concurrently
npm run build          → build:frontend → sync → next build
npm start              → next start
```

### The 7 frontend routes (`frontend/src/routes/`)
1. **`mentor.tsx`** — AI mentor chatbot
2. **`resume.tsx`** — resume upload + analysis dashboard
3. **`coding.tsx`** — coding practice (client-side JS sandbox)
4. **`interview.tsx`** — mock interviewer (text + voice via Web Speech API)
5. **`roadmap.tsx`** — 12-week career roadmap
6. **`companies.tsx`** — target company picker
7. **`profile.tsx`** — user profile and settings

---

## 2. Authentication — NextAuth v4 (NOT Better Auth)

Every part of the live app uses **NextAuth v4** (imported as `next-auth`):

**Backend** (`src/`):
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
- `src/lib/auth.ts` — `authOptions`: JWT strategy, 30-day sessions,
  Credentials + Google OAuth providers, `tokenVersion` revocation,
  `signIn` callback upserts Google users
- `src/lib/login-throttle.ts` — DB-backed rate limiting (5 fails / 15 min)
- `src/server/session-revoke.ts` — `tokenVersion` bump (kill switch)

**Middleware** (`src/middleware.ts`):
- Uses `getToken` from `next-auth/jwt`
- Matches only `/dashboard` and `/dashboard/:path*` (exact paths, not prefix)
- Redirects unauth'd users to `/login?callbackUrl=...`
- In production, denies all dashboard traffic if `NEXTAUTH_SECRET` missing

**Frontend** (`frontend/`):
- `frontend/src/lib/api.ts` — calls `/api/auth/csrf`,
  `/api/auth/callback/credentials`, `/api/auth/session`
- `frontend/src/lib/session.tsx` — `SessionProvider` calls `getSession()` (NextAuth)
- `frontend/src/lib/session-context.ts`:
  > *"Session state backed by the REAL NextAuth session. A full auth framework
  > is unnecessary when NextAuth already owns the cookies."*
- `frontend/src/components/app-shell.tsx` — uses `useNextSession()` (NextAuth)

### Security measures
- Middleware blocks `/dashboard/**` before any page renders (primary guard)
- Every `/api` route self-checks via `getServerSession` (defense in depth)
  — except `/api/health` which is intentionally public
- Login form never reveals whether an email exists
- `LOCKOUT_PREFIX` constant in `src/lib/auth-errors.ts` (shared between layers)

---

## 3. Database (Prisma + PostgreSQL on Neon)

### 9 models (`prisma/schema.prisma`), all PostgreSQL

| Model | Key fields | Purpose |
|---|---|---|
| **User** | `id`, `email` (unique), `hashedPassword?`, `tokenVersion` (default 0) | Auth users; `tokenVersion` = JWT revocation kill switch |
| **Resume** | `id`, `userId`, `fileName`, `rawText`, `parsedData?` (JSON), `analysisResult?` (JSON) | Uploaded resume + LLM outputs |
| **BuilderResume** | `id`, `userId`, `title`, `content` (JSON) | Structured resume builder data |
| **InterviewSession** | `id`, `userId`, `resumeId?`, `mode`, `status`, `transcript` (JSON), `finalScore?`, `summary?`, `questionCount` | Mock interview state + transcript |
| **TargetCompany** | `id`, `userId`, `companyName`, `role`, `notes?`, `active` | Job target; drives company-tailored outputs |
| **PracticeAttempt** | `id`, `userId`, `challengeTitle`, `passed` | Pass/fail tracking (lightweight) |
| **Roadmap** | `id`, `userId`, `content` (JSON), `completedIdx` (JSON), `status`, `attemptStartedAt?`, `failedAttempts` | 12-week plan with async generation |
| **MentorConversation** | `id`, `userId`, `messages` (JSON, default `[]`) | Chat history with AI mentor |
| **LoginThrottle** | `email` (PK), `failedCount`, `windowStart`, `lockedUntil?` | DB-backed rate limiting |

### Key design decisions
- **Neon PostgreSQL** — Vercel serverless needs pooled connection (`DATABASE_URL`)
- **Async roadmap generation** — `POST /api/roadmap` marks "pending" + returns;
  `GET` acts as lazy worker (60s cap, 3-attempt retry, `attemptStartedAt` claim)
- **`LoginThrottle`** is DB-backed because Vercel serverless instances have
  separate memory (in-memory counters won't work across instances)
- **`binaryTargets`** include Windows + Linux to prevent Lambda engine errors

---

## 4. API Routes — 22 Route Handlers

All under `src/app/api/`:

| Route | Method | Function |
|---|---|---|
| `/api/health` | GET | Public health check (`SELECT 1`) |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth v4 handler |
| `/api/register` | POST | User registration (bcrypt, `registerApiSchema`) |
| `/api/resume` | GET | List user's resumes |
| `/api/resume/upload` | POST | Upload PDF/TXT (max 5MB, pdf-parse) |
| `/api/resume/[id]` | GET/PATCH/DELETE | Resume CRUD |
| `/api/resume/[id]/parse` | POST | LLM parse → structured JSON |
| `/api/resume/[id]/analyze` | POST | LLM analysis → ATS score + feedback |
| `/api/interview` | POST | Start an interview session |
| `/api/interview/[id]` | GET | Get interview session state |
| `/api/interview/[id]/answer` | POST | Submit answer → LLM eval + follow-up |
| `/api/interview/[id]/finish` | POST | End → final summary score |
| `/api/mentor` | GET/POST | Mentor chatbot (reads snapshot, no mutations) |
| `/api/roadmap` | GET/POST/PATCH | Async roadmap generation + progress |
| `/api/practice/challenge` | POST | Generate coding challenge (LLM) |
| `/api/practice/hint` | POST | Get a hint for a challenge (LLM) |
| `/api/practice/attempt` | POST | Record pass/fail attempt |
| `/api/target` | POST | Set/clear target company |
| `/api/github` | POST | Analyze GitHub profile (public API, 24h cache) |
| `/api/readiness` | GET | Compute 0–100 readiness score (deterministic) |
| `/api/builder/[id]` | GET/PATCH | Builder resume CRUD |
| `/api/builder/seed` | POST | Seed builder content |
| `/api/builder/polish` | POST | AI polish of resume lines |

### The LLM "Brain" (`src/lib/llm.ts`)
- **Protected by `import "server-only"`** — build fails if any client imports it
- Provider fallback chain: **Groq → Gemini → OpenRouter `:free`**
- Retry on HTTP 429 with 2s backoff
- Logs every call (provider name + purpose only; never API keys or prompts)

### Prompt templates (`src/lib/prompts/`)
10 files, one per feature: `resumeParse.ts`, `resumeAnalysis.ts`, `mentor.ts`,
`interviewQuestions.ts`, `interviewEval.ts`, `interviewFinish.ts`,
`challengeGen.ts`, `roadmapGen.ts`, `builderPolish.ts`, `githubAnalysis.ts`

---

## 5. The Better Auth Dead Code Problem

> **Severity: Medium** — installed dependency + ~2,500 lines of scaffolding that
> is never used. Not a security risk *today*, but confusing for anyone reading
> the code.

### What exists

**`frontend/package.json`** (line 54): `"better-auth": "~1.6.30"`

**`frontend/src/lib/auth/`** — 7 files of Better Auth scaffolding:

| File | Contains | Used? |
|---|---|---|
| `client.ts` | `createAuthClient` from `better-auth/react` | ❌ Never imported |
| `server.ts` | `betterAuth(...)` instance with PGLite dialect | ❌ Never used |
| `provider.tsx` | `AuthProvider` — a **no-op passthrough** | ⚠️ Imported but does nothing |
| `providers.ts` | `GROK_PROVIDERS` array (Google, X) | ❌ Never imported in real code |
| `middleware.ts` | Bearer-token middleware | ❌ Never used |
| `use-current-user.ts` | `useCurrentUser()` hook | ❌ Never called |
| `sign-in-gate.ts` | `requireUserId` wrapper | ❌ Never used |

### What's actually used instead

The only import from `@/lib/auth/` is `AuthProvider` in
`frontend/src/routes/__root.tsx`:
```tsx
import { AuthProvider } from "@/lib/auth/provider";
```
But `AuthProvider` is a **complete no-op** — its docblock says:
> *"Better Auth's React client needs NO context provider — this is a passthrough
> today."*

The real auth flow uses NextAuth v4 via `SessionProvider` (calls
`/api/auth/session`) and `AppShell` (uses `useNextSession()`).

### Why the confusion?

The `frontend/` directory is **Grok app-builder template scaffolding**. The
Grok template ships with a full Better Auth + PGLite + Nitro stack designed to
be removed when the project adopts a real backend. Here the real backend is
Next.js using NextAuth, so the entire `frontend/src/lib/auth/` tree is
template leftovers.

### Verification

Codebase search for all Better Auth patterns returned **zero matches in actual
source code** — all 54 hits exist **only** in `frontend/.grok/` (template
documentation), excluded from the real import graph.

**Recommendation:** Remove `better-auth` from `frontend/package.json` and
delete `frontend/src/lib/auth/` (update `__root.tsx` to inline the no-op
provider or drop it).

---

## 6. Environment & Secrets

### `.env` (gitignored, local dev)
Contains real credentials:
```
DATABASE_URL="postgresql://neondb_owner:...@ep-winter-salad-...pooler.../neondb"
DIRECT_URL="postgresql://neondb_owner:...@ep-winter-salad-.../neondb"
NEXTAUTH_SECRET=SGdBRLxSnPG4AvfBjp/DX8ksNQJN142e6r4/abgTJmI=
GROQ_API_KEY=gsk_...       ← real Groq key
GEMINI_API_KEY=AQ.Ab8...   ← real Google Gemini key
OPENROUTER_API_KEY=sk-or-v1-...  ← real OpenRouter key
GOOGLE_CLIENT_ID=          ← empty (not configured locally)
GOOGLE_CLIENT_SECRET=      ← empty
```

### `.env.local` (gitignored)
Contains a Vercel OIDC token (auto-generated, short-lived JWT).

### `.env.example` (tracked)
All values empty placeholders — the correct template to copy and fill.

### Verdict
**Good hygiene.** Both `.env` and `.env.local` are gitignored and NOT tracked
by git (confirmed via `git ls-files`). `NEXTAUTH_SECRET` was rotated 2026-09-09.

> **Caution:** Local `.env` has **live credentials**. Anyone with filesystem
> access has full access to prod DB + LLM APIs. Rotate if this machine is shared.

---

## 7. Tests

**Zero tests exist in the real application.**

- No `*.test.ts` or `*.test.tsx` files anywhere in `src/`.
- The only test file is `frontend/src/app-data/app-data.test.ts` — Grok
  template scaffolding, not Careerpilot logic.
- `frontend/scripts/` has 12 `.test.mjs` files — all Grok template tooling tests.

### What's used instead
- TypeScript strict mode — `npx tsc --noEmit` = 0 errors
- ESLint — `npm run lint` = clean
- Production smoke testing via Reticle (browser automation)
- Manual verification documented in `MEMORY.md`

---

## 8. Documentation (`MD FILES/`)

Seven well-maintained files serve as the project's source of truth:

| File | Purpose |
|---|---|
| **PRD.md** | Product requirements, user journeys, constraints |
| **ARCHITECTURE.md** | Overview — ⚠️ **stale** (says "single Next.js app") |
| **PROJECT_GRAPH.md** | Full Mermaid architecture — most accurate doc |
| **DESIGN.md** | Design system: colors, typography, components |
| **PHASES.md** | Build phases 1–7; Phase 6b: LIVE |
| **RULES.md** | Security, LLM, and operational rules |
| **MEMORY.md** | Durable session memory, deployment runbook, incidents |

### Staleness note
`README.md` and `ARCHITECTURE.md` describe a "single Next.js app" but the actual
architecture is a **decoupled Next.js backend + Vite frontend** (correctly
documented in `frontend/README.md`).

---

## 9. Deployment

- **Live:** `https://hireready-beige.vercel.app` (deployed 2026-09-09)
- **Build:** `build:frontend` → `build:sync-frontend` → `next build`
- **DB:** Live Neon Postgres; `prisma db push` verified
- **Full LLM matrix tested on prod** — responses 1.7–11s (under 60s limit)

### Known gotchas (from MEMORY.md)
1. **Vercel env values via PowerShell carry UTF-8 BOM** — breaks Edge middleware
2. **Google OAuth keys NOT configured** — email/password only
3. **Vercel caches GETs on API routes** — use POST or cache-busting queries
4. **Shared dev/prod Neon branch** — separate prod branch recommended

---

## 10. Uncommitted Changes (Git Status)

```
 M graphify-out/graph.json                    ← graphify tool regenerated JSON
?? graphify-out/.graphify_analysis.json
?? graphify-out/.graphify_root
?? graphify-out/cache/
?? graphify-out/manifest.json
?? install_log.txt                             ← pip install log for graphifyy
?? src/components/graphify/codebase-graph.json ← graphify tool output
```

**Nothing application-related is uncommitted.** All changes are graphify tool
artifacts from a prior session.

---

## 11. Complete File Structure

### Backend (`src/`)
```
app/
├── layout.tsx                     ← minimal root layout ("UI comes from frontend")
├── robots.ts                      ← SEO
├── (marketing)/hero/page.tsx      ← marketing hero page
└── api/                           ← 22 route handlers (see §4)
lib/
├── auth.ts                        ← NextAuth config (Credentials + Google)
├── auth-errors.ts                 ← LOCKOUT_PREFIX constant
├── login-throttle.ts              ← DB-backed rate limiting
├── llm.ts                         ← "The Brain" (server-only, Groq→Gemini→OpenRouter)
├── company-type.ts, code-runner.ts, speech.ts, readiness.ts, utils.ts
├── prompts/                       ← 10 LLM prompt templates
└── validators/                    ← Zod schemas (10 files)
server/{prisma,readiness-data,session-revoke,student-context,github}.ts
types/next-auth.d.ts               ← Session.user.id augmentation
middleware.ts                      ← auth guard for /dashboard
```

### Frontend (`frontend/`)
```
routes/        ← 7 TanStack Router pages + login/register/dashboard/index
components/    ← app-shell.tsx (uses NextAuth session), score-ring, preview-host
lib/
├── api.ts     ← API client (calls Next.js /api/* via NextAuth cookies)
├── session.tsx     ← SessionProvider (NextAuth-backed)
├── session-context.ts ← useNextSession hook
├── readiness.ts    ← frontend score computation
└── auth/           ← DEAD CODE (Better Auth scaffolding — see §5)
```

---

## 12. Key Takeaways & Recommendations

### ✅ What's done well
1. **Clean auth** — NextAuth v4 with JWT, DB-backed throttling, `tokenVersion`
   revocation, defense-in-depth (middleware + per-route checks)
2. **Server-only LLM isolation** — `import "server-only"` is machine-enforced;
   API keys can never leak to the client
3. **Serverless-friendly async design** — roadmap uses lazy-GET worker pattern
   to stay within Vercel's 60s function timeout
4. **Comprehensive documentation** — `MD FILES/` is thorough with Mermaid diagrams
5. **Production is live and verified** — full LLM matrix tested end-to-end
6. **Secrets properly gitignored** — `.env`/`.env.local` not tracked

### ⚠️ What's stale/misleading
1. **Better Auth is dead code** — installed, scaffolded (~2,500 lines), never used
   **Recommendation:** Remove `better-auth` dep + delete `frontend/src/lib/auth/`
2. **README/ARCHITECTURE.md are stale** — describe "single Next.js app" but
   actual architecture is decoupled backend + Vite frontend
   **Recommendation:** Update both to reflect two-app architecture

### 🔴 What's missing
1. **No tests in `src/`** — zero test files in the real application
2. **No dashboard/login pages in `src/app/`** — they live in `frontend/`
3. **No `src/app/page.tsx`** — landing page deleted; lives in frontend