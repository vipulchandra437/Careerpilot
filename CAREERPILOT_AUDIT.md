# CareerPilot read-only audit

Audit date: 2026-11-27

## Summary

This audit was read-only. No source file, migration, config or deployment setting was changed; the only file written is this report. No production URL and no production Neon database were contacted. Local smoke tests used temporary SQLite databases; no secret value was printed.

Top 3 risks:

1. First-time roadmap generation returns HTTP 500 before the background job starts (`backend/api/roadmap.py:59`).
2. The production database is documented as still stamped `009_profile_avatar`; deploying current code before migrations `010`–`015` will break roadmap reads/generation (`MEMORY.md:159`, `PHASE.md:124`). `users.is_active` also has no incremental migration.
3. Next-owned routes verify only the JWT signature, so disabled accounts and revoked tokens still read/write interview, target and dashboard data (`frontend/lib/interview/auth.ts:12-18`, `frontend/app/actions/target.ts:13-16`, `frontend/app/actions/dashboard.ts:22-25`).

Two further high-impact issues: spend controls are weak in both stacks (`backend/ai/orchestrator.py:69-72`, `frontend/app/api/interview/turn/route.ts:101-169`), and refresh tokens are replayable with no production `token_version` increment path (`backend/auth.py:27-35`, `backend/api/auth.py:130-149`).

Automated checks are healthy: backend 219 tests pass, Ruff passes, frontend 27 tests pass, lint/typecheck pass, and the production build completes on 28 routes. The main risk is release state and a few concrete runtime paths, not broad test failure.

## Architecture overview

- **Frontend:** Next.js 15 App Router in `frontend/`, TypeScript/Tailwind, client token storage in `localStorage`, server routes/actions for interview, readiness and dashboard data. `frontend/next.config.js:4-10` proxies `/api/:path*` to FastAPI via `BACKEND_API_URL`. `frontend/package.json:5-12` defines `dev`/`build`/`lint`/`typecheck`/`test`; dependencies include Next, Prisma, jose, Zod and Vitest.
- **Backend:** FastAPI in `backend/main.py`, routers registered at `backend/main.py:150-161`, SQLAlchemy 2 async models in `backend/models/`, services in `backend/services/`, and one LLM gateway in `backend/ai/orchestrator.py`. `backend/requirements.txt:1-22` pins the FastAPI/SQLAlchemy/Alembic/Pydantic/JWT/OpenRouter/S3/test dependency set.
- **Persistence:** Alembic chain `001`–`015` in `alembic/versions/`. `014_unique_aggregate_rows` and `015_roadmap_status_columns` exist only in the working tree. Startup uses `Base.metadata.create_all` plus a narrow helper in `backend/main.py:61-86`; on PostgreSQL that helper only widens one column and returns.
- **Separate data store:** Prisma interview/dashboard DB in `frontend/prisma/`; Vercel builds with `frontend/vercel.json:2` and the production schema.
- **External services:** OpenRouter for LLM calls, Judge0 for code execution, S3-compatible object storage for avatars/resumes, optional GitHub OAuth.

## Critical issues

### CRIT-1 — First roadmap generation fails with HTTP 500

- **Severity:** Critical
- **Path/line:** `backend/api/roadmap.py:58-60`; `backend/services/roadmap.py:368-378`
- **What is wrong:** `get_roadmap_with_milestones()` returns `None` when no roadmap exists yet. `generate_roadmap()` unpacks that value immediately, before scheduling the background job, so the documented "generating" response is never reached for a first-time user.
- **Repro/how found:** Local SQLite smoke test with seeded roles: signup → profile update → gap analysis → `POST /api/roadmap/generate?gap_report_id=<id>`. Response was HTTP 500. Server log: `TypeError: cannot unpack non-iterable NoneType object` at `backend/api/roadmap.py:59`; subsequent `GET /api/roadmap/<id>` returned 404. Reproduced both with and without `OPENROUTER_API_KEY`.
- **Suggested fix:** Treat `None` as "no existing roadmap" and continue to the background task; add a regression test for generate-on-first-gap-report that asserts HTTP 200 and a `generating` status.

### CRIT-2 — Production schema drift blocks all roadmap reads/generation

