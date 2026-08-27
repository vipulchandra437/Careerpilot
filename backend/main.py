import logging
from fastapi import FastAPI
from contextlib import asynccontextmanager

from backend.api.health import router as health_router
from backend.api.auth import router as auth_router
from backend.api.profile import router as profile_router
from backend.database import engine, Base

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified")
    except Exception as e:
        logger.warning(f"Database not available, starting without DB: {e}")
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
