# Ollama LLM Platform

A full-stack, production-grade web application where evaluators chat with open-source LLMs (`llama3.2:1b`, `qwen2.5:1.5b`, `nomic-embed-text`) served locally via Ollama with native AST tool-calling and document RAG.

---

## Live Demo & Deployment
- **GitHub Pages Frontend**: Built automatically on push to `main` via GitHub Actions (`.github/workflows/deploy-pages.yml`).
- **Live Evaluator Link**: `https://tuhartechy.github.io/LLM_TOOL_OLLAMA/` *(or your custom public VPS/tunnel URL)*.

---

## Features
1. **Streaming Chat**: SSE streaming tokens with markdown rendering, syntax-highlighted code blocks, copy-to-clipboard, stop generation, and prompt regeneration.
2. **Model Selector & Controls**: Live dropdown fetching available models from Ollama `/api/tags`, slider controls for temperature and max tokens, and custom system instructions.
3. **Session Management**: Persistent conversations stored in SQLite WAL mode (create, rename, delete, switch).
4. **Tool Calling Engine**:
   - `calculator`: AST-parsed safe arithmetic calculator (zero `eval()` usage, depth and exponent bounded).
   - `get_time`: Timezone-aware ISO timestamp retriever.
   - `web_search`: Offline simulated search engine returning deterministic verified context.
   - Interactive Tool Cards displayed in the chat interface showing arguments and results.
5. **RAG Vector Search**: Document upload (`.txt`, `.md`), chunking with 50-character overlap, `nomic-embed-text` embeddings, and cosine similarity top-$k$ retrieval with cited snippets.
6. **Telemetry & Health**: Dynamic status pills for Ollama connectivity and model loading states.

---

## Architecture

```
[ Evaluator Browser / GitHub Pages ]
                 │
                 │ HTTPS
                 ▼
┌────────────────────────────────────────────────────────┐
│ Caddy Reverse Proxy (Automatic TLS / Static Files)    │
│  - /api/*  ──► Proxy to Backend (flush_interval -1)    │
│  - /*      ──► Serve React SPA static build             │
└───────────────────────┬────────────────────────────────┘
                        │
                        │ Internal Port 8000
                        ▼
┌────────────────────────────────────────────────────────┐
│ FastAPI Backend (App Server)                           │
│  - Request ID & CORS Middleware                        │
│  - SSE Streaming Protocol Router                       │
│  - Tool Execution Sandbox (AST Calculator, Time, Search)│
│  - RAG Vector Indexer (Cosine Matcher)                 │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
   SQLite UNIX │ Socket       HTTP 11434  │ Bridge Network (`app_net`)
               ▼                          ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│ SQLite Database          │  │ Ollama Server (Internal) │
│ - conversations          │  │ - llama3.2:1b            │
│ - messages               │  │ - qwen2.5:1.5b           │
│ - documents & embeddings │  │ - nomic-embed-text       │
└──────────────────────────┘  └──────────────────────────┘
```

---

## Evaluator Test Script

Run through this test sequence to verify all capabilities:

| # | Step | Prompt / Action | Expected Result |
|---|---|---|---|
| **1** | Basic Streaming | `Explain the difference between a process and a thread in 2 sentences.` | Tokens stream smoothly; model badge indicates active model. |
| **2** | Model Switching | Select `qwen2.5:1.5b` $\rightarrow$ `Write a one-line Python lambda to reverse a string.` | Syntax-highlighted code block renders with working **Copy** button. |
| **3** | Tool Call: Math | `What is ((450 * 2) / 5) + 120? Use the calculator.` | A tool execution card appears with arguments and result `300.0`. |
| **4** | Tool Call: Time | `What time is it right now? Use the get_time tool.` | A tool execution card appears containing a formatted ISO timestamp. |
| **5** | RAG Ingestion | Upload a `.txt` file via Database icon $\rightarrow$ `Summarize the uploaded document.` | File citation badges appear above response text; content matches document. |
| **6** | Abort Stream | `Write an extremely long 1000-word essay on space exploration.` $\rightarrow$ Click **Stop** | Generation halts immediately; client disconnect cleanly closes upstream Ollama stream. |

---

## Quickstart (Run Locally)

```bash
# 1. Clone repository
git clone https://github.com/Tuhartechy/LLM_TOOL_OLLAMA.git && cd LLM_TOOL_OLLAMA

# 2. Copy environment profile
cp .env.example .env

# 3. Start local stack (launches Ollama, pulls models, compiles containers)
docker compose up -d --build

# 4. Follow model initialization progress
docker logs -f model_puller_service

# 5. Open application
open http://localhost
```

---

## Deploy to GitHub Pages

1. In your GitHub repository settings, go to **Settings > Pages**.
2. Under **Build and deployment > Source**, select **GitHub Actions**.
3. Push your code to the `main` branch:
   ```bash
   git push origin main
   ```
4. The GitHub Actions workflow in `.github/workflows/deploy-pages.yml` will automatically build and publish the frontend to GitHub Pages!
5. In the deployed frontend, click the **Settings (gear)** icon and enter your backend VPS or Cloudflare Tunnel URL so the browser can communicate with Ollama.
