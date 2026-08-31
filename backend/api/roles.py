import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.target_role import TargetRoleProfile
from backend.api.dependencies import require_admin

router = APIRouter(prefix="/admin/roles", tags=["admin-roles"])


class RequiredSkill(BaseModel):
    skill: str
    weight: float = Field(ge=0, le=1)
    min_depth: str = "working"


class TargetRoleCreate(BaseModel):
    name: str
    required_skills: list[RequiredSkill]


class TargetRoleUpdate(BaseModel):
    name: str | None = None
    required_skills: list[RequiredSkill] | None = None


class TargetRoleResponse(BaseModel):
    id: uuid.UUID
    name: str
    required_skills: list
    created_at: datetime


def _to_response(role: TargetRoleProfile) -> TargetRoleResponse:
    return TargetRoleResponse(
        id=uuid.UUID(role.id),
        name=role.name,
        required_skills=role.required_skills or [],
        created_at=role.created_at,
    )


@router.get("", response_model=list[TargetRoleResponse])
async def list_roles(
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all target role profiles (admin only)."""
    result = await db.execute(select(TargetRoleProfile).order_by(TargetRoleProfile.name))
    return [_to_response(r) for r in result.scalars().all()]


@router.get("/{role_id}", response_model=TargetRoleResponse)
async def get_role(
    role_id: str,
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TargetRoleProfile).where(TargetRoleProfile.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target role not found")
    return _to_response(role)


@router.post("", response_model=TargetRoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    req: TargetRoleCreate,
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(TargetRoleProfile).where(TargetRoleProfile.name == req.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A target role with this name already exists"
        )
    role = TargetRoleProfile(
        name=req.name,
        required_skills=[s.model_dump() for s in req.required_skills],
        updated_by=str(user.id),
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return _to_response(role)


@router.put("/{role_id}", response_model=TargetRoleResponse)
async def update_role(
    role_id: str,
    req: TargetRoleUpdate,
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TargetRoleProfile).where(TargetRoleProfile.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target role not found")
    if req.name is not None:
        role.name = req.name
    if req.required_skills is not None:
        role.required_skills = [s.model_dump() for s in req.required_skills]
    role.updated_by = str(user.id)
    await db.commit()
    await db.refresh(role)
    return _to_response(role)


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: str,
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TargetRoleProfile).where(TargetRoleProfile.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target role not found")
    await db.delete(role)
    await db.commit()
