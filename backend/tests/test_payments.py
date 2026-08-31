"""Phase 6 Task 3 — Stripe Checkout credit-purchase integration (mocked E2E).

Per P6-3, Stripe runs behind .env keys and CI/tests exercise the FULL purchase
flow with a MOCKED Stripe client — no live keys required to land Phase 6.

Covered here:
  - pack catalog surfaces (PLACEHOLDER) prices with US-dollar conversion
  - create_checkout_session records a pending order + calls (mock) Stripe,
    persisting the session id
  - checkout endpoint: 503 when Stripe disabled; success URL when enabled
  - fulfill_order: credits the ledger exactly once (idempotent on retry), with
    a real before/after balance delta + audit invariant
  - webhook dispatch end-to-end through the HTTP endpoint (mocked signature)
  - signature verification: bad signature rejected
"""

import types

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select, func

from backend.main import app
from backend.database import Base, get_db
from backend.models import User, UserRole, CreditOrder, CreditTransaction  # noqa: F401
from backend.auth import create_access_token
from backend.services import payments
from backend.services.credit import record_transaction

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


async def _balance(user_id) -> int:
    async with _session() as db:
        u = await db.get(User, user_id)
        return u.credit_balance


async def _audit_sum(user_id) -> int:
    async with _session() as db:
        r = await db.execute(
            select(func.coalesce(func.sum(CreditTransaction.delta), 0)).where(
                CreditTransaction.user_id == user_id
            )
        )
        return int(r.scalar())


def _enabled_settings():
    """A Settings-like object with Stripe enabled and the (placeholder) pack catalog."""
    return types.SimpleNamespace(
        stripe_enabled=True,
        stripe_secret_key="sk_test_placeholder",
        stripe_webhook_secret="whsec_placeholder",
        stripe_success_url="http://localhost:3000/credits?status=success",
        stripe_cancel_url="http://localhost:3000/credits?status=cancelled",
        credit_packs={
            "pack_starter": {"name": "Starter", "credits": 50, "price_usd_cents": 500},
            "pack_pro": {"name": "Pro", "credits": 150, "price_usd_cents": 1400},
            "pack_career": {"name": "Career", "credits": 300, "price_usd_cents": 2500},
        },
    )


def _fake_session(id="cs_test_123"):
    return types.SimpleNamespace(
        id=id, url="https://checkout.stripe.com/test", status="open"
    )


def _fake_stripe():
    return types.SimpleNamespace(
        checkout=types.SimpleNamespace(
            Session=types.SimpleNamespace(create=lambda **kw: _fake_session())
        ),
        Webhook=types.SimpleNamespace(
            construct_event=lambda payload, sig, secret: (
                {"type": "checkout.session.completed",
                 "data": {"object": {"id": "cs_test_123"}}}
            )
        ),
    )


def _fake_event():
    return {
        "type": "checkout.session.completed",
        "data": {"object": {"id": "cs_test_123"}},
    }


# ---------------------------------------------------------------------------
# catalog
# ---------------------------------------------------------------------------

def test_pack_catalog_surface(monkeypatch):
    monkeypatch.setattr(payments, "get_settings", _enabled_settings)
    packs = payments.list_packs()
    by_id = {p["id"]: p for p in packs}
    assert by_id["pack_starter"]["credits"] == 50
    assert by_id["pack_starter"]["price_usd_cents"] == 500
    assert by_id["pack_starter"]["price_usd"] == 5.0  # dollar conversion


# ---------------------------------------------------------------------------
# create_checkout_session (mocked Stripe)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_checkout_session_records_pending_order(monkeypatch, _setup_db):
    monkeypatch.setattr(payments, "get_settings", _enabled_settings)
    monkeypatch.setattr(payments, "is_stripe_enabled", lambda: True)
    u = await _write_user(role=UserRole.student, email="buy@example.com")
    async with _session() as db:
        order, url = await payments.create_checkout_session(
            db, u, "pack_starter", stripe=_fake_stripe()
        )
        assert url == "https://checkout.stripe.com/test"
        assert order.status == "pending"
        assert order.credits == 50
        assert order.stripe_session_id == "cs_test_123"
    assert await _balance(u.id) == 0  # nothing credited at session creation


