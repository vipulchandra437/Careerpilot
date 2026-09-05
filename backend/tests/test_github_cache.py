import pytest
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from backend.services.github import _get_cached_data, _cache_data


def _snapshot_row(github_data):
    """Build a MagicMock that mimics a ProfileSnapshot row."""
    m = MagicMock()
    m.github_data = github_data
    return m


def _mock_db(scalar_or_none_value):
    """A mocked AsyncSession whose execute returns a result with scalar_one_or_none."""
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=scalar_or_none_value)
    db.execute.return_value = result
    db.add = MagicMock()
    return db


@pytest.mark.asyncio
async def test_cache_miss_no_snapshot():
    """Cache returns None when no snapshot exists."""
    db = _mock_db(None)
    result = await _get_cached_data(db, uuid.uuid4())
    assert result is None


@pytest.mark.asyncio
async def test_cache_miss_no_github_data():
    """Cache returns None when snapshot has no github_data."""
    db = _mock_db(_snapshot_row(None))
    result = await _get_cached_data(db, uuid.uuid4())
    assert result is None


@pytest.mark.asyncio
async def test_cache_hit_fresh():
    """Cache returns data within the 24h TTL without re-fetching."""
    data = {
        "username": "octocat",
        "repos": [],
        "languages": {},
        "fetched_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
    }
    db = _mock_db(_snapshot_row(data))
    result = await _get_cached_data(db, uuid.uuid4())
    assert result == data


@pytest.mark.asyncio
async def test_cache_expired():
    """Cache returns None when the fetched_at is older than 24h."""
    data = {
        "username": "octocat",
        "repos": [],
        "languages": {},
        "fetched_at": (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat(),
    }
    db = _mock_db(_snapshot_row(data))
    result = await _get_cached_data(db, uuid.uuid4())
    assert result is None


@pytest.mark.asyncio
async def test_cache_data_writes_to_existing_snapshot():
    """_cache_data updates github_data on an existing snapshot."""
    existing = _snapshot_row(None)
    db = _mock_db(existing)
    data = {"username": "octocat", "repos": [], "languages": {}, "fetched_at": "now"}
    await _cache_data(db, uuid.uuid4(), data)
    assert existing.github_data == data
    db.add.assert_not_called()
    db.commit.assert_awaited()


@pytest.mark.asyncio
async def test_cache_data_creates_snapshot_when_missing():
    """_cache_data creates a new snapshot when none exists."""
    db = _mock_db(None)
    data = {"username": "octocat", "repos": [], "languages": {}, "fetched_at": "now"}
    await _cache_data(db, uuid.uuid4(), data)
    added = db.add.call_args[0][0]
    assert added.github_data == data
    db.commit.assert_awaited()
