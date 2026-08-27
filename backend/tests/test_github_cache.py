import pytest
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy import select

from backend.models.github import GitHubCache
from backend.services.github import _get_cached_data, _cache_data, CACHE_TTL_HOURS


@pytest.mark.asyncio
async def test_cache_miss():
    """Test cache returns None when no entry exists."""
    db = AsyncMock()
    db.execute.return_value = MagicMock(scalar_one_or_none=MagicMock(return_value=None))

    result = await _get_cached_data(uuid.uuid4(), "github_data", db)
    assert result is None


@pytest.mark.asyncio
async def test_cache_hit_fresh():
    """Test cache returns data when entry is fresh."""
    mock_entry = MagicMock()
    mock_entry.fetched_at = datetime.now(timezone.utc) - timedelta(hours=1)
    mock_entry.data = {"repos": []}

    db = AsyncMock()
    db.execute.return_value = MagicMock(scalar_one_or_none=MagicMock(return_value=mock_entry))

    result = await _get_cached_data(uuid.uuid4(), "github_data", db)
    assert result == {"repos": []}


@pytest.mark.asyncio
async def test_cache_expired():
    """Test cache returns None when entry is expired."""
    mock_entry = MagicMock()
    mock_entry.fetched_at = datetime.now(timezone.utc) - timedelta(hours=CACHE_TTL_HOURS + 1)
    mock_entry.data = {"repos": []}

    db = AsyncMock()
    db.execute.return_value = MagicMock(scalar_one_or_none=MagicMock(return_value=mock_entry))

    result = await _get_cached_data(uuid.uuid4(), "github_data", db)
    assert result is None
