from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.sandbox.executor import SandboxRunError, check_health

router = APIRouter()


class Judge0Health(BaseModel):
    status: str
    version: str


class HealthResponse(BaseModel):
    status: str
    version: str
    judge0: Judge0Health | None = None


@router.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    # Verify the database is actually reachable. This makes it impossible for
    # the API to report healthy while running in a broken no-DB state, which
    # previously caused registration to fail silently.
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )
    # Report code-execution sandbox reachability (works against both public CE
    # and self-hosted Judge0 via the same config-driven code path). A failure
    # here degrades the sandbox health field but does NOT fail the whole health
    # check — the DB is the hard dependency; sandbox availability is surfaced
    # separately so a Judge0 outage is visible without blocking the API itself.
    judge0 = None
    try:
        judge0 = Judge0Health(**check_health())
    except SandboxRunError:
        judge0 = Judge0Health(status="unreachable", version="unknown")
    return HealthResponse(status="ok", version="0.1.0", judge0=judge0)
