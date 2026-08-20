# CareerPilot — Complete Project Brain

> Living reference document. Last updated: 2026-08-19. All file paths relative to `D:\major project\careerpilot\`.

---

## 1. Overview

CareerPilot is an AI-powered career readiness platform for CS students. It assesses skills, resumes, coding, interviews, and communication, then builds personalized plans targeting specific companies (Microsoft, Google, Amazon, Meta, etc.).

**Stack:** Next.js 16.3, React 19, Prisma 6.19, NextAuth v5 beta, Tailwind CSS 4, SQLite (dev) / PostgreSQL (prod Docker), Zod 4, OpenRouter (AI), Piston (code execution), Redis (rate limiting in prod).

**Repo:** `github.com/vipulchandra437/Careerpilot` - Branch: `master`

---

## 2. Architecture

```
Browser -> Next.js 16 App Router (React 19 SSR + Client)
           Route Groups: (public) | (student) | (admin)
           API Routes: /api/*

           +-----------+----------------+------------+
           |           |                |            |
     Prisma ORM   OpenRouter       Piston API     Redis
     SQLite/PG    (GPT-4o-mini)    (code exec)   (prod)
```

### Key Paths

| Layer | Location |
|---|---|
| Pages (public) | `src/app/(public)/` - landing, login, register |
| Pages (student) | `src/app/(student)/` - dashboard, profile, resume, coding, interview, mentor, communication, hiring-simulation |
| Pages (admin) | `src/app/(admin)/admin/` - admin dashboard, users |
| API routes | `src/app/api/` - health, csrf, profile, interview, mentor, coding, resume, upload, admin, test |
| Server logic | `src/server/` - ai/, coding/, scoring/, services/ |
| Shared libs | `src/lib/` - api, auth, db, env, logger, metrics, rate-limit, s3, security-logger, audit, utils |
| DB schemas | `prisma/schema.prisma` (SQLite), `prisma/schema.postgres.prisma` (PostgreSQL) |
| Seed data | `prisma/seed.ts` |
| Docker | `Dockerfile`, `docker-compose.yml`, `.dockerignore` |
| CI/CD | `.github/workflows/ci.yml`, `.github/workflows/docker.yml` |
| Tests | `tests/unit/`, `tests/e2e/`, `vitest.config.ts`, `playwright.config.ts` |
| Scripts | `scripts/fetch-leetcode.ts` |

---

## 3. Database Schema (30 models, 14 enums)

### Enums

- **UserRole**: STUDENT, ADMIN
- **ExperienceLevel**: ENTRY, INTERMEDIATE, EXPERIENCED
- **SkillCategory**: PROGRAMMING_LANGUAGE, FRAMEWORK, DATABASE, AI_ML, CLOUD, DEVOPS, TOOL, SOFT_SKILL, OTHER
- **ProficiencyLevel**: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
- **Difficulty**: EASY, MEDIUM, HARD
- **InterviewType**: HR, TECHNICAL, BEHAVIORAL, SYSTEM_DESIGN, AI_ML
- **InterviewStatus**: IN_PROGRESS, COMPLETED, ABORTED
- **GapStatus**: STRONG, GOOD, NEEDS_IMPROVEMENT, MISSING
- **ScoreType**: OVERALL_READINESS, RESUME, CODING, INTERVIEW, COMMUNICATION, GITHUB, LINKEDIN, PROJECTS, SKILL_COVERAGE, COMPANY_READINESS, MOCK_INTERVIEW
- **SubmissionStatus**: PENDING, ACCEPTED, WRONG_ANSWER, COMPILE_ERROR, RUNTIME_ERROR, TIME_LIMIT_EXCEEDED, MEMORY_LIMIT_EXCEEDED, SYSTEM_ERROR
- **Importance**: ESSENTIAL, IMPORTANT, NICE_TO_HAVE
- **RoadmapStatus**: ACTIVE, COMPLETED, ARCHIVED
- **TaskType**: DAILY, WEEKLY, MONTHLY

### Core Models

| Model | Purpose |
|---|---|
| `User` | Auth (credentials + NextAuth v5), role, password reset, GDPR consent |
| `Account` | OAuth provider accounts (NextAuth adapter) |
| `Session` | Session tokens (NextAuth adapter) |
| `VerificationToken` | Email verification |
| `Authenticator` | WebAuthn/passkey support |
| `StudentProfile` | Location, bio, URLs, target company/role, onboarding status |
| `Education` | College, degree, branch, graduation year, CGPA |
| `Skill` | 68 seeded skills across 9 categories |
| `StudentSkill` | Profile-Skill with rating (1-5) and proficiency level |
| `Company` | 10 seeded companies |
| `JobRole` | Roles per company with JSON weights for score computation |
| `CompanySkillRequirement` | Skills required per role with importance + requiredRating |
| `Resume` | Structured JSON content, template, isPrimary flag |
| `ResumeAnalysis` | Scores (overall, ATS, content, keyword, company match), strengths/weaknesses |
| `CodingProblem` | 32 seeded problems (expandable via LeetCode fetcher), test cases, starter code |
| `CodingSubmission` | Per-attempt records with code, status, test results, AI feedback |
| `CodingAssessment` | Best-score tracking per user/problem |
| `Interview` | Type, difficulty, status, score, feedback, linked company/role |
| `InterviewQuestion` | Prompts with order, linked to interview |
| `InterviewAnswer` | Answer text + AI evaluation + score |
| `CommunicationAnalysis` | Transcript, metrics (fluency, clarity, etc.), score, feedback |
| `GitHubAnalysis` | Username, score, profile data, repo analysis |
| `LinkedInAnalysis` | Profile text, score, strengths/weaknesses |
| `Project` | Name, repo URL, tech stack |
| `ProjectAnalysis` | Per-category scores, feedback |
| `SkillGap` | Profile-JobRole-Skill gap with current/required ratings, status, priority |
| `LearningRoadmap` | Duration, tasks (daily/weekly/monthly) |
| `RoadmapTask` | Type, week, title, resources, completion status |
| `CompanyReadiness` | Overall score + JSON breakdown per profile/role |
| `ScoreHistory` | Time-series score tracking by type |
| `CareerReport` | Generated reports per profile/company/role |
| `AuditLog` | Immutable admin action trail (survives user deletion) |
| `MentorConversation` | Persistent mentor chat threads |
| `MentorMessage` | Messages with role (user/assistant/system), token count |
| `CodingStreak` | Current/longest streak, total/easy/medium/hard solved |
| `DailyChallenge` | One problem per day, globally unique date |
| `CodingBookmark` | User-Problem bookmarks |

### Key Relations

```
User 1->1 StudentProfile 1->1 Education
User 1->N CodingSubmission, Interview, CommunicationAnalysis, GitHubAnalysis,
          LinkedInAnalysis, Project, ScoreHistory, CareerReport, MentorConversation
StudentProfile N->N Skill (via StudentSkill)
StudentProfile N->1 Company (target), N->1 JobRole (target)
StudentProfile 1->N SkillGap, LearningRoadmap, CompanyReadiness, Resume
Company 1->N JobRole 1->N CompanySkillRequirement
Resume 1->N ResumeAnalysis
CodingProblem 1->N CodingSubmission, CodingAssessment, DailyChallenge, CodingBookmark
Interview 1->N InterviewQuestion 1->1 InterviewAnswer
MentorConversation 1->N MentorMessage
```

---

## 4. Server-Side Code

### 4.1 AI Provider (`src/server/ai/`)

- **`provider.ts`**: `AIService` class, `AIServiceError`. Routes through OpenRouter. Methods:
  - `generate(messages, options)` - raw text completion
  - `generateStructured(schema, messages)` - Zod-validated JSON output
  - `analyzeResume(text, company?, role?)` - resume scoring
  - `generateInterviewFeedback(type, questions, answers)` - interview evaluation
  - `analyzeCommunication(transcript)` - speaking/fluency analysis
  - `analyzeGitHub(username, profile, repos)` - GitHub scoring
  - `analyzeLinkedIn(profileText)` - LinkedIn scoring
  - `generateInterviewQuestions(type, difficulty, count, context?)` - question generation
- **`index.ts`**: Singleton `aiService`. `isConfigured()` checks `OPENROUTER_API_KEY` presence.

### 4.2 Code Execution (`src/server/coding/`)

- **`executor.ts`**: `executeCode(language, code, testCases, timeLimitMs)`. Supports Python and JavaScript. Uses Piston API (prod) or local subprocess (dev). Returns `{ passed, total, compileError, runtimeError, timedOut, runtimeMs }`.
- **`harness.ts`**: `runCodeSafely(language, code, testCases, opts)`. Anti-spoof: filters `fetch`, `require`, `import`, `eval`, `exec`, `child_process`, `fs`, `process.exit`. Injects `__cp` locals. Enforces output size cap (50KB), time limit, memory limit.

### 4.3 Scoring Engine (`src/server/scoring/`)

- **`score-engine.ts`**: Category scoring weights. `computeCategoryScore()`. `CATEGORY_LABELS`, `readinessBand()`.
- **`readiness.service.ts`**: `computeReadiness(userId)` - aggregates all category scores into overall readiness (0-100). Weighted by role-specific weights from `JobRole.weights` JSON.
- **`company-readiness.service.ts`**: `computeCompanyReadiness(profileId, companyId, jobRoleId)`. `recordScoreHistory()` - writes to `ScoreHistory` table.

### 4.4 Services (`src/server/services/`)

| Service | Key Exports |
|---|---|
| `profile.service.ts` | `getOrCreateProfile(userId)`, `proficiencyFromRating()`, `updateStudentSkills()` |
| `mentor.service.ts` | `mentorReply(message, context, history)` - AI-powered with 15+ topic patterns, deterministic fallback |
| `interview.service.ts` | `generateInterviewQuestions(type, diff, count, context?)`, `interviewTypeLabel()` |
| `resume-content.ts` | `resumeContentSchema`, `resumeToText()`, `deterministicAnalyzeResume()` (fallback when AI down) |
| `communication.service.ts` | `analyzeTranscript(transcript)` - speech rate, filler words, grammar, vocabulary scoring |
| `github.service.ts` | `analyzeGitHubProfile(username)` - fetches public GitHub API, computes score |
| `linkedin.service.ts` | `analyzeLinkedInProfile(profileText)` - AI analysis with deterministic fallback |
| `project.service.ts` | `analyzeProject(name, description, techStack)` - AI analysis with fallback |

### 4.5 Auth (`src/lib/auth.ts`)

NextAuth v5 beta with PrismaAdapter. Credentials provider (email + bcrypt password). JWT strategy. Role refreshed from DB on session callback. `requireUser()`, `getOptionalUser()`, `requireAdmin()` in `src/lib/auth-helpers.ts`.

---

## 5. API Routes

### Public

| Route | Methods | Purpose |
|---|---|---|
| `/api/health` | GET | Health check (DB, execution provider, security status) |
| `/api/csrf` | GET | CSRF token generation |

### Profile

| Route | Methods | Purpose |
|---|---|---|
| `/api/profile` | GET, PUT | Full profile CRUD (skills, education, URLs, onboarding) |

### Assessment Modules

| Route | Methods | Purpose |
|---|---|---|
| `/api/interview` | GET, POST | List interviews, start new interview |
| `/api/mentor/chat` | POST | Stateless mentor chat (uses request history) |
| `/api/mentor/conversations` | GET, POST | List/create persistent mentor conversations |
| `/api/mentor/conversations/[id]/messages` | GET, POST | List messages, send message (with full context) |
| `/api/coding/problems` | GET | Paginated problem list with user submission status |
| `/api/coding/submit` | POST | Submit solution (hidden tests, streak update, AI feedback) |
| `/api/coding/run` | POST | Run against visible tests (no persist) |
| `/api/coding/daily-challenge` | GET | Today's daily challenge |
| `/api/coding/stats` | GET | Streak, acceptance rate, recent submissions |
| `/api/resume/analyze` | POST | Upload PDF/DOCX or JSON content then AI analysis |
| `/api/upload/presign` | POST | S3 presigned upload URL generation |

### Admin

| Route | Methods | Purpose |
|---|---|---|
| `/api/admin/users` | GET | List users |
| `/api/admin/users/[id]` | PATCH, DELETE | Change role, delete user |

### Test

| Route | Methods | Purpose |
|---|---|---|
| `/api/test/firewall` | GET, POST, PUT, DELETE, PATCH | Firewall/CSRF testing endpoint |

---

## 6. Frontend Components

### Route Groups

- **`(public)/`**: Landing page, login, register - no auth required, redirect if already logged in
- **`(student)/`**: Dashboard, profile, resume, coding, interview, mentor, communication, hiring-simulation - all require auth via `requireUser()`
- **`(admin)/admin/`**: Admin dashboard, user management - require admin role

### Key Components

| Component | Lines | Description |
|---|---|---|
| `DashboardContent` | 139 | Readiness score card, category breakdown grid, quick stats |
| `CodingWorkspace` | 565 | Problem list with search/filters, Monaco editor, test runner, streak bar, bookmarks, daily challenge |
| `MentorChat` | 497 | ChatGPT-like UI with conversation sidebar, markdown rendering, typing indicator, persistent conversations |
| `InterviewWorkspace` | 417 | Company/role selector, question cards, answer submission, AI feedback display, history |
| `ProfileForm` | 370 | Multi-section form (personal, education, skills with category grouping, URLs, onboarding) |
| `ResumeAnalyzer` | 297 | File upload (drag-drop), content editor, analysis results with score cards |
| `CommunicationAnalyzer` | 246 | Text input/paste, score display, past analyses list |
| `HiringSimulation` | 145 | 3-stage pipeline (Application -> Coding -> Interview), pass/fail per stage, evidence breakdown |

### UI Primitives

- **`components/ui/`**: shadcn-based components - button, card, dialog, input, label, select, tabs, badge, separator, textarea, toaster/sonner, scroll-area, progress
- **`components/theme-provider.tsx`**: next-themes wrapper (dark/system/light)

---

## 7. Lib Utilities

| File | Purpose |
|---|---|
| `api.ts` | `ApiError`, `apiError()`, `apiOk()`, `parseJson()`, `validate()`, `validateBody()`, `toErrorResponse()` (Prisma error mapping: P2002->409, P2003->409, P2025->404) |
| `auth.ts` | NextAuth v5 config (credentials provider, PrismaAdapter, JWT, role refresh) |
| `auth-helpers.ts` | `requireUser()`, `getOptionalUser()`, `requireAdmin()` |
| `db.ts` | Prisma singleton with global caching |
| `env.ts` | Zod-validated env config with production safety checks |
| `logger.ts` | JSON structured logger with `createLogger(service)`, `.child()` |
| `request-logger.ts` | HTTP request logging helper |
| `security-logger.ts` | Security event logger (login_failed, rate_limit_exceeded, etc.) |
| `audit.ts` | Audit log writer + `clientIp()` helper |
| `rate-limit.ts` | Fixed-window rate limiter with Redis + in-memory fallback, Lua atomic INCR+EXPIRE |
| `metrics.ts` | In-process Prometheus-format metrics (counters, durations, uptime, memory) |
| `s3.ts` | S3 presigned URL generation (native AWS Sig V4) |
| `utils.ts` | `cn()` (clsx+twMerge), `formatDate()`, `formatDateTime()`, `scoreColor()` |
| `admin-helpers.ts` | `getApiAdmin()` - re-verifies admin role from DB |
| `email-verify.ts` | Email verification token generation/verification with bcrypt |

---

## 8. Configuration Files

### `next.config.ts`
- `output: "standalone"` for Docker
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Image optimization (remotePatterns for GitHub avatars, Gravatar)

### `tsconfig.json`
- Strict mode, paths alias `@/*` -> `./src/*`
- `exclude: ["node_modules", "scripts"]` - prevents `scripts/fetch-leetcode.ts` from being compiled

### `docker-compose.yml`
- 4 services: `app` (Next.js), `db` (PostgreSQL 16), `redis` (Redis 7), `piston` (code execution)
- App: memory limit 2GB, `NODE_OPTIONS="--max-old-space-size=1024"`, healthcheck on `127.0.0.1:3000/api/health`
- DB: persistent volume, healthcheck via pg_isready
- Redis: persistent volume, healthcheck via redis-cli ping

### `Dockerfile`
- Multi-stage: builder (deps + build) -> runner (standalone output)
- Copies `.next/static` and `public` into `.next/standalone/`
- Sets `HOSTNAME=0.0.0.0`, `PORT=3000`
- Runs as non-root `node` user
- Swaps SQLite schema -> PostgreSQL schema during build

### `.dockerignore`
- Excludes `node_modules`, `.next`, `.git`, `prisma/schema.prisma`, `prisma/migrations`

### CI/CD (`.github/workflows/`)
- `ci.yml`: Lint, typecheck, unit tests, E2E tests, Docker build
- `docker.yml`: Docker image build and push

---

## 9. Environment Variables

```bash
# Database
DATABASE_URL="file:./dev.db"           # SQLite (dev)
DATABASE_URL="postgresql://..."        # PostgreSQL (Docker prod)

# Auth
AUTH_SECRET="generate-a-long-random-secret"
AUTH_TRUST_HOST="true"                 # Required behind proxy

# AI
OPENROUTER_API_KEY=""
OPENROUTER_MODEL="openai/gpt-4o-mini"
AI_MAX_TOKENS=2000

# Code Execution
EXECUTION_PROVIDER="local"             # or "piston"
PISTON_API_URL="http://piston:2000"

# Redis (Docker prod)
REDIS_URL="redis://redis:6379"

# Rate Limiting
RATE_LIMIT_ENABLED="true"

# S3 (optional)
S3_BUCKET=""
S3_REGION=""
S3_ENDPOINT=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""

# Production
NODE_ENV="production"
POSTGRES_PASSWORD="change-me"
```

---

## 10. Seed Data (`prisma/seed.ts`)

- **68 skills** across 9 categories (programming languages, frameworks, databases, AI/ML, cloud, devOps, tools, soft skills, other)
- **32 coding problems** (Easy/Medium/Hard) with test cases and starter code - expandable via `scripts/fetch-leetcode.ts` (3,081 LeetCode problems available)
- **10 companies** with job roles and skill requirements:
  - Microsoft (SWE, AI Engineer, PM)
  - Google (SWE, SRE, Data Engineer)
  - Amazon (SDE, Solutions Architect, DevOps)
  - Meta (SWE, ML Engineer, Security Engineer)
  - Apple (SWE, iOS Engineer, ML Engineer)
  - Netflix (SWE, Data Engineer, Security)
  - Salesforce (SWE, Admin, Architect)
  - Adobe (SWE, Designer, ML Engineer)
  - Uber (SWE, ML Engineer, Platform)
  - Databricks (SWE, ML Engineer, Data)
- **Admin user**: admin@careerpilot.dev / admin123
- **Demo student**: student@careerpilot.dev / student123

---

## 11. Testing

### Unit Tests (`tests/unit/`)
- Run: `npm test` (vitest)
- Coverage: `npm run test:coverage`
- Files: `api-helpers.test.ts`, `auth-helpers.test.ts`, `env.test.ts`, `errors.test.ts`, `metrics.test.ts`, `rate-limit.test.ts`, `security-logger.test.ts`, `s3.test.ts`, `utils.test.ts`

### E2E Tests (`tests/e2e/`)
- Run: `npm run test:e2e` (Playwright)
- Install browsers: `npm run test:e2e:install`
- Config: `playwright.config.ts` (baseURL: `http://localhost:3000`)

---

## 12. Key Patterns and Conventions

### API Route Pattern
```typescript
export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();  // BEFORE try/catch (may redirect)
  try {
    const data = await validateBody(request, schema);
    // ... business logic ...
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);  // Maps ApiError, Prisma errors, generic
  }
}
```

### Error Handling
- `ApiError(status, message)` for expected errors
- `toErrorResponse()` handles: ApiError -> status/message, Prisma P2002 -> 409, P2003 -> 409, P2025 -> 404, generic -> 500 with requestId
- AI failures fall back to deterministic scoring

### Auth Pattern
- Server components: `const user = await requireUser()` (throws redirect if unauthenticated)
- API routes: Same, called before try/catch
- Admin: `const admin = await requireAdmin()` / `getApiAdmin()` (re-verifies role from DB)

### Validation
- Zod schemas for all API inputs
- `validateBody(request, schema)` - parse + validate in one step
- `validateParams(schema, params)` for dynamic routes

### AI Fallback Pattern
```typescript
async function analyzeWithFallback(...) {
  if (aiService.isConfigured()) {
    try { return await aiService.analyze(...); }
    catch (err) {
      if (err instanceof AIServiceError) logger.warn(...);
      else throw err;
    }
  }
  return deterministicFallback(...);
}
```

---

## 13. Docker Deployment

### Quick Start
```bash
cp .env.example .env
# Edit .env with real secrets
docker compose up -d
# First time only:
docker compose exec app npx tsx prisma/seed.ts
```

### Services

| Service | Image | Port | Health |
|---|---|---|---|
| app | Custom (Dockerfile) | 3000 | HTTP /api/health |
| db | postgres:16-alpine | 5432 | pg_isready |
| redis | redis:7-alpine | 6379 | redis-cli ping |
| piston | ghcr.io/engineer-man/piston | 2000 | HTTP /runtimes |

### Build Notes
- Dockerfile swaps `schema.postgres.prisma` -> `schema.prisma` and `migrations-postgres/` -> `migrations/` before build
- Standalone output: `.next/standalone/server.js` is the entrypoint
- Memory: 2GB limit, 1GB Node heap
- Healthcheck uses `127.0.0.1` (not `localhost`) to avoid IPv6 issues

---

## 14. Security Features

- **CSRF Protection**: `/api/csrf` generates tokens stored in httpOnly cookies
- **Rate Limiting**: Redis-backed (prod) or in-memory (dev), configurable via `RATE_LIMIT_ENABLED`
- **Security Middleware**: Bot detection, suspicious activity tracking
- **Security Logger**: Tracks login failures, rate limit violations, suspicious patterns
- **Audit Trail**: Immutable `AuditLog` table for admin actions (survives user deletion)
- **Password Policy**: Min 8 chars, must contain letter + number
- **Input Validation**: Zod schemas on all API inputs
- **Code Execution Sandbox**: Piston container (prod) or restricted subprocess (dev), anti-spoof filtering, output size cap
- **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

---

## 15. LeetCode Fetcher (`scripts/fetch-leetcode.ts`)

- **Output**: `prisma/leetcode-problems.json` (cache) + `prisma/leetcode-seed.ts` (generated seed fragment)
- **Stats**: 3,081 free problems (798 Easy, 1,919 Medium, 894 Hard)
- **Run**: `npx tsx scripts/fetch-leetcode.ts`
- **Integration**: After fetching, replace 32 hand-crafted problems in `prisma/seed.ts` with LeetCode data

---

## 16. Git History (Recent)

| Commit | Description |
|---|---|
| `80ca58f` | Audit fixes: 48 files, +959/-373 - harness async/anti-spoof, proxy trust, admin DB re-verification, GitHub error handling, resume fallback, scoring guards, env placeholder detection, Docker port binding, local executor fail-closed, register passwordSchema, Prisma error mapping, audio limits, profile PATCH semantics |
| `ecd32dc` | Project report: `PROJECT_REPORT.md` - 920 lines |
| `25ea144` | Commercial-readiness: password reset, email verification, GDPR consent, structured logging, CI/CD, presigned URL uploads, enhanced admin analytics |
| `75df17d` | LeetCode + mentor + firewall + cleanup: 32 problems, streak/daily-challenge/bookmarks, persistent mentor conversations, security middleware, console->logger migration |

---

## 17. Current State and Known Issues

### Working
- Docker stack fully healthy (app, db, redis, piston)
- Standalone Next.js server running in Docker
- Health endpoint returns 200 at `:3000/api/health`
- All 37 unit tests passing
- All 13 E2E tests passing
- Local dev server on `:3100`

### Pending
- LeetCode fetcher script written but not yet run (3,081 problems)
- After fetching, must integrate into `prisma/seed.ts`
- Deployment to VPS still deferred

### Known Constraints
- Two Prisma schema files (SQLite dev / PostgreSQL prod) must be kept in sync manually
- `scripts/fetch-leetcode.ts` excluded from TS compilation - must run with `npx tsx`
- NextAuth v5 beta - may have breaking changes
- OpenRouter API key required for AI features
- Piston code execution requires the public emkc.org API token since Feb 2026 (or self-hosted)

---

## 18. File Tree Summary

```
careerpilot/
  brain.md                            # This file
  PROJECT_REPORT.md                   # 920-line comprehensive report
  package.json                        # Dependencies and scripts
  tsconfig.json                       # TypeScript config (strict, paths)
  next.config.ts                      # Next.js config (standalone, security headers)
  Dockerfile                          # Multi-stage Docker build
  docker-compose.yml                  # 4-service stack
  .dockerignore
  start.sh                            # Local dev start script
  vitest.config.ts                    # Unit test config
  playwright.config.ts                # E2E test config
  .env.example                        # Environment template
  .github/workflows/
    ci.yml                            # Lint, test, build
    docker.yml                        # Docker build and push
  prisma/
    schema.prisma                     # SQLite schema (30 models)
    schema.postgres.prisma            # PostgreSQL variant
    seed.ts                           # Seed data (68 skills, 32 problems, 10 companies)
    dev.db                            # SQLite dev database
    migrations/                       # SQLite migrations
    migrations-postgres/              # PostgreSQL migrations
  scripts/
    fetch-leetcode.ts                 # LeetCode problem fetcher
  src/
    app/
      layout.tsx                      # Root layout (ThemeProvider, Toaster)
      globals.css
      (public)/                       # Landing, login, register
        page.tsx                      # Landing page
        login/page.tsx
        register/page.tsx
      (student)/                      # Auth-required pages
        dashboard/page.tsx            # Readiness overview
        profile/page.tsx              # Skill/education management
        resume/page.tsx               # Resume upload and analysis
        coding/page.tsx               # LeetCode-style editor
        interview/page.tsx            # Mock interviews
        mentor/page.tsx               # AI career mentor
        communication/page.tsx        # Speaking analysis
        hiring-simulation/page.tsx    # Pipeline simulation
      (admin)/admin/                  # Admin pages
        admin/page.tsx
        admin/users/page.tsx
      api/
        health/route.ts
        csrf/route.ts
        profile/route.ts
        interview/route.ts
        mentor/
          chat/route.ts
          conversations/
            route.ts
            [id]/messages/route.ts
        coding/
          problems/route.ts
          submit/route.ts
          run/route.ts
          daily-challenge/route.ts
          stats/route.ts
        resume/analyze/route.ts
        upload/presign/route.ts
        admin/
          users/route.ts
          users/[id]/route.ts
        test/firewall/route.ts
    components/
      ui/                             # shadcn primitives
      theme-provider.tsx
      auth/                           # login-form, register-form
      dashboard/dashboard-content.tsx
      profile/profile-form.tsx
      resume/resume-analyzer.tsx
      coding/coding-workspace.tsx
      interview/interview-workspace.tsx
      mentor/mentor-chat.tsx
      communication/communication-analyzer.tsx
      hiring-simulation/hiring-simulation.tsx
    lib/
      api.ts, auth.ts, auth-helpers.ts, db.ts, env.ts
      logger.ts, request-logger.ts, security-logger.ts
      audit.ts, metrics.ts, rate-limit.ts
      s3.ts, utils.ts, admin-helpers.ts, email-verify.ts
    server/
      ai/
        index.ts                      # AI service singleton
        provider.ts                   # OpenRouter integration
      coding/
        executor.ts                   # Code execution (Piston/local)
        harness.ts                    # Safe execution with anti-spoof
      scoring/
        readiness.service.ts          # Overall readiness computation
        score-engine.ts               # Category scoring logic
        company-readiness.service.ts
      services/
        profile.service.ts
        mentor.service.ts
        interview.service.ts
        resume-content.ts
        communication.service.ts
        github.service.ts
        linkedin.service.ts
        project.service.ts
  tests/
    unit/                             # 9 vitest test files
    e2e/                              # Playwright E2E tests
```
