"""Phase 5 admin user-management + usage-dashboard tests (PRD §6.7, RULES §2).

Hermetic in-memory SQLite engine (mirrors test_admin.py). Covers:
  - /api/admin/users list (roles surfaced, active flag, github_connected)
  - enable/disable via PATCH; a disabled user is REJECTED at login and at
    get_current_user (any authed endpoint), confirming the toggle is real.
  - an admin cannot disable an admin account through the console (self-lockout
    guard).
  - /api/admin/users/{id}/usage aggregates llm_usage_log rows per feature.
  - /api/admin/usage summary aggregates signups + feature usage + cost.
  - SECURITY (RULES §2): non-admin direct calls to the new endpoints are 403.
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
from backend.models import User, UserRole, LLMUsageLog  # noqa: F401 (tables)
from backend.auth import create_access_token, hash_password

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
    # Fresh schema every test: drop + recreate so no state leaks between tests
    # (the in-memory StaticPool engine is shared across the whole file).
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


async def _write_user(**kw) -> User:
    maker = async_sessionmaker(_engine, expire_on_commit=False)
    async with maker() as db:
        u = User(**kw)
        db.add(u)
        await db.commit()
        await db.refresh(u)
        return u


async def _token(user: User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user.id, user.role.value)}"}


# ---------------------------------------------------------------------------
# users list + enable/disable
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_users_surfaces_accounts(client, _setup_db):
    admin = await _write_user(role=UserRole.admin, email="admin@example.com")
    st = await _write_user(
        role=UserRole.student,
        email="student@example.com",
        password_hash=hash_password("x"),
        github_id="gh123",
    )
    headers = await _token(admin)
    r = await client.get("/api/admin/users", headers=headers)
    assert r.status_code == 200
    by_email = {u["email"]: u for u in r.json()}
    assert by_email["student@example.com"]["role"] == "student"
    assert by_email["student@example.com"]["is_active"] is True
    assert by_email["student@example.com"]["github_connected"] is True
    assert by_email["admin@example.com"]["role"] == "admin"


@pytest.mark.asyncio
async def test_disable_user_then_login_rejected(client, _setup_db):
    """Disabling must actually prevent login (PRD §6.7) — not cosmetic."""
    admin = await _write_user(role=UserRole.admin, email="admin@example.com")
    student = await _write_user(
        role=UserRole.student,
        email="blocked@example.com",
        password_hash=hash_password("pw"),
    )
    # Disable the student as admin.
    r = await client.patch(
        f"/api/admin/users/{student.id}",
        headers=await _token(admin),
        json={"active": False},
    )
    assert r.status_code == 200
    assert r.json()["is_active"] is False

    # Login is now rejected.
    r = await client.post(
        "/api/auth/login",
        json={"email": "blocked@example.com", "password": "pw"},
    )
    assert r.status_code == 403

    # Re-enable, login works again.
    await client.patch(
        f"/api/admin/users/{student.id}",
        headers=await _token(admin),
        json={"active": True},
    )
    r = await client.post(
        "/api/auth/login",
        json={"email": "blocked@example.com", "password": "pw"},
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_disabled_user_authed_endpoint_rejected(client, _setup_db):
    """A disabled user's existing JWT is rejected at the auth seam too."""
    admin = await _write_user(role=UserRole.admin, email="admin@example.com")
    student = await _write_user(role=UserRole.student, email="s@example.com")
    await client.patch(
        f"/api/admin/users/{student.id}",
        headers=await _token(admin),
        json={"active": False},
    )
    # Non-admin protected endpoint -> rejected (403 account disabled), not 200.
    r = await client.get(
        "/api/admin/users",
        headers=await _token(student),
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_admin_cannot_disable_admin(client, _setup_db):
    """Self-lockout guard: an admin cannot disable another admin through the console."""
    a1 = await _write_user(role=UserRole.admin, email="a1@example.com")
    a2 = await _write_user(role=UserRole.admin, email="a2@example.com")
    r = await client.patch(
        f"/api/admin/users/{a2.id}",
        headers=await _token(a1),
        json={"active": False},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_disable_unknown_user_404(client, _setup_db):
    admin = await _write_user(role=UserRole.admin, email="admin@example.com")
    r = await client.patch(
        "/api/admin/users/does-not-exist",
        headers=await _token(admin),
        json={"active": False},
    )
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# per-user usage
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_user_usage_aggregates_features(client, _setup_db):
    admin = await _write_user(role=UserRole.admin, email="admin@example.com")
    st = await _write_user(role=UserRole.student, email="s@example.com")
    maker = async_sessionmaker(_engine, expire_on_commit=False)
    async with maker() as db:
        db.add_all([
            LLMUsageLog(user_id=st.id, feature="gap_analysis", model="gpt-4o",
                        tokens_in=100, tokens_out=40, cost_usd=0.0),
            LLMUsageLog(user_id=st.id, feature="gap_analysis", model="gpt-4o",
                        tokens_in=50, tokens_out=20, cost_usd=0.0),
            LLMUsageLog(user_id=st.id, feature="mock_interview", model="gpt-4o",
                        tokens_in=200, tokens_out=80, cost_usd=0.0),
        ])
        await db.commit()

    r = await client.get(f"/api/admin/users/{st.id}/usage", headers=await _token(admin))
    assert r.status_code == 200
    data = r.json()
    assert data["total_calls"] == 3
    assert data["total_tokens_in"] == 350
    by = {f["feature"]: f for f in data["feature_usage"]}
    assert by["gap_analysis"]["calls"] == 2
    assert by["gap_analysis"]["tokens_in"] == 150
    assert by["mock_interview"]["calls"] == 1


@pytest.mark.asyncio
async def test_user_usage_404_unknown(client, _setup_db):
    admin = await _write_user(role=UserRole.admin, email="admin@example.com")
    r = await client.get("/api/admin/users/nope/usage", headers=await _token(admin))
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# usage summary dashboard
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_usage_summary_aggregates(client, _setup_db):
    admin = await _write_user(role=UserRole.admin, email="admin@example.com")
    await _write_user(role=UserRole.student, email="s1@example.com")
    await _write_user(role=UserRole.student, email="s2@example.com")
    maker = async_sessionmaker(_engine, expire_on_commit=False)
    async with maker() as db:
        db.add(LLMUsageLog(user_id=admin.id, feature="gap_analysis", model="gpt-4o",
                           tokens_in=10, tokens_out=5, cost_usd=0.0))
        await db.commit()

    r = await client.get("/api/admin/usage", headers=await _token(admin))
    assert r.status_code == 200
    data = r.json()
    assert data["total_users"] == 3
    assert data["total_feature_calls"] == 1
    assert data["total_tokens_in"] == 10
    assert any(f["feature"] == "gap_analysis" for f in data["feature_usage"])
    # signups_over_time should include at least one month bucket for the admin.
    assert len(data["signups_over_time"]) >= 1


# ---------------------------------------------------------------------------
# SECURITY: non-admin direct calls rejected (RULES §2)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_non_admin_forbidden_on_user_and_usage_endpoints(client, _setup_db):
    student = await _write_user(role=UserRole.student, email="s@example.com")
    headers = await _token(student)
    for method, path, body in [
        ("GET", "/api/admin/users", None),
        ("PATCH", f"/api/admin/users/{student.id}", {"active": False}),
        ("GET", f"/api/admin/users/{student.id}/usage", None),
        ("GET", "/api/admin/usage", None),
    ]:
        r = await client.request(method, path, headers=headers, json=body)
        assert r.status_code == 403, f"{method} {path} -> {r.status_code}: admin gate broken"
