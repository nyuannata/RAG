import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId
from datetime import datetime
from typing import List, Optional
from ..database import get_db
from ..models import ChatSessionCreate, ChatSessionResponse, ChatMessageStreamRequest, ChatMessageResponse, Citation, CitationList
from ..llm import get_embedding, get_chat_model

router = APIRouter()

@router.get("/sessions", response_model=List[ChatSessionResponse])
def get_sessions():
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    sessions = list(db.sessions.find().sort("updated_at", -1))
    return [ChatSessionResponse(
        id=str(s["_id"]),
        title=s.get("title", "Percakapan Baru"),
        created_at=s.get("created_at"),
        updated_at=s.get("updated_at")
    ) for s in sessions]

@router.post("/sessions", response_model=ChatSessionResponse)
def create_session(session: ChatSessionCreate):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    now = datetime.utcnow().isoformat()
    new_session = {
        "title": session.title,
        "created_at": now,
        "updated_at": now
    }
    result = db.sessions.insert_one(new_session)
    return ChatSessionResponse(
        id=str(result.inserted_id),
        title=new_session["title"],
        created_at=now,
        updated_at=now
    )

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    db.sessions.delete_one({"_id": ObjectId(session_id)})
    db.messages.delete_many({"session_id": session_id})
    return {"message": "Session deleted"}

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def get_messages(session_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    messages = list(db.messages.find({"session_id": session_id}).sort("created_at", 1))
    response = []
    for m in messages:
        citations = None
        if "citations" in m and m["citations"]:
            cits = [Citation(**c) for c in m["citations"]]
            citations = CitationList(citations=cits)
        response.append(ChatMessageResponse(
            id=str(m["_id"]),
            role=m.get("role"),
            content=m.get("content"),
            created_at=m.get("created_at"),
            citations=citations
        ))
    return response

@router.post("/sessions/{session_id}/stream")
async def chat_stream(session_id: str, request: ChatMessageStreamRequest):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    query = request.message
    document_ids = request.document_ids
    
    # Save user message
    now = datetime.utcnow().isoformat()
    user_msg = {
        "session_id": session_id,
        "role": "user",
        "content": query,
        "created_at": now
    }
    db.messages.insert_one(user_msg)
    db.sessions.update_one({"_id": ObjectId(session_id)}, {"$set": {"updated_at": now}})
    
    # Embed the query
    query_embedding = get_embedding(query)
    
    # Context retrieval using MongoDB Vector Search
    # Note: Requires an Atlas Vector Search Index on `chunks` collection named `default`
    # Definition should map `embedding` to `vector` and (optionally) index `document_id` as filterable
    context_chunks = []
    citations = []
    
    if query_embedding:
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "default",
                    "path": "embedding",
                    "queryVector": query_embedding,
                    "numCandidates": 100,
                    "limit": 5
                }
            }
        ]
        
        if document_ids:
             # Add pre-filter for specific document IDs
             pipeline[0]["$vectorSearch"]["filter"] = {
                 "document_id": {"$in": document_ids}
             }
             
        pipeline.append({
            "$project": {
                "text": 1,
                "document_id": 1,
                "filename": 1,
                "page": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        })
        
        try:
            results = list(db.chunks.aggregate(pipeline))
            for i, res in enumerate(results):
                context_chunks.append(res.get("text", ""))
                citations.append({
                    "index": i + 1,
                    "filename": res.get("filename", "Unknown"),
                    "page": res.get("page", 1)
                })
        except Exception as e:
            print(f"Vector search failed: {e}. Check if Atlas Vector Search index 'default' is created.")
            
    # Combine context and query
    context_text = "\n\n---\n\n".join(context_chunks)
    prompt = f"""Anda adalah asisten AI untuk perusahaan. Jawab pertanyaan berikut berdasarkan konteks yang diberikan. 
Gunakan kutipan dari sumber jika relevan dengan format [Sumber X] di mana X adalah index dokumen.
Jika Anda tidak tahu jawabannya berdasarkan konteks, katakan bahwa Anda tidak tahu. Jangan mengarang informasi.

Konteks:
{context_text}

Pertanyaan: {query}
"""
    
    async def generate():
        model = get_chat_model()
        try:
            response_stream = model.generate_content(prompt, stream=True)
            
            # Send citations first
            if citations:
                yield f"event: citations\ndata: {json.dumps(citations)}\n\n"
                
            full_response = ""
            for chunk in response_stream:
                text_chunk = chunk.text
                if text_chunk:
                    full_response += text_chunk
                    yield f"event: text\ndata: {json.dumps(text_chunk)}\n\n"
                    
            # Save assistant message
            assistant_msg = {
                "session_id": session_id,
                "role": "assistant",
                "content": full_response,
                "created_at": datetime.utcnow().isoformat(),
                "citations": citations
            }
            db.messages.insert_one(assistant_msg)
            
            yield "event: done\ndata: {}\n\n"
        except Exception as e:
            print(f"LLM generation error: {e}")
            yield f"event: text\ndata: {json.dumps(f'*Error: {str(e)}*')}\n\n"
            yield "event: done\ndata: {}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