@pytest.mark.asyncio
async def test_create_checkout_session_unknown_pack(monkeypatch, _setup_db):
    monkeypatch.setattr(payments, "get_settings", _enabled_settings)
    monkeypatch.setattr(payments, "is_stripe_enabled", lambda: True)
    u = await _write_user(role=UserRole.student, email="buy@example.com")
    async with _session() as db:
        with pytest.raises(payments.UnknownPack):
            await payments.create_checkout_session(db, u, "pack_nope", stripe=_fake_stripe())


# ---------------------------------------------------------------------------
# fulfill_order — idempotent, real before/after delta, audit invariant
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fulfill_order_credits_once_with_delta(monkeypatch, _setup_db):
    monkeypatch.setattr(payments, "get_settings", _enabled_settings)
    monkeypatch.setattr(payments, "is_stripe_enabled", lambda: True)
    u = await _write_user(role=UserRole.student, email="buy@example.com")

    async with _session() as db:
        order, _ = await payments.create_checkout_session(db, u, "pack_pro", stripe=_fake_stripe())
        before = u.credit_balance
        order = await payments.fulfill_order(db, order_id=order.id)
        after = (await db.get(User, u.id)).credit_balance

    assert before == 0
    assert after == 150          # Pro pack credits added
    assert order.status == "succeeded"
    assert order.ledger_tx_id     # linked to the purchase ledger row

    # audit invariant: balance == sum of ledger deltas
    assert await _audit_sum(u.id) == after


@pytest.mark.asyncio
async def test_fulfill_order_is_idempotent_on_retry(monkeypatch, _setup_db):
    monkeypatch.setattr(payments, "get_settings", _enabled_settings)
    monkeypatch.setattr(payments, "is_stripe_enabled", lambda: True)
    u = await _write_user(role=UserRole.student, email="buy@example.com")

    async with _session() as db:
        order, _ = await payments.create_checkout_session(db, u, "pack_starter", stripe=_fake_stripe())
        await payments.fulfill_order(db, order_id=order.id)
        first = (await db.get(User, u.id)).credit_balance

        # Simulate Stripe webhook retry: same order, fulfilled again.
        again = await payments.fulfill_order(db, order_id=order.id)
        second = (await db.get(User, u.id)).credit_balance

    assert first == 50
    assert second == 50            # NO double credit
    assert again.status == "succeeded"
    assert await _audit_sum(u.id) == 50  # ledger has exactly one purchase


@pytest.mark.asyncio
async def test_fulfill_by_session_id_after_created(monkeypatch, _setup_db):
    monkeypatch.setattr(payments, "get_settings", _enabled_settings)
    monkeypatch.setattr(payments, "is_stripe_enabled", lambda: True)
    u = await _write_user(role=UserRole.student, email="buy@example.com")
    async with _session() as db:
        order, _ = await payments.create_checkout_session(db, u, "pack_career", stripe=_fake_stripe())
        await payments.fulfill_order(db, stripe_session_id="cs_test_123")
    assert await _balance(u.id) == 300


# ---------------------------------------------------------------------------
# verify_webhook — signature handling (mocked)
# ---------------------------------------------------------------------------

def test_verify_webhook_good_signature():
    # construct_event returns a real event; must pass through.
    ev = payments.verify_webhook(b"payload", "sig", stripe=_fake_stripe())
    assert ev["type"] == "checkout.session.completed"


def test_verify_webhook_bad_signature():
    bad = types.SimpleNamespace(
        Webhook=types.SimpleNamespace(
            construct_event=lambda payload, sig, secret: (_ for _ in ()).throw(
                ValueError("No signatures found")
            )
        )
    )
    with pytest.raises(payments.StripeWebhookError):
        payments.verify_webhook(b"payload", "badsig", stripe=bad)


