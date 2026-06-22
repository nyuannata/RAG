import uuid
from datetime import datetime
from pydantic import BaseModel

class DocumentBase(BaseModel):
    filename: str
    file_type: str
    file_size: int

class DocumentCreate(DocumentBase):
    file_path: str
    user_id: uuid.UUID

class DocumentUpdate(BaseModel):
    embedding_status: str

class DocumentResponse(DocumentBase):
    id: uuid.UUID
    user_id: uuid.UUID
    embedding_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
