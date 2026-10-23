"""
Ollama LLM Platform - Simple One-Click Runner (No Docker Required)
"""
import sys
import os
import subprocess
import webbrowser
import time
import urllib.request
import json

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

def check_or_install_dependencies():
    print("=" * 60)
    print(" [1/3] Checking Python dependencies...")
    print("=" * 60)
    try:
        import fastapi
        import uvicorn
        import httpx
        import aiosqlite
        import sqlalchemy
    except ImportError:
        print("Installing required dependencies from backend/requirements.txt...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", os.path.join(BACKEND_DIR, "requirements.txt")])
    print("Dependencies ready.")

def check_ollama():
    print("=" * 60)
    print(" [2/3] Checking Ollama engine...")
    print("=" * 60)
    try:
        req = urllib.request.urlopen("http://127.0.0.1:11434/api/version", timeout=2)
        if req.status == 200:
            version_data = json.loads(req.read().decode())
            print(f"Ollama is running (version {version_data.get('version', 'unknown')}).")
            return True
    except Exception:
        pass
    
    print("NOTICE: Ollama is not yet running at http://127.0.0.1:11434.")
    print("If you haven't installed Ollama yet, download the Windows installer from: https://ollama.com/download")
    print("Once installed, open Ollama and start this script again.")
    return False

def pull_model_if_needed(model_name="llama3.2:1b"):
    try:
        req = urllib.request.urlopen("http://127.0.0.1:11434/api/tags", timeout=3)
        if req.status == 200:
            tags = json.loads(req.read().decode())
            models = [m["name"] for m in tags.get("models", [])]
            if any(model_name in m for m in models):
                print(f"Model '{model_name}' is already available.")
                return
    except Exception:
        return

    print(f"Pulling lightweight model '{model_name}' (this may take 1-2 minutes)...")
    try:
        pull_data = json.dumps({"name": model_name}).encode("utf-8")
        req = urllib.request.Request(
            "http://127.0.0.1:11434/api/pull",
            data=pull_data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=300) as response:
            for line in response:
                pass
        print(f"Model '{model_name}' pulled successfully.")
    except Exception as e:
        print(f"Note: Could not automatically pull model: {e}")

def main():
    check_or_install_dependencies()
    ollama_ok = check_ollama()
    if ollama_ok:
        pull_model_if_needed("llama3.2:1b")
    
    print("=" * 60)
    print(" [3/3] Starting Web Application...")
    print("=" * 60)
    print("\n   Application URL: http://127.0.0.1:8000\n")

    # Give a tiny pause then open the browser automatically
    def open_browser():
        time.sleep(1.5)
        webbrowser.open("http://127.0.0.1:8000")

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    # Run Uvicorn directly
    import uvicorn
    sys.path.insert(0, BACKEND_DIR)
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)

if __name__ == "__main__":
    main()
