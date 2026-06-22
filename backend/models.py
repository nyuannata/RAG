from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class ChatSessionCreate(BaseModel):
    title: str

class ChatSessionResponse(BaseModel):
    id: str
    title: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class ChatMessageStreamRequest(BaseModel):
    message: str
    document_ids: Optional[List[str]] = None

class Citation(BaseModel):
    index: int
    filename: str
    page: int

class CitationList(BaseModel):
    citations: List[Citation]

class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: str
    citations: Optional[CitationList] = None

class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    file_type: str
    embedding_status: str