- **Severity:** Critical
- **Path/line:** `MEMORY.md:159`; `PHASE.md:124`; `backend/models/roadmap.py:17-18`; `alembic/versions/015_roadmap_status_columns.py:1-7,15-16`; `backend/main.py:61-86`
- **What is wrong:** The model and API read `roadmaps.status` and `roadmaps.error`, but the production database is documented as stamped `009_profile_avatar` and lacking both columns. `create_all(checkfirst=True)` does not alter existing tables, and the PostgreSQL startup helper returns after widening `linked_action_id` (`backend/main.py:76-86`), so startup does not heal the drift.
- **Repro/how found:** Static comparison of model columns, migration revisions and project records. MEMORY.md and PHASE.md record the earlier local reproduction: pre-`015` databases returned `no such column: roadmaps.status` on roadmap read/generation. No production connection was made in this audit.
- **Suggested fix:** Back up, then apply Alembic `010` → `015` in order before deploying this code; verify with `alembic current` and `alembic heads`. Either add these columns to the PostgreSQL startup helper or fail startup with an explicit schema-version error instead of a later 500.

### CRIT-3 — `users.is_active` has no incremental migration for PostgreSQL

- **Severity:** Critical
- **Path/line:** `backend/models/user.py:30`; `backend/api/auth.py:121-122`; `backend/api/dependencies.py:38-42`; `backend/main.py:88-102`
- **What is wrong:** Login and every authenticated request read `User.is_active`, but no migration in `alembic/versions/001`–`015` adds that column. Fresh databases get it from `001_initial`'s `create_all`, and SQLite gets it from the startup helper at `backend/main.py:102`, but the PostgreSQL branch of that helper returns at `backend/main.py:86` before adding anything.
- **Repro/how found:** Grep for `is_active` across all migration files found no match; static comparison with the model and auth dependency shows a missing-column failure on any older PostgreSQL DB that predates the column. No production DB was queried.
- **Suggested fix:** Add an idempotent Alembic revision that adds `users.is_active BOOLEAN NOT NULL DEFAULT TRUE` on PostgreSQL, or extend the existing startup helper before its early `return`; verify the column exists before deploying auth changes.

## High-priority bugs

### HIGH-1 — Daily LLM cap is non-atomic and its 429 is hidden by fallbacks

- **Severity:** High
- **Path/line:** `backend/ai/orchestrator.py:69-72`; `backend/services/gap_engine.py:390-410`; `backend/services/roadmap.py:267-288`; `backend/services/coding_challenges.py:190-222`; `backend/services/interviews.py:96,217,303,702`
- **What is wrong:** The cap counts `LLMUsageLog` rows and then calls the provider; the comment at `orchestrator.py:70-71` notes the check is not atomic. The raised 429 is caught by broad `except Exception` blocks in feature services, which silently return deterministic gaps/milestones/challenges or continue without a follow-up question.
- **Repro/how found:** Static trace from the cap to each caller. With `LLM_DAILY_CALL_LIMIT=N`, N concurrent requests can all pass the count before any row is logged. In the missing-key smoke run, gap analysis returned HTTP 200 with fallback data instead of an error. No paid provider call was made.
- **Suggested fix:** Reserve the call count atomically before the provider request and reconcile on failure. Let quota 429 propagate to the client; restrict service fallbacks to provider/parse errors, not limit errors.

### HIGH-2 — Interview answers are unbounded and sent to paid prompts

- **Severity:** High
- **Path/line:** `backend/api/interviews.py:39-40`; `backend/services/interviews.py:192-206,94,666`
- **What is wrong:** `AnswerRequest.content` has no maximum length. The service only rejects empty text, stores the full string, and interpolates the growing transcript into the next-question and feedback prompts. No per-session turn cap exists while status is `in_progress`.
- **Repro/how found:** Static inspection. Sending a multi-megabyte `content` to `POST /api/interviews/{id}/answer` is accepted, persisted and later sent to OpenRouter on the next turn and again at feedback.
- **Suggested fix:** Add `Field(max_length=...)`, cap total transcript characters sent to the LLM, and cap turns/session duration server-side.

