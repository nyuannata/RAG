import sys
import os

# Menambahkan path root backend agar Python bisa menemukan modul 'app'
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.api.chat import router as chat_router

# Setup logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API untuk Aplikasi RAG Chatbot Dokumen Perusahaan",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS Middleware to allow cross-origin requests from modern frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database dynamic initialization on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Menginisialisasi skema database secara otomatis...")
    try:
        async with engine.begin() as conn:
            # Sync model metadata with postgres to create missing tables
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Inisialisasi database PostgreSQL berhasil selesai.")
    except Exception as e:
        logger.error(f"Gagal menginisialisasi skema database: {str(e)}")
        # App will keep running, but log database initialization errors clearly

# Mount routers
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(chat_router)

# Healthcheck endpoint
@app.get("/api/health", tags=["System"])
async def health_check():
    """Retrieve application status health check."""
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }

# General error handler middleware
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception caught on request {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Terjadi kesalahan internal pada server. Silakan coba beberapa saat lagi."}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
