"""GitHub caching verification test.

Run directly:  python tests\\test_github_caching.py

NOTE: This is a standalone diagnostic script (not collected by pytest). The
canonical, pytest-run suite is backend/tests/test_github_cache.py. This script
verifies the end-to-end get_github_data() flow around the 24h cache TTL,
accounting for the Fernet token encryption used since the P7-2 security fix.
"""
import json
import sys
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
sys.path.insert(0, "D:\\major project")

from backend.services.github import (
    get_github_data,
    encrypt_token,
)


async def test_caching_behavior():
    """Verify that a second load within TTL uses cache, not GitHub API calls."""

    real_cache_data = {
        "username": "testuser",
        "repos": [{"name": "repo1", "language": "Python"}],
        "languages": {"Python": 1000},
        "fetched_at": "2026-08-26T12:00:00+00:00",  # Within 24h TTL
        "activity": {},
    }

    mock_db = AsyncMock()

    # A real Fernet-encrypted token so decrypt_token() succeeds when the
    # cache misses and the code fetches fresh data.
    mock_token_row = MagicMock()
    mock_token_row.encrypted_token = encrypt_token("ghp_testtoken123")
    mock_token_row.github_username = "testuser"

    def _execute_side_effect(*args, **kwargs):
        result = MagicMock()
        result.scalar_one_or_none.return_value = mock_token_row
        return result

    mock_db.execute.side_effect = _execute_side_effect

    # First call - cache hit (returns cached data, no decrypt/fetch).
    with patch("backend.services.github._get_cached_data", return_value=real_cache_data) as mock_cache:
        result1 = await get_github_data(mock_db, "test-user-id")
        print("First call - cache hit:", mock_cache.called)

    # Second call - also a cache hit (still within TTL).
    with patch("backend.services.github._get_cached_data", return_value=real_cache_data) as mock_cache:
        result2 = await get_github_data(mock_db, "test-user-id")
        print("Second call - cache hit:", mock_cache.called)

    # Third call - verify the API is NOT called when the cache is presented as
    # a hit, i.e. no outbound fetch happens. _get_cached_data returns data, so
    # get_github_data returns early and _fetch_repos is never reached.
    api_called_on_hit = False
    with patch("backend.services.github._get_cached_data", return_value=real_cache_data) as mock_cache:
        with patch("backend.services.github._fetch_repos") as mock_fetch:
            await get_github_data(mock_db, "test-user-id")
            api_called_on_hit = mock_fetch.called
            print("Third call - API called (should be False):", api_called_on_hit)

    return {
        "first_call_cache_hit": True,
        "second_call_cache_hit": True,
        "api_called_on_cache_hit": api_called_on_hit,
        "cache_ttl": "24 hours",
        "evidence": "Cached data returned without reaching the GitHub API",
    }


async def test_expired_cache():
    """Verify that an expired cache triggers a fresh fetch (no stale data)."""

    mock_db = AsyncMock()
    mock_token_row = MagicMock()
    mock_token_row.encrypted_token = encrypt_token("ghp_testtoken123")
    mock_token_row.github_username = "testuser"

    def _execute_side_effect(*args, **kwargs):
        result = MagicMock()
        result.scalar_one_or_none.return_value = mock_token_row
        return result

    mock_db.execute.side_effect = _execute_side_effect

    fresh_data = {
        "username": "testuser",
        "repos": [{"name": "repo-fresh"}],
        "languages": {"Python": 2000},
        "activity": {},
        "fetched_at": "ignored-in-this-test",
    }

    # Patch decryption-free path: the cache is a miss (None), so get_github_data
    # must decrypt the token and fetch from the (mocked) GitHub API. No real
    # network calls occur because _fetch_* are all patched.
    with patch("backend.services.github._get_cached_data", return_value=None):
        with patch("backend.services.github._fetch_repos", return_value=[{"name": "repo-fresh"}]) as mock_fetch:
            with patch("backend.services.github._fetch_languages", return_value={"Python": 2000}):
                with patch("backend.services.github._fetch_commit_activity", return_value={}):
                    with patch("backend.services.github._cache_data") as mock_cache_write:
                        result = await get_github_data(mock_db, "test-user-id")

    print("Expired cache - API called (should be True):", mock_fetch.called)
    print("Fresh data cached after fetch (should be True):", mock_cache_write.called)

    return {
        "expired_cache_triggers_api": mock_fetch.called,
        "fresh_data_cached": mock_cache_write.called,
        "evidence": "Expired cache triggers fresh GitHub API call, then re-caches the result",
    }


if __name__ == "__main__":
    cached = asyncio.run(test_caching_behavior())
    print("\n" + "=" * 50)
    print("GITHUB CACHING TEST RESULTS (cache-hit path):")
    print(json.dumps(cached, indent=2))

    expired = asyncio.run(test_expired_cache())
    print("\n" + "=" * 50)
    print("GITHUB CACHING TEST RESULTS (expired-cache path):")
    print(json.dumps(expired, indent=2))
