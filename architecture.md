# architecture.md — System Architecture

## 1. High-Level Overview

```
[Student Browser] -->HTTPS--> [Next.js Frontend]
                                    |
                                    v
                        [FastAPI Backend (REST + WebSocket for interviews)]
                        /        |         |          \
                       v         v         v           v
                [Postgres]  [OpenRouter   [S3-compatible  [Sandboxed
                (users,      Orchestrator] File Store]     Code Runner]
                 profiles,        |        (resumes/         (isolated
                 roadmaps,        v         uploads)          container
                 sessions)   [OpenRouter API]                 per submission)
                                    |
                        [External: GitHub API]
                                    |
                            [Admin Console (same frontend,
                             role-gated routes)]
```

## 2. Tech Stack (locked — see PROMPT.md)

- **Frontend:** Next.js (React) + Tailwind CSS + shadcn/ui components.
- **Backend:** FastAPI (Python 3.11+) — async endpoints throughout, since most requests wait on LLM/API calls.
- **Database:** PostgreSQL via SQLAlchemy + Alembic for migrations.
- **AI Layer:** OpenRouter — single orchestration module, model selection configurable per feature (see §5).
- **File storage:** S3-compatible bucket (e.g., Cloudflare R2 or AWS S3), private by default.
- **Auth:** JWT access + refresh tokens; GitHub OAuth for the GitHub connection feature (reuse for login too, optional).
- **Code execution:** Firecracker/gVisor-style microVM or Docker-in-Docker sandbox, network-disabled, CPU/memory/time limits enforced.
- **Background jobs:** Celery + Redis (or FastAPI BackgroundTasks for v1 if load is low) for roadmap generation, report PDF export, and GitHub repo analysis.

## 3. Data Model (core tables — not exhaustive)

### 3.1 users

| column | type | notes |
|--------|------|-------|
| id | uuid, pk | |
| email | text, unique | |
| password_hash | text, nullable | nullable if OAuth-only |
| github_id | text, nullable | |
| role | enum(student, admin) | |
| credit_balance | integer | for usage-based billing, see PROMPT.md |
| created_at | timestamptz | |

### 3.2 target_role_profiles (admin-managed)

| column | type | notes |
|--------|------|-------|
| id | uuid, pk | |
| name | text | e.g. "Backend Engineer" |
| required_skills | jsonb | [{skill, weight, min_depth}] |
| updated_by | uuid, fk users | |

### 3.3 profile_snapshots

| column | type | notes |
|--------|------|-------|
| id | uuid, pk | |
| user_id | uuid, fk | |
| resume_data | jsonb | parsed resume output |
| github_data | jsonb, nullable | |
| linkedin_data | jsonb, nullable | manually imported |
| computed_at | timestamptz | |

### 3.4 gap_reports

| column | type | notes |
|--------|------|-------|
| id | uuid, pk | |
| snapshot_id | uuid, fk | |
| target_role_id | uuid, fk | |
| gaps | jsonb | [{skill, severity, reason, suggested_resource}] |

### 3.5 roadmaps / roadmap_milestones

- `roadmaps`: id, user_id, gap_report_id, version, created_at.
- `roadmap_milestones`: id, roadmap_id, title, linked_gap_skill, status(not_started/in_progress/done), linked_action_type(challenge/interview/resource), linked_action_id, order_index.

### 3.6 coding_challenges / challenge_submissions

- `coding_challenges`: id, topic, difficulty, prompt, test_cases(jsonb), created_by(admin or "ai_generated").
- `challenge_submissions`: id, user_id, challenge_id, code, result(jsonb: pass/fail per test, complexity_estimate), feedback_text, submitted_at.

### 3.7 interview_sessions / interview_turns

- `interview_sessions`: id, user_id, type(technical/behavioral), status, started_at, ended_at.
- `interview_turns`: id, session_id, role(interviewer/student), content, order_index.
- `interview_feedback`: id, session_id, clarity_score, structure_notes, referenced_turn_ids(jsonb).

### 3.8 llm_usage_log (required for metering — see RULES.md §1 and PROMPT.md)

| column | type | notes |
|--------|------|-------|
| id | uuid, pk | |
| user_id | uuid, fk | |
| feature | text | e.g. "gap_analysis", "mock_interview" |
| model | text | which OpenRouter model was used |
| tokens_in / tokens_out | integer | |
| cost_usd | numeric | computed from OpenRouter response metadata |
| created_at | timestamptz | |

## 4. ProfileSnapshot Merge Logic

When resume + GitHub + LinkedIn data conflict or overlap (e.g., "Python" appears in both resume and GitHub language stats):

- Take the highest-confidence signal per skill (GitHub commit history > resume bullet > LinkedIn skill tag, since code activity is harder to fake).
- Never silently drop a skill source's data — store all three raw payloads in profile_snapshots, and compute the merged view as a derived field, so re-merging logic can be improved later without re-fetching data.

## 5. Core Components (implementation notes)

### 5.1 OpenRouter Orchestration Module (backend/ai/orchestrator.py or equivalent)

Single entry point: `call_llm(feature: str, prompt: str, user_id: str, model_override: str | None = None) -> LLMResponse`.

Responsibilities: pick default model per feature (configurable, e.g., cheaper model for challenge generation, stronger model for interview follow-ups), retry with backoff on transient failures, log every call to `llm_usage_log`, enforce a per-user rate/cost limit before calling out.

**No feature module imports the OpenRouter SDK directly. Ever.** This is the single most important architectural rule in the project — it's what makes model swaps, cost control, and later outcome-based pricing possible without touching feature code.

### 5.2 Sandboxed Code Execution Service

Separate process/container from the main API — communicates via an internal queue or HTTP call, never a direct function call from request-handling code.

Hard limits: execution timeout (e.g., 5s), memory cap, no network access, no filesystem access outside a scratch dir wiped after each run.

### 5.3 Skill Gap Engine

Deterministic pass first (skill keyword/synonym matching against required_skills), then one LLM call to reason about depth/context (e.g., "mentions React" vs. "built and deployed 3 React apps with state management").

Deterministic + LLM results merged into the final GapReport — don't let the LLM override a clear deterministic mismatch without explanation.

### 5.4 Roadmap Generator

Runs as a background job (not inline in the request) since it's a heavier LLM call — return a "generating..." state to the frontend and poll/websocket for completion.

## 6. Folder Structure (suggested)

```
/backend
  /api            (route handlers, thin — no business logic here)
  /services       (profile_analysis, gap_engine, roadmap, coding_challenges, interviews)
  /ai
    orchestrator.py
    prompts/      (versioned prompt templates, one file per feature)
  /models         (SQLAlchemy models)
  /sandbox        (code execution service, isolated)
  /tests
/frontend
  /app            (Next.js routes)
  /components
    /ui           (shared primitives only)
    /feature-name (co-located per feature)
  /lib
```

## 7. Scalability & Cost Notes

- Cache `target_role_profiles` and `coding_challenges` reads — low write frequency, high read frequency.
- Rate-limit LLM calls per user (tie to credit_balance) to control OpenRouter cost — enforce in the orchestrator, not per-feature.
- GitHub API calls are cached per user for a configurable TTL (e.g., 24h) to respect rate limits and avoid redundant cost.
