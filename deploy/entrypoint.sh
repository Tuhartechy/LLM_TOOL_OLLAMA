#!/bin/sh
set -e

echo "[Init] Waiting for Ollama daemon to report ready status..."
until curl -s http://ollama:11434/api/version > /dev/null; do
    echo "[Init] Ollama unavailable. Retrying in 2 seconds..."
    sleep 2
done

echo "[Init] Ollama online. Synchronizing foundational lightweight models..."

pull_model() {
    MODEL_NAME=$1
    echo "[Init] Verifying presence of: ${MODEL_NAME}..."
    curl -s -X POST http://ollama:11434/api/pull -d "{\"name\": \"${MODEL_NAME}\"}" | while read -r line; do
        status=$(echo "$line" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$status" ]; then
            printf "\r[Pulling %s] %s" "$MODEL_NAME" "$status"
        fi
    done
    printf "\n[Init] Model %s ready.\n" "$MODEL_NAME"
}

pull_model "llama3.2:1b"
pull_model "qwen2.5:1.5b"
pull_model "nomic-embed-text"

echo "[Init] Model provisioning sequence complete."
exit 0
