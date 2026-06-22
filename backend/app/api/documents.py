import os
import uuid
import shutil
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.db.session import get_db
from app.db.session import async_session_maker
from app.models.models import User, Document
from app.schemas.document import DocumentResponse
from app.auth.deps import get_current_user
from app.rag.pipeline import process_and_embed_document, delete_document_embeddings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["Documents"])

# Allowed extensions and sizes
ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "md"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB in bytes

async def background_embedding_task(
    user_id: uuid.UUID,
    document_id: uuid.UUID,
    file_path: str,
    file_type: str,
    filename: str
):
    """Asynchronous background task to process document text and generate vector embeddings."""
    success = await process_and_embed_document(
        user_id=user_id,
        document_id=document_id,
        file_path=file_path,
        file_type=file_type,
        filename=filename
    )
    
    # Update state in database
    async with async_session_maker() as db_session:
        result = await db_session.execute(
            select(Document).filter(Document.id == document_id)
        )
        doc = result.scalars().first()
        if doc:
            doc.embedding_status = "completed" if success else "failed"
            await db_session.commit()

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a document, validate format and size, save locally,
    and queue it for vector database ingestion.
    """
    # 1. Validate File Name & Extension
    filename = file.filename
    if not filename or "." not in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama file tidak valid."
        )
        
    ext = filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Format file '{ext}' tidak didukung. Gunakan PDF, DOCX, TXT, atau MD."
        )

    # 2. Validate File Size
    # Spool files are read to verify actual content sizes
    contents = await file.read()
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ukuran file melebihi batas 10 MB."
        )
    
    # Reset read pointer
    await file.seek(0)

    # 3. Create Document DB entry (status: processing)
    doc_id = uuid.uuid4()
    user_upload_dir = os.path.join(settings.UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_upload_dir, exist_ok=True)
    
    file_path = os.path.join(user_upload_dir, f"{doc_id}.{ext}")

    db_document = Document(
        id=doc_id,
        user_id=current_user.id,
        filename=filename,
        file_path=file_path,
        file_size=file_size,
        file_type=ext,
        embedding_status="processing"
    )
    db.add(db_document)
    await db.commit()
    await db.refresh(db_document)

    # 4. Save file to disk
    try:
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        logger.error(f"Gagal menulis file ke disk: {str(e)}")
        db_document.embedding_status = "failed"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal menyimpan file ke server."
        )

    # 5. Enqueue background RAG processing task
    background_tasks.add_task(
        background_embedding_task,
        user_id=current_user.id,
        document_id=doc_id,
        file_path=file_path,
        file_type=ext,
        filename=filename
    )

    return db_document

@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve list of all documents uploaded by the authenticated user."""
    result = await db.execute(
        select(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    return result.scalars().all()

@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a document from PostgreSQL, purge the local file,
    and remove its vector chunks from ChromaDB.
    """
    result = await db.execute(
        select(Document)
        .filter(Document.id == document_id, Document.user_id == current_user.id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokumen tidak ditemukan atau Anda tidak memiliki akses."
        )

    # 1. Delete Embeddings from ChromaDB
    try:
        delete_document_embeddings(doc.id)
    except Exception as e:
        logger.error(f"Gagal menghapus embeddings untuk dokumen {doc.id}: {str(e)}")
        # Continue with DB deletion even if Chroma fails, to prevent locking user
        
    # 2. Delete Local File from Storage
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            logger.error(f"Gagal menghapus file di path {doc.file_path}: {str(e)}")

    # 3. Delete DB record
    await db.delete(doc)
    await db.commit()
    
    return {"detail": "Dokumen berhasil dihapus secara permanen."}
