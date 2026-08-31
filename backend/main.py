import logging
import re
from fastapi import FastAPI
from contextlib import asynccontextmanager

from backend.api.health import router as health_router
from backend.api.auth import router as auth_router
from backend.api.profile import router as profile_router
from backend.api.roles import router as roles_router
from backend.api.admin_topics import router as admin_topics_router
from backend.api.admin_users import router as admin_users_router
from backend.api.admin_usage import router as admin_usage_router
from backend.api.gap import router as gap_router
from backend.api.roadmap import router as roadmap_router
from backend.api.challenges import router as challenges_router
from backend.api.interviews import router as interviews_router
from backend.api.credits import router as credits_router
from backend.api.admin_credits import router as admin_credits_router
from backend.api.payments_webhook import router as payments_webhook_router
from backend.database import engine, Base

logger = logging.getLogger(__name__)


class RedactSensitiveQueryParams(logging.Filter):
    """Redact sensitive query-string values (OAuth auth codes, state, tokens)
    from uvicorn access logs before they are written to disk/console.

    The uvicorn access logger records the full request URL, including
    `?code=...&state=...` for the GitHub connect callback. Codes and tokens
    must never appear in logs.

    NOTE: uvicorn's access formatter builds the log line from `record.args`
    (specifically args[2] = full_path), NOT from record.msg. So this filter
    sanitizes the full_path element of record.args.
    """

    # Match ?key=value pairs (also after & or at start) and blank the value.
    _SENSITIVE_KEYS = ("code", "state", "token", "access_token", "refresh_token")

    @staticmethod
    def _redact(text: str) -> str:
        for key in RedactSensitiveQueryParams._SENSITIVE_KEYS:
            pattern = re.compile(rf"([?&]{key}=)([^&\s]*)", re.IGNORECASE)
            text = pattern.sub(rf"\1[REDACTED]", text)
        return text

    def filter(self, record: logging.LogRecord) -> bool:
        # Sanitize the full_path argument (args[2]) used by uvicorn's formatter.
        if isinstance(record.args, (tuple, list)) and len(record.args) >= 5:
            client_addr, method, full_path = record.args[0], record.args[1], record.args[2]
            if isinstance(full_path, str) and ("?" in full_path):
                redacted = self._redact(full_path)
                if redacted != full_path:
                    new_args = list(record.args)
                    new_args[2] = redacted
                    record.args = tuple(new_args)
        return True


async def _apply_lightweight_migrations(conn):
    """Idempotent, non-destructive column migrations for pre-existing dev DBs.

    The project relies on `Base.metadata.create_all`, which creates missing
    TABLES but never ALTERs an existing table. When a column is later added to
    a model, an existing dev DB keeps the old shape and every query that
    references the new column fails. Since production will use proper Alembic
    migrations (not built yet), this covers the SQLite dev DB non-destructively.

    Current migrations:
      - users.is_active (added for PRD §6.7 enable/disable)
    """

    # SQLite: inspect columns via PRAGMA. Portable enough here because the dev
    # DB is SQLite (P2-1); Postgres prod will use Alembic when it exists.
    def _column_exists(conn_sync, table: str, column: str) -> bool:
        rows = conn_sync.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
        return any(r[1] == column for r in rows)

    async def _ensure_column(table: str, column: str, ddl: str):
        exists = await conn.run_sync(lambda c: _column_exists(c, table, column))
        if not exists:
            await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
            logger.info("Migration: added %s.%s", table, column)

    from sqlalchemy import text

    await _ensure_column("users", "is_active", "BOOLEAN NOT NULL DEFAULT 1")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Attach the redactor in startup, AFTER uvicorn has configured its loggers
    # (uvicorn's logging config otherwise clears any filter added at import).
    access_logger = logging.getLogger("uvicorn.access")
    if not any(isinstance(f, RedactSensitiveQueryParams) for f in access_logger.filters):
        access_logger.addFilter(RedactSensitiveQueryParams())
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await _apply_lightweight_migrations(conn)
        logger.info("Database tables created/verified")
    except Exception as e:
        # Hard-fail: never start the API without a working database. Starting
        # without a DB causes write endpoints (signup, resume upload, etc.) to
        # fail silently and leave users with phantom/empty accounts (e.g., a
        # user who "registered" can never log back in). Fail loudly instead.
        logger.error(f"CRITICAL: Database unavailable, refusing to start: {e}")
        raise RuntimeError(
            f"Database connection failed at startup: {e}. "
            "Check DATABASE_URL and that the database is reachable."
        ) from e
    yield
    await engine.dispose()


app = FastAPI(
    title="Career Platform API",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(roles_router, prefix="/api")
app.include_router(admin_topics_router, prefix="/api")
app.include_router(admin_users_router, prefix="/api")
app.include_router(admin_usage_router, prefix="/api")
app.include_router(gap_router, prefix="/api")
app.include_router(roadmap_router, prefix="/api")
app.include_router(challenges_router, prefix="/api")
app.include_router(interviews_router, prefix="/api")
app.include_router(credits_router, prefix="/api")
app.include_router(admin_credits_router, prefix="/api")
app.include_router(payments_webhook_router, prefix="/api")
