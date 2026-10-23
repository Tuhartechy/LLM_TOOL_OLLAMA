import json
import uuid
import numpy as np
from typing import List, Tuple
from sqlalchemy import select
from app.database import async_session, DocumentChunkModel
from app.config import settings
import httpx

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    chunks = []
    start = 0
    clean_text = " ".join(text.split())
    while start < len(clean_text):
        end = start + chunk_size
        chunks.append(clean_text[start:end])
        start += (chunk_size - overlap)
    return chunks

async def generate_embedding(text: str) -> List[float]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{settings.OLLAMA_BASE_URL}/api/embeddings",
            json={"model": "nomic-embed-text", "prompt": text}
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Embedding failure from Ollama: {resp.text}")
        return resp.json()["embedding"]

async def store_document(filename: str, content: str) -> int:
    chunks = chunk_text(content)
    async with async_session() as session:
        for idx, chunk in enumerate(chunks):
            embedding = await generate_embedding(chunk)
            doc_chunk = DocumentChunkModel(
                id=str(uuid.uuid4()),
                filename=filename,
                chunk_index=idx,
                content=chunk,
                embedding=json.dumps(embedding)
            )
            session.add(doc_chunk)
        await session.commit()
    return len(chunks)

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))

async def retrieve_top_k(query: str, k: int = 3) -> List[Tuple[str, str, float]]:
    query_emb = np.array(await generate_embedding(query), dtype=np.float32)
    results = []

    async with async_session() as session:
        stmt = select(DocumentChunkModel)
        result = await session.execute(stmt)
        chunks = result.scalars().all()

        for chunk in chunks:
            chunk_emb = np.array(json.loads(chunk.embedding), dtype=np.float32)
            sim = cosine_similarity(query_emb, chunk_emb)
            results.append((chunk.filename, chunk.content, sim))

    results.sort(key=lambda x: x[2], reverse=True)
    return results[:k]
