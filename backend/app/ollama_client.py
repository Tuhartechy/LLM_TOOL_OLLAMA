import json
import httpx
from typing import AsyncGenerator, Dict, Any, List
from app.config import settings

class OllamaClient:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.keep_alive = settings.OLLAMA_KEEP_ALIVE

    async def check_health(self) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/version")
                if res.status_code == 200:
                    tags_res = await client.get(f"{self.base_url}/api/tags")
                    models = [m["name"] for m in tags_res.json().get("models", [])]
                    return {"connected": True, "version": res.json().get("version"), "models": models}
        except Exception:
            pass
        return {"connected": False, "version": None, "models": []}

    async def list_models(self) -> List[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    return res.json().get("models", [])
        except Exception:
            pass
        return []

    async def stream_chat(
        self,
        model: str,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]] = None,
        options: Dict[str, Any] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "keep_alive": self.keep_alive,
            "options": options or {}
        }
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0)) as client:
            async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                if response.status_code != 200:
                    error_body = await response.aread()
                    raise RuntimeError(f"Ollama error ({response.status_code}): {error_body.decode()}")

                async for line in response.aiter_lines():
                    if line:
                        chunk = json.loads(line)
                        yield chunk
