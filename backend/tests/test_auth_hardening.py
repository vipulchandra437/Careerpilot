"""Regression tests for auth and GitHub OAuth hardening."""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch
from urllib.parse import quote

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from jose import jwt
from sqlalchemy import select

from backend.auth import decode_token, decode_github_oauth_state, settings
from backend.database import Base, async_session, engine
from backend.main import app
from backend.models.profile import ProfileSnapshot
from backend.models.user import User


@pytest_asyncio.fixture(autouse=True)
async def _schema():
    # ASGITransport does not run the app lifespan, so create the tables here.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


def _client(ip: str) -> AsyncClient:
    return AsyncClient(
        transport=ASGITransport(app=app, client=(ip, 123)),
        base_url="http://test",
    )


async def _signup(client: AsyncClient) -> tuple[str, dict]:
    email = f"hardening-{uuid.uuid4().hex[:12]}@example.com"
    response = await client.post(
        "/api/auth/signup",
        json={"email": email, "password": "securepassword123"},
    )
    assert response.status_code == 201, response.text
    return email, response.json()


def _auth(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def _reencode(payload: dict) -> str:
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


@pytest.mark.asyncio
async def test_password_byte_limit():
    async with _client("10.10.0.1") as client:
        long = await client.post(
            "/api/auth/signup",
            json={"email": f"long-{uuid.uuid4().hex[:12]}@example.com", "password": "a" * 73},
        )
        assert long.status_code == 422
        assert "72 bytes" in long.json()["detail"]

        prefix = "securepassword123"
        password = prefix + "b" * (72 - len(prefix))
        _, _ = await _signup(client)
        email2, _ = await _signup(client)
        prefix_email = email2.replace("@", "+prefix@")
        assert (await client.post(
            "/api/auth/signup",
            json={"email": prefix_email, "password": password},
        )).status_code == 201
        assert (await client.post(
            "/api/auth/login", json={"email": prefix_email, "password": password + "c"}
        )).status_code == 401
        assert (await client.post(
            "/api/auth/login", json={"email": prefix_email, "password": password}
        )).status_code == 200


@pytest.mark.asyncio
async def test_signup_rate_limit():
    async with _client("10.10.0.2") as client:
        for _ in range(5):
            assert (await _signup(client))[1]["access_token"]
        blocked = await client.post(
            "/api/auth/signup",
            json={"email": f"blocked-{uuid.uuid4().hex[:12]}@example.com", "password": "securepassword123"},
        )
        assert blocked.status_code == 429
        assert "signup" in blocked.json()["detail"].lower()


@pytest.mark.asyncio
async def test_refresh_rejects_stale_token_version():
    async with _client("10.10.0.3") as client:
        email, tokens = await _signup(client)
        async with async_session() as db:
            user = (await db.execute(select(User).where(User.email == email))).scalar_one()
            user.token_version += 1
            await db.commit()

        response = await client.post(
            "/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
        )
        assert response.status_code == 401
        assert "revoked" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_legacy_tokens_without_ver_stay_valid():
    async with _client("10.10.0.4") as client:
        _, tokens = await _signup(client)
        refresh_payload = decode_token(tokens["refresh_token"])
        access_payload = decode_token(tokens["access_token"])
        assert refresh_payload["ver"] == 0 and access_payload["ver"] == 0
        refresh_payload.pop("ver")
        access_payload.pop("ver")

        refreshed = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": _reencode(refresh_payload)},
        )
        assert refreshed.status_code == 200
        snapshot = await client.get(
            "/api/profile/snapshot",
            headers={"Authorization": f"Bearer {_reencode(access_payload)}"},
        )
        assert snapshot.status_code == 200

        wrong = {**access_payload, "ver": 99}
        rejected = await client.get(
            "/api/profile/snapshot",
            headers={"Authorization": f"Bearer {_reencode(wrong)}"},
        )
        assert rejected.status_code == 401
        assert "revoked" in rejected.json()["detail"].lower()


@pytest.mark.asyncio
async def test_github_state_issued_signed_and_bound():
    async with _client("10.10.0.5") as client:
        _, tokens = await _signup(client)
        response = await client.get("/api/profile/github/auth-url", headers=_auth(tokens))
        assert response.status_code == 200
        data = response.json()
        assert data["state"] in data["url"]
        user_id = decode_token(tokens["access_token"])["sub"]
        assert decode_github_oauth_state(data["state"], user_id)
        assert decode_github_oauth_state(data["state"], str(uuid.uuid4())) is None


@pytest.mark.asyncio
async def test_github_connect_rejects_foreign_expired_tampered_and_replayed_state():
    async with _client("10.10.0.6") as client:
        _, tokens_a = await _signup(client)
        _, tokens_b = await _signup(client)
        state = (await client.get(
            "/api/profile/github/auth-url", headers=_auth(tokens_a)
        )).json()["state"]
        user_a = decode_token(tokens_a["access_token"])["sub"]
        mocked = AsyncMock(return_value={"github_username": "octocat"})

        def connect(token: str, state_value: str, headers: dict):
            return client.post(
                "/api/profile/github/connect",
                params={"code": "abc", "state": state_value},
                headers=headers,
            )

        with patch("backend.api.profile.connect_github_account", new=mocked):
            assert (await connect(tokens_a["access_token"], state, _auth(tokens_b))).status_code == 400
            assert mocked.await_count == 0

            expired = _reencode({
                "sub": user_a,
                "nonce": str(uuid.uuid4()),
                "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
                "type": "github_state",
            })
            assert (await connect(tokens_a["access_token"], expired, _auth(tokens_a))).status_code == 400
            assert (await connect(tokens_a["access_token"], state + "x", _auth(tokens_a))).status_code == 400
            assert mocked.await_count == 0

            assert (await connect(tokens_a["access_token"], state, _auth(tokens_a))).status_code == 200
            replay = await connect(tokens_a["access_token"], state, _auth(tokens_a))
            assert replay.status_code == 400
            assert "used" in replay.json()["detail"].lower()
            assert mocked.await_count == 1


@pytest.mark.asyncio
async def test_avatar_proxy_uses_authenticated_ownership_check():
    async with _client("10.10.0.7") as client:
        _, tokens_a = await _signup(client)
        _, tokens_b = await _signup(client)
        user_a = decode_token(tokens_a["access_token"])["sub"]
        key = f"profiles/{user_a}/avatar.png"
        async with async_session() as db:
            db.add(ProfileSnapshot(user_id=user_a, avatar_key=key))
            await db.commit()

        snapshot = await client.get("/api/profile/snapshot", headers=_auth(tokens_a))
        assert snapshot.status_code == 200
        body = snapshot.json()
        assert body["avatar_key"] == key
        assert body["personal"]["avatar_url"] == f"/api/profile/avatar/file?key={quote(key, safe='')}"
        assert "X-Amz" not in str(body)

        forbidden = await client.get(
            "/api/profile/avatar/file", params={"key": key}, headers=_auth(tokens_b)
        )
        assert forbidden.status_code == 403

        with patch(
            "backend.api.profile.get_presigned_url",
            new=AsyncMock(return_value="https://object.test/signed?X-Amz-Expires=60"),
        ) as presign:
            allowed = await client.get(
                "/api/profile/avatar/file", params={"key": key}, headers=_auth(tokens_a)
            )
            assert allowed.status_code == 307
            assert allowed.headers["location"].startswith("https://object.test/signed")
            assert presign.await_args.kwargs["expires_in"] == 60
