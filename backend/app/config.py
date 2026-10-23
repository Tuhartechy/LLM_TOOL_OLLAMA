from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ACCESS_CODE: str = ""
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/ollama_tool.db"
    ALLOWED_ORIGINS: str = "*"
    RATE_LIMIT_PER_MINUTE: int = 30
    OLLAMA_KEEP_ALIVE: str = "24h"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
