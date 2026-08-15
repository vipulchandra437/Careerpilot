# CareerPilot

An AI-assisted career development platform for computer science students. It performs real-time skill gap analysis, generates coding challenges, simulates interviews, and produces personalized career roadmaps — powered by OpenRouter LLMs.

## Features

- **Skill assessment & gap analysis** — students rate their skills; the system compares them against target job roles and flags gaps.
- **AI career roadmap & reports** — generates a personalized career roadmap and a downloadable/printable career report with readiness scores.
- **Coding practice** — a built-in problem list (12 seeded problems) with a Monaco editor, Python & JavaScript runtimes, hidden test cases, and AI-powered feedback on submissions.
- **AI mock interviews** — text-based interview simulation with role-matched questions and structured feedback.
- **Communication feedback** — paste in a speech transcript and get clarity/impact scores plus rewrites.
- **Resume, LinkedIn, GitHub & project analysis** — paste or upload artifacts and get an AI breakdown of strengths and weaknesses.
- **Admin console** — platform analytics (users, assessments, engagement) and a coding-problem manager.
- **Responsive UI** — dark/light themes, Base UI + shadcn component stack, role-based navigation.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Database:** SQLite + Prisma ORM (swap the datasource for PostgreSQL/MySQL in production)
- **Auth:** NextAuth v5 (credentials provider, Prisma adapter, JWT sessions)
- **AI:** OpenRouter (OpenAI-compatible) — model configurable via `OPENROUTER_MODEL`
- **Code execution:** local Python/Node subprocess harness (dev default) or a Piston sandbox (production)
- **UI:** Tailwind CSS v4, Base UI, shadcn, recharts, Monaco editor
- **Testing:** Vitest unit tests, Playwright E2E, ESLint, `tsc --noEmit`

## Prerequisites

- Node.js 20+ (tested on v26)
- Python 3.12+ on PATH (for the local code-execution provider)
- npm 10+

## Getting Started

```bash
npm install
cp .env.example .env   # then fill in values (see below)
npx prisma migrate dev # applies migrations to dev.db
npm run seed           # demo users, skills, problems, companies, job roles
npm run dev            # http://localhost:3000
```

Demo accounts (seeded):

| Role  | Email                     | Password   |
| ----- | ------------------------- | ---------- |
| Student | `student@careerpilot.dev` | `student123` |
| Admin   | `admin@careerpilot.dev`   | `admin123`   |

## Environment Variables

| Variable               | Required | Default                     | Description |
| ---------------------- | -------- | --------------------------- | ----------- |
| `DATABASE_URL`         | yes      | `file:./dev.db`             | Prisma connection string |
| `AUTH_SECRET`          | yes      | —                           | Generate with `npx auth secret` |
| `AUTH_TRUST_HOST`      | hosting  | `true`                      | Required behind a reverse proxy |
| `OPENROUTER_API_KEY`   | yes      | —                           | https://openrouter.ai/keys |
| `OPENROUTER_MODEL`     | no       | `openai/gpt-4o-mini`        | AI model used for all analysis |
| `AI_MAX_TOKENS`        | no       | `2000`                      | Max output tokens per AI call |
| `EXECUTION_PROVIDER`   | no       | `local`                     | `local` (Python/Node subprocess) or `piston` |
| `PISTON_API_URL`       | piston   | `https://emkc.org/api/v2/piston` | Piston sandbox base URL |
| `PISTON_API_KEY`       | piston   | —                           | Token for the public API (required since Feb 2026) or a self-hosted instance |
| `GITHUB_TOKEN`         | no       | —                           | Raises GitHub API rate limits |
| `POSTGRES_PASSWORD`    | compose  | `careerpilot`               | PostgreSQL password (production) |
| `RATE_LIMIT_ENABLED`   | no       | `true`                      | Master switch for API rate limiting |
| `RATE_LIMIT_AUTH`      | no       | `20`                        | Login/register requests per IP per minute |
| `RATE_LIMIT_AI`        | no       | `10`                        | AI analysis calls per IP per minute |
| `RATE_LIMIT_CODING`    | no       | `30`                        | Coding/interview calls per IP per minute |
| `RATE_LIMIT_GENERAL`   | no       | `300`                       | All other mutating API calls per IP per minute |
| `NEXT_PUBLIC_APP_URL`  | hosting  | `http://localhost:3000`     | Canonical app URL |

> **Security:** never commit `.env`. The local execution provider runs code as your host user — it is intended for development only.

## Code Execution Providers

- **`local` (default)** — runs user submissions in a spawned `python`/`node` process with a hard time-to-kill (≤15s), output-size caps, and a shared test harness. Zero external dependencies; ideal for development.
- **`piston`** — for production, self-host Piston (Docker) and point `PISTON_API_URL` at it. Note: the public `emkc.org/api/v2/piston/execute` endpoint now requires an API token (since Feb 15, 2026), and tokens are not granted for individual/portfolio projects.

## Scripts

| Command               | Purpose |
| --------------------- | ------- |
| `npm run dev`         | Start the dev server |
| `npm run build`       | Production build |
| `npm run start`       | Serve the production build |
| `npm run lint`        | ESLint (zero warnings expected) |
| `npm run typecheck`   | `tsc --noEmit` |
| `npm test`            | Vitest unit tests |
| `npm run test:watch`  | Vitest in watch mode |
| `npm run test:coverage` | Vitest with coverage report |
| `npm run test:e2e`    | Playwright E2E suite (starts its own dev server on port 3100) |
| `npm run test:e2e:install` | Install the Playwright Chromium browser |
| `npm run seed`        | Seed demo data (SQLite) |
| `npm run db:reset`    | Drop, migrate & reseed |
| `npm run db:studio`   | Open Prisma Studio |
| `npx prisma migrate dev --name <name>` | Create & apply a migration |
| `npm run db:migrate:deploy:prod` | Apply PostgreSQL migrations |
| `npm run db:seed:prod` | Seed demo data into PostgreSQL |

