# Career Platform Project Audit Report

**Audit date:** 2026-09-04  
**Scope:** Backend, frontend, migrations, tests, configuration, repository hygiene, and Graphify-preserved artifacts.

> **Current status (2026-11-27):** This is a historical audit snapshot. The credit/Stripe/payments subsystem described below was removed on 2026-09-05; those findings are retained for history only. The Alembic chain was rebuilt in the 2026-11-22 bug-fix pass and access-token refresh is now wired. A later 2026-11-27 fix pass addressed CI, schema races, auth hardening and frontend state bugs (see MEMORY.md AUDIT-1…AUDIT-6); its measured results are in the tables below. Production deployment, the Alembic `014` migration and live PostgreSQL/self-hosted Judge0 verification remain outstanding.

## Executive summary

The project is healthy for local development and the current automated test/build checks are passing. The backend suite has **217 passing tests**, all backend Python modules compile, and the Next.js frontend typechecks and produces a successful production build for all **28 routes**.

The main remaining risks are production-hardening items that require infrastructure or a larger authentication workflow. The local SQLite/mock suite is green; PostgreSQL concurrency behavior and self-hosted Judge0 still need deployment-level verification.

## Verification performed

| Check | Result |
|---|---|
| Backend test suite | **217 passed, 1 deprecation warning** (`HTTP_422_UNPROCESSABLE_ENTITY` from Starlette) |
| Backend lint | `ruff check backend/` — clean |
| Backend + Alembic Python compilation | **Passed** (`compileall`) |
| Frontend TypeScript validation | **Passed** |
| Frontend unit tests | **27 passed** (Vitest) |
| Next.js production build | **Passed**; 28/28 routes generated |
| Browser-driven checks (2026-11-27) | Reticle `verified: yes` for login navigation, `/practice?language=javascript` deep-link filtering, and throttled-login error text |
| Editor diagnostics | **No errors reported** |
| Patch integrity | No diff-check errors; only normal CRLF conversion warnings |
| Tracked secret/runtime artifact scan | `.env`, database, dependencies, and `.next` ignored |
| Graphify output | Preserved as requested |

## Confirmed findings

### Fixed: Alembic migration branch duplication (superseded in 2026-11-22)

**Files:** `alembic/versions/*.py`

The historical `002_profile_snapshots` branch was made a no-op so the merge produces one head. In 2026-11-22 the whole chain was made authoritative: `001_initial` now creates the current schema from `Base.metadata`, and all later revisions are compatibility no-ops that keep already-stamped databases able to reach head.

**Verification:** a fresh-database `alembic upgrade head` test (`backend/tests/test_migrations.py`) proves every model table is created, and an offline PostgreSQL DDL generation test proves the chain emits valid Postgres SQL.

**Remaining action:** run `alembic upgrade head` against a disposable live PostgreSQL database and document the result.

### Fixed: Startup no longer runs SQLite migration SQL on PostgreSQL

**File:** `backend/main.py`

The lightweight compatibility helper now returns immediately for non-SQLite dialects. PostgreSQL schema changes are left to Alembic.

**Verification:** Backend tests and Python compilation pass.

**Remaining action:** Add a clean PostgreSQL startup/integration test.

> The next two findings cover code removed on 2026-09-05 (`backend/services/credit.py`, `backend/services/payments.py`, `backend/api/payments_webhook.py`). They are historical only; no payment or credit code exists in the current tree.

### Fixed: Credit deductions are serialized on PostgreSQL (obsolete)

**File:** `backend/services/credit.py`

Credit authorization now selects the user row with `FOR UPDATE` before checking free allowance and balance. Purchase fulfillment also locks its order and keeps the ledger/order update in one transaction.

**Impact before the fix:** A user could spend more credits than their balance under concurrent requests.

**Remaining action:** Add a real PostgreSQL concurrency test; SQLite tests cannot prove row-lock behavior.

### Fixed: Stripe fulfillment validation and concurrency protection (obsolete)

**Files:** `backend/services/payments.py`, `backend/api/payments_webhook.py`

Signed Checkout events now validate paid status, amount, currency, and optional pack/order metadata before fulfillment. The order is locked and the purchase ledger row plus succeeded status are committed together.

**Verification:** Payment tests pass, including an unpaid Checkout regression test.

