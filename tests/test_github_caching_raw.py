"""GitHub caching test with explicit API call counting."""
import json
import sys
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock, call
sys.path.insert(0, "D:\\major project")

api_call_count = 0

async def mock_fetch_repos(*args, **kwargs):
    global api_call_count
    api_call_count += 1
    return [{"name": "repo1", "language": "Python", "languages_url": "https://api.github.com/repos/test/repo1/languages"}]

async def mock_fetch_languages(*args, **kwargs):
    return {"Python": 1000}

async def mock_fetch_user_info(*args, **kwargs):
    return {"login": "testuser"}

async def test_caching():
    global api_call_count
    
    from backend.services.github import get_github_data, _get_cached_data
    
    mock_db = AsyncMock()
    
    # Scenario 1: Fresh cache (within 24h) - should NOT call API
    api_call_count = 0
    mock_snapshot = MagicMock()
    mock_snapshot.github_data = {
        "username": "testuser",
        "repos": [{"name": "repo1", "language": "Python"}],
        "languages": {"Python": 1000},
        "fetched_at": "2026-08-26T12:00:00+00:00",  # Within 24h
        "activity": {},
    }
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_snapshot
    mock_db.execute.return_value = mock_result
    
    with patch("backend.services.github._fetch_repos", side_effect=mock_fetch_repos) as mock_api:
        result1 = await get_github_data(mock_db, "user-id-1")
        print(f"SCENARIO 1 (fresh cache): _fetch_repos called = {mock_api.called}, call count = {mock_api.call_count}")
    
    # Scenario 2: Expired cache (>24h) - SHOULD call API
    api_call_count = 0
    mock_snapshot2 = MagicMock()
    mock_snapshot2.github_data = {
        "username": "testuser",
        "repos": [],
        "languages": {},
        "fetched_at": "2026-08-20T12:00:00+00:00",  # >24h ago
        "activity": {},
    }
    mock_result2 = MagicMock()
    mock_result2.scalar_one_or_none.return_value = mock_snapshot2
    mock_db.execute.return_value = mock_result2
    
    with patch("backend.services.github._fetch_repos", side_effect=mock_fetch_repos) as mock_api:
        with patch("backend.services.github._fetch_languages", side_effect=mock_fetch_languages):
            with patch("backend.services.github._fetch_user_info", side_effect=mock_fetch_user_info):
                try:
                    result2 = await get_github_data(mock_db, "user-id-2")
                except Exception as e:
                    print(f"SCENARIO 2 (expired cache): Exception = {e}")
                print(f"SCENARIO 2 (expired cache): _fetch_repos called = {mock_api.called}, call count = {mock_api.call_count}")
    
    # Scenario 3: No cache at all - SHOULD call API
    api_call_count = 0
    mock_result3 = MagicMock()
    mock_result3.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result3
    
    with patch("backend.services.github._fetch_repos", side_effect=mock_fetch_repos) as mock_api:
        with patch("backend.services.github._fetch_languages", side_effect=mock_fetch_languages):
            with patch("backend.services.github._fetch_user_info", side_effect=mock_fetch_user_info):
                try:
                    result3 = await get_github_data(mock_db, "user-id-3")
                except Exception as e:
                    print(f"SCENARIO 3 (no cache): Exception = {e}")
                print(f"SCENARIO 3 (no cache): _fetch_repos called = {mock_api.called}, call count = {mock_api.call_count}")


if __name__ == "__main__":
    asyncio.run(test_caching())
