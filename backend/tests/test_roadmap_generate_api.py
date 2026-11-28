"""Regression test for first-time roadmap generation (CRIT-1)."""

import uuid
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

import backend.api.roadmap as roadmap_api
from backend.auth import create_access_token
from backend.database import async_session
from backend.main import app
from backend.models.gap import GapReport
from backend.models.profile import ProfileSnapshot
from backend.models.target_role import TargetRoleProfile
from backend.models.user import User, UserRole


@pytest.mark.asyncio
async def test_generate_roadmap_without_existing_roadmap_returns_generating(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    background = AsyncMock()
    monkeypatch.setattr(roadmap_api, "_generate_roadmap_background", background)

    async with async_session() as db:
        user = User(
            email=f"roadmap-first-{uuid.uuid4().hex[:12]}@example.com",
            role=UserRole.student,
            password_hash="unused",
        )
        db.add(user)
        await db.flush()

        snapshot = ProfileSnapshot(
            user_id=user.id,
            github_data={},
            resume_data={},
            linkedin_data={},
        )
        db.add(snapshot)
        await db.flush()

        role = TargetRoleProfile(
            name=f"Backend Engineer {uuid.uuid4().hex[:8]}",
            required_skills=[],
        )
        db.add(role)
        await db.flush()

        report = GapReport(
            snapshot_id=snapshot.id,
            target_role_id=role.id,
            gaps=[],
        )
        db.add(report)
        await db.commit()

        user_id = user.id
        role_value = user.role.value
        gap_report_id = report.id

    headers = {"Authorization": f"Bearer {create_access_token(user_id, role_value)}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            f"/api/roadmap/generate?gap_report_id={gap_report_id}",
            headers=headers,
        )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "generating"
    background.assert_awaited_once()
