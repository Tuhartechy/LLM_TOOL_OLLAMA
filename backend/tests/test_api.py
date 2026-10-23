import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert "ollama" in data

@pytest.mark.asyncio
async def test_conversation_lifecycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create
        create_res = await client.post("/api/conversations", json={"title": "Test Run"})
        assert create_res.status_code == 200
        cid = create_res.json()["id"]

        # Rename
        patch_res = await client.patch(f"/api/conversations/{cid}", json={"title": "Updated Run"})
        assert patch_res.status_code == 200
        assert patch_res.json()["title"] == "Updated Run"

        # Delete
        del_res = await client.delete(f"/api/conversations/{cid}")
        assert del_res.status_code == 200
