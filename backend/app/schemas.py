from __future__ import annotations

import ipaddress
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from app.models import RequestStatus, RequestType, Role


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    role: Role
    is_sso: bool = False

    class Config:
        from_attributes = True


EnvironmentName = Literal["prod", "nonprod"]


class EC2AccessCreate(BaseModel):
    environment: EnvironmentName
    server_ip: str = Field(..., min_length=7, max_length=45)
    access_level: Literal["restricted_folder", "elevated"]
    ssh_public_key: str | None = None
    duration_hours: float = Field(default=4, ge=0.25, le=24)
    reason: str | None = None

    @field_validator("server_ip")
    @classmethod
    def validate_ip(cls, v: str) -> str:
        raw = v.strip()
        try:
            ipaddress.ip_address(raw)
        except ValueError as exc:
            raise ValueError("server_ip must be a valid IPv4/IPv6 address") from exc
        return raw

    @field_validator("ssh_public_key")
    @classmethod
    def normalize_key(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned or None


class KafkaTopicCreate(BaseModel):
    environment: EnvironmentName
    cluster_id: str = Field(..., min_length=1)
    topic_name: str
    partitions: int = Field(ge=1)
    replication_factor: int = Field(ge=1)


class RedisDeleteCreate(BaseModel):
    environment: EnvironmentName
    cluster_id: str = Field(..., min_length=1)
    key: str = Field(..., min_length=1)


class ApprovalDecisionBody(BaseModel):
    reason: str | None = None


class ServiceRequestOut(BaseModel):
    id: int
    request_type: RequestType
    status: RequestStatus
    payload_json: dict[str, Any]
    result_json: dict[str, Any] | None
    error_message: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogOut(BaseModel):
    id: int
    actor_user_id: int | None
    action: str
    resource_type: str
    resource_id: str
    status: str
    metadata_json: dict[str, Any] | None
    created_at: datetime

    class Config:
        from_attributes = True
