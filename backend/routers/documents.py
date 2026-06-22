import os
import io
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from bson import ObjectId
from typing import List
from database import get_db
from models import DocumentResponse
from llm import get_embedding
from pypdf import PdfReader
from docx import Document as DocxDocument

router = APIRouter()

def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = filename.lower().split('.')[-1]
    text = ""
    try:
        if ext == 'pdf':
            reader = PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        elif ext in ['doc', 'docx']:
            doc = DocxDocument(io.BytesIO(file_bytes))
            for para in doc.paragraphs:
                text += para.text + "\n"
        elif ext in ['txt', 'md']:
            text = file_bytes.decode('utf-8')
        else:
            raise ValueError("Unsupported file format")
    except Exception as e:
        print(f"Error extracting text: {e}")
        raise ValueError(f"Failed to extract text from {filename}")
    return text

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def process_document_background(doc_id: str, text: str, filename: str):
    db = get_db()
    if db is None:
        print("DB is not available for background processing")
        return
        
    try:
        # Update status to processing
        db.documents.update_one({"_id": ObjectId(doc_id)}, {"$set": {"embedding_status": "processing"}})
        
        chunks = chunk_text(text)
        
        chunk_docs = []
        for i, chunk in enumerate(chunks):
            embedding = get_embedding(chunk)
            if embedding:
                chunk_docs.append({
                    "document_id": doc_id,
                    "filename": filename,
                    "text": chunk,
                    "embedding": embedding,
                    "page": i + 1 # simplistic page mapping for citation
                })
                
        if chunk_docs:
            db.chunks.insert_many(chunk_docs)
            db.documents.update_one({"_id": ObjectId(doc_id)}, {"$set": {"embedding_status": "completed"}})
        else:
             db.documents.update_one({"_id": ObjectId(doc_id)}, {"$set": {"embedding_status": "failed"}})
             
    except Exception as e:
        print(f"Background processing error: {e}")
        db.documents.update_one({"_id": ObjectId(doc_id)}, {"$set": {"embedding_status": "failed"}})

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    file_bytes = await file.read()
    file_size = len(file_bytes)
    file_type = file.filename.split('.')[-1] if '.' in file.filename else "unknown"
    
    # Save document metadata
    doc_metadata = {
        "filename": file.filename,
        "file_size": file_size,
        "file_type": file_type,
        "embedding_status": "pending"
    }
    
    result = db.documents.insert_one(doc_metadata)
    doc_id = str(result.inserted_id)
    
    # Extract text
    try:
        text = extract_text(file_bytes, file.filename)
    except Exception as e:
        db.documents.update_one({"_id": result.inserted_id}, {"$set": {"embedding_status": "failed"}})
        raise HTTPException(status_code=400, detail=str(e))
        
    # Trigger background task for embedding
    background_tasks.add_task(process_document_background, doc_id, text, file.filename)
    
    return DocumentResponse(
        id=doc_id,
        filename=doc_metadata["filename"],
        file_size=doc_metadata["file_size"],
        file_type=doc_metadata["file_type"],
        embedding_status=doc_metadata["embedding_status"]
    )

@router.get("", response_model=List[DocumentResponse])
def get_documents():
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    # Get sorted by newest first
    docs = list(db.documents.find().sort("_id", -1))
    response = []
    for d in docs:
        response.append(DocumentResponse(
            id=str(d["_id"]),
            filename=d.get("filename", "Unknown"),
            file_size=d.get("file_size", 0),
            file_type=d.get("file_type", "unknown"),
            embedding_status=d.get("embedding_status", "pending")
        ))
    return response

@router.delete("/{doc_id}")
def delete_document(doc_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    try:
        db.documents.delete_one({"_id": ObjectId(doc_id)})
        db.chunks.delete_many({"document_id": doc_id})
        return {"message": "Document deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to delete document: {e}")
