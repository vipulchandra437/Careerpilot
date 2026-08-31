import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from backend.main import app


@pytest.mark.asyncio
async def test_signup():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Unique email so the test is idempotent against leftover rows in the
        # dev DB (signup correctly 409s on an already-registered email).
        email = f"signup-{uuid.uuid4().hex[:12]}@example.com"
        response = await client.post(
            "/api/auth/signup",
            json={"email": email, "password": "securepassword123"},
        )
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/auth/signup",
            json={"email": "login@example.com", "password": "securepassword123"},
        )
        response = await client.post(
            "/api/auth/login",
            json={"email": "login@example.com", "password": "securepassword123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
