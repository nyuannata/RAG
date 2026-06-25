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
    folder_id: Optional[str] = None

class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    folder_id: Optional[str] = None
    tag_ids: Optional[List[str]] = None

class ChatSessionResponse(BaseModel):
    id: str
    title: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    folder_id: Optional[str] = None
    tag_ids: Optional[List[str]] = []

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
    is_cached: Optional[bool] = False

class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    file_type: str
    embedding_status: str
    created_at: str
    folder_id: Optional[str] = None

class ProjectCreate(BaseModel):
    name: str

class ProjectResponse(BaseModel):
    id: str
    name: str
    created_at: str

class FolderCreate(BaseModel):
    name: str
    project_id: str

class FolderResponse(BaseModel):
    id: str
    project_id: str
    name: str
    created_at: str

class TagCreate(BaseModel):
    name: str
    color: str

class TagResponse(BaseModel):
    id: str
    name: str
    color: str
    created_at: str