### HIGH-3 — Refresh tokens are replayable and revocation is incomplete

- **Severity:** High
- **Path/line:** `backend/auth.py:27-35`; `backend/api/auth.py:130-149`; `backend/models/user.py:32`
- **What is wrong:** Refresh JWTs have no `jti`; refresh does not rotate/invalidate the old token and never increments `token_version`. `token_version_matches()` treats a missing `ver` claim as valid, so older signed tokens survive an increment. Repository search found increments only in tests.
- **Repro/how found:** Static trace plus local smoke: `POST /api/auth/refresh` twice with the same token produced two valid pairs. Manually incrementing `token_version` would not revoke a token lacking `ver`.
- **Suggested fix:** Rotate refresh tokens with `jti` and reuse detection; increment `token_version` on password change, logout and administrative disable; require `ver` on all newly issued tokens.

### HIGH-4 — Expired-session redirect removes the token needed for auto-restore

- **Severity:** High
- **Path/line:** `frontend/lib/auth.ts:15-25`; `frontend/app/(auth)/login/page.tsx:19-32`; caller example `frontend/components/dashboard/dashboard-view.tsx:33`
- **What is wrong:** `redirectExpired()` calls `clearTokens()`, which deletes both access and refresh tokens. The login recovery effect only runs when `getRefreshToken()` is present, and `refreshTokens()` needs that same token.
- **Repro/how found:** Static call trace. A 401 from a dashboard/server action sends the user to `/login?reason=expired`; the auto-refresh effect immediately returns and the user is forced to type credentials even though a valid refresh token existed.
- **Suggested fix:** On the expired path remove only `access_token`, or call `refreshTokens()` before redirecting. Keep the refresh token until rotation succeeds or the server rejects it.

### HIGH-5 — Rate limiting is per-process, proxy-keyed and bounded only to auth

- **Severity:** High
- **Path/line:** `backend/api/auth.py:18-22,25-50`; `frontend/next.config.js:4-10`
- **What is wrong:** Login/signup throttles live in module-level `defaultdict`s, so each serverless instance has its own state and entries for distinct keys are never pruned. They key on `request.client.host`, which is the Next proxy host for same-origin browser traffic. No throttle exists on LLM-triggering routes (challenge/interview/roadmap/mentor/resume).
- **Repro/how found:** Static inspection. Six signups from one proxy/NAT within 60 seconds hit the signup 429; many distinct login emails create one permanent deque per key; a second backend instance starts with an empty limiter.
- **Suggested fix:** Use a shared bounded store keyed by trusted proxy headers plus account identity, and add per-user throttles to expensive routes.

### HIGH-6 — Production secret validation is disabled in the deployed environment

- **Severity:** High
- **Path/line:** `backend/config.py:54-71`; `MEMORY.md:143`; `.env.example:1-2,51-52`
- **What is wrong:** The strict validator runs only when `ENVIRONMENT=production`, and MEMORY.md records that this flag was removed from Vercel because the validator caused 500s. Default S3 credentials, HTTP S3 endpoints, public Judge0 and placeholder secrets can therefore run in production without failing startup.
- **Repro/how found:** Read the validator and the locked deployment decision. No production setting was changed or read back in this audit.
- **Suggested fix:** Fix the HTTPS S3 endpoint and self-hosted Judge0 prerequisites, then set `ENVIRONMENT=production`. Make the critical checks unconditional when the app is deployed, and document the prerequisites in README.

### HIGH-7 — Next-owned endpoints ignore revocation and disabled accounts

- **Severity:** High
- **Path/line:** `frontend/lib/interview/auth.ts:12-18`; `frontend/app/actions/target.ts:13-16`; `frontend/app/actions/dashboard.ts:22-25`; compare `backend/api/dependencies.py:25-42` and `backend/api/admin_users.py:90`
- **What is wrong:** These verifiers check only signature, `type` and `sub`. They never compare the `ver` claim with `User.token_version` and never check `is_active`, so they are weaker than the FastAPI dependency.
- **Repro/how found:** Static comparison of Next.js verifiers with `get_current_user()`. After an admin disables a student or `token_version` is bumped, the old token still reads/writes dashboard, target and interview data through these Next-owned routes.
- **Suggested fix:** Resolve `sub` against the authoritative user record or call a backend `/me` endpoint, and enforce the same `ver`/`is_active` checks on every Next route and server action.

