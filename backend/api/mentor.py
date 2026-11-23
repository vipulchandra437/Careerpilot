"""Mentor chat API (user-requested MVP)."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.database import get_db
from backend.services.mentor import get_messages, send_message, clear_messages

router = APIRouter(prefix="/mentor", tags=["mentor"])


class SendRequest(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


def _msg(m) -> dict:
    return {"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat() if m.created_at else None}


@router.get("/messages")
async def list_messages(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    msgs = await get_messages(db, user.id)
    return {"messages": [_msg(m) for m in msgs]}


@router.post("/messages")
async def create_message(req: SendRequest, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        msg = await send_message(db, user.id, req.content)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=502, detail="Mentor is unavailable right now. Please try again.")
    return {"message": _msg(msg)}


@router.delete("/messages")
async def delete_messages(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await clear_messages(db, user.id)
    return {"ok": True}
