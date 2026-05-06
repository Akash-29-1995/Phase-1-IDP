from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, Field


class KafkaClusterDef(BaseModel):
    id: str = Field(min_length=1)
    display_name: str = Field(default="")
    bootstrap: str = Field(min_length=1)


class RedisClusterDef(BaseModel):
    id: str = Field(min_length=1)
    display_name: str = Field(default="")
    url: str = Field(min_length=1)


def _normalize_env_key(raw: str) -> str:
    return str(raw).strip().lower()


def parse_kafka_clusters_by_env(raw: str) -> dict[str, list[KafkaClusterDef]]:
    data: Any = json.loads(raw or "{}")
    if not isinstance(data, dict):
        return {}

    out: dict[str, list[KafkaClusterDef]] = {}
    for env_key, clusters in data.items():
        env = _normalize_env_key(str(env_key))
        if not isinstance(clusters, list):
            continue
        cleaned: list[KafkaClusterDef] = []
        for item in clusters:
            if not isinstance(item, dict):
                continue
            cid = str(item.get("id", "")).strip()
            boot = str(item.get("bootstrap", "")).strip()
            dn = str(item.get("display_name", "")).strip() or cid
            if not cid or not boot:
                continue
            cleaned.append(KafkaClusterDef(id=cid, display_name=dn, bootstrap=boot))
        out[env] = cleaned
    return out


def kafka_catalog_public(by_env: dict[str, list[KafkaClusterDef]]) -> dict[str, list[dict[str, str]]]:
    return {env: [{"id": c.id, "display_name": c.display_name or c.id} for c in clusters] for env, clusters in by_env.items()}


def resolve_kafka_bootstrap(by_env: dict[str, list[KafkaClusterDef]], *, environment: str, cluster_id: str) -> str:
    env = _normalize_env_key(environment)
    clusters = by_env.get(env, [])
    for c in clusters:
        if c.id == cluster_id:
            return c.bootstrap
    raise ValueError(f"Unknown Kafka cluster '{cluster_id}' for environment '{environment}'")


def parse_redis_clusters_by_env(raw: str) -> dict[str, list[RedisClusterDef]]:
    data: Any = json.loads(raw or "{}")
    if not isinstance(data, dict):
        return {}

    out: dict[str, list[RedisClusterDef]] = {}
    for env_key, clusters in data.items():
        env = _normalize_env_key(str(env_key))
        if not isinstance(clusters, list):
            continue
        cleaned: list[RedisClusterDef] = []
        for item in clusters:
            if not isinstance(item, dict):
                continue
            cid = str(item.get("id", "")).strip()
            url = str(item.get("url", "")).strip()
            dn = str(item.get("display_name", "")).strip() or cid
            if not cid or not url:
                continue
            cleaned.append(RedisClusterDef(id=cid, display_name=dn, url=url))
        out[env] = cleaned
    return out


def redis_catalog_public(by_env: dict[str, list[RedisClusterDef]]) -> dict[str, list[dict[str, str]]]:
    return {env: [{"id": c.id, "display_name": c.display_name or c.id} for c in clusters] for env, clusters in by_env.items()}


def resolve_redis_url(by_env: dict[str, list[RedisClusterDef]], *, environment: str, cluster_id: str) -> str:
    env = _normalize_env_key(environment)
    clusters = by_env.get(env, [])
    for c in clusters:
        if c.id == cluster_id:
            return c.url
    raise ValueError(f"Unknown Redis cluster '{cluster_id}' for environment '{environment}'")
