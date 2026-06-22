import uuid
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.models import User, ChatSession, ChatMessage
from app.schemas.chat import (
    ChatSessionResponse,
    ChatSessionCreate,
    ChatMessageResponse,
    ChatQueryRequest
)
from app.auth.deps import get_current_user
from app.rag.chatbot import generate_chatbot_stream

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chatbot"])

@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    payload: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new chat conversation session for the user."""
    new_session = ChatSession(
        user_id=current_user.id,
        title=payload.title or "Percakapan Baru"
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    return new_session

@router.get("/sessions", response_model=List[ChatSessionResponse])
async def list_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all chat conversations created by the authenticated user."""
    result = await db.execute(
        select(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
    )
    return result.scalars().all()

@router.delete("/sessions/{session_id}", status_code=status.HTTP_200_OK)
async def delete_chat_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a chat session and its complete message history."""
    result = await db.execute(
        select(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesi percakapan tidak ditemukan."
        )

    await db.delete(session)
    await db.commit()
    return {"detail": "Sesi percakapan berhasil dihapus."}

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_session_messages(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve all messages belonging to a specific conversation session."""
    # 1. Verify ownership of the chat session
    session_result = await db.execute(
        select(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = session_result.scalars().first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesi percakapan tidak ditemukan."
        )

    # 2. Fetch messages ordered chronologically
    messages_result = await db.execute(
        select(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    return messages_result.scalars().all()

@router.post("/sessions/{session_id}/stream")
async def chat_stream_response(
    session_id: uuid.UUID,
    payload: ChatQueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Stream context-aware chatbot replies based on query and optional selected documents.
    Uses SSE (Server-Sent Events) to return tokens progressively.
    """
    # Verify session ownership
    session_result = await db.execute(
        select(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = session_result.scalars().first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesi percakapan tidak ditemukan."
        )

    # Return asynchronous streaming response
    return StreamingResponse(
        generate_chatbot_stream(
            user_id=current_user.id,
            session_id=session_id,
            user_query=payload.message,
            selected_document_ids=payload.document_ids
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
