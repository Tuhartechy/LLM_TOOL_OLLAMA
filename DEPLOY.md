# Deployment Guide

This project supports two primary deployment topologies:
1. **Full-Stack Self-Hosted (Recommended for Live Demo)**: Runs Ollama, FastAPI, SQLite, and React behind Caddy on any Linux VPS or your local machine with a Cloudflare Tunnel.
2. **Hybrid / GitHub Pages Frontend**: The static React frontend is automatically deployed to GitHub Pages via GitHub Actions, and connects to your backend instance (via Cloudflare tunnel or VPS URL configured in the UI settings).

---

## Architecture Note on GitHub Pages
> **Important**: GitHub Pages is a static-only web host. It cannot run Python backend servers, Docker containers, or Ollama LLM neural weights.
> 
> Therefore, this project provides a **Dual-Mode Setup**:
> - **Static UI on GitHub Pages**: Evaluators can open the web app directly from your GitHub Pages URL (`https://<username>.github.io/<repo>/`).
> - **Backend Connectivity**: In the top-right Settings modal of the UI, evaluators or you can specify the **Backend Server / Cloudflare Tunnel URL** (e.g. `https://xxxx.trycloudflare.com`). The web client then streams LLM tokens, calls tools, and queries RAG via secure HTTPS CORS!

---

## Option 1: VPS Full-Stack Deployment (Hetzner, DigitalOcean, Oracle Cloud)

### 1. Provision Host & Install Docker
```bash
ssh root@YOUR_SERVER_IP

sudo apt update && sudo apt install -y curl git ufw
curl -fsSL https://get.docker.com | sh
```

### 2. Configure Firewall
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. Clone & Configure
```bash
git clone https://github.com/Tuhartechy/ollama-llm-tool.git /opt/ollama-llm-tool
cd /opt/ollama-llm-tool
cp .env.example .env
```

Edit `deploy/Caddyfile` with your domain or `YOUR_SERVER_IP.nip.io`:
```caddy
YOUR_SERVER_IP.nip.io {
    encode zstd gzip
    handle /api/* {
        reverse_proxy backend:8000 {
            flush_interval -1
            transport http {
                response_header_timeout 180s
                read_timeout 180s
            }
        }
    }
    handle {
        reverse_proxy frontend:80
    }
}
```

### 4. Start Stack
```bash
docker compose up -d --build
docker logs -f model_puller_service
```

---

## Option 2: Localhost / Colab + Free Cloudflare Tunnel (Zero Cost)

### 1. Launch Docker Stack Locally
```bash
docker compose up -d --build
```

### 2. Expose Port 80 via Cloudflare Tunnel
Install `cloudflared` on your machine:
- **Windows**: `winget install --id Cloudflare.cloudflared`
- **macOS**: `brew install cloudflared`
- **Linux**: `curl -L --output cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && chmod +x cloudflared`

Run:
```bash
cloudflared tunnel --url http://localhost:80
```

Cloudflare will give you an instant public HTTPS URL:
`https://random-assigned-name.trycloudflare.com`

You can share this link directly with evaluators, OR enter this tunnel link into your GitHub Pages frontend settings!
