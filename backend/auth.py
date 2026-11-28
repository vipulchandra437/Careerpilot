import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, role: str, token_version: int = 0) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload = {"sub": user_id, "role": role, "exp": expire, "type": "access", "ver": token_version}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: str, token_version: int = 0) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days)
    payload = {"sub": user_id, "exp": expire, "type": "refresh", "ver": token_version}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def token_version_matches(payload: dict, token_version: int) -> bool:
    """Tokens without `ver` are legacy and stay valid; a present mismatch is revoked."""
    return "ver" not in payload or payload["ver"] == token_version


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None


def create_github_oauth_state(user_id: str) -> str:
    """Signed, user-bound OAuth state with a 10-minute lifetime and a replay nonce."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=10)
    payload = {
        "sub": user_id,
        "nonce": str(uuid.uuid4()),
        "exp": expire,
        "type": "github_state",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_github_oauth_state(token: str, user_id: str) -> str | None:
    """Return the state nonce only for an untampered, unexpired, user-bound token."""
    payload = decode_token(token)
    if not payload or payload.get("type") != "github_state" or payload.get("sub") != user_id:
        return None
    nonce = payload.get("nonce")
    return nonce if isinstance(nonce, str) else None