### HIGH-8 — Voice interview has no quota or rate limit on LLM spend

- **Severity:** High
- **Path/line:** `frontend/app/api/interview/turn/route.ts:101-110,138,160-169`; `frontend/lib/llm.ts:66-100`
- **What is wrong:** `start` creates unlimited sessions, every `turn` can call the provider chain, and `finish` calls it again. None consult backend usage/quota or throttle the endpoint.
- **Repro/how found:** Static trace. Replaying `POST /api/interview/turn` in a loop with one valid JWT can trigger a paid provider call on each iteration.
- **Suggested fix:** Enforce a per-user session/turn cap and quota lookup before any provider call, and throttle the endpoint.

## Medium/low issues

### MED-1 — Any client can mark any owned milestone `done`

- **Severity:** Medium
- **Path/line:** `backend/api/roadmap.py:231-260`; `backend/services/roadmap.py:423-449`
- **What is wrong:** The PATCH endpoint validates only the status enum; the service assigns the status without checking action type or verified completion. This bypasses the intended challenge/interview completion path for resource and interview milestones.
- **Repro/how found:** Static trace. With an owned `resource` or `interview` milestone, `PATCH /api/roadmap/milestones/{id}` with `{"status":"done"}` returns HTTP 200 and reorders the roadmap.
- **Suggested fix:** Restrict client-writable statuses/action types and reserve `done` for verified challenge/interview completion.

### MED-2 — Mobile bottom nav has nine full-label tabs in a fixed row

- **Severity:** Medium
- **Path/line:** `frontend/app/(dashboard)/layout.tsx:19-29,92-116`
- **What is wrong:** The comment says "4 primary sections + profile", but all nine `sideItems` are mapped into `flex flex-1` with full labels. Content padding is a fixed `pb-16`.
- **Repro/how found:** Static class inspection. At ~360 px each tab is ~40 px; labels such as "Resume Analyzer" wrap, making the fixed nav taller than the reserved 64 px and allowing content to sit underneath.
- **Suggested fix:** Use a small primary set plus an overflow/More menu, or keep all items but prevent wrapping and size padding from the actual nav height.

### MED-3 — Forgot-password page claims a reset link was sent

- **Severity:** Medium
- **Path/line:** `frontend/app/(auth)/forgot-password/page.tsx:50-55,65-73`
- **What is wrong:** Submission only sets `submitted = true`; there is no API call. The form itself says reset emails are coming in a later phase.
- **Repro/how found:** Enter any email and click "Send reset link"; the success text says a reset link will be sent even though nothing was sent.
- **Suggested fix:** Disable/hide the form until a reset endpoint exists, or wire it to a real endpoint and show actual success/failure.

### MED-4 — Env examples omit variables the code reads and document an ignored Judge0 variable

- **Severity:** Medium
- **Path/line:** `backend/config.py:38-50`; `.env.example:1-52`; `frontend/.env.example:1-16`; `deploy/judge0/README.md:123-125`
- **What is wrong:** Root example omits `LLM_DAILY_CALL_LIMIT`, Judge0 limit/poll variables and `LLM_PRICING`. Frontend example omits `NEXT_PUBLIC_RETICLE_TOKEN`, `NEXT_PUBLIC_RETICLE_ROOT` and `NEXT_PUBLIC_RETICLE_URL`. The Judge0 runbook names `JUDGE0_LANGUAGE_ID_PYTHON`, but settings read the ignored flat name via `judge0_language_ids` JSON.
- **Repro/how found:** Compared settings/usages with both example files; the subagent also confirmed `JUDGE0_LANGUAGE_ID_PYTHON=999` is discarded while `JUDGE0_LANGUAGE_IDS='{"python":999}'` is honoured. No secret values were printed.
- **Suggested fix:** Document each variable with format/default; mark dev-only variables; correct the Judge0 runbook to the JSON variable.

### LOW-1 — Signup backdrop wrapper uses header-logo classes

