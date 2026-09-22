from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "BhoomiX Land Intelligence API"
    database_url: str = "postgresql://bhoomix:bhoomix-dev-password@localhost:5432/bhoomix"
    storage_dir: Path = Path("./data/uploads")
    max_upload_size_mb: int = 15
    validation_confidence_threshold: float = 0.85
    qwen_api_url: str | None = None
    qwen_api_key: str | None = None
    qwen_model: str = "qwen2.5-vl-7b-instruct"
    gemma_api_url: str | None = None
    gemma_api_key: str | None = None
    gemma_model: str = "gemma-2-9b-it"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
settings.storage_dir.mkdir(parents=True, exist_ok=True)
settings.storage_dir.parent.mkdir(parents=True, exist_ok=True)
