"""Test-only database setup.

CI has no .env, and the app default is Postgres. Point every pytest process at
its own temporary SQLite DB before any backend module creates the engine.
"""
import asyncio
import atexit
import os
import shutil
import tempfile

import pytest

_db_dir = tempfile.mkdtemp(prefix="career_platform_test_")
atexit.register(shutil.rmtree, _db_dir, ignore_errors=True)
os.environ.setdefault(
    "DATABASE_URL",
    "sqlite+aiosqlite:///" + os.path.join(_db_dir, "test.db").replace("\\", "/"),
)


@pytest.fixture(scope="session", autouse=True)
def _create_test_schema():
    """Some tests use ASGI transport without the app lifespan, so create tables once."""
    import backend.models  # noqa: F401 — registers every mapped table
    from backend.database import Base, engine

    async def create() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    asyncio.run(create())