- **Severity:** Low
- **Path/line:** `frontend/app/(auth)/signup/page.tsx:108-121`, exact wrapper class at `:113`
- **What is wrong:** The element wrapping the animated gradient has `mx-auto mb-4 flex h-14 w-14 ... bg-gradient-brand`, so its absolutely positioned blobs are sized relative to a 56×56 box in normal flow. `/login` uses a full-viewport fixed backdrop.
- **Repro/how found:** Static comparison with `frontend/app/(auth)/login/page.tsx:74-82`; the class was not part of the light-theme work.
- **Suggested fix:** Give the backdrop the fixed-inset classes used on `/login` and leave logo styling on the actual header icon.

### LOW-2 — Unused exports and import remain

- **Severity:** Low
- **Path/line:** `frontend/lib/auth.ts:65-84`; `frontend/app/admin/layout.tsx:15`; `frontend/components/ui.tsx:8,40,107,135`; `frontend/lib/targets.ts:67`
- **What is wrong:** `getRole`, `isAdmin`, `authHeaders`, the unused `getRole` import, `Spinner`, `Card`, `EmptyState`, `StatCard` and `ALL_COMPANY_TYPE_IDS` have no consumers.
- **Repro/how found:** Grep across frontend TS/TSX/JS files returned only definitions plus the dead import.
- **Suggested fix:** Remove the unused declarations/import; keep used `Pill` and `PageHeader`.

### LOW-3 — No CORS/allowed-origin policy is configured or documented

- **Severity:** Low
- **Path/line:** `backend/main.py:144-148`; `frontend/next.config.js:4-11`
- **What is wrong:** FastAPI is created without CORS middleware; no origin allowlist exists. Current UI works through the Next proxy, but direct browser-to-API use is undefined.
- **Repro/how found:** Search for `CORSMiddleware`/`allow_origins` found no matches.
- **Suggested fix:** Document that browser clients must use the Next proxy; add an explicit origin allowlist only if direct API access is supported.

### MED-5 — `finish` can be replayed, duplicating answers

- **Severity:** Medium
- **Path/line:** `frontend/app/api/interview/turn/route.ts:142-195`; `frontend/prisma/schema.prod.prisma:25-36`
- **What is wrong:** There is no `endedAt` guard, answer indices are client-supplied and unconstrained, and `(sessionId, index)` is not unique.
- **Repro/how found:** Static read. Sending the same `finish` payload twice calls `createMany` again and upserts the report/session a second time.
- **Suggested fix:** Reject `finish` when `session.endedAt` is set, add `@@unique([sessionId, index])` with a migration, and make the write idempotent.

### MED-6 — Provider failures are silent and can block a request for about 36 seconds

- **Severity:** Medium
- **Path/line:** `frontend/lib/llm.ts:66-101`; `frontend/app/api/interview/turn/route.ts:44-54,159-173`
- **What is wrong:** Three providers are tried with a 12-second timeout each (`frontend/lib/llm.ts:84`), errors are swallowed without logging, and the client silently receives bank/rule fallbacks.
- **Repro/how found:** Static trace. With all three keys configured and endpoints hanging, one request can wait roughly 36 seconds with no monitoring signal.
- **Suggested fix:** Log provider failures, cap the total chain timeout rather than each provider independently, and expose a degraded-mode signal to the client/monitoring.

### LOW-4 — Target preference arrays have no length bound

- **Severity:** Low
- **Path/line:** `frontend/lib/validations/target.ts:8-12`; `frontend/app/actions/target.ts:31-35`
- **What is wrong:** IDs are checked against static lists, but duplicate IDs are allowed and both arrays are unbounded.
- **Repro/how found:** Static read. Calling `saveTargetPreference` with a very large array of repeated valid IDs passes validation and is written as one large JSON string.
- **Suggested fix:** Add `.max(...)` to both arrays and optionally `.refine(...)` to reject duplicates.

## Migration and deployment risks

### Migration inventory and model delta

