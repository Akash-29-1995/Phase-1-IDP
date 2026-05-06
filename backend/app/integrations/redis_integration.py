from __future__ import annotations

from typing import Any

import redis

from app.config import Settings, parse_cluster_map
from app.config_env_clusters import parse_redis_clusters_by_env, resolve_redis_url


def _resolve_redis_connection(settings: Settings, *, environment: str, cluster_id: str) -> str:
    by_env = parse_redis_clusters_by_env(settings.redis_clusters_by_env_json)
    if by_env:
        return resolve_redis_url(by_env, environment=environment, cluster_id=cluster_id)

    legacy = parse_cluster_map(settings.redis_url_by_cluster)
    if cluster_id in legacy:
        return legacy[cluster_id]

    raise ValueError(
        "Redis is not configured. Set REDIS_CLUSTERS_BY_ENV_JSON (preferred) "
        "or legacy REDIS_URL_BY_CLUSTER."
    )


def get_redis_client(settings: Settings, *, environment: str, cluster_id: str) -> redis.Redis:
    url = _resolve_redis_connection(settings, environment=environment, cluster_id=cluster_id)
    return redis.Redis.from_url(url, decode_responses=True)


def redis_get(settings: Settings, *, environment: str, cluster_id: str, key: str) -> dict[str, Any]:
    client = get_redis_client(settings, environment=environment, cluster_id=cluster_id)
    exists = bool(client.exists(key))
    if not exists:
        return {"exists": False, "key": key}
    t = client.type(key)
    value_preview: Any
    if t == "string":
        raw = client.get(key)
        value_preview = raw[:2000] if isinstance(raw, str) else raw
    else:
        value_preview = f"<non-string type: {t}>"
    return {"exists": True, "key": key, "type": t, "preview": value_preview}


def redis_delete(settings: Settings, *, environment: str, cluster_id: str, key: str) -> dict[str, Any]:
    client = get_redis_client(settings, environment=environment, cluster_id=cluster_id)
    deleted = int(client.delete(key))
    return {"deleted": deleted, "key": key}
