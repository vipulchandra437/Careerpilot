import logging
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.user import User
from backend.auth import hash_password, verify_password, create_access_token, create_refresh_token, decode_token, token_version_matches

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# shortcut: in-memory limiter is per process; use a shared store when running
# multiple serverless instances or brute-force traffic can spread across them.
_login_attempts: dict[tuple[str, str], deque[float]] = defaultdict(deque)
# shortcut: in-memory limiter is per process; use a shared store for multi-instance serverless.
_signup_attempts: dict[str, deque[float]] = defaultdict(deque)


def _check_login_rate(request: Request, email: str) -> None:
    ip = request.client.host if request.client else "unknown"
    attempts = _login_attempts[(ip, email.lower())]
    now = time.monotonic()
    while attempts and attempts[0] <= now - 60:
        attempts.popleft()
    if len(attempts) >= 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again later.",
        )
    attempts.append(now)


def _check_signup_rate(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    attempts = _signup_attempts[ip]
    now = time.monotonic()
    while attempts and attempts[0] <= now - 60:
        attempts.popleft()
    if len(attempts) >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many signup attempts. Try again later.",
        )
    attempts.append(now)


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def limit_bcrypt_bytes(cls, value: str) -> str:
        # bcrypt silently truncates past 72 bytes, so two different passwords
        # sharing that prefix would both unlock the same account.
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(req: SignupRequest, request: Request, db: AsyncSession = Depends(get_db)):
    _check_signup_rate(request)
    try:
        existing = await db.execute(select(User).where(User.email == req.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

        user = User(email=req.email, password_hash=hash_password(req.password))
        db.add(user)
        await db.commit()
        await db.refresh(user)
    except HTTPException:
        raise
    except Exception as e:
        # Never silently swallow a registration failure. Roll back and surface a
        # clear error so the client knows the account was NOT created.
        await db.rollback()
        logger.exception("Registration failed for %s", req.email)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Registration could not be completed. Please try again.",
        ) from e

    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role.value, user.token_version),
        refresh_token=create_refresh_token(str(user.id), user.token_version),
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    _check_login_rate(request, req.email)
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    # bcrypt ignores bytes past 72; reject rather than accept a prefix match.
    too_long = len(req.password.encode("utf-8")) > 72
    if too_long or not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role.value, user.token_version),
        refresh_token=create_refresh_token(str(user.id), user.token_version),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not token_version_matches(payload, user.token_version):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role.value, user.token_version),
        refresh_token=create_refresh_token(str(user.id), user.token_version),
    )
