import json
import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "RAG Chatbot Dokumen Perusahaan"
    ENVIRONMENT: str = "development"
    
    # JWT & Auth
    JWT_SECRET: str = "supersecretjwtkeychangeinproduction12345!@#$"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # PostgreSQL Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/rag_chatbot"

    # Google Gemini API
    GEMINI_API_KEY: str = ""

    # Chroma DB
    CHROMA_PERSIST_DIRECTORY: str = "./chroma_db"

    # Local storage for documents
    UPLOAD_DIR: str = "./uploads"

    # CORS origins
    BACKEND_CORS_ORIGINS: Union[List[str], str] = ["*"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        return v

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure required directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)
