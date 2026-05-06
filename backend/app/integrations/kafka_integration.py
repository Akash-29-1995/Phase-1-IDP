from __future__ import annotations

import re
from typing import Any

from kafka.admin import KafkaAdminClient, NewTopic
from kafka.errors import TopicAlreadyExistsError

from app.config import Settings, parse_cluster_map
from app.config_env_clusters import parse_kafka_clusters_by_env, resolve_kafka_bootstrap


def _resolve_bootstrap_servers(settings: Settings, *, environment: str, cluster_id: str) -> str:
    by_env = parse_kafka_clusters_by_env(settings.kafka_clusters_by_env_json)
    if by_env:
        return resolve_kafka_bootstrap(by_env, environment=environment, cluster_id=cluster_id)

    legacy = parse_cluster_map(settings.kafka_bootstrap_by_cluster)
    if cluster_id in legacy:
        return legacy[cluster_id]

    raise ValueError(
        "Kafka is not configured. Set KAFKA_CLUSTERS_BY_ENV_JSON (preferred) "
        "or legacy KAFKA_BOOTSTRAP_BY_CLUSTER."
    )


def create_topic(
    settings: Settings,
    *,
    environment: str,
    cluster_id: str,
    topic_name: str,
    partitions: int,
    replication_factor: int,
) -> dict[str, Any]:
    if not re.match(settings.topic_name_pattern, topic_name):
        raise ValueError("Topic name failed naming convention check")

    if partitions > settings.topic_max_partitions:
        raise ValueError(f"partitions must be <= {settings.topic_max_partitions}")

    if replication_factor > settings.topic_default_rf_cap:
        raise ValueError(f"replication_factor must be <= {settings.topic_default_rf_cap}")

    bootstrap = _resolve_bootstrap_servers(settings, environment=environment, cluster_id=cluster_id)
    broker_list = [b.strip() for b in bootstrap.split(",") if b.strip()]
    admin = KafkaAdminClient(bootstrap_servers=broker_list, client_id="idp-phase1")

    topic = NewTopic(
        name=topic_name,
        num_partitions=partitions,
        replication_factor=replication_factor,
    )
    try:
        admin.create_topics([topic], validate_only=False)
    except TopicAlreadyExistsError:
        return {"created": False, "reason": "already_exists"}
    finally:
        admin.close()

    return {"created": True}