**Remaining action:** Add a PostgreSQL concurrent webhook-delivery test.

### Fixed: Frontend API proxy is environment-driven

**File:** `frontend/next.config.js`

The rewrite destination now reads `BACKEND_API_URL`, defaulting to `http://localhost:8000` for local development.

**Verification:** Frontend typecheck and production build pass.

**Deployment action:** Set `BACKEND_API_URL` in the production frontend environment.

## Medium-priority risks

### Access-token refresh is not wired in the frontend (fixed 2026-11-22)

**Files:** `frontend/lib/auth.ts`, `frontend/app/(auth)/login/page.tsx`, `backend/api/auth.py`

The frontend stored a refresh token but never called the refresh endpoint; a 30-minute access-token expiry forced a full re-login. `refreshTokens()` now exchanges the stored token, and the `reason=expired` login path restores the session and redirects by role.

**Remaining hardening:** callers still redirect to login on `401` rather than retrying the original request; secure HttpOnly cookie storage is a production decision.

### Fixed: Production configuration validation

**File:** `backend/config.py`

Production validation now rejects the placeholder JWT secret, missing GitHub encryption key, HTTP storage, default MinIO credentials, missing OpenRouter credentials, public Judge0, and missing Judge0 auth headers. Stripe validation was removed with the payments subsystem.

**Verification:** An insecure production-shaped configuration is rejected and a complete production-shaped configuration is accepted.

**Deployment action:** Set the required production values before startup; use `ENVIRONMENT=production` to activate these checks.

### Fixed: Admin usage query is database-neutral

**File:** `backend/api/admin_usage.py`

The usage aggregation now uses SQLAlchemy `EXTRACT` year/month expressions, which compile for both SQLite and PostgreSQL.

**Verification:** Backend tests and Python compilation pass.

**Remaining action:** Add a PostgreSQL integration test for the dashboard endpoint.

### Public Judge0 remains a development dependency

**Files:** `backend/config.py`, `deploy/judge0/README.md`

The default execution endpoint is the public Judge0 CE service. This is acceptable for local development but is not the final production deployment model.

**Impact:** Shared-service availability, rate limits, and operational control are unsuitable for a commercial launch.

**Recommendation:** Deploy the provided self-hosted Judge0 stack on a secured VM, enable authentication, point `JUDGE0_BASE_URL` and `JUDGE0_AUTH_HEADERS` to it, and rerun the sandbox load/security checks.

## Warnings found during tests

The earlier three async-mock warnings were fixed by modeling SQLAlchemy's
synchronous `add` and `add_all` methods with `Mock`. The current full suite
finishes with **0 warnings**. A previous `PyPDF2` deprecation warning was also
observed in the broader project history; the service should standardize on the
already-declared `pypdf` dependency.

## Security controls verified by the existing project evidence

- Student code is routed through the external Judge0 executor rather than executed in the API process.
- GitHub tokens use Fernet encryption at rest.
- Admin endpoints enforce server-side role checks.
- Roadmap endpoints enforce profile ownership.
- Resume and LinkedIn uploads have bounded 10 MB reads.
- Invalid LinkedIn UTF-8 input returns a controlled validation error.
- Sensitive query parameters are redacted from Uvicorn access logs.
- `.env`, local databases, dependencies, and Next.js build output are ignored.

## Repository cleanup status

- `.claude/` was deleted as requested.
- `.reticle/` runtime journals are now ignored (`.gitignore`, 2026-11-27); they are not deliverables.
- Disposable runtime logs and pytest cache were removed.
- `graphify-out/` was intentionally preserved.
- No tracked `.env`, database, `node_modules`, `.next`, Python bytecode, or log files were found.

## Recommended release order

1. Run the revised Alembic history on a clean PostgreSQL database.
2. Add PostgreSQL integration tests for the admin usage dashboard and row-lock behavior where applicable.
3. Move token storage to secure HttpOnly cookies and retry the original request after a transparent refresh.
4. Migrate Judge0 from the public service to the self-hosted deployment kit and boot it on the production VM.

## Conclusion

The current project is **green for local development and automated regression checks**, but it is not yet fully production-ready. The report’s P0/P1 findings should be addressed before deploying for real users or processing live payments. No new runtime error was found in the current local test/build pass; the remaining issues are deployment portability, concurrency, and production integration hardening.
