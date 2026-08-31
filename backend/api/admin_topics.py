"""Admin CRUD for the coding-challenge topic bank (PRD §6.7, DESIGN §2.9).

Server-side role-gated (RULES §2): every route depends on `require_admin`, so a
direct non-admin API call is rejected regardless of what the frontend shows.
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.topic import ChallengeTopic
from backend.api.dependencies import require_admin

router = APIRouter(prefix="/admin/topics", tags=["admin-topics"])


class TopicCreate(BaseModel):
    name: str
    description: str | None = None
    enabled: bool = True


class TopicUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    enabled: bool | None = None


class TopicResponse(BaseModel):
    id: str
    name: str
    description: str | None
    enabled: bool
    created_at: datetime


def _to_response(t: ChallengeTopic) -> TopicResponse:
    return TopicResponse(
        id=t.id,
        name=t.name,
        description=t.description,
        enabled=t.enabled,
        created_at=t.created_at,
    )


@router.get("", response_model=list[TopicResponse])
async def list_topics(
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ChallengeTopic).order_by(ChallengeTopic.name))
    return [_to_response(t) for t in result.scalars().all()]


async def _name_exists(db, name: str, exclude_id: str | None = None) -> bool:
    """Case-insensitive uniqueness: 'SQL' and 'sql' are the same topic."""
    from sqlalchemy import func
    stmt = select(ChallengeTopic.id).where(func.lower(ChallengeTopic.name) == name.lower())
    if exclude_id:
        stmt = stmt.where(ChallengeTopic.id != exclude_id)
    return (await db.execute(stmt)).scalar_one_or_none() is not None


@router.post("", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(
    req: TopicCreate,
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Topic name cannot be empty")
    if await _name_exists(db, name):
        raise HTTPException(status_code=409, detail="A topic with this name already exists")
    topic = ChallengeTopic(
        name=name,
        description=(req.description or "").strip() or None,
        enabled=req.enabled,
        updated_by=str(user.id),
    )
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return _to_response(topic)


@router.put("/{topic_id}", response_model=TopicResponse)
async def update_topic(
    topic_id: str,
    req: TopicUpdate,
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ChallengeTopic).where(ChallengeTopic.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    if req.name is not None:
        name = req.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Topic name cannot be empty")
        if await _name_exists(db, name, exclude_id=topic_id):
            raise HTTPException(status_code=409, detail="A topic with this name already exists")
        topic.name = name
    if req.description is not None:
        topic.description = req.description.strip() or None
    if req.enabled is not None:
        topic.enabled = req.enabled
    topic.updated_by = str(user.id)
    await db.commit()
    await db.refresh(topic)
    return _to_response(topic)


@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    topic_id: str,
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ChallengeTopic).where(ChallengeTopic.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    await db.delete(topic)
    await db.commit()