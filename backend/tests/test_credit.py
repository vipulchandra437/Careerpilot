"""Phase 6 credit-engine tests (Task 2) — free tier, deduction, refunds, gating.

Covers the credit service policy (P6-1 fixed cost, P6-2 free allowance):
  - free allowance is consumed per-feature without balance change, and is
    counted in the ledger (no reload bypass)
  - paid uses deduct the exact fixed cost
  - insufficient balance raises InsufficientCredits, deducts nothing
  - refunds restore the balance and are recorded in the ledger
  - running balance ALWAYS equals the sum of ledger deltas (audit invariant)
  - endpoint-level: 402 on out-of-credits, balance delta before/after
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.database import Base, get_db
from backend.models import User, UserRole, CreditTransaction  # noqa: F401
from backend.auth import create_access_token
from backend.services.credit import (
    FEATURE_COST,
    FREE_ALLOWANCE,
    authorize_use,
    record_transaction,
    refund_last,
    InsufficientCredits,
)

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
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


import contextlib


@contextlib.asynccontextmanager
async def _session():
    maker = async_sessionmaker(_engine, expire_on_commit=False)
    async with maker() as db:
        yield db


async def _write_user(**kw) -> User:
    maker = async_sessionmaker(_engine, expire_on_commit=False)
    async with maker() as db:
        u = User(**kw)
        db.add(u)
        await db.commit()
        await db.refresh(u)
        return u


async def _balance(db, user_id: int) -> int:
    u = await db.get(User, user_id)
    return u.credit_balance


async def _ledger_sum(db, user_id: int) -> int:
    r = await db.execute(
        select(func.coalesce(func.sum(CreditTransaction.delta), 0)).where(
            CreditTransaction.user_id == user_id
        )
    )
    return int(r.scalar())


# ---------------------------------------------------------------------------
# free allowance
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_free_allowance_consumed_without_balance_change(_setup_db):
    u = await _write_user(role=UserRole.student, email="a@example.com")
    async with _session() as db:
        before = await _balance(db, u.id)
        for i in range(FREE_ALLOWANCE["practice_challenge"]):
            await authorize_use(db, u.id, "practice_challenge")
        after = await _balance(db, u.id)
        assert after == before == 0  # free uses never change balance
        # ledger counted them
        assert await _ledger_sum(db, u.id) == 0


@pytest.mark.asyncio
async def test_next_use_after_allowance_is_paid(_setup_db):
    u = await _write_user(role=UserRole.student, email="a@example.com", credit_balance=100)
    async with _session() as db:
        for _ in range(FREE_ALLOWANCE["practice_challenge"]):
            await authorize_use(db, u.id, "practice_challenge")
        await authorize_use(db, u.id, "practice_challenge")  # 1 past allowance
        cost = FEATURE_COST["practice_challenge"]
        assert await _balance(db, u.id) == 100 - cost
        assert await _ledger_sum(db, u.id) == -cost


@pytest.mark.asyncio
async def test_ledger_sum_equals_running_balance_across_mixed_uses(_setup_db):
    """Audit invariant: sum of ledger deltas always equals credit_balance."""
    u = await _write_user(role=UserRole.student, email="a@example.com")
    async with _session() as db:
        # grant 50 via purchase-style transaction
        await record_transaction(db, u.id, 50, "purchase", description="pack")
        # use free allowances
        for feature, n in FREE_ALLOWANCE.items():
            for _ in range(n):
                await authorize_use(db, u.id, feature)
        # a few paid uses across features
        await authorize_use(db, u.id, "practice_challenge")
        await authorize_use(db, u.id, "mock_interview")
        await authorize_use(db, u.id, "gap_analysis")
        spent = FEATURE_COST["practice_challenge"] + FEATURE_COST["mock_interview"] + FEATURE_COST["gap_analysis"]
        assert await _balance(db, u.id) == 50 - spent
        assert await _ledger_sum(db, u.id) == 50 - spent


# ---------------------------------------------------------------------------
# insufficient credits
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_insufficient_credits_deducts_nothing(_setup_db):
    u = await _write_user(role=UserRole.student, email="a@example.com")
    async with _session() as db:
        await record_transaction(db, u.id, 1, "admin_grant", description="seed")  # balance 1
        # burn free allowance first
        for _ in range(FREE_ALLOWANCE["mock_interview"]):
            await authorize_use(db, u.id, "mock_interview")
        # balance 1 < cost 3
        with pytest.raises(InsufficientCredits):
            await authorize_use(db, u.id, "mock_interview")
        assert await _balance(db, u.id) == 1
        assert await _ledger_sum(db, u.id) == 1  # no phantom deduction


@pytest.mark.asyncio
async def test_insufficient_credits_after_exact_balance(_setup_db):
    u = await _write_user(role=UserRole.student, email="a@example.com")
    async with _session() as db:
        await record_transaction(db, u.id, 2, "admin_grant", description="seed")  # balance 2
        for _ in range(FREE_ALLOWANCE["practice_challenge"]):
            await authorize_use(db, u.id, "practice_challenge")
        # balance 2 == cost 2 -> allowed
        await authorize_use(db, u.id, "practice_challenge")
        assert await _balance(db, u.id) == 0
        # now 0 < 2 -> blocked
        with pytest.raises(InsufficientCredits):
            await authorize_use(db, u.id, "practice_challenge")
        assert await _balance(db, u.id) == 0


# ---------------------------------------------------------------------------
# refunds
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_refund_restores_balance(_setup_db):
    u = await _write_user(role=UserRole.student, email="a@example.com")
    async with _session() as db:
        await record_transaction(db, u.id, 20, "purchase", description="pack")  # balance 20
        for _ in range(FREE_ALLOWANCE["gap_analysis"]):
            await authorize_use(db, u.id, "gap_analysis")
        await authorize_use(db, u.id, "gap_analysis")  # paid 5
        assert await _balance(db, u.id) == 15
        await refund_last(db, u.id, "gap_analysis")
        assert await _balance(db, u.id) == 20
        assert await _ledger_sum(db, u.id) == 20


@pytest.mark.asyncio
async def test_refund_free_use_is_noop(_setup_db):
    u = await _write_user(role=UserRole.student, email="a@example.com")
    async with _session() as db:
        await record_transaction(db, u.id, 10, "admin_grant", description="seed")
        await authorize_use(db, u.id, "mock_interview")  # free use (delta 0)
        await refund_last(db, u.id, "mock_interview")  # should do nothing
        assert await _balance(db, u.id) == 10


# ---------------------------------------------------------------------------
# endpoint-level gating
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_endpoint_402_when_out_of_credits(client, _setup_db):
    student = await _write_user(
        role=UserRole.student,
        email="poor@example.com",
        password_hash="x",
        credit_balance=0,
    )
    headers = {"Authorization": f"Bearer {create_access_token(student.id, student.role.value)}"}

    # Create a profile snapshot + target role so gap analysis can run up to the gate.
    from backend.models.profile import ProfileSnapshot
    from backend.models.target_role import TargetRoleProfile
    import uuid as _uuid
    async with _session() as db:
        db.add(ProfileSnapshot(user_id=student.id, resume_data={}))
        role = TargetRoleProfile(name="BE", required_skills=[{"skill": "python"}])
        db.add(role)
        await db.commit()
        role_id = role.id

    # First analysis is free (allowance 1).
    r1 = await client.post("/api/gap/analyze", headers=headers, json={"target_role_id": role_id})
    # It may fail at LLM (no key) after free-use marker — but must NOT be 402, and
    # free use must not have charged anything.
    assert r1.status_code != 402

    # Now past free allowance with 0 balance -> second hit must be 402.
    r2 = await client.post("/api/gap/analyze", headers=headers, json={"target_role_id": role_id})
    assert r2.status_code == 402


# ---------------------------------------------------------------------------
# balance + ledger endpoints
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_student_sees_own_balance_and_pricing(client, _setup_db):
    u = await _write_user(role=UserRole.student, email="s@example.com", credit_balance=0)
    headers = {"Authorization": f"Bearer {create_access_token(u.id, u.role.value)}"}
    r = await client.get("/api/credits/balance", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["balance"] == 0
    assert body["pricing"]["gap_analysis"] == FEATURE_COST["gap_analysis"]
    assert body["free_allowance"]["practice_challenge"] == FREE_ALLOWANCE["practice_challenge"]


@pytest.mark.asyncio
async def test_student_sees_own_ledger(client, _setup_db):
    u = await _write_user(role=UserRole.student, email="s@example.com")
    async with _session() as db:
        await record_transaction(db, u.id, 5, "admin_grant", description="seed")
        await authorize_use(db, u.id, "gap_analysis")  # free use (delta 0)
    headers = {"Authorization": f"Bearer {create_access_token(u.id, u.role.value)}"}
    r = await client.get("/api/credits/ledger", headers=headers)
    assert r.status_code == 200
    txs = r.json()["transactions"]
    reasons = [t["reason"] for t in txs]
    assert "admin_grant" in reasons
    assert "free_use" in reasons


@pytest.mark.asyncio
async def test_admin_grant_updates_balance_before_after(client, _setup_db):
    admin = await _write_user(role=UserRole.admin, email="adm@example.com")
    student = await _write_user(role=UserRole.student, email="st@example.com")
    admin_headers = {"Authorization": f"Bearer {create_access_token(admin.id, admin.role.value)}"}
    student_headers = {"Authorization": f"Bearer {create_access_token(student.id, student.role.value)}"}

    before = (await client.get("/api/credits/balance", headers=student_headers)).json()["balance"]

    r = await client.post(
        f"/api/admin/credits/{student.id}",
        headers=admin_headers,
        json={"amount": 25, "note": "review grant"},
    )
    assert r.status_code == 200
    assert r.json()["balance"] == before + 25

    after = (await client.get("/api/credits/balance", headers=student_headers)).json()["balance"]
    assert after == before + 25  # real before/after delta


@pytest.mark.asyncio
async def test_admin_grant_rejected_for_non_admin(client, _setup_db):
    student = await _write_user(role=UserRole.student, email="st@example.com")
    headers = {"Authorization": f"Bearer {create_access_token(student.id, student.role.value)}"}
    r = await client.post(
        f"/api/admin/credits/{student.id}",
        headers=headers,
        json={"amount": 10},
    )
    assert r.status_code == 403