# ---------------------------------------------------------------------------
# endpoints — checkout 503 when disabled; mocked E2E webhook
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_checkout_endpoint_503_when_disabled(client, _setup_db, monkeypatch):
    monkeypatch.setattr(payments, "is_stripe_enabled", lambda: False)
    u = await _write_user(role=UserRole.student, email="buy@example.com")
    headers = {"Authorization": f"Bearer {create_access_token(u.id, u.role.value)}"}
    r = await client.post("/api/credits/checkout", headers=headers, json={"pack_id": "pack_starter"})
    assert r.status_code == 503


@pytest.mark.asyncio
async def test_checkout_endpoint_returns_url_when_enabled(client, _setup_db, monkeypatch):
    monkeypatch.setattr(payments, "get_settings", _enabled_settings)
    monkeypatch.setattr(payments, "is_stripe_enabled", lambda: True)
    u = await _write_user(role=UserRole.student, email="buy@example.com")
    headers = {"Authorization": f"Bearer {create_access_token(u.id, u.role.value)}"}
    # Patch the service-layer call to inject the fake Stripe client (no live keys).
    real_create = payments.create_checkout_session

    async def _fake_create(db, user, pack_id, stripe=None):
        return await real_create(db, user, pack_id, stripe=_fake_stripe())
    monkeypatch.setattr(payments, "create_checkout_session", _fake_create)
    r = await client.post("/api/credits/checkout", headers=headers, json={"pack_id": "pack_starter"})
    assert r.status_code == 200
    assert r.json()["checkout_url"] == "https://checkout.stripe.com/test"


@pytest.mark.asyncio
async def test_webhook_endpoint_fulfills_order(client, _setup_db, monkeypatch):
    monkeypatch.setattr(payments, "get_settings", _enabled_settings)
    monkeypatch.setattr(payments, "is_stripe_enabled", lambda: True)
    # Bypass crypto for the HTTP path; dispatch the controlled event.
    monkeypatch.setattr(payments, "verify_webhook", lambda p, s: _fake_event())

    u = await _write_user(role=UserRole.student, email="buy@example.com")
    async with _session() as db:
        await payments.create_checkout_session(db, u, "pack_pro", stripe=_fake_stripe())

    before = await _balance(u.id)
    r = await client.post(
        "/api/credits/webhook",
        content=b"{}",
        headers={"Stripe-Signature": "sig"},
    )
    after = await _balance(u.id)

    assert r.status_code == 200
    assert r.json()["status"] == "succeeded"
    assert before == 0
    assert after == 150
    assert await _audit_sum(u.id) == 150


@pytest.mark.asyncio
async def test_webhook_endpoint_idempotent_across_retries(client, _setup_db, monkeypatch):
    monkeypatch.setattr(payments, "get_settings", _enabled_settings)
    monkeypatch.setattr(payments, "is_stripe_enabled", lambda: True)
    monkeypatch.setattr(payments, "verify_webhook", lambda p, s: _fake_event())

    u = await _write_user(role=UserRole.student, email="buy@example.com")
    async with _session() as db:
        await payments.create_checkout_session(db, u, "pack_starter", stripe=_fake_stripe())

    await client.post("/api/credits/webhook", content=b"{}", headers={"Stripe-Signature": "sig"})
    first = await _balance(u.id)
    await client.post("/api/credits/webhook", content=b"{}", headers={"Stripe-Signature": "sig"})
    second = await _balance(u.id)

    assert first == 50
    assert second == 50  # retried webhook did not double-credit


@pytest.mark.asyncio
async def test_webhook_endpoint_400_on_bad_signature(client, _setup_db, monkeypatch):
    monkeypatch.setattr(payments, "is_stripe_enabled", lambda: True)
    monkeypatch.setattr(
        payments, "verify_webhook",
        lambda p, s: (_ for _ in ()).throw(payments.StripeWebhookError("bad")),
    )
    u = await _write_user(role=UserRole.student, email="buy@example.com")
    r = await client.post(
        "/api/credits/webhook",
        content=b"{}",
        headers={"Stripe-Signature": "badsig"},
    )
    assert r.status_code == 400
    # nothing was credited
    assert await _balance(u.id) == 0
