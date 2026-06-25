import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId
from datetime import datetime
from typing import List, Optional
from database import get_db
from models import ChatSessionCreate, ChatSessionUpdate, ChatSessionResponse, ChatMessageStreamRequest, ChatMessageResponse, Citation, CitationList
from llm import get_embedding, get_chat_model

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
        updated_at=s.get("updated_at"),
        folder_id=s.get("folder_id"),
        tag_ids=s.get("tag_ids", [])
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
        "updated_at": now,
        "folder_id": session.folder_id,
        "tag_ids": []
    }
    result = db.sessions.insert_one(new_session)
    return ChatSessionResponse(
        id=str(result.inserted_id),
        title=new_session["title"],
        created_at=now,
        updated_at=now,
        folder_id=session.folder_id,
        tag_ids=[]
    )

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    db.sessions.delete_one({"_id": ObjectId(session_id)})
    db.messages.delete_many({"session_id": session_id})
    return {"message": "Session deleted"}

@router.put("/sessions/{session_id}", response_model=ChatSessionResponse)
def update_session(session_id: str, session: ChatSessionUpdate):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    now = datetime.utcnow().isoformat()
    update_data = {"updated_at": now}
    if session.title is not None:
        update_data["title"] = session.title
    if session.folder_id is not None:
        update_data["folder_id"] = session.folder_id
    if session.tag_ids is not None:
        update_data["tag_ids"] = session.tag_ids

    db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": update_data}
    )
    
    updated_session = db.sessions.find_one({"_id": ObjectId(session_id)})
    
    return ChatSessionResponse(
        id=session_id,
        title=updated_session.get("title", ""),
        updated_at=now,
        folder_id=updated_session.get("folder_id"),
        tag_ids=updated_session.get("tag_ids", [])
    )

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
            citations=citations,
            is_cached=m.get("is_cached", False)
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
    
    # Check Semantic Cache first
    cached_answer = None
    if query_embedding:
        try:
            cache_results = list(db.semantic_cache.aggregate([
                {
                    "$vectorSearch": {
                        "index": "cache_index",
                        "path": "question_embedding",
                        "queryVector": query_embedding,
                        "numCandidates": 50,
                        "limit": 1
                    }
                },
                {
                    "$project": {
                        "answer": 1,
                        "citations": 1,
                        "score": {"$meta": "vectorSearchScore"}
                    }
                }
            ]))
            
            if cache_results:
                top_hit = cache_results[0]
                similarity = top_hit.get("score", 0)
                if similarity > 0.95:
                    cached_answer = top_hit.get("answer")
                    cached_citations = top_hit.get("citations")
        except Exception as e:
            print(f"Semantic cache error: {e}. Falling back to normal RAG.")
            
    if cached_answer:
        async def stream_cached():
            # Send citations first
            if cached_citations:
                yield f"event: citations\ndata: {json.dumps(cached_citations)}\n\n"
                
            # Send cached answer
            yield f"event: text\ndata: {json.dumps(cached_answer)}\n\n"
            
            # Save assistant message flagged as cached
            assistant_msg = {
                "session_id": session_id,
                "role": "assistant",
                "content": cached_answer,
                "created_at": datetime.utcnow().isoformat(),
                "citations": cached_citations,
                "is_cached": True
            }
            db.messages.insert_one(assistant_msg)
            
            yield "event: done\ndata: " + json.dumps({"is_cached": True}) + "\n\n"
            
        return StreamingResponse(stream_cached(), media_type="text/event-stream")

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
                "citations": citations,
                "is_cached": False
            }
            db.messages.insert_one(assistant_msg)
            
            # Save to semantic_cache collection
            if query_embedding:
                try:
                    db.semantic_cache.insert_one({
                        "question": query,
                        "question_embedding": query_embedding,
                        "answer": full_response,
                        "citations": citations,
                        "created_at": datetime.utcnow().isoformat()
                    })
                except Exception as e:
                    print(f"Failed to save to semantic cache: {e}")
            
            yield "event: done\ndata: {}\n\n"
        except Exception as e:
            print(f"LLM generation error: {e}")
            yield f"event: text\ndata: {json.dumps(f'*Error: {str(e)}*')}\n\n"
            yield "event: done\ndata: {}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
