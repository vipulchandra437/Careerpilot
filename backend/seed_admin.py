"""Admin bootstrap: promote an existing user to the `admin` role.

There is deliberately NO self-service admin path — signup always creates a
`student` (see backend/api/auth.py). Making someone an admin is an out-of-band,
operator act, which is the correct posture for a commercial product (RULES §2:
admin is a real server-side role, not something a user requests).

Usage:
    python -m backend.seed_admin you@example.com

Idempotent — re-running on an already-admin user is a no-op.
"""

import asyncio
import sys

from sqlalchemy import select

from backend.database import async_session, engine, Base
from backend.models.user import User, UserRole


async def main(email: str) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            print(f"user not found: {email}")
            return
        if user.role == UserRole.admin:
            print(f"{email} is already admin")
            return
        user.role = UserRole.admin
        await db.commit()
        print(f"promoted {email} -> admin (id={user.id})")
    await engine.dispose()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: python -m backend.seed_admin <email>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1].strip()))