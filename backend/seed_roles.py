"""Seed admin-managed target role profiles (PHASE.md Phase 2).

Idempotent: skips any role whose name already exists, so it is safe to run
repeatedly. Run with:  python -m backend.seed_roles
"""

import asyncio

from sqlalchemy import select

from backend.database import async_session, engine, Base
from backend.models.target_role import TargetRoleProfile

ROLES = [
    {
        "name": "Backend Engineer",
        "required_skills": [
            {"skill": "python", "weight": 1.0, "min_depth": "working"},
            {"skill": "sql", "weight": 1.0, "min_depth": "working"},
            {"skill": "rest api", "weight": 1.0, "min_depth": "working"},
            {"skill": "git", "weight": 0.8, "min_depth": "basic"},
            {"skill": "docker", "weight": 0.7, "min_depth": "basic"},
            {"skill": "databases", "weight": 0.8, "min_depth": "working"},
        ],
    },
    {
        "name": "ML Engineer",
        "required_skills": [
            {"skill": "python", "weight": 1.0, "min_depth": "working"},
            {"skill": "machine learning", "weight": 1.0, "min_depth": "working"},
            {"skill": "pandas", "weight": 0.8, "min_depth": "working"},
            {"skill": "numpy", "weight": 0.8, "min_depth": "working"},
            {"skill": "scikit-learn", "weight": 0.7, "min_depth": "basic"},
            {"skill": "sql", "weight": 0.6, "min_depth": "basic"},
        ],
    },
    {
        "name": "Frontend Engineer",
        "required_skills": [
            {"skill": "javascript", "weight": 1.0, "min_depth": "working"},
            {"skill": "react", "weight": 1.0, "min_depth": "working"},
            {"skill": "html", "weight": 0.8, "min_depth": "working"},
            {"skill": "css", "weight": 0.8, "min_depth": "working"},
            {"skill": "typescript", "weight": 0.7, "min_depth": "basic"},
            {"skill": "git", "weight": 0.6, "min_depth": "basic"},
        ],
    },
    {
        "name": "Full-Stack Engineer",
        "required_skills": [
            {"skill": "javascript", "weight": 1.0, "min_depth": "working"},
            {"skill": "react", "weight": 1.0, "min_depth": "working"},
            {"skill": "python", "weight": 0.9, "min_depth": "working"},
            {"skill": "sql", "weight": 0.9, "min_depth": "working"},
            {"skill": "rest api", "weight": 0.9, "min_depth": "working"},
            {"skill": "git", "weight": 0.8, "min_depth": "basic"},
            {"skill": "docker", "weight": 0.5, "min_depth": "basic"},
        ],
    },
]


async def main() -> None:
    # Ensure tables exist (this script can run standalone, before `main.py` boots).
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        for spec in ROLES:
            existing = await db.execute(
                select(TargetRoleProfile).where(TargetRoleProfile.name == spec["name"])
            )
            if existing.scalar_one_or_none():
                print(f"skip   {spec['name']} (already exists)")
                continue
            db.add(TargetRoleProfile(name=spec["name"], required_skills=spec["required_skills"]))
            print(f"seeded {spec['name']}")
        await db.commit()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
