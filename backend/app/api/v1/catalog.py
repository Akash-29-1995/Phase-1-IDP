from __future__ import annotations

from fastapi import APIRouter, Depends

from app.config import Settings, get_settings, parse_cluster_map
from app.config_env_clusters import (
    KafkaClusterDef,
    RedisClusterDef,
    kafka_catalog_public,
    parse_kafka_clusters_by_env,
    parse_redis_clusters_by_env,
    redis_catalog_public,
)
from app.deps import CurrentUser

router = APIRouter(prefix="/catalog", tags=["catalog"])


def _kafka_catalog(settings: Settings) -> dict:
    by_env = parse_kafka_clusters_by_env(settings.kafka_clusters_by_env_json)
    if not by_env:
        flat = parse_cluster_map(settings.kafka_bootstrap_by_cluster)
        if flat:
            clusters = [KafkaClusterDef(id=k, display_name=k, bootstrap=v) for k, v in flat.items()]
            by_env = {"nonprod": clusters}

    # Ensure predictable defaults exist for the UI even when empty.
    for key in ("prod", "nonprod"):
        by_env.setdefault(key, [])

    public = kafka_catalog_public(by_env)
    return {"environments": ["prod", "nonprod"], "clusters_by_environment": public}


def _redis_catalog(settings: Settings) -> dict:
    by_env = parse_redis_clusters_by_env(settings.redis_clusters_by_env_json)
    if not by_env:
        flat = parse_cluster_map(settings.redis_url_by_cluster)
        if flat:
            clusters = [RedisClusterDef(id=k, display_name=k, url=v) for k, v in flat.items()]
            by_env = {"nonprod": clusters}

    for key in ("prod", "nonprod"):
        by_env.setdefault(key, [])

    public = redis_catalog_public(by_env)
    return {"environments": ["prod", "nonprod"], "clusters_by_environment": public}


@router.get("/kafka")
def kafka_catalog(_user: CurrentUser, settings: Settings = Depends(get_settings)) -> dict:
    del _user
    return _kafka_catalog(settings)


@router.get("/redis")
def redis_catalog(_user: CurrentUser, settings: Settings = Depends(get_settings)) -> dict:
    del _user
    return _redis_catalog(settings)