- **Files present:** `001_initial`, `002_profile_analysis`, `002_profile_snapshots`, `003_merge_heads`, `004_credit_transactions`, `005_credit_orders`, `006_interview_phase1`, `007_remedial_actions`, `008_profile_personal_fields`, `009_profile_avatar`, `010_mentor_messages`, `011_mentor_conversations`, `012_challenge_language`, `013_roadmap_action_id_text`, `014_unique_aggregate_rows`, `015_roadmap_status_columns`.
- **Order/duplication:** The two `002_*` files are a historical branch, not duplicate revisions: both descend from `001_initial` (`002_profile_analysis.py:9-10`, `002_profile_snapshots.py:12-13`) and are merged by `003_merge_heads.py:23-24`. Both are no-ops (`002_profile_analysis.py:15-16`, `002_profile_snapshots.py:18`), so no duplicate DDL is created. The chain from `003` through `015` is linear.
- **Idempotency:** `001_initial.py:22-23` uses `create_all(checkfirst=True)`. `010_mentor_messages.py:29-33`, `011_mentor_conversations.py:37-55`, `012_challenge_language.py:28-36`, `013_roadmap_action_id_text.py:28-42`, `014_unique_aggregate_rows.py:99-119` and `015_roadmap_status_columns.py:30-39` all guard their DDL with table/column/constraint inspection. No migration was found that blindly re-runs DDL against an already-migrated schema.

| Code-owned schema element | Migration source | Status |
|---|---|---|
| `users.token_version` | `014_unique_aggregate_rows.py:105-109` | Missing from live chain; CRIT-2/DEPLOY-1. |
| Unique `profile_snapshots.user_id`, `gap_reports(snapshot_id,target_role_id)`, `roadmaps.gap_report_id` | `014_unique_aggregate_rows.py:19-23,111-119` | Missing from live chain; DEPLOY-1. |
| `roadmaps.status`, `roadmaps.error` | `015_roadmap_status_columns.py:20-39` | Missing from live chain; CRIT-2. |
| `mentor_messages` table and indexes | `010_mentor_messages.py:34-43` | Present in working tree only. |
| `mentor_conversations` table, `mentor_messages.conversation_id` | `011_mentor_conversations.py:40-55` | Present in working tree only. |
| `challenges.language` | `012_challenge_language.py:32-36` | Present in working tree only. |
| `roadmap_milestones.linked_action_id` → `TEXT` | `013_roadmap_action_id_text.py:34-42` | Present in working tree only; PostgreSQL startup helper also widens it at `backend/main.py:76-85`. |
| `users.is_active` | None | CRIT-3: only fresh `create_all` and the SQLite-only startup helper add it. |
| `profile_snapshots` personal/avatar fields | `008_profile_personal_fields.py:23`, `009_profile_avatar.py:33-34` | Present and chained. |

`Base.metadata.create_all` at `backend/main.py:117-119` creates missing tables but never adds columns to existing tables; every dependency above on older stamped databases is therefore a real deploy risk.

### DEPLOY-1 — Required migrations and CI fixes exist only in the working tree

- **Severity:** High
- **Path/line:** `alembic/versions/014_unique_aggregate_rows.py:14-16`; `alembic/versions/015_roadmap_status_columns.py:15-16`; `backend/tests/conftest.py:16`; `pytest.ini:1`; `.github/workflows/ci.yml:20-31,55-71`
- **What is wrong:** `014`, `015`, `conftest.py` and `pytest.ini` are untracked; CI/config files are modified. A clean clone at the last commit will not contain the migrations or the test fixtures the current checks rely on.
- **Repro/how found:** `git ls-files alembic/versions` stops at `013`; `git status --short --untracked-files=all` lists `014`, `015`, `conftest.py` and `pytest.ini` as untracked. No commit or push was made.
- **Suggested fix:** Commit the scoped migration/CI set together, run CI from a clean clone, and verify `alembic heads` before deployment.

### DEPLOY-2 — Root Vercel rewrite collapses all API paths to `/api/index`

- **Severity:** High
- **Path/line:** `vercel.json:2-6`; `api/index.py:9-11`; `backend/main.py:150-161`
- **What is wrong:** `source: /api/(.*)` → `destination: /api/index`. Under Vercel's newer Python request-path behavior, FastAPI may receive `/api/index`, which is not registered; every API call could 404.
- **Repro/how found:** Static config trace only. No preview deployment was created and no production URL was contacted, so this is a release risk rather than a confirmed live break.
- **Suggested fix:** Remove the rewrite if the Python catch-all already routes `/api/*` to `api/index.py`, or preserve the original path. Verify `/api/health` and one authenticated route on a preview deployment.

