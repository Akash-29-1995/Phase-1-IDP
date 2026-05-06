from __future__ import annotations

import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.deps import AdminUser
from app.models import Approval, AuditLog, RequestStatus, ServiceRequest, User
from app.schemas import UserOut

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview")
def admin_overview(_admin: AdminUser, db: Session = Depends(get_db)) -> dict:
    pending = db.query(func.count(ServiceRequest.id)).filter(ServiceRequest.status == RequestStatus.pending_approval).scalar() or 0
    users_n = db.query(func.count(User.id)).scalar() or 0
    audit_n = db.query(func.count(AuditLog.id)).scalar() or 0
    requests_n = db.query(func.count(ServiceRequest.id)).scalar() or 0
    approvals_n = db.query(func.count(Approval.id)).scalar() or 0
    return {
        "pending_approvals": int(pending),
        "users": int(users_n),
        "audit_events": int(audit_n),
        "service_requests_total": int(requests_n),
        "approval_rows": int(approvals_n),
    }


@router.get("/users", response_model=list[UserOut])
def admin_users(_admin: AdminUser, db: Session = Depends(get_db)) -> list[User]:
    return db.query(User).order_by(User.id.asc()).all()


@router.get("/integrations")
def admin_integrations(_admin: AdminUser, settings: Settings = Depends(get_settings)) -> dict:
    kafka_env = bool(settings.kafka_clusters_by_env_json.strip() and settings.kafka_clusters_by_env_json.strip() != "{}")
    kafka_legacy = bool(settings.kafka_bootstrap_by_cluster.strip() and settings.kafka_bootstrap_by_cluster.strip() != "{}")
    redis_env = bool(
        settings.redis_clusters_by_env_json.strip() and settings.redis_clusters_by_env_json.strip() != "{}"
    )
    redis_legacy = bool(settings.redis_url_by_cluster.strip() and settings.redis_url_by_cluster.strip() != "{}")
    return {
        "kafka_configured": kafka_env or kafka_legacy,
        "redis_configured": redis_env or redis_legacy,
        "aws_region_set": bool(settings.aws_region),
        "sso_enabled": bool(
            settings.oidc_issuer
            and settings.oidc_client_id
            and settings.oidc_client_secret
            and settings.allowed_sso_email_domains.strip(),
        ),
        "database_backend": "postgresql" if "postgresql" in settings.database_url else "sqlite",
    }


@router.get("/audit/export")
def admin_audit_export_csv(_admin: AdminUser, db: Session = Depends(get_db)) -> StreamingResponse:
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(5000).all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id", "created_at", "actor_user_id", "action", "resource_type", "resource_id", "status"])
    for r in rows:
        writer.writerow(
            [
                r.id,
                r.created_at.isoformat() if r.created_at else "",
                r.actor_user_id or "",
                r.action,
                r.resource_type,
                r.resource_id,
                r.status,
            ]
        )
    data = buf.getvalue()
    headers = {"Content-Disposition": 'attachment; filename="audit-export.csv"'}
    return StreamingResponse(iter([data]), media_type="text/csv", headers=headers)
