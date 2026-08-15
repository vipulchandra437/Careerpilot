# CareerPilot VPS Deployment Runbook

Deploy the full production stack (Next.js app + PostgreSQL + Redis + self-hosted
Piston sandbox) on a single Ubuntu VPS.

## Stack

| Service  | Image / build              | Purpose                                  |
| -------- | -------------------------- | ---------------------------------------- |
| `app`    | built from `Dockerfile`    | Next.js app (Prisma -> Postgres)         |
| `db`     | `postgres:16-alpine`       | Primary database                         |
| `redis`  | `redis:7-alpine`           | Rate limiting + future queues            |
| `piston` | `ghcr.io/engineer-man/piston` | Code-execution sandbox (self-hosted)  |

All services run under one compose project named `careerpilot`. Data persists in
the named volumes `pgdata`, `redisdata`, `piston_packages`, `piston_compilers`.

## Prerequisites

- Ubuntu 22.04 or 24.04 VPS, >= 2 GB RAM, >= 20 GB disk.
- A public hostname or IP you control (for `NEXT_PUBLIC_APP_URL`).
- An OpenRouter API key: https://openrouter.ai/keys

## Quick start (one command)

```bash
sudo bash scripts/deploy/deploy.sh      # run 1: installs Docker, clones repo, creates .env, exits
sudo nano /opt/careerpilot/.env         # fill in secrets (see .env reference below)
sudo bash scripts/deploy/deploy.sh      # run 2: builds and starts everything
```

Or copy `scripts/deploy/deploy.sh` to the server and run `sudo bash deploy.sh`.

## Environment reference (`.env`)

| Variable                  | Required | Notes                                                        |
| ------------------------- | -------- | ------------------------------------------------------------ |
| `POSTGRES_PASSWORD`       | yes      | Long random value. Persisted in the `pgdata` volume.         |
| `AUTH_SECRET`             | yes      | >= 32 chars. Generate with `npx auth secret`.                |
| `OPENROUTER_API_KEY`      | yes      | Powers mentor, interview, resume, GitHub/LinkedIn analysis.  |
| `NEXT_PUBLIC_APP_URL`     | yes      | e.g. `https://careerpilot.example.com`.                      |
| `OPENROUTER_MODEL`        | no       | Default `openai/gpt-4o-mini`.                                |
| `PISTON_API_KEY`          | no       | Shared secret between app and piston (compose default works).|
| `RATE_LIMIT_*`            | no       | Per-IP per-minute limits (auth/ai/coding/general).           |

Everything else in `.env.example` has sane defaults. `DATABASE_URL` and
`REDIS_URL` are wired automatically by compose; do not override them.

## First boot

- `start.sh` runs `prisma migrate deploy` before starting the app, so the
  Postgres schema is created automatically.
- The piston bootstrap installs the Python and JavaScript runtimes
  (`python 3.10.0`, `javascript 18.15.0`) on first boot and persists them in
  the `piston_packages` volume. It is crash-proof: if a package download fails
  (e.g. GitHub release-assets is unreachable) the API keeps running and the
  bootstrap retries later; the other runtime is still usable.

## Verification

```bash
docker compose ps                       # all 4 services "healthy"
curl -s https://<your-host>/api/health
```

Expected health payload:

```json
{
  "ok": true,
  "database": "ok",
  "aiProvider": "openrouter",
  "executionProvider": "piston",
  "rateLimiter": "redis",
  "configIssues": []
}
```

## Updates

```bash
cd /opt/careerpilot
git pull
sudo bash scripts/deploy/deploy.sh      # or: docker compose up -d --build
```

## Backups

Postgres lives in the named volume `pgdata`. Back up with pg_dump:

```bash
docker compose exec -T db pg_dump -U careerpilot careerpilot > backup-$(date +%F).sql
```

Restore:

```bash
docker compose exec -T db psql -U careerpilot -d careerpilot < backup-YYYY-MM-DD.sql
```

## Hardening

- Open only 80/443 (and 22 for SSH) in the cloud firewall. Ports 5432, 6379,
  and 2000 are bound to `127.0.0.1` only and should not be exposed publicly.
- Put a reverse proxy in front (Caddy or nginx with TLS) that forwards to
  `127.0.0.1:3000`. Set `AUTH_TRUST_HOST=true` (compose already sets it).
- Keep `RATE_LIMIT_ENABLED=true` (compose default) so the public API is
  throttled per IP.

## Troubleshooting

| Symptom                                   | Fix                                                        |
| ----------------------------------------- | ---------------------------------------------------------- |
| App unhealthy / healthcheck failing       | `docker compose logs app --tail=200`                       |
| `PISTON_API_URL` wrong                    | Must be `http://piston:2000/api/v2` (piston-api v3 routes under `/api/v2`). |
| Piston unhealthy                          | `docker compose logs piston --tail=100`. Bootstrap retries runtime installs; check the `piston_packages` volume. |
| Coding submissions time out               | Piston stock limits cap runs at 3s; compose raises them via `PISTON_RUN_TIMEOUT` (default 15s). |
| `P3018` / missing table on Postgres       | Migration SQL must be UTF-8 without a BOM; current migrations are clean. Run `docker compose run --rm app npx prisma migrate deploy`. |
| Port 3000 in use                          | Change the `app` port mapping in `docker-compose.yml` (e.g. `127.0.0.1:3001:3000`) and point the proxy there. |
