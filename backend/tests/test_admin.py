"""Phase 5 admin tests (RULES §2, PHASE.md Phase 5, PRD §6.7).

Runs against an isolated in-memory SQLite engine (NOT the dev DB), so the tests
are hermetic and repeatable. Covers:
  - challenge topic-bank CRUD behavior (create/update/delete/list, case-
    insensitive unique name, validation, 404).
  - SECURITY (RULES §2): a non-admin user's direct API calls to admin endpoints
    are rejected server-side with 403 — for BOTH the target-role CRUD that
    predates this phase and the new topic-bank CRUD. Tested at the FastAPI
    layer with real tokens, not frontend hiding.
"""

import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.database import Base, get_db
from backend.models import User, UserRole, ChallengeTopic  # noqa: F401 (tables)
from backend.auth import create_access_token

_engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool)


async def _override_get_db():
    maker = async_sessionmaker(_engine, expire_on_commit=False)
    async with maker() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    app.dependency_overrides[get_db] = _override_get_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            yield c
    finally:
        app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def _setup_db():
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


async def _make_user(role: UserRole, email: str | None = None) -> User:
    maker = async_sessionmaker(_engine, expire_on_commit=False)
    async with maker() as db:
        u = User(email=email or f"u-{uuid.uuid4().hex[:8]}@example.com", role=role)
        db.add(u)
        await db.commit()
        await db.refresh(u)
        return u


async def _token(user: User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user.id, user.role.value)}"}


# ---------------------------------------------------------------------------
# topic bank CRUD
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_topic_crud_lifecycle(client, _setup_db):
    admin = await _make_user(UserRole.admin)
    headers = await _token(admin)

    r = await client.post("/api/admin/topics", headers=headers, json={"name": "  SQL  "})
    assert r.status_code == 201
    topic_id = r.json()["id"]
    assert r.json()["name"] == "SQL"
    assert r.json()["enabled"] is True

    r = await client.get("/api/admin/topics", headers=headers)
    assert r.status_code == 200
    assert any(t["id"] == topic_id for t in r.json())

    r = await client.put(
        f"/api/admin/topics/{topic_id}",
        headers=headers,
        json={"enabled": False, "description": "Database work"},
    )
    assert r.status_code == 200
    assert r.json()["enabled"] is False
    assert r.json()["description"] == "Database work"

    r = await client.delete(f"/api/admin/topics/{topic_id}", headers=headers)
    assert r.status_code == 204

    r = await client.get("/api/admin/topics", headers=headers)
    assert not any(t["id"] == topic_id for t in r.json())


@pytest.mark.asyncio
async def test_topic_case_insensitive_duplicate_rejected(client, _setup_db):
    admin = await _make_user(UserRole.admin)
    headers = await _token(admin)
    await client.post("/api/admin/topics", headers=headers, json={"name": "Redis"})
    r = await client.post("/api/admin/topics", headers=headers, json={"name": "  redis  "})
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_topic_empty_name_rejected(client, _setup_db):
    admin = await _make_user(UserRole.admin)
    headers = await _token(admin)
    r = await client.post("/api/admin/topics", headers=headers, json={"name": "   "})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_topic_update_404(client, _setup_db):
    admin = await _make_user(UserRole.admin)
    headers = await _token(admin)
    r = await client.put("/api/admin/topics/does-not-exist", headers=headers, json={"enabled": False})
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# SECURITY: non-admin direct API calls must be rejected (RULES §2)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_non_admin_forbidden_on_topic_bank(client, _setup_db):
    student = await _make_user(UserRole.student)
    headers = await _token(student)
    for method, path, body in [
        ("GET", "/api/admin/topics", None),
        ("POST", "/api/admin/topics", {"name": "Hack"}),
        ("PUT", "/api/admin/topics/nope", {"enabled": False}),
        ("DELETE", "/api/admin/topics/nope", None),
    ]:
        r = await client.request(method, path, headers=headers, json=body)
        assert r.status_code == 403, f"{method} {path} -> {r.status_code}: admin gate broken"


@pytest.mark.asyncio
async def test_non_admin_forbidden_on_target_roles(client, _setup_db):
    """The pre-existing target-role CRUD must be gated too (RULES §2)."""
    student = await _make_user(UserRole.student)
    headers = await _token(student)
    for method, path, body in [
        ("GET", "/api/admin/roles", None),
        ("POST", "/api/admin/roles", {"name": "Rogue Role", "required_skills": []}),
        ("DELETE", "/api/admin/roles/nope", None),
    ]:
        r = await client.request(method, path, headers=headers, json=body)
        assert r.status_code == 403, f"{method} {path} -> {r.status_code}: admin gate broken"


@pytest.mark.asyncio
async def test_unauthenticated_rejected(client, _setup_db):
    r = await client.get("/api/admin/topics")
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_admin_can_reach_target_roles(client, _setup_db):
    """Sanity: an admin is allowed through the same gate (not blanket-403)."""
    admin = await _make_user(UserRole.admin)
    headers = await _token(admin)
    r = await client.get("/api/admin/roles", headers=headers)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_admin_can_reach_topic_bank(client, _setup_db):
    admin = await _make_user(UserRole.admin)
    headers = await _token(admin)
    r = await client.get("/api/admin/topics", headers=headers)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_signup_creates_student_role(client, _setup_db):
    """Admin must never be reachable via public signup (RULES §2)."""
    email = f"signup-{uuid.uuid4().hex[:8]}@example.com"
    r = await client.post(
        "/api/auth/signup",
        json={"email": email, "password": "s3cret-password"},
    )
    assert r.status_code == 201
    maker = async_sessionmaker(_engine, expire_on_commit=False)
    async with maker() as db:
        u = (await db.execute(select(User).where(User.email == email))).scalar_one()
        assert u.role == UserRole.student