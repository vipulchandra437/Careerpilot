import uuid
import json
import hashlib
import base64
from datetime import datetime, timezone, timedelta

import httpx
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import get_settings
from backend.models.github import GitHubToken

settings = get_settings()

# Encrypt GitHub OAuth tokens at rest with Fernet (authenticated AEAD cipher) —
# RULES.md §2 "tokens are encrypted at rest". The key is derived from the dedicated
# GITHUB_TOKEN_ENCRYPTION_KEY setting (SHA-256 -> url-safe b64 32 bytes, the exact
# format Fernet requires). A dedicated key is preferred; if absent we fall back to a
# derivation of jwt_secret_key for local/dev only (see config.py).
def _fernet_key() -> bytes:
    source = settings.github_token_encryption_key or settings.jwt_secret_key
    return base64.urlsafe_b64encode(hashlib.sha256(source.encode()).digest())


_fernet = Fernet(_fernet_key())


def _encrypt_fernet(token: str) -> str:
    try:
        return _fernet.encrypt(token.encode()).decode()
    except Exception:
        # Re-derive on settings change so a rotated key still works.
        return Fernet(_fernet_key()).encrypt(token.encode()).decode()


def encrypt_token(token: str) -> str:
    """Encrypt GitHub token at rest (Fernet authenticated encryption)."""
    return _encrypt_fernet(token)


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a Fernet-encrypted GitHub token. Raises ValueError on tamper/old
    data so a corrupted value can never silently produce a wrong token."""
    try:
        return _fernet.decrypt(encrypted_token.encode()).decode()
    except InvalidToken:
        try:
            return Fernet(_fernet_key()).decrypt(encrypted_token.encode()).decode()
        except InvalidToken as e:
            raise ValueError("GitHub token could not be decrypted (key rotated or data tampered)") from e


def get_github_auth_url(state: str) -> str:
    """Generate GitHub OAuth authorization URL."""
    return (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.github_client_id}"
        f"&redirect_uri={settings.github_redirect_uri}"
        f"&scope=repo,user"
        f"&state={state}"
    )


async def exchange_code_for_token(code: str) -> str:
    """Exchange OAuth code for access token."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        if response.status_code != 200:
            raise ValueError("Failed to exchange code for token")
        data = response.json()
        if "error" in data:
            raise ValueError(f"GitHub OAuth error: {data['error_description']}")
        return data["access_token"]


async def _fetch_user_info(token: str) -> dict:
    """Fetch GitHub user info."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {token}"},
        )
        if response.status_code != 200:
            raise ValueError("Failed to fetch GitHub user info")
        return response.json()


async def _fetch_repos(token: str, username: str) -> list[dict]:
    """Fetch user repositories."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.github.com/users/{username}/repos",
            headers={"Authorization": f"Bearer {token}"},
            params={"sort": "updated", "per_page": 30},
        )
        if response.status_code != 200:
            raise ValueError("Failed to fetch repositories")
        return response.json()


async def _fetch_languages(token: str, repo_url: str) -> dict:
    """Fetch languages for a specific repo.

    `repo_url` is the repo's `languages_url` from the GitHub API, which already
    ends in `/languages` (e.g. https://api.github.com/repos/owner/repo/languages).
    Call it directly; appending another `/languages` yields a 404."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            repo_url,
            headers={"Authorization": f"Bearer {token}"},
        )
        if response.status_code != 200:
            return {}
        return response.json()


async def _fetch_commit_activity(token: str, username: str) -> dict:
    """Fetch recent commit activity."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.github.com/users/{username}/events",
            headers={"Authorization": f"Bearer {token}"},
            params={"per_page": 30},
        )
        if response.status_code != 200:
            return {}
        return response.json()


async def connect_github_account(db: AsyncSession, user_id: uuid.UUID, code: str) -> dict:
    """Connect a GitHub account via OAuth code."""
    token = await exchange_code_for_token(code)
    user_info = await _fetch_user_info(token)

    # Store encrypted token
    existing = await db.execute(select(GitHubToken).where(GitHubToken.user_id == user_id))
    existing_token = existing.scalar_one_or_none()

    if existing_token:
        existing_token.encrypted_token = encrypt_token(token)
        existing_token.github_username = user_info.get("login")
        existing_token.updated_at = datetime.now(timezone.utc)
    else:
        github_token = GitHubToken(
            user_id=user_id,
            encrypted_token=encrypt_token(token),
            github_username=user_info.get("login"),
        )
        db.add(github_token)

    await db.commit()

    return {
        "github_username": user_info.get("login"),
        "avatar_url": user_info.get("avatar_url"),
        "public_repos": user_info.get("public_repos"),
    }


async def get_github_data(db: AsyncSession, user_id: uuid.UUID) -> dict:
    """Get GitHub data for a user, using cache if available."""
    result = await db.execute(select(GitHubToken).where(GitHubToken.user_id == user_id))
    github_token = result.scalar_one_or_none()

    if not github_token:
        raise ValueError("GitHub account not connected")

    # Check if we have cached data (within 24h TTL)
    cached_data = await _get_cached_data(db, user_id)
    if cached_data:
        return cached_data

    # Decrypt token and fetch fresh data
    token = decrypt_token(github_token.encrypted_token)
    username = github_token.github_username

    repos = await _fetch_repos(token, username)

    # Get languages for top repos
    languages = {}
    for repo in repos[:10]:  # Limit to top 10 repos
        if repo.get("languages_url"):
            repo_langs = await _fetch_languages(token, repo["languages_url"])
            for lang, bytes_count in repo_langs.items():
                languages[lang] = languages.get(lang, 0) + bytes_count

    # Fetch recent activity
    activity = await _fetch_commit_activity(token, username)

    data = {
        "username": username,
        "repos": [
            {
                "name": repo.get("name"),
                "description": repo.get("description"),
                "language": repo.get("language"),
                "stars": repo.get("stargazers_count"),
                "forks": repo.get("forks_count"),
                "updated_at": repo.get("updated_at"),
            }
            for repo in repos
        ],
        "languages": languages,
        "activity": activity,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }

    # Cache the data
    await _cache_data(db, user_id, data)

    return data


async def _get_cached_data(db: AsyncSession, user_id: uuid.UUID) -> dict | None:
    """Get cached GitHub data if within TTL."""
    from backend.models.profile import ProfileSnapshot
    result = await db.execute(
        select(ProfileSnapshot).where(ProfileSnapshot.user_id == user_id)
    )
    snapshot = result.scalar_one_or_none()
    if snapshot and snapshot.github_data:
        fetched_at = snapshot.github_data.get("fetched_at")
        if fetched_at:
            fetched_time = datetime.fromisoformat(fetched_at)
            if datetime.now(timezone.utc) - fetched_time < timedelta(hours=24):
                return snapshot.github_data
    return None


async def _cache_data(db: AsyncSession, user_id: uuid.UUID, data: dict) -> None:
    """Cache GitHub data in profile snapshot."""
    from backend.models.profile import ProfileSnapshot
    result = await db.execute(
        select(ProfileSnapshot).where(ProfileSnapshot.user_id == user_id)
    )
    snapshot = result.scalar_one_or_none()

    if snapshot:
        snapshot.github_data = data
    else:
        snapshot = ProfileSnapshot(user_id=user_id, github_data=data)
        db.add(snapshot)

    await db.commit()
