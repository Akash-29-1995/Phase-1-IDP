from __future__ import annotations

from functools import lru_cache
from typing import Any

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg2://idp:idp@localhost:5432/idp"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    cors_origins: str = "http://localhost:5173,http://localhost:8080"

    admin_username: str = "admin"
    admin_password: str = "admin123"
    dev_username: str = "developer"
    dev_password: str = "dev123"

    # Legacy flat maps (cluster_id -> bootstrap/url). Prefer env-scoped JSON below.
    redis_url_by_cluster: str = "{}"
    kafka_bootstrap_by_cluster: str = "{}"

    # Preferred: JSON object env -> list[{id,display_name,bootstrap|url}]
    kafka_clusters_by_env_json: str = "{}"
    redis_clusters_by_env_json: str = "{}"

    aws_region: str | None = None

    # OIDC / SSO (optional). Example issuer: https://login.microsoftonline.com/<tenant>/v2.0
    oidc_issuer: str | None = None
    oidc_client_id: str | None = None
    oidc_client_secret: str | None = None
    oidc_redirect_uri: str = "http://127.0.0.1:8000/api/v1/auth/oidc/callback"
    frontend_url: str = "http://127.0.0.1:5173"
    allowed_sso_email_domains: str = ""

    topic_name_pattern: str = r"^[a-zA-Z0-9._-]+$"
    topic_max_partitions: int = 64
    topic_default_rf_cap: int = 3


@lru_cache
def get_settings() -> Settings:
    return Settings()


def parse_cluster_map(raw: str) -> dict[str, str]:
    import json

    data: Any = json.loads(raw or "{}")
    if not isinstance(data, dict):
        return {}
    return {str(k): str(v) for k, v in data.items()}
