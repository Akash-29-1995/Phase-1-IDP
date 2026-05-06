from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.deps import AdminUser, CurrentUser
from app.integrations.redis_integration import redis_delete
from app.models import Approval, RequestStatus, RequestType, ServiceRequest
from app.schemas import ApprovalDecisionBody, ServiceRequestOut
from app.services.audit_service import write_audit

router = APIRouter(prefix="/approvals", tags=["approvals"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/pending", response_model=list[ServiceRequestOut])
def pending_requests(_admin: AdminUser, db: Session = Depends(get_db)) -> list[ServiceRequest]:
    rows = (
        db.query(ServiceRequest)
        .filter(ServiceRequest.status == RequestStatus.pending_approval)
        .order_by(ServiceRequest.created_at.desc())
        .all()
    )
    return rows


@router.post("/{request_id}/approve", response_model=ServiceRequestOut)
def approve_request(
    request_id: int,
    body: ApprovalDecisionBody,
    admin: AdminUser,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ServiceRequest:
    req = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="request not found")
    if req.status != RequestStatus.pending_approval:
        raise HTTPException(status_code=400, detail="request is not pending approval")

    appr = db.query(Approval).filter(Approval.request_id == req.id).first()
    if not appr:
        raise HTTPException(status_code=500, detail="approval row missing")

    if req.request_type == RequestType.redis_delete:
        environment = str(req.payload_json.get("environment"))
        cluster_id = str(req.payload_json.get("cluster_id"))
        key = str(req.payload_json.get("key"))
        try:
            outcome = redis_delete(settings, environment=environment, cluster_id=cluster_id, key=key)
            req.result_json = outcome
            req.status = RequestStatus.completed
            req.error_message = None
            audit_status = "completed"
        except Exception as exc:
            req.status = RequestStatus.failed
            req.error_message = str(exc)
            audit_status = "failed"
    else:
        raise HTTPException(status_code=400, detail="unsupported request type for approval execution")

    appr.decided_by_user_id = admin.id
    appr.decision = "approved"
    appr.reason = body.reason
    appr.decided_at = _utcnow()

    write_audit(
        db,
        actor_user_id=admin.id,
        action="approval.approve",
        resource_type="service_request",
        resource_id=str(req.id),
        status=audit_status,
        metadata={"request_type": req.request_type.value, "result": req.result_json, "error": req.error_message},
    )
    db.commit()
    db.refresh(req)
    return req


@router.post("/{request_id}/reject", response_model=ServiceRequestOut)
def reject_request(
    request_id: int,
    body: ApprovalDecisionBody,
    admin: AdminUser,
    db: Session = Depends(get_db),
) -> ServiceRequest:
    req = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="request not found")
    if req.status != RequestStatus.pending_approval:
        raise HTTPException(status_code=400, detail="request is not pending approval")

    appr = db.query(Approval).filter(Approval.request_id == req.id).first()
    if not appr:
        raise HTTPException(status_code=500, detail="approval row missing")

    req.status = RequestStatus.rejected
    req.error_message = body.reason

    appr.decided_by_user_id = admin.id
    appr.decision = "rejected"
    appr.reason = body.reason
    appr.decided_at = _utcnow()

    write_audit(
        db,
        actor_user_id=admin.id,
        action="approval.reject",
        resource_type="service_request",
        resource_id=str(req.id),
        status="rejected",
        metadata={"request_type": req.request_type.value},
    )
    db.commit()
    db.refresh(req)
    return req


@router.get("/mine", response_model=list[ServiceRequestOut])
def my_recent_requests(
    user: CurrentUser,
    db: Session = Depends(get_db),
    limit: int = 50,
) -> list[ServiceRequest]:
    rows = (
        db.query(ServiceRequest)
        .filter(ServiceRequest.requester_id == user.id)
        .order_by(ServiceRequest.created_at.desc())
        .limit(limit)
        .all()
    )
    return rows
