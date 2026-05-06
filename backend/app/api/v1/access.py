from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.deps import MutatorUser
from app.integrations.ssm_integration import ec2_access_precheck
from app.models import RequestStatus, RequestType, ServiceRequest
from app.schemas import EC2AccessCreate, ServiceRequestOut
from app.services.audit_service import write_audit

router = APIRouter(prefix="/access", tags=["access"])


@router.post("/ec2", response_model=ServiceRequestOut)
def request_ec2_access(
    body: EC2AccessCreate,
    user: MutatorUser,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ServiceRequest:
    region = settings.aws_region
    check = ec2_access_precheck(body.server_ip, region)

    ssh_meta = None
    if body.ssh_public_key:
        ssh_meta = {"provided": True, "chars": len(body.ssh_public_key)}

    guidance = {
        "restricted_folder": (
            "Prefer SSM port forwarding or session into a non-root service account; "
            "scope file access to application directories only."
        ),
        "elevated": (
            "Elevated access is high risk: require justification, approvals, and break-glass procedures "
            "outside this MVP."
        ),
    }

    result_json = {
        "check": check,
        "access_level": body.access_level,
        "environment": body.environment,
        "ssh_public_key": ssh_meta,
        "guidance": guidance.get(body.access_level),
    }

    ok = bool(check.get("ok"))
    req = ServiceRequest(
        requester_id=user.id,
        request_type=RequestType.ssm_access,
        status=RequestStatus.completed,
        payload_json={
            "environment": body.environment,
            "server_ip": body.server_ip,
            "access_level": body.access_level,
            "ssh_public_key": body.ssh_public_key,
            "duration_hours": body.duration_hours,
            "reason": body.reason,
        },
        result_json=result_json,
        error_message=None
        if ok
        else str(
            (check.get("ssm") or {}).get("detail")
            or (check.get("resolved") or {}).get("detail")
            or check.get("detail")
            or "failed",
        ),
    )
    db.add(req)
    db.flush()

    instance_id = None
    if isinstance(check.get("ssm"), dict):
        instance_id = check["ssm"].get("instance_id")
    resource_id = instance_id or body.server_ip

    write_audit(
        db,
        actor_user_id=user.id,
        action="ec2.access_request",
        resource_type="ec2_instance",
        resource_id=str(resource_id),
        status="completed" if ok else "failed",
        metadata={
            "environment": body.environment,
            "server_ip": body.server_ip,
            "access_level": body.access_level,
            "duration_hours": body.duration_hours,
            "ssh_meta": ssh_meta,
            "check": check,
        },
    )
    db.commit()
    db.refresh(req)
    return req
