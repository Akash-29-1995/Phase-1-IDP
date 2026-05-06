from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.deps import CurrentUser, MutatorUser
from app.integrations.redis_integration import redis_get
from app.models import Approval, RequestStatus, RequestType, ServiceRequest
from app.schemas import RedisDeleteCreate, ServiceRequestOut
from app.services.audit_service import write_audit

router = APIRouter(prefix="/redis", tags=["redis"])


@router.get("/lookup")
def redis_lookup(
    environment: str,
    cluster_id: str,
    key: str,
    user: CurrentUser,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    try:
        payload = redis_get(settings, environment=environment, cluster_id=cluster_id, key=key)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    write_audit(
        db,
        actor_user_id=user.id,
        action="redis.get",
        resource_type="redis_key",
        resource_id=f"{environment}:{cluster_id}:{key}",
        status="completed",
        metadata={"payload": payload},
    )
    db.commit()
    return payload


@router.post("/delete-requests", response_model=ServiceRequestOut)
def redis_delete_request(
    body: RedisDeleteCreate,
    user: MutatorUser,
    db: Session = Depends(get_db),
) -> ServiceRequest:
    req = ServiceRequest(
        requester_id=user.id,
        request_type=RequestType.redis_delete,
        status=RequestStatus.pending_approval,
        payload_json={"environment": body.environment, "cluster_id": body.cluster_id, "key": body.key},
        result_json=None,
        error_message=None,
    )
    db.add(req)
    db.flush()

    appr = Approval(request_id=req.id)
    db.add(appr)

    write_audit(
        db,
        actor_user_id=user.id,
        action="redis.delete_request",
        resource_type="redis_key",
        resource_id=f"{body.environment}:{body.cluster_id}:{body.key}",
        status="pending_approval",
        metadata={"request_id": req.id},
    )
    db.commit()
    db.refresh(req)
    return req
