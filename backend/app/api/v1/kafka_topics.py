from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.deps import MutatorUser
from app.integrations.kafka_integration import create_topic
from app.models import RequestStatus, RequestType, ServiceRequest
from app.schemas import KafkaTopicCreate, ServiceRequestOut
from app.services.audit_service import write_audit

router = APIRouter(prefix="/kafka", tags=["kafka"])


@router.post("/topics", response_model=ServiceRequestOut)
def create_kafka_topic(
    body: KafkaTopicCreate,
    user: MutatorUser,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ServiceRequest:
    outcome = None
    status = RequestStatus.failed
    error_message = None

    try:
        outcome = create_topic(
            settings,
            environment=body.environment,
            cluster_id=body.cluster_id,
            topic_name=body.topic_name,
            partitions=body.partitions,
            replication_factor=body.replication_factor,
        )
        status = RequestStatus.completed
        audit_status = "completed"
    except Exception as exc:
        error_message = str(exc)
        audit_status = "failed"

    req = ServiceRequest(
        requester_id=user.id,
        request_type=RequestType.kafka_topic,
        status=status,
        payload_json={
            "environment": body.environment,
            "cluster_id": body.cluster_id,
            "topic_name": body.topic_name,
            "partitions": body.partitions,
            "replication_factor": body.replication_factor,
        },
        result_json=outcome,
        error_message=error_message,
    )
    db.add(req)
    db.flush()

    write_audit(
        db,
        actor_user_id=user.id,
        action="kafka.create_topic",
        resource_type="kafka_topic",
        resource_id=f"{body.environment}:{body.cluster_id}:{body.topic_name}",
        status=audit_status,
        metadata={"payload": req.payload_json, "result": outcome, "error": error_message},
    )
    db.commit()
    db.refresh(req)
    return req
