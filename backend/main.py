import os
import sys
import json

# Add current directory to sys.path so packages like 'routers' are recognized
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path, override=True)

from routers import documents, chat, auth

app = FastAPI(title="RAG Chatbot API")

# Configure CORS
origins_env = os.getenv("BACKEND_CORS_ORIGINS", '["*"]')
try:
    origins_list = json.loads(origins_env)
except Exception:
    origins_list = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

# Fallback routers for Vercel experimentalServices if routePrefix is not stripped
app.include_router(auth.router, prefix="/_/backend/api/auth", tags=["auth_vercel"])
app.include_router(documents.router, prefix="/_/backend/api/documents", tags=["documents_vercel"])
app.include_router(chat.router, prefix="/_/backend/api/chat", tags=["chat_vercel"])

@app.get("/")
def read_root():
    return {"message": "Welcome to RAG Chatbot API using FastAPI, MongoDB Atlas, and Gemini"}
