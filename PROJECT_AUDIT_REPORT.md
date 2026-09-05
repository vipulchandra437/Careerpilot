# Career Platform Project Audit Report

**Audit date:** 2026-09-04  
**Scope:** Backend, frontend, migrations, tests, configuration, repository hygiene, and Graphify-preserved artifacts.

## Executive summary

The project is healthy for local development and the current automated test/build checks are passing. The backend suite has **188 passing tests**, all backend Python modules compile, and the Next.js frontend typechecks and produces a successful production build for all **22 routes**.

The main remaining risks are production-hardening items that require infrastructure or a larger authentication workflow. The local SQLite/mock suite is green; PostgreSQL concurrency behavior and self-hosted Judge0 still need deployment-level verification.

## Verification performed

| Check | Result |
|---|---|
| Backend test suite | **188 passed, 0 warnings** |
| Backend + Alembic Python compilation | **Passed** (`PYTHON_COMPILE_OK`) |
| Frontend TypeScript validation | **Passed** |
| Next.js production build | **Passed**; 22/22 routes generated |
| Editor diagnostics | **No errors reported** |
| Patch integrity | No diff-check errors; only normal CRLF conversion warnings |
| Tracked secret/runtime artifact scan | `.env`, database, dependencies, and `.next` ignored |
| Graphify output | Preserved as requested |

## Confirmed findings

### Fixed: Alembic migration branch duplication

**Files:** `alembic/versions/002_profile_analysis.py`, `alembic/versions/002_profile_snapshots.py`, `alembic/versions/003_merge_heads.py`

The historical `002_profile_snapshots` branch was a duplicate table-creation branch. It is now an intentional no-op, leaving `002_profile_analysis` as the schema-producing branch before the merge.

**Verification:** Python compilation passes. A clean-database Alembic upgrade should still be run against PostgreSQL before launch.

**Remaining action:** Run `alembic upgrade head` against a disposable PostgreSQL database and document the result.

### Fixed: Startup no longer runs SQLite migration SQL on PostgreSQL

**File:** `backend/main.py`

The lightweight compatibility helper now returns immediately for non-SQLite dialects. PostgreSQL schema changes are left to Alembic.

**Verification:** Backend tests and Python compilation pass.

**Remaining action:** Add a clean PostgreSQL startup/integration test.

### Fixed: Credit deductions are serialized on PostgreSQL

**File:** `backend/services/credit.py`

Credit authorization now selects the user row with `FOR UPDATE` before checking free allowance and balance. Purchase fulfillment also locks its order and keeps the ledger/order update in one transaction.

**Impact before the fix:** A user could spend more credits than their balance under concurrent requests.

**Remaining action:** Add a real PostgreSQL concurrency test; SQLite tests cannot prove row-lock behavior.

### Fixed: Stripe fulfillment validation and concurrency protection

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

### Access-token refresh is not wired in the frontend

**Files:** `frontend/lib/auth.ts`, `backend/api/auth.py`

The frontend stores a refresh token, but the browser client does not transparently call the refresh endpoint after access-token expiry.

**Impact:** Users may be logged out after the 30-minute access token expires.

**Recommendation:** Add one shared authenticated-fetch wrapper that refreshes once on `401`, retries the original request, and clears tokens if refresh fails. Prefer secure HttpOnly cookies for production token storage.

### Fixed: Production configuration validation

**File:** `backend/config.py`

Production validation now rejects the placeholder JWT secret, missing GitHub encryption key, HTTP storage, default MinIO credentials, missing OpenRouter credentials, public Judge0, missing Judge0 auth headers, and incomplete Stripe credentials when Stripe is enabled.

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
- `.reticle/` deletion is present in the worktree and was not changed by the audit.
- Disposable runtime logs and pytest cache were removed.
- `graphify-out/` was intentionally preserved.
- No tracked `.env`, database, `node_modules`, `.next`, Python bytecode, or log files were found.

## Recommended release order

1. Run the revised Alembic history on a clean PostgreSQL database.
2. Add PostgreSQL integration and concurrency tests for credits and Stripe.
3. Add token refresh and secure production cookie handling.
4. Migrate Judge0 from the public service to the self-hosted deployment kit.

## Conclusion

The current project is **green for local development and automated regression checks**, but it is not yet fully production-ready. The report’s P0/P1 findings should be addressed before deploying for real users or processing live payments. No new runtime error was found in the current local test/build pass; the remaining issues are deployment portability, concurrency, and production integration hardening.