## Project Structure

```
src/
  app/
    (public)/        # Landing, about, login, register
    (student)/       # Dashboard, profile, skills, coding, interview, reports, settings
    admin/           # Analytics, problems manager
    api/             # Route handlers (auth, profile, coding, interview, AI analyses, admin)
  components/
    ui/              # shadcn/base-ui primitives
    app/             # Shell, sidebar
    (student)/       # Feature components (forms, charts, editors)
  config/            # Navigation
  lib/               # Auth, DB client, utils, AI helpers
  proxy.ts           # Rate limiting + request logging (edge)
  server/            # AI services, code-execution harness + providers
prisma/
  schema.prisma      # SQLite data model (local dev)
  schema.postgres.prisma  # PostgreSQL data model (production)
  migrations/        # SQLite migrations (local dev)
  migrations-postgres/    # PostgreSQL migrations (production)
  seed.ts            # Demo data
```

## Production Deployment (Docker Compose)

The stack ships as three containers: the app, PostgreSQL, and a self-hosted
Piston sandbox for secure code execution.

```bash
cp .env.example .env
# Required: AUTH_SECRET, OPENROUTER_API_KEY
npx auth secret
```

Then start the stack:

```bash
docker compose up -d --build
docker compose run --rm app npm run db:seed:prod   # seed demo data (optional)
```

- App: `http://localhost:3000` — healthcheck on `GET /api/health`.
- PostgreSQL: `127.0.0.1:5432` (not exposed publicly).
- Piston sandbox: `127.0.0.1:2000`, used by the app via `EXECUTION_PROVIDER=piston`.
- A local-only `EXECUTION_PROVIDER=local` remains available for development; it
  runs user code as your OS user and must never be used on a shared host.

### Database strategy

- **Local dev** uses SQLite (`prisma/schema.prisma` + `prisma/migrations/`) —
  zero setup, ideal for development and CI.
- **Production** uses PostgreSQL (`prisma/schema.postgres.prisma` +
  `prisma/migrations-postgres/`). The Dockerfile swaps the PostgreSQL schema and
  migration set into place before installing, and `start.sh` runs
  `prisma migrate deploy` on boot, so the schema is applied automatically.
- To add a production migration during development, connect to a PostgreSQL
  instance and run `DATABASE_URL=... npm run db:migrate:dev:prod`.

### Security & operations hardening

- **Rate limiting** (`src/proxy.ts`): per-IP limits applied to mutating `/api`
  requests — auth (20/min), AI endpoints (10/min), coding/interview (30/min),
  general (300/min). In-memory per instance; move to Redis for multi-instance.
- **Security headers** (`next.config.ts`): CSP, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, HSTS, `Referrer-Policy`, `Permissions-Policy`.
- **Structured logs**: every request is emitted as a single-line JSON log
  (`event`, `method`, `path`, `status`, `durationMs`, `ip`).
- **Non-root container**: the app runs as `node` user; only the Piston sandbox
  needs elevated privileges to install compilers.
- Health check: `GET /api/health` returns `200` when the database is reachable,
  `503` otherwise.

### Continuous integration

`.github/workflows/ci.yml` runs on every push/PR to `master`:

1. **quality** — `npm ci`, typecheck, lint, unit tests, production build.
2. **e2e** — installs Playwright Chromium and runs the full E2E suite against a
   fresh SQLite database (auto-migrated and seeded by the global setup). The
   AI-dependent interview spec is skipped when `OPENROUTER_API_KEY` is unset.
3. **docker** — validates `docker-compose.yml` and builds the production image
   with the GitHub Actions layer cache.

### Automated tests

- **Unit** (`npm test`) — Vitest covers the shared API helpers, the code-execution
  harness, and the readiness score engine in `tests/`.
- **E2E** (`npm run test:e2e`) — Playwright verifies registration, login,
  route protection, the coding workspace (runs code end to end through the
  executor), and — when an AI key is present — a full mock-interview session.

### Backups

The production database is PostgreSQL. Point `pg_dump` at it via the provided
scripts and schedule them with cron / Task Scheduler:

- `scripts/backup-postgres.sh` (Linux/macOS)
- `scripts/backup-postgres.ps1` (Windows)

Both require `DATABASE_URL` and produce timestamped `.sql.gz` files in
`./backups`. Typical cron line (retains 7 days):

```cron
0 2 * * * DATABASE_URL="postgresql://careerpilot:...@db:5432/careerpilot" BACKUP_DIR=/var/backups/careerpilot /path/to/careerpilot/scripts/backup-postgres.sh
```

### Data privacy & audit logging

- **GDPR account export** — `GET /api/account/export` returns every data record
  owned by the signed-in user as a downloadable JSON file.
- **Account deletion** — `DELETE /api/account/delete` permanently removes the
  user and all owned records (cascading deletes) and emits an audit entry.
- **Audit log** — all admin write operations (user/company/job-role/problem/
  skill changes) are recorded in the `AuditLog` table with actor, action,
  target, and IP address. Audit rows are intentionally **not** related to the
  user so they survive account deletion.
- Public-facing **Privacy Policy** and **Terms of Service** pages are at
  `/privacy` and `/terms`.

### Notes

- Set `AUTH_SECRET` and `AUTH_TRUST_HOST=true` when running behind a proxy.
- On a single host without Docker, the app runs entirely on SQLite with the
  `local` execution provider — see Getting Started.

