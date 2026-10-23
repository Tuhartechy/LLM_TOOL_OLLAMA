import json
import uuid
import time
import asyncio
from contextlib import asynccontextmanager
from typing import Dict
from fastapi import FastAPI, Request, HTTPException, Depends, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy import select, delete

from app.config import settings
from app.database import init_db, async_session, ConversationModel, MessageModel
from app.schemas import (
    ConversationSchema, ConversationDetailSchema, ConversationCreate,
    ConversationUpdate, ChatRequest, MessageSchema
)
from app.tools import DEFINED_TOOLS, execute_tool
from app.rag import store_document, retrieve_top_k
from app.ollama_client import OllamaClient

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="Ollama LLM Platform API", version="1.0.0", lifespan=lifespan)

# Concurrency semaphore: prevent CPU oversubscription on small host
CHAT_SEMAPHORE = asyncio.Semaphore(2)
ollama_client = OllamaClient()

# IP-based Leaky Bucket Rate Limiter
RATE_LIMIT_BUCKET: Dict[str, list] = {}

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    req_history = RATE_LIMIT_BUCKET.setdefault(client_ip, [])
    # Evict items older than 60s
    req_history[:] = [ts for ts in req_history if now - ts < 60]

    if len(req_history) >= settings.RATE_LIMIT_PER_MINUTE:
        return JSONResponse(status_code=429, content={"detail": "Too many requests. Rate limit is 30 req/min."})

    req_history.append(now)
    response = await call_next(request)
    return response

