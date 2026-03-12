from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # ── 应用 ───────────────────────────────────────────
    app_env: str = "development"
    debug: bool = True
    log_level: str = "INFO"

    # ── 数据库 ─────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://cdss:cdss123@localhost:5432/cdss"

    # ── Redis ──────────────────────────────────────────
    redis_url: str = "redis://:redis123@localhost:6379/0"

    # ── Elasticsearch ──────────────────────────────────
    es_url: str = "http://localhost:9200"

    # ── MinIO ──────────────────────────────────────────
    minio_endpoint: str = "localhost:9000"
    minio_root_user: str = "minioadmin"
    minio_root_password: str = "minioadmin123"
    minio_bucket: str = "cdss-files"

    # ── JWT ────────────────────────────────────────────
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    # ── 外部系统对接模式 ────────────────────────────────
    his_mode: str = "mock"   # mock | real
    lis_mode: str = "mock"
    pacs_mode: str = "mock"
    emr_mode: str = "mock"
    ecg_mode: str = "mock"
    pathology_mode: str = "mock"

    # ── 真实系统接口地址 ────────────────────────────────
    his_api_url: str = ""
    his_api_key: str = ""
    lis_api_url: str = ""
    lis_api_key: str = ""
    pacs_api_url: str = ""
    emr_api_url: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
