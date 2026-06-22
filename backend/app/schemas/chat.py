import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class ChatMessageBase(BaseModel):
    role: str  # user, assistant
    content: str

class ChatMessageCreate(ChatMessageBase):
    session_id: uuid.UUID
    citations: Optional[dict] = None

class ChatMessageResponse(ChatMessageBase):
    id: uuid.UUID
    session_id: uuid.UUID
    citations: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionBase(BaseModel):
    title: str

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "Percakapan Baru"

class ChatSessionResponse(ChatSessionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ChatQueryRequest(BaseModel):
    message: str
    document_ids: Optional[List[uuid.UUID]] = None  # Select specific docs or None for all
