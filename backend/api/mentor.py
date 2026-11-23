"""Mentor chat API."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.database import get_db
from backend.services.mentor import (
    create_conversation,
    delete_conversation,
    get_messages,
    list_conversations,
    send_message,
)

router = APIRouter(prefix="/mentor", tags=["mentor"])


class SendRequest(BaseModel):
    content: str = Field(min_length=1, max_length=4000)
    conversation_id: str | None = None


def _msg(m) -> dict:
    return {
        "id": m.id,
        "role": m.role,
        "content": m.content,
        "conversation_id": m.conversation_id,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _conv(c) -> dict:
    if isinstance(c, dict):
        return c
    return {
        "id": c.id,
        "title": c.title,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.get("/conversations")
async def conversations(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return {"conversations": await list_conversations(db, user.id)}


@router.post("/conversations")
async def new_conversation(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    conv = await create_conversation(db, user.id)
    return {"conversation": _conv(conv)}


@router.get("/conversations/{conversation_id}/messages")
async def conversation_messages(conversation_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        msgs = await get_messages(db, user.id, conversation_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"messages": [_msg(m) for m in msgs]}


@router.delete("/conversations/{conversation_id}")
async def remove_conversation(conversation_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        await delete_conversation(db, user.id, conversation_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"ok": True}


@router.post("/messages")
async def create_message(req: SendRequest, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        conv, user_msg, assistant_msg = await send_message(db, user.id, req.content, req.conversation_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Conversation not found")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=502, detail="Mentor is unavailable right now. Please try again.")
    return {"conversation": _conv(conv), "user_message": _msg(user_msg), "message": _msg(assistant_msg)}