### DEPLOY-3 — README deployment guidance is stale

- **Severity:** Medium
- **Path/line:** `README.md:201-210`; `PHASE.md:124`; `frontend/vercel.json:2`
- **What is wrong:** README tells operators to apply only `014`; `015` is also required or roadmap reads 500. There is no concise two-Vercel-project deploy section covering shared `JWT_SECRET_KEY`, `BACKEND_API_URL`, `INTERVIEW_DATABASE_URL` in the build env, and migration timing.
- **Repro/how found:** Compared README with PHASE.md, MEMORY.md and the Vercel build command.
- **Suggested fix:** Add a short deployment section listing required env vars per project, migration order `014 → 015`, and the `ENVIRONMENT=production` prerequisites.

### DEPLOY-4 — CI does not exercise the production Prisma build path

- **Severity:** Medium
- **Path/line:** `.github/workflows/ci.yml:55-71`; `frontend/vercel.json:2`; `frontend/prisma/schema.prod.prisma:7-10`
- **What is wrong:** CI generates/builds against SQLite `schema.prisma`; Vercel validates and migrates against the production Postgres schema. A broken prod schema or migration can pass CI.
- **Repro/how found:** Compared the `--schema` arguments and `INTERVIEW_DATABASE_URL` values in CI and Vercel config.
- **Suggested fix:** Add `prisma validate --schema prisma/schema.prod.prisma` and a migrate check against an ephemeral Postgres in CI.

### DEPLOY-5 — Production Prisma migrations run inside the Vercel build step

- **Severity:** Medium
- **Path/line:** `frontend/vercel.json:2`
- **What is wrong:** `prisma migrate deploy` runs against `INTERVIEW_DATABASE_URL` on every build, before the build artifact is known to succeed; concurrent builds can also race migrations.
- **Repro/how found:** Config read. An unreachable production DB makes the build fail before artifact creation.
- **Suggested fix:** Move migrations to a separate deploy/release step with explicit rollback control.

## Security checklist

| Area | Status | Evidence / note |
|---|---|---|
| Password hashing and length | Pass (static/local) | bcrypt at `backend/auth.py:13-18`; 8–128 chars and 72-byte cap at `backend/api/auth.py:53-64`. |
| JWT verification and admin role checks | Partial | Backend checks are correct at `backend/api/dependencies.py:13-46`; Next-owned routes fail HIGH-7. |
| Ownership filters on user data | Pass (static, not exhaustive) | Gap/roadmap/mentor/profile queries join or filter by `current_user.id`; examples at `backend/api/roadmap.py:39-45,140-145`. |
| GitHub OAuth state | Pass (static) | Signed, user-bound, 10-minute state with replay nonce at `backend/auth.py:45-60`; used with `_used_github_states` at `backend/api/profile.py:32-34`. |
| Private avatar delivery | Pass (static) | Proxy endpoint with 60-second presigned redirect and ownership check at `backend/api/profile.py:325-346`. |
| Refresh-token rotation/revocation | Fail | HIGH-3: replayable refresh tokens and no production version increment. |
| Rate limiting | Fail | HIGH-5: auth-only, per-process, proxy-keyed, unbounded keys; HIGH-8: no voice-interview quota/throttle. |
| Production secret checks | Fail | HIGH-6: strict validator disabled on Vercel. |
| Committed secrets | Pass (static/git history scan) | Tracked env files are `.env.example` and `frontend/.env.example`; a history pattern scan found placeholders/test tokens only. No value was printed. |
| Token storage | Accepted risk | `localStorage` matches locked AUDIT-5 decision; no concrete XSS sink found statically, but tokens remain readable by script. |
| Prisma write idempotency | Partial | MED-5: replayed `finish` duplicates answers and overwrites reports. |
| CORS | Not configured/documented | LOW-3; current UI uses same-origin proxy. |
| Production URL/DB verification | Not performed | Explicitly out of scope for this audit. |

