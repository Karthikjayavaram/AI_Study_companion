import os
from typing import List, Optional, Union
from pydantic import AnyHttpUrl, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[".env", "../.env"],
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Application
    APP_NAME: str = "AI Study Companion"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "temporary-dev-secret-key-replace-in-production-min-32-chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for prototyping convenience

    # Database
    DATABASE_URL: str = "sqlite:///./study_companion_dev.db"

    # Background workers / Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # AI Provider Architecture
    AI_PROVIDER: str = "huggingface"

    # Hugging Face Configuration (Primary external AI provider)
    HF_API_KEY: str = ""
    HUGGINGFACEHUB_API_TOKEN: Optional[str] = None
    HF_CHAT_MODEL: str = "meta-llama/Llama-3.1-8B-Instruct"
    HF_EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIMENSION: int = 384
    HF_TEMPERATURE: float = 0.2
    HF_MAX_TOKENS: int = 1024
    HF_TIMEOUT_SECONDS: float = 120.0

    # Text Chunking Configuration
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50

    # Storage (Deployment target is supabase; local fallback available for dev/tests)
    STORAGE_BACKEND: str = "supabase"  # "supabase" (production) or "local" (dev/tests)
    LOCAL_STORAGE_DIR: str = "./storage/uploads"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "ai-study-companion"

    # Observability & Tracing (LangSmith / LangChain)
    LANGCHAIN_TRACING_V2: bool = False
    LANGCHAIN_ENDPOINT: str = "https://api.smith.langchain.com"
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "ai-study-companion"

    # Legacy Observability (Optional)
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"
    AI_TRACING_ENABLED: bool = False

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    @model_validator(mode="after")
    def normalize_keys(self) -> "Settings":
        if not self.HF_API_KEY and self.HUGGINGFACEHUB_API_TOKEN:
            self.HF_API_KEY = self.HUGGINGFACEHUB_API_TOKEN
        return self

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v


settings = Settings()

