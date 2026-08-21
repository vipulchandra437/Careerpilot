# CareerPilot — Complete Project Brain

> Living reference document. Last updated: 2026-08-21. All file paths relative to `D:\major project\careerpilot\`.

---

## 1. Overview

CareerPilot is an AI-powered career readiness platform for CS students. It assesses skills, resumes, coding, interviews, and communication, then builds personalized plans targeting specific companies (Microsoft, Google, Amazon, Meta, etc.).

**Stack:** Next.js 16.3, React 19, Prisma 6.19, NextAuth v5 beta, Tailwind CSS 4, SQLite (dev) / PostgreSQL (prod Docker), Zod 4, OpenRouter (AI), Piston (code execution), Redis (rate limiting in prod), Stripe (payments).

**Repo:** `github.com/vipulchandra437/Careerpilot` - Branch: `master`

### Stats (as of 2026-08-21)

| Metric | Value |
|---|---|
| Prisma models | 46 |
| Prisma enums | 17 |
| API routes | 81 |
| React components | 109 |
| Student pages | 23 |
| Admin pages | 8 |
| Public pages | 13 |
| Source files (TS/TSX) | 296 |
| Total source lines | ~34,400 |
| DB migrations | 11 |
| Test files | 5 (37 tests) |
| UI primitives | 27 (shadcn-based) |

---

## 2. Architecture

```
Browser -> Next.js 16 App Router (React 19 SSR + Client)
           Route Groups: (public) | (student) | (admin)
           API Routes: /api/*

           +-----------+----------------+------------+---------+
           |           |                |            |         |
     Prisma ORM   OpenRouter       Piston API     Redis    Stripe
     SQLite/PG    (GPT-4o-mini)    (code exec)   (prod)   (payments)
```

### Key Paths

| Layer | Location |
|---|---|
| Pages (public) | `src/app/(public)/` - landing, login, register, about, pricing, features, etc. (13 pages) |
| Pages (student) | `src/app/(student)/` - dashboard, profile, resume, coding, interview, mentor, jobs, jd-analysis, skill-gaps, roadmap, notifications, settings, readiness, report, etc. (23 pages) |
| Pages (admin) | `src/app/admin/` - dashboard, users, skills, companies, job-roles, problems, analytics, assessment-config (8 pages) |
| API routes | `src/app/api/` - 81 route handlers across auth, profile, coding, interview, resume, jobs, notifications, subscription, settings, admin, etc. |
| Server logic | `src/server/` - ai/, coding/, scoring/, services/, learning/, usage.ts, subscription.ts |
| Shared libs | `src/lib/` - api, auth, db, env, logger, metrics, rate-limit, s3, security-logger, audit, utils, 2fa, stripe, premium, notifications, notification-triggers, pdf-report |
| DB schemas | `prisma/schema.prisma` (SQLite, 46 models), `prisma/schema.postgres.prisma` (PostgreSQL) |
| Seed data | `prisma/seed.ts` |
| Docker | `Dockerfile`, `docker-compose.yml`, `.dockerignore` |
| CI/CD | `.github/workflows/ci.yml`, `.github/workflows/docker.yml` |
| Tests | `tests/` - 5 vitest test files, `vitest.config.ts`, `playwright.config.ts` |
| Scripts | `scripts/fetch-leetcode.ts` |

---

## 3. Database Schema (46 models, 17 enums)

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
- **JobApplicationStatus**: SAVED, APPLIED, INTERVIEWING, OFFER, ACCEPTED, REJECTED, WITHDRAWN
- **NotificationType**: JOB_ALERT, LEARNING_REMINDER, INTERVIEW_REMINDER, SCORE_UPDATE, SYSTEM, WEEKLY_REPORT
- **SubscriptionTier**: FREE, PREMIUM
- **GoalStatus**: ACTIVE, COMPLETED, CANCELLED

### Core Models

| Model | Purpose |
|---|---|
| `User` | Auth (credentials + NextAuth v5), role, password reset, GDPR consent, 2FA secret, failed login counter, lockout timestamp |
| `Account` | OAuth provider accounts (NextAuth adapter) |
| `Session` | Session tokens (NextAuth adapter) |
| `VerificationToken` | Email verification |
| `Authenticator` | WebAuthn/passkey support |
| `StudentProfile` | Location, bio, URLs, target company/role, onboarding status, profile photo path |
| `Education` | College, degree, branch, graduation year, CGPA |
| `WorkExperience` | Company, title, description, start/end dates, current flag, tech stack |
| `Skill` | 68 seeded skills across 9 categories |
| `StudentSkill` | Profile-Skill with rating (1-5) and proficiency level |
| `Company` | 10 seeded companies |
| `JobRole` | Roles per company with JSON weights for score computation |
| `CompanySkillRequirement` | Skills required per role with importance + requiredRating |
| `Resume` | Structured JSON content, template, isPrimary flag |
| `ResumeAnalysis` | Scores (overall, ATS, content, keyword, company match), strengths/weaknesses |
| `CodingProblem` | 32 seeded + 3,081 LeetCode problems, test cases, starter code, companies, tags |
| `CodingSubmission` | Per-attempt records with code, status, test results, AI feedback |
| `CodingAssessment` | Best-score tracking per user/problem |
| `Interview` | Type, difficulty, status, score, feedback, linked company/role, time limit |
| `InterviewQuestion` | Prompts with order, type-specific time limits, linked to interview |
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
| `Notification` | User notifications with read status, type, link |
| `NotificationPreference` | Per-type email/push toggles, quiet hours config, weekly report toggle |
| `Subscription` | Stripe subscription tracking (tier, period, status, IDs) |
| `UsageRecord` | Monthly usage tracking per feature (coding, resume, interview, JD, mentor) |
| `CareerGoal` | Goal title, description, deadline, progress, status |
| `LearningLog` | Time tracking per skill (minutes logged, date, description) |

### Key Relations

```
User 1->1 StudentProfile 1->1 Education
User 1->N CodingSubmission, Interview, CommunicationAnalysis, GitHubAnalysis,
          LinkedInAnalysis, Project, ScoreHistory, CareerReport, MentorConversation,
          Notification, Subscription, UsageRecord, CareerGoal, LearningLog
User 1->N WorkExperience
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
  - `generateCoverLetter(resumeContent, jobDescription)` - cover letter generation
  - `rewriteResumeSection(section, context)` - section rewriting
  - `tailorResume(resumeContent, jobDescription)` - JD-to-resume tailoring
  - `generateCodeReview(code, language, problemTitle)` - code review
  - `generateStudyPlan(skills, goals, timeframe)` - personalized study plans
- **`index.ts`**: Singleton `aiService`. `isConfigured()` checks `OPENROUTER_API_KEY` presence.
- **`schemas.ts`**: Zod schemas for structured AI outputs.

### 4.2 Code Execution (`src/server/coding/`)

- **`executor.ts`**: `executeCode(language, code, testCases, timeLimitMs)`. Supports Python and JavaScript. Uses Piston API (prod) or local subprocess (dev). Returns `{ passed, total, compileError, runtimeError, timedOut, runtimeMs }`.
- **`harness.ts`**: `runCodeSafely(language, code, testCases, opts)`. Anti-spoof: filters `fetch`, `require`, `import`, `eval`, `exec`, `child_process`, `fs`, `process.exit`. Injects `__cp` locals. Enforces output size cap (50KB), time limit, memory limit.
- **`local-executor.ts`**: Local code execution via child_process spawn.
- **`piston.service.ts`**: Piston API client for code execution.

### 4.3 Scoring Engine (`src/server/scoring/`)

- **`score-engine.ts`**: Category scoring weights. `computeCategoryScore()`. `CATEGORY_LABELS`, `readinessBand()`.
- **`readiness.service.ts`**: `computeReadiness(userId)` - aggregates all category scores into overall readiness (0-100). Weighted by role-specific weights from `JobRole.weights` JSON.
- **`company-readiness.service.ts`**: `computeCompanyReadiness(profileId, companyId, jobRoleId)`. `recordScoreHistory()` - writes to `ScoreHistory` table.
- **`skills.ts`**: Skill assessment logic.

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
| `roadmap.service.ts` | `generateStudyPlan(skills, goals)` - AI-powered study plan generation with time estimates |
| `recommendations.service.ts` | `getRecommendations(profileId)` - personalized skill/learning recommendations |
| `report.service.ts` | Report generation for career readiness |

### 4.5 Other Server Code

| File | Purpose |
|---|---|
| `src/server/usage.ts` | `checkUsageLimit()`, `incrementUsage()` - per-feature monthly usage tracking with limits |
| `src/server/subscription.ts` | `getSubscription()`, `isPremium()` - subscription status checks |
| `src/server/learning/resources.ts` | 20+ curated learning resources per skill (freeCodeCamp, MDN, YouTube, Coursera links) |
| `src/server/actions/resume.actions.ts` | Server actions for resume operations |

### 4.6 Auth (`src/lib/auth.ts`)

NextAuth v5 beta with PrismaAdapter. Credentials provider (email + bcrypt password) + OAuth providers (Google, GitHub). JWT strategy. Role refreshed from DB on session callback. `requireUser()`, `getOptionalUser()`, `requireAdmin()` in `src/lib/auth-helpers.ts`.

---

## 5. API Routes (81 total)

### Auth

| Route | Methods | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handler (credentials + OAuth) |
| `/api/auth/register` | POST | User registration with password validation |
| `/api/auth/providers` | GET | List available OAuth providers (Google, GitHub) |
| `/api/auth/forgot-password` | POST | Password reset email |
| `/api/auth/reset-password` | POST | Password reset with token |
| `/api/auth/send-verification` | POST | Email verification token |
| `/api/auth/verify-email` | POST | Email verification |

### Profile

| Route | Methods | Purpose |
|---|---|---|
| `/api/profile` | GET, PUT | Full profile CRUD (skills, education, URLs, onboarding) |
| `/api/profile/photo` | POST, DELETE | Profile photo upload/delete (local file storage) |
| `/api/profile/experience` | GET, POST, PUT, DELETE | Work experience CRUD |
| `/api/profile/career-goal` | GET, PUT | Career goal settings |

### Settings & Security

| Route | Methods | Purpose |
|---|---|---|
| `/api/settings` | GET, PUT | User settings (profile card) |
| `/api/settings/account` | PUT, DELETE | Account update, GDPR deletion with password confirmation |
| `/api/settings/2fa` | GET, POST, PUT, DELETE | 2FA setup (TOTP), enable, disable, backup codes |
| `/api/settings/sessions` | GET, DELETE | Active session management (list, revoke) |
| `/api/account/delete` | POST | Account deletion |
| `/api/account/export` | POST | GDPR data export (JSON) |

### Coding

| Route | Methods | Purpose |
|---|---|---|
| `/api/coding/problems` | GET | Paginated problem list with search/filter/sort |
| `/api/coding/problems/[id]` | GET | Single problem details |
| `/api/coding/problems/[problemId]/submissions` | GET | Submission history per problem (last 20) |
| `/api/coding/submit` | POST | Submit solution (hidden tests, streak update, AI feedback) |
| `/api/coding/run` | POST | Run against visible tests (no persist) |
| `/api/coding/daily-challenge` | GET | Today's daily challenge |
| `/api/coding/stats` | GET | Streak, acceptance rate, recent submissions |
| `/api/coding/analytics` | GET | Detailed analytics (by difficulty, topic, company, heatmap data) |

### Interview

| Route | Methods | Purpose |
|---|---|---|
| `/api/interview` | GET, POST | List interviews, start new interview (with pre-setup config) |
| `/api/interview/[id]/answer` | POST | Submit answer to question |
| `/api/interview/[id]/finish` | POST | Complete interview, get AI feedback + grade |
| `/api/interview/history` | GET | Interview history with score trends |

### Resume

| Route | Methods | Purpose |
|---|---|---|
| `/api/resume` | GET, POST | List/create resumes |
| `/api/resume/[id]` | GET, PUT, DELETE | Single resume CRUD |
| `/api/resume/[id]/export` | POST | PDF export via jsPDF |
| `/api/resume/analyze` | POST | AI resume analysis with scoring |
| `/api/resume/cover-letter` | POST | AI cover letter generation |
| `/api/resume/rewrite` | POST | AI section rewriter |
| `/api/resume/tailor` | POST | JD-to-resume tailoring with keyword analysis |

### Jobs

| Route | Methods | Purpose |
|---|---|---|
| `/api/jobs` | GET, POST | List/create job applications |
| `/api/jobs/[id]` | GET, PUT, DELETE | Single job CRUD |
| `/api/jobs/reminders` | GET, POST, PUT, DELETE | Follow-up reminder management |

### JD Analysis

| Route | Methods | Purpose |
|---|---|---|
| `/api/jd-analyze` | GET, POST | List saved JDs, analyze new JD |
| `/api/jd-analyze/[id]` | GET, DELETE | Single JD CRUD (saved library) |
| `/api/jd-analyze/trends` | GET | Skill demand trends across analyzed JDs |

### Notifications

| Route | Methods | Purpose |
|---|---|---|
| `/api/notifications` | GET | User notifications with unread count |
| `/api/notifications/[id]` | PATCH | Mark notification as read |
| `/api/notifications/read-all` | POST | Mark all as read |
| `/api/notifications/preferences` | GET, PUT | Per-type notification preferences |
| `/api/notifications/trigger-overdue` | POST | Trigger overdue task notifications |

### Subscription & Usage

| Route | Methods | Purpose |
|---|---|---|
| `/api/subscription` | GET | Current subscription status |
| `/api/subscription/checkout` | POST | Create Stripe checkout session |
| `/api/subscription/portal` | POST | Create Stripe customer portal session |
| `/api/subscription/webhook` | POST | Stripe webhook handler |
| `/api/usage` | GET | Monthly usage stats per feature |

### Skills

| Route | Methods | Purpose |
|---|---|---|
| `/api/skills/assess` | POST | Skill self-assessment quiz (5-Q MCQ) |

### Goals & Learning

| Route | Methods | Purpose |
|---|---|---|
| `/api/goals` | GET, POST, PUT, DELETE | Career goal CRUD with deadlines |
| `/api/learning/log` | GET, POST, DELETE | Learning time tracker (log minutes per skill) |

### Roadmap

| Route | Methods | Purpose |
|---|---|---|
| `/api/roadmap/[roadmapId]/tasks/[taskId]` | PATCH | Toggle roadmap task completion |
| `/api/roadmap/study-plan` | POST | AI study plan generation |

### Peer Comparison

| Route | Methods | Purpose |
|---|---|---|
| `/api/peer-comparison` | GET | Anonymous peer averages, top 10%, percentile rank |

### Mentor

| Route | Methods | Purpose |
|---|---|---|
| `/api/mentor/chat` | POST | Stateless mentor chat (uses request history) |
| `/api/mentor/conversations` | GET, POST | List/create persistent mentor conversations |
| `/api/mentor/conversations/[id]/messages` | GET, POST | List messages, send message (with full context) |

### Other

| Route | Methods | Purpose |
|---|---|---|
| `/api/health` | GET | Health check (DB, execution provider, security status) |
| `/api/csrf` | GET | CSRF token generation |
| `/api/metrics` | GET | Prometheus-format metrics |
| `/api/communication/analyze` | POST | Speaking analysis |
| `/api/github/analyze` | POST | GitHub profile analysis |
| `/api/linkedin/analyze` | POST | LinkedIn profile analysis |
| `/api/projects` | GET, POST | Project CRUD |
| `/api/projects/[id]` | GET, PUT, DELETE | Single project CRUD |
| `/api/projects/[id]/analyze` | POST | Project analysis |
| `/api/upload/presign` | POST | S3 presigned URL generation |

### Admin

| Route | Methods | Purpose |
|---|---|---|
| `/api/admin/users` | GET | List users |
| `/api/admin/users/[id]` | PATCH, DELETE | Change role, delete user |
| `/api/admin/skills` | GET, POST | Skills CRUD |
| `/api/admin/skills/[id]` | GET, PUT, DELETE | Single skill CRUD |
| `/api/admin/companies` | GET, POST | Companies CRUD |
| `/api/admin/companies/[id]` | GET, PUT, DELETE | Single company CRUD |
| `/api/admin/job-roles` | GET, POST | Job roles CRUD |
| `/api/admin/job-roles/[id]` | GET, PUT, DELETE | Single job role CRUD |
| `/api/admin/problems` | GET, POST | Coding problems CRUD |
| `/api/admin/problems/[id]` | GET, PUT, DELETE | Single problem CRUD |
| `/api/admin/analytics` | GET | Admin analytics dashboard |

---

## 6. Frontend Components

### Route Groups

- **`(public)/`**: Landing, login, register, about, pricing, features, how-it-works, contact, privacy, terms, forgot-password, reset-password, verify-email (13 pages)
- **`(student)/`**: Dashboard, profile, resume, coding, coding/analytics, interview, mentor, communication, hiring-simulation, github, linkedin, projects, jd-analysis, jobs, skill-gaps, roadmap, readiness, report, progress, notifications, settings, subscription, career-goal (23 pages)
- **`admin/`**: Dashboard, users, skills, companies, job-roles, problems, analytics, assessment-config (8 pages)

### Key Components

| Component | Location | Description |
|---|---|---|
| **Dashboard** | | |
| `DashboardContent` | `dashboard/` | Readiness score card, category breakdown grid, quick stats, weekly sparkline |
| `DashboardView` | `dashboard/` | Dashboard layout wrapper |
| `GoalSetting` | `dashboard/` | Career goal setting with deadlines + progress tracking |
| `PeerComparison` | `dashboard/` | Anonymous averages, top 10%, percentile rank comparison |
| `ProgressChart` | `dashboard/` | Score history chart |
| **Auth** | | |
| `LoginForm` | `auth/` | Email/password login with OAuth buttons |
| `RegisterForm` | `auth/` | Registration with password strength indicator |
| `OAuthButtons` | `auth/` | Google + GitHub OAuth login (conditionally shown) |
| **Profile** | | |
| `ProfileForm` | `profile/` | Multi-section form (personal, education, skills, URLs, onboarding) |
| `ProfileCompleteness` | `profile/` | Circular progress + checklist showing profile completion % |
| `ExperienceSection` | `profile/` | Work experience CRUD (company, title, dates, tech stack) |
| **Resume** | | |
| `ResumeAnalyzer` | `resume/` | File upload (drag-drop), content editor, analysis results with score cards |
| `ResumeBuilder` | `resume/` | Full resume builder with multi-section editing, ATS score toolbar |
| `ResumePreview` | `resume/` | Live resume preview with template rendering |
| `TemplateSelector` | `resume/` | Resume template selection grid |
| `CoverLetterBuilder` | `resume/` | AI cover letter generator with template fallback |
| `ResumeTailor` | `resume/` | JD-to-resume tailoring with keyword overlap analysis |
| `VersionDiff` | `resume/` | Side-by-side version comparison |
| **Coding** | | |
| `CodingWorkspace` | `coding/` | Monaco editor, test runner, streak bar, bookmarks, terminal output |
| `CodingAnalytics` | `coding/` | Progress analytics (by difficulty, topic, company, heatmap) |
| `DailyChallengeBanner` | `coding/` | Daily challenge with streak + 7-day calendar |
| **Interview** | | |
| `InterviewWorkspace` | `interview/` | Pre-setup screen, question cards with timers, STAR guidance, navigation |
| `InterviewHistory` | `interview/` | Interview history with score trend chart + averages by type |
| **JD Analysis** | | |
| `JdAnalyzer` | `jd-analysis/` | Single JD analysis with match report |
| `JdAnalysisPageClient` | `jd-analysis/` | Tabbed page: Analyzer, Library, Optimizer, Trends, Batch |
| `JdLibrary` | `jd-analysis/` | Saved JD library with search/sort/filter |
| `JdResumeOptimizer` | `jd-analysis/` | JD-to-resume optimizer with keyword overlap |
| `BatchComparison` | `jd-analysis/` | Side-by-side comparison of 2-3 JDs |
| `SkillTrends` | `jd-analysis/` | Skill demand trends (bar chart, missing in-demand) |
| `MatchReport` | `jd-analysis/` | JD match report visualization |
| **Jobs** | | |
| `JobTracker` | `jobs/` | Tabbed view: list + kanban board |
| `JobCard` | `jobs/` | Job application card with days-since-applied, status dots |
| `JobForm` | `jobs/` | Add/edit job application form |
| `JobKanban` | `jobs/` | Drag-and-drop kanban board (HTML5 DnD) |
| `JobAnalytics` | `jobs/` | Application analytics (pie chart, funnel, salary distribution) |
| `OfferComparison` | `jobs/` | Side-by-side offer comparison (2-3 offers) |
| **Skill Gaps** | | |
| `SkillGapsView` | `skill-gaps/` | Skill gap visualization and management |
| `SkillAssessment` | `skill-gaps/` | 5-question MCQ assessment with AI/deterministic generation |
| **Roadmap** | | |
| `RoadmapView` | `roadmap/` | Learning roadmap with task management |
| `StudyPlan` | `roadmap/` | AI personalized study plan generator |
| `TimeTracker` | `roadmap/` | Learning time tracker (log minutes per skill, weekly totals) |
| `RoadmapAnalytics` | `roadmap/` | Roadmap progress analytics, time per skill, estimated completion |
| **Notifications** | | |
| `NotificationBell` | `notifications/` | Bell icon with numeric badge + grouped dropdown |
| `NotificationList` | `notifications/` | Notification list with mark read |
| `NotificationPreferences` | `notifications/` | Per-type email/push toggles, quiet hours config |
| **Settings** | | |
| `SettingsTabs` | `settings/` | Tabbed settings page |
| `ProfileCard` | `settings/` | Profile info editing |
| `PasswordCard` | `settings/` | Password change with strength indicator |
| `TwoFactorForm` | `settings/` | 2FA setup (TOTP QR code + backup codes) |
| `SessionManager` | `settings/` | Active session list with revoke |
| `DataExportCard` | `settings/` | GDPR data export (JSON download) |
| `AccountDeletion` | `settings/` | Account deletion with password confirmation |
| **Subscription** | | |
| `PricingPage` | `subscription/` | Free vs Premium pricing with annual toggle |
| `UsageDisplay` | `subscription/` | Monthly usage per feature with progress bars |
| `CancellationSurvey` | `subscription/` | Cancellation flow with reasons + feedback |
| `SubscriptionBadge` | `subscription/` | Current plan badge |
| **Readiness** | | |
| `ReadinessView` | `readiness/` | Overall readiness with radar chart + improvement tips |
| **Report** | | |
| `ReportView` | `report/` | Career readiness report with PDF export |
| **Progress** | | |
| `ProgressView` | `progress/` | Progress tracking view |
| **Admin** | | |
| `UsersManager` | `admin/` | User management with role changes |
| `SkillsManager` | `admin/` | Skills CRUD management |
| `CompaniesManager` | `admin/` | Companies CRUD management |
| `JobRolesManager` | `admin/` | Job roles CRUD management |
| `ProblemsManager` | `admin/` | Coding problems CRUD management |
| `AnalyticsView` | `admin/` | Admin analytics dashboard |
| `EnhancedAnalyticsView` | `admin/` | Enhanced analytics with charts |
| `AssessmentConfig` | `admin/` | Assessment configuration |
| **App Shell** | | |
| `AppShell` | `app/` | Main layout wrapper |
| `Sidebar` | `app/` | Navigation sidebar with feature icons |
| `OnboardingBanner` | `app/` | Onboarding completion banner |
| **Analyzers** | | |
| `GithubAnalyzer` | `analyzers/` | GitHub profile analysis UI |
| `LinkedinAnalyzer` | `analyzers/` | LinkedIn profile analysis UI |
| `ProjectsAnalyzer` | `analyzers/` | Project analysis UI |
| **Misc** | | |
| `Icons/BrandIcons` | `icons/` | Custom brand icons (LeetCode, etc.) |
| `CareerGoalForm` | `career-goal/` | Career goal setting form |

### UI Primitives (27)

- **`components/ui/`**: alert, avatar, badge, breadcrumb, button, card, checkbox, collapsible, dialog, dropdown-menu, file-upload, input, label, progress, radar-chart, radio-group, score-ring, scroll-area, select, separator, sheet, skeleton, slider, sonner, switch, table, tabs, textarea, tooltip

---

## 7. Lib Utilities

| File | Purpose |
|---|---|
| `api.ts` | `ApiError`, `apiError()`, `apiOk()`, `parseJson()`, `validate()`, `validateBody()`, `toErrorResponse()` (Prisma error mapping: P2002->409, P2003->409, P2025->404) |
| `auth.ts` | NextAuth v5 config (credentials + OAuth providers, PrismaAdapter, JWT, role refresh) |
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
| `2fa.ts` | TOTP 2FA: `generateSecret()`, `generateQRCode()`, `verifyToken()`, `generateBackupCodes()` (pure Node crypto, no external 2FA library) |
| `stripe.ts` | Stripe client initialization |
| `premium.ts` | `isPremiumUser()`, `requirePremium()` - subscription checks |
| `notifications.ts` | `createNotification()`, `getUnreadCount()` - notification CRUD |
| `notification-triggers.ts` | Automated notification triggers: score change, job match, overdue tasks, interview complete, weekly report |
| `pdf-report.ts` | PDF report generation using jsPDF |
| `config/nav.ts` | Navigation configuration (sidebar items, icons, roles) |

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

# Stripe (Payments)
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PREMIUM_PRICE_ID=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""

# OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_ID=""
GITHUB_SECRET=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

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

## 11. Industry-Level Features

### Feature 1: User Management
- Email/password registration with password strength indicator
- OAuth login (Google + GitHub) with conditional provider buttons
- Two-factor authentication (TOTP) with QR code + backup codes (pure Node crypto)
- Account lockout after 5 failed login attempts (15-minute cooldown)
- Session management (view/revoke active sessions)
- GDPR account deletion with password confirmation
- GDPR data export (full JSON download)
- Audit logging on all auth events (login, register, password change, 2FA)

### Feature 2: Notifications
- Per-type notification preferences (email, push, job alerts, learning, interview, weekly, system)
- Quiet hours configuration (start/end time)
- Automated triggers: score changes, job matches, overdue tasks, interview completion
- Deduplication (1-hour window) to prevent notification spam
- Weekly report generation
- Enhanced bell with numeric badge, grouped dropdown, mark all read

### Feature 3: Subscription System
- Free vs Premium tiers with Stripe integration
- Usage tracking per feature (coding, resume, interview, JD, mentor)
- Free tier enforcement: 5 coding/day, 1 resume/mo, 3 interviews/mo, 5 JD/mo, 10 mentor/day
- 429 responses with upgrade prompt when limits exceeded
- Annual billing toggle on pricing page
- Cancellation survey with reasons + feedback
- Usage display component with progress bars

### Feature 4: Resume Builder
- Multi-template resume builder with section editing
- AI cover letter generator with template fallback
- AI resume section rewriter (rewrite with AI buttons per section)
- JD-to-resume tailoring with keyword overlap analysis
- Version diff view (side-by-side comparison)
- Real-time ATS score preview (debounced, in toolbar)
- PDF export via jsPDF
- File upload (drag-drop PDF/DOCX)

### Feature 5: Coding Assessment
- Monaco editor with Python/JavaScript support
- Terminal-style code output console with test results
- Submission history per problem (last 20)
- Custom test cases with localStorage persistence
- Progress analytics page (by difficulty, topic, company, heatmap)
- AI code review tab
- Daily challenge banner with streak + 7-day calendar
- Enhanced filtering (company, sort options, search)
- 3,081 LeetCode problems in database

### Feature 6: AI Mock Interview
- Pre-interview setup screen (type, difficulty, question count)
- Per-question countdown timer (60s/90s/120s by question type)
- STAR method guidance card for behavioral questions
- Question navigation with flagged indicators
- Interview history with score trend chart + averages by type
- Enhanced final report with grade, time analysis, score breakdown
- AI-powered feedback on each answer
- Company/role-specific questions

### Feature 7: Job Tracker
- List view + Kanban board view with HTML5 drag-and-drop
- Follow-up reminders with date picker + badge indicators
- Application analytics: pie chart (status breakdown), funnel (conversion rates), salary distribution, timeline
- Offer comparison tool (2-3 offers side-by-side)
- Enhanced cards with days-since-applied, status dots
- CRUD operations for job applications

### Feature 8: Dashboard & Reports
- SVG radar/spider chart for 8-category score visualization
- Career goal setting with deadlines + progress tracking
- Peer comparison (anonymous averages, top 10%, percentile rank)
- PDF report export (jsPDF)
- Quick action cards + weekly sparkline
- Category breakdown grid with readiness bands

### Feature 9: JD Analysis
- Single JD analysis with match scoring
- Saved JD library with search/sort/filter
- JD-to-resume optimizer with keyword overlap analysis
- Batch JD comparison (2-3 JDs side-by-side)
- Skill demand trends (bar chart, score trends, missing in-demand skills)

### Feature 10: Skill Gap & Roadmap
- Skill gap visualization with gap analysis
- Curated learning resources (20+ skills, freeCodeCamp/MDN/YouTube/Coursera links)
- Learning time tracker (log minutes per skill, weekly totals)
- Skill assessment mini-tests (5-question MCQ with AI/deterministic generation)
- AI personalized study plan generator
- Roadmap analytics (progress, time per skill, estimated completion)
- Task management with daily/weekly/monthly categories

### Feature 11: Career Profile
- Multi-section profile form (personal, education, skills, URLs)
- Profile photo upload (local file storage with preview)
- Profile completeness indicator (circular progress + checklist)
- Work experience CRUD section
- Enhanced readiness view with radar chart + improvement tips

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

### Usage Enforcement Pattern
```typescript
export async function POST(request: Request) {
  const user = await requireUser();
  try {
    const usage = await checkUsageLimit(user.id, "coding", 5); // 5/day for free
    if (!usage.allowed) {
      return toErrorResponse(new ApiError(429, "Daily limit reached. Upgrade to Premium."));
    }
    // ... business logic ...
    await incrementUsage(user.id, "coding");
  } catch (error) {
    return toErrorResponse(error);
  }
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

### Native Dev (Windows)
```bash
npx next dev --port 3000
# App at http://localhost:3000
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
- **Password Policy**: Min 8 chars, must contain letter + number, strength indicator
- **Account Lockout**: 5 failed attempts -> 15-minute cooldown
- **Two-Factor Auth**: TOTP with QR code + backup codes (pure Node crypto)
- **OAuth**: Google + GitHub with conditional provider display
- **Input Validation**: Zod schemas on all API inputs
- **Code Execution Sandbox**: Piston container (prod) or restricted subprocess (dev), anti-spoof filtering, output size cap
- **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Session Management**: View/revoke active sessions
- **GDPR Compliance**: Account deletion with password confirmation, full data export

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
| `8a9fc15` | Industry-level upgrade: all 11 features upgraded across 11 phases - 120 files, +14,318 lines - OAuth, 2FA, session management, GDPR, notifications, subscription/usage, resume AI, coding analytics, interview timer/history, kanban, radar chart, goals, peer comparison, JD library/optimizer/trends, skill assessment, learning tracker, profile completeness |
| `56199e8` | Resume builder complete: multi-template, AI cover letter, resume tailor, version diff, ATS score preview, PDF export |
| `84e5224` | JD analysis, job tracker, notifications, subscription system - 4 new features |
| `80ca58f` | Audit fixes: 48 files, +959/-373 - harness async/anti-spoof, proxy trust, admin DB re-verification, GitHub error handling, resume fallback, scoring guards, env placeholder detection, Docker port binding, local executor fail-closed, register passwordSchema, Prisma error mapping, audio limits, profile PATCH semantics |
| `ecd32dc` | Project report: `PROJECT_REPORT.md` - 920 lines |
| `25ea144` | Commercial-readiness: password reset, email verification, GDPR consent, structured logging, CI/CD, presigned URL uploads, enhanced admin analytics |
| `75df17d` | LeetCode + mentor + firewall + cleanup: 32 problems, streak/daily-challenge/bookmarks, persistent mentor conversations, security middleware, console->logger migration |

---

## 17. Current State

### Working
- All 11 features fully implemented and upgraded to industry-level quality
- 46 Prisma models, 17 enums, 11 migrations
- 81 API routes, 109 React components, 44 pages
- Zero type errors (`npx tsc --noEmit`)
- 37/37 unit tests passing
- 3,081 LeetCode problems in database
- 14 users, 77+ skills, 10 companies seeded
- Native dev server on `:3000` (Windows)
- Docker stack available (app, db, redis, piston)

### Known Constraints
- Two Prisma schema files (SQLite dev / PostgreSQL prod) must be kept in sync manually
- `scripts/fetch-leetcode.ts` excluded from TS compilation - must run with `npx tsx`
- NextAuth v5 beta - may have breaking changes
- OpenRouter API key required for AI features
- Piston code execution requires the public emkc.org API token since Feb 2026 (or self-hosted)
- Docker not accessible from Windows browser (WSL2 networking) - use native dev server
- `requireUser()` MUST be called OUTSIDE try/catch in all API routes

---

## 18. File Tree Summary

```
careerpilot/
  brain.md                              # This file
  package.json                          # Dependencies and scripts
  tsconfig.json                         # TypeScript config (strict, paths)
  next.config.ts                        # Next.js config (standalone, security headers)
  Dockerfile                            # Multi-stage Docker build
  docker-compose.yml                    # 4-service stack
  .dockerignore
  .env.example                          # Environment template
  vitest.config.ts                      # Unit test config
  playwright.config.ts                  # E2E test config
  proxy.ts                              # Next.js proxy middleware
  start.sh                              # Local dev start script
  .github/workflows/
    ci.yml                              # Lint, test, build
    docker.yml                          # Docker build and push
  prisma/
    schema.prisma                       # SQLite schema (46 models, 17 enums)
    schema.postgres.prisma              # PostgreSQL variant
    seed.ts                             # Seed data (68 skills, 32 problems, 10 companies)
    dev.db                              # SQLite dev database
    migrations/                         # 11 SQLite migrations
    migrations-postgres/                # PostgreSQL migrations
  scripts/
    fetch-leetcode.ts                   # LeetCode problem fetcher (3,081 problems)
  src/
    app/
      layout.tsx                        # Root layout (ThemeProvider, Toaster)
      globals.css
      error.tsx, loading.tsx, not-found.tsx
      (public)/                         # 13 pages
        page.tsx                        # Landing page
        login/page.tsx, register/page.tsx
        about/page.tsx, features/page.tsx, how-it-works/page.tsx
        pricing/page.tsx, contact/page.tsx
        privacy/page.tsx, terms/page.tsx
        forgot-password/page.tsx, reset-password/page.tsx
        verify-email/page.tsx
      (student)/                        # 23 pages
        dashboard/page.tsx, profile/page.tsx, resume/page.tsx
        coding/page.tsx, coding/analytics/page.tsx
        interview/page.tsx, mentor/page.tsx
        communication/page.tsx, hiring-simulation/page.tsx
        github/page.tsx, linkedin/page.tsx, projects/page.tsx
        jd-analysis/page.tsx, jobs/page.tsx
        skill-gaps/page.tsx, roadmap/page.tsx
        readiness/page.tsx, report/page.tsx, progress/page.tsx
        notifications/page.tsx, settings/page.tsx
        subscription/page.tsx, career-goal/page.tsx
      admin/                            # 8 pages
        page.tsx, layout.tsx
        users/page.tsx, skills/page.tsx
        companies/page.tsx, job-roles/page.tsx
        problems/page.tsx, analytics/page.tsx
        assessment-config/page.tsx
      api/                              # 81 route handlers
        auth/                           # 7 routes (nextauth, register, providers, forgot/reset password, verify-email, send-verification)
        profile/                        # 4 routes (profile, photo, experience, career-goal)
        settings/                       # 4 routes (settings, account, 2fa, sessions)
        account/                        # 2 routes (delete, export)
        coding/                         # 8 routes (problems, [id], [problemId]/submissions, submit, run, daily-challenge, stats, analytics)
        interview/                      # 4 routes (interview, [id]/answer, [id]/finish, history)
        resume/                         # 7 routes (resume, [id], [id]/export, analyze, cover-letter, rewrite, tailor)
        jobs/                           # 3 routes (jobs, [id], reminders)
        jd-analyze/                     # 3 routes (jd-analyze, [id], trends)
        notifications/                  # 5 routes (notifications, [id], read-all, preferences, trigger-overdue)
        subscription/                   # 4 routes (subscription, checkout, portal, webhook)
        skills/                         # 1 route (assess)
        goals/                          # 1 route (goals)
        learning/                       # 1 route (log)
        roadmap/                        # 2 routes ([roadmapId]/tasks/[taskId], study-plan)
        peer-comparison/                # 1 route
        mentor/                         # 3 routes (chat, conversations, [id]/messages)
        github/                         # 1 route (analyze)
        linkedin/                       # 1 route (analyze)
        communication/                  # 1 route (analyze)
        projects/                       # 3 routes (projects, [id], [id]/analyze)
        upload/                         # 1 route (presign)
        admin/                          # 11 routes (users, [id], skills, [id], companies, [id], job-roles, [id], problems, [id], analytics)
        health/, csrf/, metrics/
    components/                         # 109 components
      ui/                               # 27 primitives (alert, avatar, badge, breadcrumb, button, card, checkbox, collapsible, dialog, dropdown-menu, file-upload, input, label, progress, radar-chart, radio-group, score-ring, scroll-area, select, separator, sheet, skeleton, slider, sonner, switch, table, tabs, textarea, tooltip)
      app/                              # AppShell, Sidebar, OnboardingBanner
      auth/                             # LoginForm, RegisterForm, OAuthButtons
      dashboard/                        # DashboardContent, DashboardView, GoalSetting, PeerComparison, ProgressChart
      profile/                          # ProfileForm, ProfileCompleteness, ExperienceSection
      resume/                           # ResumeAnalyzer, ResumeBuilder, ResumePreview, TemplateSelector, CoverLetterBuilder, ResumeTailor, VersionDiff
      coding/                           # CodingWorkspace, CodingAnalytics, DailyChallengeBanner
      interview/                        # InterviewWorkspace, InterviewHistory
      jd-analysis/                      # JdAnalyzer, JdAnalysisPageClient, JdLibrary, JdResumeOptimizer, BatchComparison, SkillTrends, MatchReport
      jobs/                             # JobTracker, JobCard, JobForm, JobKanban, JobAnalytics, OfferComparison
      skill-gaps/                       # SkillGapsView, SkillAssessment
      roadmap/                          # RoadmapView, StudyPlan, TimeTracker, RoadmapAnalytics
      notifications/                    # NotificationBell, NotificationList, NotificationPreferences
      settings/                         # SettingsTabs, ProfileCard, PasswordCard, TwoFactorForm, SessionManager, DataExportCard, AccountDeletion, SettingsForm
      subscription/                     # PricingPage, UsageDisplay, CancellationSurvey, SubscriptionBadge
      readiness/                        # ReadinessView
      report/                           # ReportView
      progress/                         # ProgressView
      mentor/                           # MentorChat
      communication/                    # CommunicationAnalyzer
      hiring-simulation/                # HiringSimulation
      analyzers/                        # GithubAnalyzer, LinkedinAnalyzer, ProjectsAnalyzer
      admin/                            # UsersManager, SkillsManager, CompaniesManager, JobRolesManager, ProblemsManager, AnalyticsView, EnhancedAnalyticsView, AssessmentConfig
      icons/                            # BrandIcons
      career-goal/                      # CareerGoalForm
      theme-provider.tsx
    lib/                                # 18 utility files
      api.ts, auth.ts, auth-helpers.ts, db.ts, env.ts
      logger.ts, request-logger.ts, security-logger.ts
      audit.ts, metrics.ts, rate-limit.ts
      s3.ts, utils.ts, admin-helpers.ts, email-verify.ts
      2fa.ts, stripe.ts, premium.ts
      notifications.ts, notification-triggers.ts, pdf-report.ts
      config/nav.ts
    config/
      nav.ts                            # Navigation config
    server/
      ai/
        index.ts                        # AI service singleton
        provider.ts                     # OpenRouter integration
        schemas.ts                      # Zod schemas for AI outputs
      coding/
        executor.ts                     # Code execution (Piston/local)
        harness.ts                      # Safe execution with anti-spoof
        local-executor.ts              # Local subprocess execution
        piston.service.ts              # Piston API client
      scoring/
        readiness.service.ts            # Overall readiness computation
        score-engine.ts                 # Category scoring logic
        company-readiness.service.ts
        skills.ts                       # Skill assessment logic
      services/
        profile.service.ts
        mentor.service.ts
        interview.service.ts
        resume-content.ts
        communication.service.ts
        github.service.ts
        linkedin.service.ts
        project.service.ts
        roadmap.service.ts
        recommendations.service.ts
        report.service.ts
      learning/
        resources.ts                    # 20+ curated learning resources
      usage.ts                          # Usage tracking & enforcement
      subscription.ts                   # Subscription status checks
      actions/
        resume.actions.ts              # Server actions for resume
    types/
      next-auth.d.ts                    # NextAuth type extensions
  tests/                                # 5 test files (37 tests)
    api-helpers.test.ts
    harness.test.ts
    rate-limit.test.ts
    resume-content.test.ts
    score-engine.test.ts
```