## Test results

| Check | Result |
|---|---|
| Dependency install | NOT RUN; the existing `.venv` and `frontend/node_modules` were used. No lockfile/source change was made. |
| Backend pytest | `219 passed, 1 warning in 25.06s`; warning is Starlette's deprecated `HTTP_422_UNPROCESSABLE_ENTITY`. |
| Backend lint | `.\.venv\Scripts\python.exe -m ruff check backend/` → `All checks passed!` |
| Frontend tests | `npm test` → 5 files, 27 tests passed. |
| Frontend lint | `npm run lint` → no ESLint warnings/errors; `next lint` deprecation notice only. |
| Frontend typecheck | `npm run typecheck` → pass. |
| Frontend build | `npm run build` → compiled successfully; 28/28 static pages generated. |
| Local DB safety | Smoke databases were temporary `sqlite+aiosqlite` files; no production DB was contacted. |

Local API smoke test, fresh temporary SQLite DB with seeded roles and no `OPENROUTER_API_KEY`:

| Flow | Result | Detail |
|---|---|---|
| Health | PASS | `GET /api/health` → 200, Judge0 ok. |
| Signup | PASS | HTTP 201. |
| Login | PASS | HTTP 200, access token returned. |
| Token refresh | PASS | HTTP 200, new pair returned. |
| Profile update | PASS | HTTP 200, persisted name returned. |
| Avatar upload | PASS | HTTP 200, `avatar_key` returned. |
| Gap roles list | PASS | HTTP 200, 4 roles after seeding. |
| Gap analysis with missing AI key | PASS | HTTP 200, deterministic fallback gaps. |
| Roadmap generate trigger | FAIL | HTTP 500; `TypeError` at `backend/api/roadmap.py:59`. |
| Roadmap status read | FAIL | Subsequent GET returned 404; no roadmap/milestones created. |
| Mentor create conversation | PASS | HTTP 200. |
| Mentor missing-key behavior | PASS | HTTP 502 with detail `Mentor AI is not configured. Please set OPENROUTER_API_KEY.` |
| Mentor history after failed message | Observed | HTTP 200 with 0 messages; the failed turn was not committed. |
| Challenges language filter | PASS | HTTP 200, 5 Python challenges returned. |

Reticle was not run for this audit: it changes no user-visible code. The earlier light-theme verification remains recorded in MEMORY.md. The follow-up frontend findings (HIGH-7, HIGH-8, MED-5, MED-6, LOW-4) are static-analysis only and were not runtime-reproduced.

## Recommended fix order

1. Fix CRIT-1 so first-time roadmap generation returns `generating` instead of 500; add the regression test.
2. Commit the scoped `014`/`015`/CI files from DEPLOY-1, add the missing `users.is_active` migration (CRIT-3), then apply migrations `010` → `015` plus that new revision to the production DB after backup. Verify columns/revision before any code deploy (CRIT-2). Resolve DEPLOY-2 on a preview deployment and confirm `/api/health` plus one authenticated route are not rewritten to `/api/index`.
3. Fix the auth-consistency bundle: HIGH-7 (Next-owned routes enforce `ver`/`is_active`), HIGH-3 (refresh rotation/version revocation) and HIGH-4 (expired-session token preservation).
4. Fix the spend-control bundle: HIGH-1 (atomic LLM reservation with visible 429s), HIGH-2 (bounded backend interview answers/transcripts) and HIGH-8 (voice-interview quota/turn cap).
5. Add shared throttles and timeout control: HIGH-5, MED-6 and the LLM-triggering routes in both stacks.
6. Harden Prisma writes: MED-5 (`endedAt` guard, unique `(sessionId, index)`, idempotent finish) and LOW-4 (bounded target arrays).
7. Complete production secret prerequisites and enable validation (HIGH-6); update env examples and deployment docs (`MED-4`, `DEPLOY-3`, `DEPLOY-4`, `DEPLOY-5`).
8. Then handle the lower-risk API/UI cleanup: MED-1, MED-2, MED-3, LOW-1, LOW-2 and LOW-3.

No production migration, push or deployment was performed. Those actions remain awaiting explicit approval.