# CORS Configuration
origins = ["*"] if settings.ALLOWED_ORIGINS == "*" else [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def verify_access_code(x_access_code: str = Header(default="")):
    if settings.ACCESS_CODE and x_access_code != settings.ACCESS_CODE:
        raise HTTPException(status_code=401, detail="Invalid access code provided.")

@app.get("/api/health")
async def health():
    h = await ollama_client.check_health()
    status = "ok" if h["connected"] else "degraded"
    return {"status": status, "ollama": h["connected"], "version": h["version"], "models": h["models"]}

@app.get("/api/models", dependencies=[Depends(verify_access_code)])
async def get_models():
    models = await ollama_client.list_models()
    return {"models": models}

@app.get("/api/tools", dependencies=[Depends(verify_access_code)])
async def get_tools():
    return {"tools": DEFINED_TOOLS}

@app.post("/api/upload", dependencies=[Depends(verify_access_code)])
async def upload_document(file: UploadFile = File(...)):
    if not (file.filename.endswith(".txt") or file.filename.endswith(".md")):
        raise HTTPException(status_code=400, detail="Only .txt and .md files supported.")

    content_bytes = await file.read()
    if len(content_bytes) > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File size exceeds 2 MB boundary.")

    content = content_bytes.decode("utf-8", errors="ignore")
    chunks_stored = await store_document(file.filename, content)
    return {"filename": file.filename, "chunks_stored": chunks_stored}

@app.get("/api/conversations", dependencies=[Depends(verify_access_code)])
async def list_conversations():
    async with async_session() as session:
        stmt = select(ConversationModel).order_by(ConversationModel.updated_at.desc())
        res = await session.execute(stmt)
        convs = res.scalars().all()
        return [
            ConversationSchema(
                id=c.id, title=c.title, created_at=c.created_at, updated_at=c.updated_at
            ) for c in convs
        ]

@app.post("/api/conversations", dependencies=[Depends(verify_access_code)])
async def create_conversation(payload: ConversationCreate):
    conv_id = str(uuid.uuid4())
    async with async_session() as session:
        conv = ConversationModel(id=conv_id, title=payload.title or "New Conversation")
        session.add(conv)
        await session.commit()
        return {"id": conv.id, "title": conv.title}

@app.get("/api/conversations/{conv_id}", dependencies=[Depends(verify_access_code)])
async def get_conversation(conv_id: str):
    async with async_session() as session:
        conv_res = await session.execute(select(ConversationModel).where(ConversationModel.id == conv_id))
        conv = conv_res.scalar_one_or_none()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

        msg_res = await session.execute(
            select(MessageModel).where(MessageModel.conversation_id == conv_id).order_by(MessageModel.created_at.asc())
        )
        msgs = msg_res.scalars().all()

        message_schemas = [
            MessageSchema(
                id=m.id,
                conversation_id=m.conversation_id,
                role=m.role,
                content=m.content,
                tool_calls=json.loads(m.tool_calls) if m.tool_calls else None,
                created_at=m.created_at
            ) for m in msgs
        ]

        return ConversationDetailSchema(
            id=conv.id, title=conv.title, created_at=conv.created_at, updated_at=conv.updated_at, messages=message_schemas
        )

@app.patch("/api/conversations/{conv_id}", dependencies=[Depends(verify_access_code)])
async def update_conversation(conv_id: str, payload: ConversationUpdate):
    async with async_session() as session:
        res = await session.execute(select(ConversationModel).where(ConversationModel.id == conv_id))
        conv = res.scalar_one_or_none()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        conv.title = payload.title
        await session.commit()
        return {"id": conv.id, "title": conv.title}

@app.delete("/api/conversations/{conv_id}", dependencies=[Depends(verify_access_code)])
async def delete_conversation(conv_id: str):
    async with async_session() as session:
        await session.execute(delete(ConversationModel).where(ConversationModel.id == conv_id))
        await session.commit()
        return {"success": True}

@app.post("/api/chat", dependencies=[Depends(verify_access_code)])
async def chat_endpoint(payload: ChatRequest, request: Request):
    async def event_generator():
        try:
            await asyncio.wait_for(CHAT_SEMAPHORE.acquire(), timeout=5.0)
        except asyncio.TimeoutError:
            yield f"event: error\ndata: {json.dumps({'error': 'Server saturated. Try again shortly.'})}\n\n"
            return

        try:
            # 1. Fetch conversation history
            async with async_session() as session:
                res = await session.execute(
                    select(MessageModel).where(MessageModel.conversation_id == payload.conversation_id).order_by(MessageModel.created_at.asc())
                )
                db_messages = res.scalars().all()

            history = []
            if payload.system_prompt:
                history.append({"role": "system", "content": payload.system_prompt})

            for m in db_messages:
                entry = {"role": m.role, "content": m.content}
                if m.tool_calls:
                    entry["tool_calls"] = json.loads(m.tool_calls)
                history.append(entry)

            user_content = payload.message
            citations = []

            # 2. RAG retrieval if requested
            if payload.use_rag:
                try:
                    top_chunks = await retrieve_top_k(payload.message, k=2)
                    if top_chunks:
                        context_str = "\n\n".join([f"Source [{c[0]}]:\n{c[1]}" for c in top_chunks])
                        user_content = f"Context Information:\n{context_str}\n\nUser Question:\n{payload.message}"
                        for c in top_chunks:
                            citations.append({"filename": c[0], "snippet": c[1][:150] + "..."})
                            yield f"event: citation\ndata: {json.dumps({'filename': c[0], 'snippet': c[1]})}\n\n"
                except Exception as e:
                    yield f"event: error\ndata: {json.dumps({'error': f'RAG embedding failed: {str(e)}'})}\n\n"

            # Persist incoming user message
            user_msg_id = str(uuid.uuid4())
            async with async_session() as session:
                um = MessageModel(
                    id=user_msg_id,
                    conversation_id=payload.conversation_id,
                    role="user",
                    content=payload.message
                )
                session.add(um)
                await session.commit()

            history.append({"role": "user", "content": user_content})

            options = {
                "temperature": payload.temperature,
                "num_predict": payload.max_tokens
            }

            # 3. Tool evaluation pass
            first_pass_text = ""
            detected_tool_calls = []

            async for chunk in ollama_client.stream_chat(
                model=payload.model,
                messages=history,
                tools=DEFINED_TOOLS,
                options=options
            ):
                if await request.is_disconnected():
                    return

                msg_chunk = chunk.get("message", {})
                if "tool_calls" in msg_chunk and msg_chunk["tool_calls"]:
                    detected_tool_calls.extend(msg_chunk["tool_calls"])

                if "content" in msg_chunk and msg_chunk["content"]:
                    content = msg_chunk["content"]
                    first_pass_text += content
                    yield f"event: token\ndata: {json.dumps({'text': content})}\n\n"

            # 4. If tools detected: execute, append results, and run second stream pass
            final_content = first_pass_text
            executed_tools_meta = []

            if detected_tool_calls:
                history.append({
                    "role": "assistant",
                    "content": first_pass_text,
                    "tool_calls": detected_tool_calls
                })

                for tool_call in detected_tool_calls:
                    fn = tool_call.get("function", {})
                    fn_name = fn.get("name")
                    fn_args = fn.get("arguments", {})

                    yield f"event: tool_call\ndata: {json.dumps({'name': fn_name, 'arguments': fn_args})}\n\n"

                    tool_output = execute_tool(fn_name, fn_args)
                    executed_tools_meta.append({"name": fn_name, "arguments": fn_args, "result": tool_output})

                    yield f"event: tool_result\ndata: {json.dumps({'name': fn_name, 'result': tool_output})}\n\n"

                    history.append({
                        "role": "tool",
                        "content": str(tool_output),
                    })

                # Stream final synthesized response
                async for chunk in ollama_client.stream_chat(
                    model=payload.model,
                    messages=history,
                    options=options
                ):
                    if await request.is_disconnected():
                        return

                    msg_chunk = chunk.get("message", {})
                    if "content" in msg_chunk and msg_chunk["content"]:
                        content = msg_chunk["content"]
                        final_content += content
                        yield f"event: token\ndata: {json.dumps({'text': content})}\n\n"

            # 5. Persist complete response
            assistant_msg_id = str(uuid.uuid4())
            async with async_session() as session:
                am = MessageModel(
                    id=assistant_msg_id,
                    conversation_id=payload.conversation_id,
                    role="assistant",
                    content=final_content,
                    tool_calls=json.dumps(executed_tools_meta) if executed_tools_meta else None
                )
                session.add(am)
                # Touch conversation timestamp
                conv_res = await session.execute(select(ConversationModel).where(ConversationModel.id == payload.conversation_id))
                c = conv_res.scalar_one_or_none()
                if c:
                    c.updated_at = am.created_at
                await session.commit()

            yield f"event: done\ndata: {json.dumps({'message_id': assistant_msg_id, 'full_text': final_content})}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
        finally:
            CHAT_SEMAPHORE.release()

    return StreamingResponse(event_generator(), media_type="text/event-stream")
