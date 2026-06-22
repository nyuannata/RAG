import json
import uuid
import logging
from typing import AsyncGenerator, List, Dict, Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.core.config import settings
from app.db.session import async_session_maker
from app.models.models import ChatMessage, ChatSession, Document
from app.rag.pipeline import get_chroma_db

logger = logging.getLogger(__name__)

async def get_chat_history(db: AsyncSession, session_id: uuid.UUID, limit: int = 6) -> List[Dict[str, str]]:
    """Retrieve recent chat message history to provide conversational memory."""
    query = (
        select(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    messages = result.scalars().all()
    # Reverse to keep chronological order
    messages.reverse()
    
    return [{"role": msg.role, "content": msg.content} for msg in messages]

async def generate_chatbot_stream(
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    user_query: str,
    selected_document_ids: Optional[List[uuid.UUID]] = None
) -> AsyncGenerator[str, None]:
    """
    RAG Streaming Generator:
    1. Fetch relevant chunks from ChromaDB with multi-tenant filtering.
    2. Format prompt with context and recent chat history.
    3. Stream response tokens using Server-Sent Events (SSE).
    4. Persist the final response and citations in the PostgreSQL database.
    """
    db_chroma = get_chroma_db()
    
    # 1. Build Chroma metadata filter
    # Format: user_id must match, and optionally filter by document_ids
    conditions = [{"user_id": str(user_id)}]
    
    if selected_document_ids:
        if len(selected_document_ids) == 1:
            conditions.append({"document_id": str(selected_document_ids[0])})
        else:
            conditions.append({"document_id": {"$in": [str(d) for d in selected_document_ids]}})
            
    chroma_filter = {"$and": conditions} if len(conditions) > 1 else conditions[0]
    
    # 2. Perform similarity search (retrieve top k chunks)
    k = 6 if selected_document_ids else 4
    try:
        retrieved_docs = db_chroma.similarity_search(
            query=user_query,
            k=k,
            filter=chroma_filter
        )
    except Exception as e:
        logger.error(f"Error during ChromaDB similarity search: {str(e)}")
        retrieved_docs = []

    # 3. Process citations
    citations = []
    context_chunks = []
    
    for idx, doc in enumerate(retrieved_docs):
        meta = doc.metadata
        citation_info = {
            "index": idx + 1,
            "filename": meta.get("filename", "Dokumen tidak dikenal"),
            "page": meta.get("page", 1),
            "snippet": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
            "content": doc.page_content,
            "document_id": meta.get("document_id")
        }
        citations.append(citation_info)
        context_chunks.append(f"[Sumber {idx+1}] {meta.get('filename')}, Halaman {meta.get('page')}:\n{doc.page_content}")

    context_str = "\n\n".join(context_chunks)

    # 4. Fetch Chat History for Context
    async with async_session_maker() as db_session:
        history = await get_chat_history(db_session, session_id)
        
        # Save user message to database
        user_message_db = ChatMessage(
            session_id=session_id,
            role="user",
            content=user_query
        )
        db_session.add(user_message_db)
        
        # Update chat session timestamp
        session_result = await db_session.execute(
            select(ChatSession).filter(ChatSession.id == session_id)
        )
        chat_session = session_result.scalars().first()
        if chat_session:
            chat_session.updated_at = chat_session.updated_at # triggers onupdate
            # Set default title if it's the first query
            if chat_session.title == "Percakapan Baru" or not chat_session.title:
                chat_session.title = user_query[:50] + "..." if len(user_query) > 50 else user_query
                
        await db_session.commit()

    # 5. Format Chat Messages for LLM
    system_prompt = (
        "Anda adalah Antigravity, asisten AI RAG profesional yang ahli dalam menganalisis dokumen perusahaan.\n"
        "Tugas Anda adalah menjawab pertanyaan user secara mendalam, faktual, dan kontekstual menggunakan informasi dari dokumen yang disediakan.\n\n"
        "ATURAN MENJAWAB:\n"
        "1. Jawablah HANYA berdasarkan informasi dari potongan dokumen (Context) yang dilampirkan. Jika informasi tidak ada di Context, katakan dengan sopan bahwa Anda tidak dapat menemukan jawabannya dalam dokumen tersebut.\n"
        "2. Jangan berasumsi atau membuat informasi tambahan di luar isi dokumen.\n"
        "3. Berikan rujukan nomor sumber kutipan di akhir kalimat yang relevan menggunakan format [Sumber X] (misalnya [Sumber 1] atau [Sumber 2]). Jangan membuat rujukan fiktif.\n"
        "4. Jawab dalam format Markdown yang rapi dan mudah dibaca (gunakan bullet points, tabel, tebal/miring jika diperlukan untuk penekanan).\n"
        "5. Selalu gunakan Bahasa Indonesia yang profesional dan sopan.\n\n"
        f"CONTEXT DOKUMEN:\n{context_str}"
    )

    llm_messages = [SystemMessage(content=system_prompt)]
    
    # Append history
    for h_msg in history:
        if h_msg["role"] == "user":
            llm_messages.append(HumanMessage(content=h_msg["content"]))
        else:
            llm_messages.append(AIMessage(content=h_msg["content"]))
            
    # Append current message
    llm_messages.append(HumanMessage(content=user_query))

    # 6. Stream tokens using SSE
    # Yield citations first
    yield f"event: citations\ndata: {json.dumps(citations)}\n\n"

    model = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash",
        google_api_key=settings.GEMINI_API_KEY,
        streaming=True,
        temperature=0.2,
        convert_system_message_to_human=True
    )

    full_response = ""
    try:
        async for chunk in model.astream(llm_messages):
            token = chunk.content
            
            # Gemini models sometimes return list of blocks instead of direct string
            if isinstance(token, list):
                token_str = ""
                for item in token:
                    if isinstance(item, dict) and "text" in item:
                        token_str += item["text"]
                    elif isinstance(item, str):
                        token_str += item
                token = token_str
                
            if token and isinstance(token, str):
                full_response += token
                yield f"event: text\ndata: {json.dumps(token)}\n\n"
    except Exception as e:
        logger.error(f"Error streaming from ChatOpenAI: {str(e)}")
        error_msg = f"\n\n*Error: Gagal mendapatkan respon dari AI. {str(e)}*"
        full_response += error_msg
        yield f"event: text\ndata: {json.dumps(error_msg)}\n\n"

    # 7. Persist final assistant response & citations into database
    try:
        async with async_session_maker() as db_session:
            assistant_message_db = ChatMessage(
                session_id=session_id,
                role="assistant",
                content=full_response,
                citations={"citations": citations} if citations else None
            )
            db_session.add(assistant_message_db)
            await db_session.commit()
            logger.info(f"Berhasil menyimpan respon chatbot untuk Session ID: {session_id}")
    except Exception as e:
        logger.error(f"Gagal menyimpan respon chatbot ke database: {str(e)}")

    yield "event: done\ndata: [DONE]\n\n"
