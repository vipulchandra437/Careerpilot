# CareerPilot - Full Project Report

**AI-Powered Career Development Platform**
**Repository:** github.com/vipulchandra437/Careerpilot
**Branch:** master | **Latest commit:** `80ca58f`
**Date:** August 18, 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [Features & Pages](#5-features--pages)
6. [API Routes](#6-api-routes)
7. [Server Services & Business Logic](#7-server-services--business-logic)
8. [AI Integration](#8-ai-integration)
9. [Code Execution System](#9-code-execution-system)
10. [Scoring & Readiness Engine](#10-scoring--readiness-engine)
11. [Security & Authentication](#11-security--authentication)
12. [Rate Limiting & Middleware](#12-rate-limiting--middleware)
13. [UI Components](#13-ui-components)
14. [Testing](#14-testing)
15. [Deployment & Infrastructure](#15-deployment--infrastructure)
16. [Bug Fixes Applied (Audit Cycle)](#16-bug-fixes-applied-audit-cycle)
17. [Remaining Work](#17-remaining-work)
18. [Full File Inventory](#18-full-file-inventory)

---

## 1. Project Overview

CareerPilot is a full-stack web application designed for Computer Science students to prepare for their careers. It provides AI-powered analysis across multiple dimensions of career readiness, including resume scoring, coding practice, mock interviews, GitHub profile analysis, LinkedIn analysis, communication skills, and personalized learning roadmaps.

### Key Differentiators

- **AI + Deterministic Fallback**: Every AI-powered feature has a deterministic fallback that runs when the AI provider is unavailable or fails. AI never produces final readiness scores.
- **Per-Company Readiness**: Students can evaluate readiness against specific companies and roles, not just generic targets.
- **Real Code Execution**: Coding challenges run in a sandboxed Piston container (production) or local subprocess (dev), not a toy evaluator.
- **8-Category Scoring**: Readiness is computed from 8 weighted categories, configurable per job role.

---

## 2. Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.3.0 | Full-stack React framework (App Router) |
| React | 19.2.8 | UI library |
| TypeScript | ^5.0 | Type safety |
| Tailwind CSS | v4 | Utility-first CSS |
| shadcn / Base UI | ^4.17.0 | Component primitives |
| Recharts | ^3.10.1 | Charts and data visualization |
| Monaco Editor | ^4.7.0 | Code editor (coding workspace) |
| Lucide React | ^1.31.0 | Icon library |
| React Hook Form | ^7.85.0 | Form state management |
| Zod | ^4.4.3 | Schema validation |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Prisma | ^6.19.3 | ORM |
| NextAuth v5 | ^5.0.0-beta.32 | Authentication |
| bcryptjs | ^3.0.3 | Password hashing |
| ioredis | ^6.0.0 | Redis client (rate limiting, caching) |
| OpenRouter API | - | AI provider (OpenAI-compatible) |

### Data & Storage
| Technology | Purpose |
|---|---|
| PostgreSQL 16 | Production database |
| SQLite | Development database |
| Redis 7 | Rate limiting, caching |

### Code Execution
| Technology | Purpose |
|---|---|
| Piston API | Sandboxed code execution (Python, JavaScript) |
| Local Subprocess | Development-only execution |

### Testing
| Technology | Purpose |
|---|---|
| Vitest | Unit tests |
| Playwright | End-to-end tests |
| ESLint | Linting |
| tsc --noEmit | Type checking |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker Compose | Multi-service orchestration |
| GitHub Actions | CI/CD |

---

## 3. System Architecture

```
                    +-----------+
                    |  Browser  |
                    +-----+-----+
                          |
                    +-----v-----+
                    |   Next.js  |  Port 3000 (docker) / 3100 (dev)
                    |  Middleware |  Rate limiting, logging, metrics
                    |    (Edge)  |
                    +-----+-----+
                          |
              +-----------+-----------+
              |                       |
        +-----v-----+         +------v------+
        |  Database  |         | AI Provider |
        | PostgreSQL |         | OpenRouter  |
        |   / SQLite |         | (LLM API)  |
        +-----+------+         +------+------+
              |                       |
        +-----v------+         +------v------+
        |   Redis     |         |   Piston    |
        | Rate Limit  |         |   Sandbox   |
        |   Cache     |         | Code Exec   |
        +-------------+         +-------------+
```

### Request Flow

1. **Middleware** (`src/proxy.ts`) intercepts all `/api/*` requests
2. **Rate limiting** applied per IP + route group (auth: 20/min, AI: 10/min, coding: 30/min, general: 300/min)
3. **Request logging** with X-Request-Id headers
4. **Route handler** validates input with Zod, checks auth via NextAuth session
5. **Service layer** processes business logic, queries database via Prisma
6. **AI provider** called for analysis (with deterministic fallback on failure)
7. **Score engine** computes readiness from 8 weighted categories
8. **Response** returned as JSON with structured error handling

---

## 4. Database Schema

### Enums (12)

| Enum | Values |
|---|---|
| UserRole | STUDENT, ADMIN |
| ExperienceLevel | ENTRY, INTERMEDIATE, EXPERIENCED |
| SkillCategory | PROGRAMMING_LANGUAGE, FRAMEWORK, DATABASE, AI_ML, CLOUD, DEVOPS, TOOL, SOFT_SKILL, OTHER |
| ProficiencyLevel | BEGINNER, INTERMEDIATE, ADVANCED, EXPERT |
| Difficulty | EASY, MEDIUM, HARD |
| InterviewType | HR, TECHNICAL, BEHAVIORAL, SYSTEM_DESIGN, AI_ML |
| InterviewStatus | IN_PROGRESS, COMPLETED, ABORTED |
| GapStatus | STRONG, GOOD, NEEDS_IMPROVEMENT, MISSING |
| ScoreType | OVERALL_READINESS, RESUME, CODING, INTERVIEW, COMMUNICATION, GITHUB, LINKEDIN, PROJECTS, SKILL_COVERAGE, COMPANY_READINESS, MOCK_INTERVIEW |
| SubmissionStatus | PENDING, ACCEPTED, WRONG_ANSWER, COMPILE_ERROR, RUNTIME_ERROR, TIME_LIMIT_EXCEEDED, MEMORY_LIMIT_EXCEEDED, SYSTEM_ERROR |
| Importance | ESSENTIAL, IMPORTANT, NICE_TO_HAVE |
| RoadmapStatus | ACTIVE, COMPLETED, ARCHIVED |
| TaskType | DAILY, WEEKLY, MONTHLY |

### Models (24)

#### User & Auth

| Model | Key Fields | Purpose |
|---|---|---|
| **User** | id, name, email, passwordHash, image, role | Core user account |
| **Account** | provider, providerAccountId, tokens | OAuth adapter (NextAuth) |
| **Session** | sessionToken, userId, expires | Active sessions |
| **VerificationToken** | identifier, token, expires | Email verification |
| **Authenticator** | credentialID, userId, counter | WebAuthn/passkey support |

#### Profile & Education

| Model | Key Fields | Purpose |
|---|---|---|
| **StudentProfile** | userId, location, bio, experienceLevel, githubUrl, linkedinUrl, portfolioUrl, onboardingCompletedAt | Student profile with FKs to targetCompany and targetJobRole |
| **Education** | profileId, college, degree, branch, graduationYear, cgpa | 1:1 with StudentProfile |

#### Skills & Gaps

| Model | Key Fields | Purpose |
|---|---|---|
| **Skill** | name, category, description | Skill catalog |
| **StudentSkill** | profileId, skillId, rating (1-5), proficiency | Student skill levels |
| **SkillGap** | profileId, jobRoleId, skillId, currentRating, requiredRating, status, priority | Gap assessment per role |
| **CompanySkillRequirement** | companyId, jobRoleId, skillId, importance, requiredRating, weight | Role requirements |

#### Companies & Roles

| Model | Key Fields | Purpose |
|---|---|---|
| **Company** | name, slug, description, logoUrl, industry, location | Company directory |
| **JobRole** | companyId, title, slug, description, level, minExperience, weights (JSON) | Role definitions with scoring weights |

#### Resume

| Model | Key Fields | Purpose |
|---|---|---|
| **Resume** | profileId, title, templateId, content (JSON), isPrimary | Resume storage |
| **ResumeAnalysis** | resumeId, overallScore, atsScore, contentScore, keywordScore, strengths, weaknesses, missingSkills | Resume quality analysis |

#### Coding

| Model | Key Fields | Purpose |
|---|---|---|
| **CodingProblem** | title, slug, description, difficulty, topics, starterCode, testCases, hiddenTestCases, timeLimitMs | Problem bank |
| **CodingSubmission** | problemId, userId, language, code, status, passedTests, totalTests, runtimeMs | Submission records |
| **CodingAssessment** | userId, problemId, attempts, bestScore | Best scores per problem |

#### Interview

| Model | Key Fields | Purpose |
|---|---|---|
| **Interview** | userId, companyId, jobRoleId, interviewType, difficulty, status, score, feedback, report | Interview sessions |
| **InterviewQuestion** | interviewId, prompt, questionType, order | Questions |
| **InterviewAnswer** | questionId, answerText, evaluation, score | Answers with AI evaluation |

#### Analysis

| Model | Key Fields | Purpose |
|---|---|---|
| **CommunicationAnalysis** | userId, transcript, audioUrl, metrics, score, strengths, weaknesses | Speech analysis |
| **GitHubAnalysis** | userId, username, score, profileData, repos, strengths | GitHub profile analysis |
| **LinkedInAnalysis** | userId, profileText, score, strengths, weaknesses | LinkedIn analysis |
| **Project** | userId, name, repoUrl, description, techStack | Project portfolio |
| **ProjectAnalysis** | projectId, score, categories, strengths, weaknesses | Project quality analysis |

#### Roadmap & Readiness

| Model | Key Fields | Purpose |
|---|---|---|
| **LearningRoadmap** | profileId, jobRoleId, durationWeeks, overview, content, status | Learning plans |
| **RoadmapTask** | roadmapId, type, week, title, description, resources, completed | Individual tasks |
| **CompanyReadiness** | profileId, jobRoleId, companyId, overallScore, breakdown | Per-company readiness |

#### Reporting & Audit

| Model | Key Fields | Purpose |
|---|---|---|
| **ScoreHistory** | userId, type, score, meta, createdAt | Score time series |
| **CareerReport** | userId, profileId, overallScore, reportData, generatedAt | Career reports |
| **AuditLog** | actorId, actorEmail, action, resource, resourceId, detail, ip, createdAt | Immutable audit trail (no FK to User) |

---

## 5. Features & Pages

### Public Pages (10)

| Route | Description |
|---|---|
| `/` | Landing page with hero, features overview, CTA |
| `/about` | About page |
| `/features` | Feature showcase |
| `/how-it-works` | Step-by-step guide |
| `/pricing` | Pricing tiers |
| `/contact` | Contact form |
| `/login` | Email/password login |
| `/register` | User registration |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

### Student Pages (17)

| Route | Feature | Description |
|---|---|---|
| `/dashboard` | Dashboard | Readiness overview, progress charts, quick actions |
| `/career-goal` | Career Goal | Select target company and job role |
| `/profile` | Profile | Edit bio, education, skills, social links |
| `/resume` | Resume Analyzer | Upload PDF/DOCX or paste structured JSON; AI + deterministic analysis (ATS score, content, keywords) |
| `/coding` | Coding Assessment | Monaco editor, 3 difficulty levels, run/submit against hidden tests, AI feedback |
| `/interview` | Mock Interview | 5 types (HR, Technical, Behavioral, System Design, AI/ML), AI question generation, answer evaluation |
| `/communication` | Communication | Audio recording (WebM/MP4/WAV) + paste transcript; word count, filler analysis, fluency scoring |
| `/github` | GitHub Analyzer | Enter username; fetches profile/repos/events; deterministic scoring (profile 30%, repos 40%, activity 30%) |
| `/linkedin` | LinkedIn Analyzer | Paste profile text; AI + deterministic analysis |
| `/projects` | Projects | Add projects with tech stack; AI + deterministic analysis across 4 categories |
| `/skill-gaps` | Skill Gaps | Table comparing student skills vs target role requirements with prioritized recommendations |
| `/readiness` | Company Readiness | Per-company readiness score breakdown with radar chart |
| `/roadmap` | Learning Roadmap | Phased learning plan with task completion toggles (6-24 weeks) |
| `/hiring-simulation` | Hiring Simulation | Simulated hiring process |
| `/mentor` | Career Mentor | AI chatbot with student context (name, role, readiness score); 12+ topic knowledge |
| `/progress` | Progress | Score history timeline charts |
| `/report` | Career Report | Full report with strengths, weaknesses, gaps, recommended actions |
| `/settings` | Settings | Change name, set/change password, data export (GDPR), account deletion |

### Admin Pages (8)

| Route | Feature |
|---|---|
| `/admin` | Admin dashboard |
| `/admin/users` | User management (role changes, deletion) |
| `/admin/companies` | Company CRUD |
| `/admin/job-roles` | Job role CRUD with scoring weight configuration |
| `/admin/skills` | Skill catalog management |
| `/admin/problems` | Coding problem management |
| `/admin/assessment-config` | Assessment weight tuning |
| `/admin/analytics` | Platform analytics |

---

## 6. API Routes

### Public

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth catch-all |
| `/api/auth/register` | POST | User registration |
| `/api/health` | GET | Health check (DB, execution provider, config issues) |
| `/api/metrics` | GET | Prometheus-format metrics |

### Profile & Settings

| Route | Method | Purpose |
|---|---|---|
| `/api/profile` | GET, PUT | Fetch/update profile, education, skills, onboarding |
| `/api/profile/career-goal` | PUT, DELETE | Set/clear career target |
| `/api/settings` | PUT | Change name/password |

### Coding

| Route | Method | Purpose |
|---|---|---|
| `/api/coding/problems` | GET | List problems with user's solve status |
| `/api/coding/problems/[id]` | GET | Get problem details |
| `/api/coding/run` | POST | Run against visible tests (no record) |
| `/api/coding/submit` | POST | Submit against hidden tests, record assessment + score history |

### Interview

| Route | Method | Purpose |
|---|---|---|
| `/api/interview` | GET, POST | List interviews / start new |
| `/api/interview/[id]/answer` | POST | Submit answer (AI evaluation) |
| `/api/interview/[id]/finish` | POST | Finish interview, compute report + score |

### Analyzers

| Route | Method | Purpose |
|---|---|---|
| `/api/resume/analyze` | POST | Analyze resume (structured JSON or file upload) |
| `/api/github/analyze` | POST | Analyze GitHub profile |
| `/api/linkedin/analyze` | POST | Analyze LinkedIn profile |
| `/api/communication/analyze` | POST | Analyze speech (transcript or audio) |
| `/api/projects` | GET, POST | List/create projects |
| `/api/projects/[id]` | DELETE | Delete project |
| `/api/projects/[id]/analyze` | POST | Analyze project |

### Mentor

| Route | Method | Purpose |
|---|---|---|
| `/api/mentor/chat` | POST | Chat with AI career mentor |

### Roadmap

| Route | Method | Purpose |
|---|---|---|
| `/api/roadmap/[roadmapId]/tasks/[taskId]` | PUT | Toggle task completion |

### Account (GDPR)

| Route | Method | Purpose |
|---|---|---|
| `/api/account/export` | GET | Export all user data as JSON |
| `/api/account/delete` | DELETE | Right to erasure (cascade delete) |

### Admin

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/users/[id]` | PATCH, DELETE | Change role / delete user |
| `/api/admin/companies` | POST | Create company |
| `/api/admin/companies/[id]` | DELETE | Delete company |
| `/api/admin/job-roles` | POST | Create job role with weights |
| `/api/admin/job-roles/[id]` | PUT, DELETE | Update weights / delete role |
| `/api/admin/skills` | POST | Create skill |
| `/api/admin/skills/[id]` | DELETE | Delete skill |
| `/api/admin/problems` | POST | Create coding problem |
| `/api/admin/problems/[id]` | DELETE | Delete problem |

---

## 7. Server Services & Business Logic

### AI Layer (`src/server/ai/`)

| File | Purpose |
|---|---|
| `provider.ts` | `OpenRouterProvider` class: HTTP client for OpenRouter chat completions. 60s timeout, temperature 0.3. Supports `chat()` (free-form) and `generateStructured()` (JSON + Zod validation). Handles network errors, unparseable responses, empty content. |
| `index.ts` | Service facade: `isConfigured()`, `chat()`, `generateStructured()`, `analyzeResume()`. Wraps provider with system prompts. |
| `schemas.ts` | Zod schema for resume analysis response. |

### Coding (`src/server/coding/`)

| File | Purpose |
|---|---|
| `executor.ts` | Provider router: dispatches to `local-executor` (dev) or `piston.service` (prod) based on `EXECUTION_PROVIDER`. Blocks local execution in production. |
| `harness.ts` | Test harness builders: wraps `solution()` with test cases. JS: async IIFE + `await`, `__cpDeepEqual` (NaN-safe), `fs.writeSync(1, marker)` + `process.exit(0)`. Python: `sys.stdout.flush()` + `os._exit(0)`. All locals prefixed `__cp` to avoid collisions. |
| `local-executor.ts` | Local subprocess execution: writes temp file, spawns `python`/`node` with hard 15s cap, 256KB output cap, process-tree kill on timeout. Keeps last N output bytes (front-truncation) so harness markers survive. Cross-platform (Windows taskkill, POSIX SIGKILL). |
| `piston.service.ts` | Piston sandbox HTTP execution: language/version detection, runtime caching (10 min TTL), compile/run error handling. Handles 401/403 for unconfigured API keys. |

### Scoring (`src/server/scoring/`)

| File | Purpose |
|---|---|
| `score-engine.ts` | Core engine: 8 category keys, default weights (sum 100), `normalizeWeights()` (ignores NaN/negative, falls back on zero total), `computeOverall()` (weighted average, clamped 0-100), `readinessBand()` (4 levels), `topScores()`/`weakestScores()`. |
| `readiness.service.ts` | Assembles 8 category scores from real DB data: resume (latest), coding (0.7 performance + 0.3 volume), interview (latest), communication (latest), projects (mean), github (latest), linkedin (latest), skill coverage (vs target role). All scores clamped 0-100. |
| `company-readiness.service.ts` | Per-company readiness computation. Optional `persist` flag (read-only views don't write). Pass `tx` for transaction support. |
| `skills.ts` | Skill gap assessment: `assessSkill()` maps rating vs requirement to GapStatus. `computeSkillCoverage()` (weighted ratio). `computeSkillGaps()` produces prioritized items. Importance weights: ESSENTIAL 1.5x, IMPORTANT 1x, NICE_TO_HAVE 0.5x. |

### Services (`src/server/services/`)

| File | Purpose |
|---|---|
| `interview.service.ts` | 5 interview types, 8-question banks each. AI question generation with validation. AI/deterministic answer evaluation. Fisher-Yates shuffle (no comparator contract violation). |
| `github.service.ts` | GitHub API fetch (user/repos/events). Deterministic scoring: profile (30%), repos (40%), activity (30%). `GitHubServiceError` for structured error propagation. Score clamped 0-100. |
| `linkedin.service.ts` | AI/deterministic LinkedIn profile analysis. Deterministic: section presence, metrics, action verbs, profile length. |
| `communication.service.ts` | AI/deterministic communication analysis. Deterministic: word count, filler ratio, vocabulary score, grammar issues (7 patterns), fluency, clarity. Weighted: fluency 35%, grammar 25%, clarity 25%, vocabulary 15%. Audio upload limits (10MB, allowed types). Optional Whisper STT. |
| `mentor.service.ts` | AI/deterministic career mentor chatbot. Deterministic: keyword-matching for 12+ topics. AI: multi-turn chat with student context. Chat history content capped at 4000 chars per item. |
| `profile.service.ts` | `getOrCreateProfile()` upsert (race-safe), `proficiencyFromRating()` (1-5 -> BEGINNER..EXPERT), `updateStudentSkills()` sync. |
| `project.service.ts` | AI/deterministic project analysis: documentation, technical scope, presentation, skill relevance. Tech stack items validated (1-100 chars). |
| `recommendations.service.ts` | Deterministic next-action recommendations. Maps 14 skill names to specific module actions. Top 5 deduplicated. |
| `report.service.ts` | Career report assembly: category scores, top 3 strengths, bottom 3 weaknesses, top 10 gaps, actions, summary. |
| `resume-content.ts` | Zod schemas for structured resume content. `resumeToText()` renders to plain text. `deterministicAnalyzeResume()` scores ATS (section detection), content (metrics + action verbs), keywords (23-word bank), company match. Falls back when AI unavailable. |
| `roadmap.service.ts` | Deterministic roadmap generator: Foundation (2wk) -> per-gap skill (1wk each) -> Projects (2wk) -> Final sprint (1wk). Clamps 6-24 weeks. Transaction-guarded creation. |

---

## 8. AI Integration

### Provider
- **OpenRouter** (OpenAI-compatible API)
- Default model: `openai/gpt-4o-mini`
- Max tokens: 2000 (configurable)
- Temperature: 0.3
- Timeout: 60 seconds

### Features Using AI

| Feature | AI Use | Fallback |
|---|---|---|
| Resume Analysis | Score + recommendations from structured content | Deterministic scoring (ATS, keywords, content) |
| LinkedIn Analysis | Profile text analysis | Section-based scoring |
| Communication Analysis | Transcript analysis | Word count, grammar, fluency metrics |
| Interview Questions | Dynamic question generation | Pre-built question banks (8 per type) |
| Interview Evaluation | Answer scoring and feedback | Keyword matching |
| Project Analysis | Documentation/impact analysis | Metric-based scoring |
| Mentor Chat | Contextual career advice | Keyword-matching for 12+ topics |

### Error Handling
- Network/timeout errors wrapped in `AIServiceError`
- Unparseable response bodies caught and reported
- Empty AI responses rejected
- Every AI call has `try/catch` with deterministic fallback

---

## 9. Code Execution System

### Production (Piston)

- Sandboxed container with isolated cgroups
- Runs Python 3.10.0 and JavaScript 18.15.0
- 15s run timeout, 10s compile timeout
- 512MB memory limit
- API key authentication (`careerpilot-piston`)
- Pinned by Docker image digest for reproducibility
- Runtime caching (10 min TTL)

### Development (Local)

- Writes wrapper to temp file
- Spawns `python`/`node` child process
- Hard 15s cap, 256KB output cap
- Process-tree kill on timeout (cross-platform)
- Blocked in production (RCE prevention)
- Front-truncation keeps last N bytes (harness markers survive)

### Test Harness

- Wraps user `solution()` with test cases
- JS: async IIFE + `await solution(...)`, NaN-safe deep equality, sync marker write + `process.exit(0)`
- Python: `print` + `sys.stdout.flush()` + `os._exit(0)`
- All locals prefixed `__cp` to avoid collisions
- Anti-spoofing: real exit kills deferred timers before markers print

---

## 10. Scoring & Readiness Engine

### 8 Categories

| Category | Data Source | Weight Default |
|---|---|---|
| RESUME | Latest resume analysis scores | 15 |
| CODING | 0.7 performance + 0.3 volume | 15 |
| INTERVIEW | Latest interview score | 15 |
| COMMUNICATION | Latest communication analysis | 10 |
| PROJECTS | Mean project scores | 10 |
| GITHUB | GitHub analysis score | 10 |
| LINKEDIN | LinkedIn analysis score | 10 |
| SKILL_COVERAGE | Skills vs target role requirements | 15 |

### Readiness Bands

| Band | Range | Label |
|---|---|---|
| Excellent | 80-100 | "Ready to apply" |
| Good | 60-79 | "Almost ready" |
| Warning | 40-59 | "In progress" |
| Critical | 0-39 | "Getting started" |

### Weight Normalization
- Non-finite (NaN, Infinity) weights are ignored
- Negative weights are clamped to 0
- If total <= 0, falls back to `DEFAULT_WEIGHTS`
- Final score is clamped to [0, 100]

---

## 11. Security & Authentication

### Authentication
- **NextAuth v5** with credentials provider (email + bcrypt password)
- JWT sessions (7-day maxAge)
- Session user verified against database on every request (deleted/demoted users lose access)
- Admin re-verified against DB (rejects stale sessions from deleted/demoted admins)

### Password Policy
- Minimum 8 characters, max 200
- Must contain at least one letter and one number
- Shared schema between register and settings routes

### CORS & Headers
- CSP (self + cdn.jsdelivr.net)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- HSTS
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera/geolocation/payment denied, microphone self-only

### Rate Limiting
- Fixed-window (60s) per IP + route group
- Groups: auth (20/min), AI (10/min), coding (30/min), general (300/min)
- Redis backend with automatic degradation to memory
- Always enforced (never skipped)

### Data Privacy (GDPR)
- Account data export (GET /api/account/export)
- Right to erasure (DELETE /api/account/delete)
- Immutable audit logs survive account deletion (no FK to User)

### Production Security
- Local code execution blocked (RCE prevention)
- Port binding: 127.0.0.1 only (no external exposure)
- Placeholder AUTH_SECRET detection in production
- Seed script refuses to run in production without explicit opt-in

---

## 12. Rate Limiting & Middleware

### Middleware (`src/proxy.ts`)
- Intercepts all `/api/*` requests
- Trust-gated IP resolution:
  - `TRUST_PROXY=true`: `x-real-ip` first, else rightmost XFF entry
  - `TRUST_PROXY=false`: first XFF entry (socket-derived)
- Rate limiting always enforced (key: `${group}:${ip}`)
- X-Request-Id header added to every response
- Structured JSON request logging
- Prometheus metrics recording

### Rate Limiter (`src/lib/rate-limit.ts`)
- Fixed-window algorithm (60s window)
- Memory backend: sweep/cap at 4096 entries
- Redis backend: atomic INCR + EXPIRE via Lua script
- Auto-degrades from Redis to memory on connection failure
- `RATE_LIMIT_ENABLED` env var controls on/off

---

## 13. UI Components

### Primitives (28 shadcn/Base UI)
alert, avatar, badge, breadcrumb, button, card, checkbox, collapsible, dialog, dropdown-menu, input, label, progress, radio-group, score-ring, scroll-area, select, separator, sheet, skeleton, slider, sonner (toasts), switch, table, tabs, textarea, tooltip

### App Shell (3)
- `app-shell.tsx` - Main layout with sidebar + content
- `sidebar.tsx` - Collapsible navigation with 7 student groups + admin group
- `onboarding-banner.tsx` - Onboarding prompt

### Auth (2)
- `login-form.tsx` - Email/password login
- `register-form.tsx` - Registration form

### Dashboard (3)
- `dashboard-view.tsx` - Dashboard page wrapper
- `dashboard-content.tsx` - Readiness cards + quick actions
- `progress-chart.tsx` - Recharts radar/line chart

### Feature Components (14)
profile-form, career-goal-form, coding-workspace (Monaco editor), interview-workspace, resume-analyzer, communication-analyzer, github-analyzer, linkedin-analyzer, projects-analyzer, skill-gaps-view, readiness-view (radar chart), roadmap-view (task toggles), progress-view (timeline charts), report-view, hiring-simulation, mentor-chat, settings-form

### Admin (7)
analytics-view, assessment-config, companies-manager, job-roles-manager, problems-manager, skills-manager, users-manager

### Other
- `theme-provider.tsx` - Dark/light mode
- `brand-icons.tsx` - GitHub & LinkedIn SVG icons

---

## 14. Testing

### Unit Tests (37 tests, 5 files)

| File | Tests | What's Tested |
|---|---|---|
| `tests/api-helpers.test.ts` | 9 | ApiError, Zod validation, Prisma error mapping (P2002/P2003/P2025), generic errors |
| `tests/rate-limit.test.ts` | 4 | Allow within limit, block over-limit, independent keys, window reset |
| `tests/harness.test.ts` | 12 | Output parsing, timeout handling, Python/JS wrapper building, async IIFE, anti-spoof (process.exit + os._exit), deep equality, __cp locals |
| `tests/score-engine.test.ts` | 9 | Weight normalization (NaN/negative/zero), overall computation, readiness bands, top/weak scores |
| `tests/resume-content.test.ts` | 3 | Deterministic resume scoring (finite 0-100, empty input, target-role keywords) |

### E2E Tests (13 tests, 7 files)

| File | Tests | What's Tested |
|---|---|---|
| `e2e/auth.spec.ts` | 3 | Registration, login redirect, unauthenticated redirect |
| `e2e/coding.spec.ts` | 2 | Problem load + code execution, problems list rendering |
| `e2e/interview.spec.ts` | 1 | Full mock interview session (start, answer, evaluate) |
| `e2e/resume.spec.ts` | 1 | Resume upload + AI analysis |
| `e2e/mentor.spec.ts` | 1 | AI mentor chat (send message, Thinking indicator, reply) |
| `e2e/analyzers.spec.ts` | 5 | GitHub error handling, LinkedIn form, LinkedIn AI analysis, Projects form, Communication form |
| `e2e/global-setup.ts` | - | Prisma migrate + seed before all tests |

### CI Gates
- `npm run typecheck` (tsc --noEmit)
- `npm run lint` (eslint)
- `npm test` (vitest)
- `npm run test:e2e` (playwright, Chromium, 1 worker, sequential)
- Load test: 2708 requests, 0 failures, p95 ~170ms, rate limiter verified

---

## 15. Deployment & Infrastructure

### Docker Compose (4 services)

| Service | Image | Purpose |
|---|---|---|
| app | Custom (Dockerfile) | Next.js application |
| db | postgres:16-alpine | PostgreSQL database |
| redis | redis:7-alpine | Rate limiting + caching |
| piston | ghcr.io/engineer-man/piston (pinned by digest) | Code execution sandbox |

### Dockerfile
- Multi-stage: node:22-alpine base
- Swaps SQLite schema for PostgreSQL at build time
- Non-root `node` user
- Entry: `prisma migrate deploy` + `npm start`

### Volume Persistence
- `pgdata`: PostgreSQL data
- `piston_packages` + `piston_compilers`: Piston runtimes
- `redisdata`: Redis AOF persistence

### Health Checks
- All 4 services have health checks
- App: `/api/health` endpoint
- DB: `pg_isready`
- Redis: `redis-cli ping`
- Piston: HTTP check against `/api/v2/runtimes`

### Backup Scripts
- `scripts/backup-postgres.sh` (Linux/macOS)
- `scripts/backup-postgres.ps1` (Windows PowerShell)

### Deployment Runbook
- `scripts/deploy/deploy.sh`: One-command Ubuntu VPS deployment
- `scripts/deploy/DEPLOY.md`: Full deployment guide

---

## 16. Bug Fixes Applied (Audit Cycle)

### Commit `80ca58f` - "Fix security and reliability bugs from the full code audit"

**48 files changed, +959/-373 lines**

#### Security Fixes
- **Harness anti-spoofing**: JS/Python test harnesses now resist deferred timer spoofing (process.exit + os._exit)
- **Proxy trust fix**: XFF parsing is now trust-gated; always rate limits
- **Deleted user revocation**: `requireUser()` and `getApiAdmin()` verify user still exists in DB
- **Local executor blocked in production**: Prevents RCE
- **Placeholder AUTH_SECRET detection**: Flags weak secrets in production
- **Seed script production guard**: Refuses to seed production DB without explicit opt-in

#### Reliability Fixes
- **Async JS execution**: Harness now awaits async solutions
- **Output front-truncation**: Local executor keeps last N bytes (harness markers survive)
- **Process-tree kill**: Timeout kills grandchild processes (cross-platform)
- **Score clamping**: All scores clamped to [0, 100]
- **Weight normalization**: NaN/negative weights ignored, zero-total fallback
- **AI response parsing**: Unparseable JSON bodies caught
- **GitHub error handling**: Network/timeout errors wrapped, score clamped
- **Resume deterministic fallback**: Works when AI unavailable

#### Data Integrity
- **Coding submissions**: Serializable transactions prevent lost updates
- **Report generation**: Transactions prevent concurrent duplicates
- **Roadmap creation**: Transactions prevent duplicate active roadmaps
- **Company readiness**: Optional `persist` flag (read-only views don't write)
- **Profile updates**: PATCH semantics (absent keys don't wipe values)
- **Interview shuffle**: Fisher-Yates (no comparator contract violation)

#### UX Fixes
- **Settings export**: Async blob download with error handling
- **Form guards**: try/catch/finally on all form submissions (login, career goal, settings)
- **Mentor E2E fix**: Exact-text "Thinking..." match (no false positive on AI replies containing "thinking")
- **Shared password policy**: Consistent between register and settings
- **Audio upload limits**: 10MB max, allowed MIME types
- **Coding problems sort**: DB-side difficulty ordering
- **Admin problems JSON**: Constraints/examples parsed once
- **Mentor history cap**: 4000 chars per chat item
- **Projects tech stack**: 1-100 char validation per item

#### Infrastructure
- **Docker port binding**: `127.0.0.1:3000` (no external exposure)
- **Piston runtime cache**: 10-minute TTL
- **Docker Compose rebuilt**: Verified healthy

#### Tests Added
- `tests/resume-content.test.ts` (3 tests): Deterministic resume scoring
- `tests/harness.test.ts` (+6 tests): Async JS, anti-spoof, deep equality
- `tests/score-engine.test.ts` (+1 test): NaN/negative weight handling
- `e2e/mentor.spec.ts` (updated): Flaky locator fix

---

## 17. Remaining Work

| Item | Priority | Status |
|---|---|---|
| VPS deployment | Medium | Deferred (`deploy.sh` + `DEPLOY.md` ready but not run) |
| Prisma FK indexes on submissions/assessments | Low | Intentionally skipped (perf-only, migration risk) |
| Additional E2E coverage | Low | Core flows covered; edge cases pending |

---

## 18. Full File Inventory

### Source Files

```
src/proxy.ts
src/types/next-auth.d.ts
src/config/nav.ts
src/lib/api.ts
src/lib/audit.ts
src/lib/auth.ts
src/lib/auth-helpers.ts
src/lib/admin-helpers.ts
src/lib/db.ts
src/lib/env.ts
src/lib/metrics.ts
src/lib/rate-limit.ts
src/lib/utils.ts
src/server/ai/index.ts
src/server/ai/provider.ts
src/server/ai/schemas.ts
src/server/coding/executor.ts
src/server/coding/harness.ts
src/server/coding/local-executor.ts
src/server/coding/piston.service.ts
src/server/scoring/score-engine.ts
src/server/scoring/readiness.service.ts
src/server/scoring/company-readiness.service.ts
src/server/scoring/skills.ts
src/server/services/communication.service.ts
src/server/services/github.service.ts
src/server/services/interview.service.ts
src/server/services/linkedin.service.ts
src/server/services/mentor.service.ts
src/server/services/profile.service.ts
src/server/services/project.service.ts
src/server/services/recommendations.service.ts
src/server/services/report.service.ts
src/server/services/resume-content.ts
src/server/services/roadmap.service.ts
```

### Components (62 files)

```
src/components/theme-provider.tsx
src/components/icons/brand-icons.tsx
src/components/ui/ (28 primitives)
src/components/app/app-shell.tsx, sidebar.tsx, onboarding-banner.tsx
src/components/auth/login-form.tsx, register-form.tsx
src/components/dashboard/dashboard-view.tsx, dashboard-content.tsx, progress-chart.tsx
src/components/admin/ (7 manager views)
src/components/profile/profile-form.tsx
src/components/career-goal/career-goal-form.tsx
src/components/coding/coding-workspace.tsx
src/components/interview/interview-workspace.tsx
src/components/resume/resume-analyzer.tsx
src/components/communication/communication-analyzer.tsx
src/components/analyzers/github-analyzer.tsx, linkedin-analyzer.tsx, projects-analyzer.tsx
src/components/skill-gaps/skill-gaps-view.tsx
src/components/readiness/readiness-view.tsx
src/components/roadmap/roadmap-view.tsx
src/components/progress/progress-view.tsx
src/components/report/report-view.tsx
src/components/hiring-simulation/hiring-simulation.tsx
src/components/mentor/mentor-chat.tsx
src/components/settings/settings-form.tsx
```

### Pages (35 routes)

```
src/app/layout.tsx
src/app/(public)/page.tsx + 9 public pages
src/app/(student)/layout.tsx + 17 student pages
src/app/admin/layout.tsx + 8 admin pages
```

### API Routes (26+ route files)

```
src/app/api/auth/[...nextauth]/route.ts
src/app/api/auth/register/route.ts
src/app/api/health/route.ts
src/app/api/metrics/route.ts
src/app/api/profile/route.ts
src/app/api/profile/career-goal/route.ts
src/app/api/settings/route.ts
src/app/api/coding/problems/route.ts
src/app/api/coding/problems/[id]/route.ts
src/app/api/coding/run/route.ts
src/app/api/coding/submit/route.ts
src/app/api/interview/route.ts
src/app/api/interview/[id]/answer/route.ts
src/app/api/interview/[id]/finish/route.ts
src/app/api/resume/analyze/route.ts
src/app/api/github/analyze/route.ts
src/app/api/linkedin/analyze/route.ts
src/app/api/communication/analyze/route.ts
src/app/api/mentor/chat/route.ts
src/app/api/projects/route.ts
src/app/api/projects/[id]/route.ts
src/app/api/projects/[id]/analyze/route.ts
src/app/api/roadmap/[roadmapId]/tasks/[taskId]/route.ts
src/app/api/account/export/route.ts
src/app/api/account/delete/route.ts
src/app/api/admin/users/[id]/route.ts
src/app/api/admin/companies/route.ts
src/app/api/admin/companies/[id]/route.ts
src/app/api/admin/job-roles/route.ts
src/app/api/admin/job-roles/[id]/route.ts
src/app/api/admin/skills/route.ts
src/app/api/admin/skills/[id]/route.ts
src/app/api/admin/problems/route.ts
src/app/api/admin/problems/[id]/route.ts
```

### Tests

```
tests/api-helpers.test.ts
tests/rate-limit.test.ts
tests/harness.test.ts
tests/score-engine.test.ts
tests/resume-content.test.ts
e2e/global-setup.ts
e2e/auth.spec.ts
e2e/coding.spec.ts
e2e/interview.spec.ts
e2e/resume.spec.ts
e2e/mentor.spec.ts
e2e/analyzers.spec.ts
```

### Scripts

```
scripts/load-test.mjs
scripts/backup-postgres.sh
scripts/backup-postgres.ps1
scripts/deploy/deploy.sh
scripts/deploy/DEPLOY.md
scripts/docker/piston-bootstrap.sh
```

### Config

```
next.config.ts
tsconfig.json
vitest.config.ts
playwright.config.ts
eslint.config.mjs
postcss.config.mjs
components.json
Dockerfile
docker-compose.yml
.env.example
.gitignore
.dockerignore
start.sh
```

---

**Total files:** ~130 source files, 35 page routes, 34 API routes, 62 components, 18 server modules, 37 unit tests, 13 E2E tests.

**Verification status:** Typecheck clean, lint clean, 37/37 unit tests pass, 13/13 E2E tests pass, load test passes (2708 req, 0 failures, p95 ~170ms), all Docker services healthy.
