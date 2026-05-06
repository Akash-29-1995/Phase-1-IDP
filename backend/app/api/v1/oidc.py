from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.security import create_access_token, hash_password
from app.db import get_db
from app.models import Role, User
from app.services.oidc_service import (
    build_authorization_url,
    decode_and_verify_id_token,
    exchange_authorization_code,
    fetch_discovery,
)

router = APIRouter(prefix="/auth", tags=["sso"])


def _parse_allowed_domains(raw: str) -> set[str]:
    return {p.strip().lower() for p in (raw or "").split(",") if p.strip()}


def _email_domain_ok(email: str, allowed: set[str]) -> bool:
    if "@" not in email:
        return False
    domain = email.split("@", 1)[1].lower()
    return domain in allowed


@router.get("/sso/status")
def sso_status(settings: Settings = Depends(get_settings)) -> dict:
    enabled = bool(
        settings.oidc_issuer
        and settings.oidc_client_id
        and settings.oidc_client_secret
        and settings.allowed_sso_email_domains.strip(),
    )
    return {"enabled": enabled}


@router.get("/oidc/login")
async def oidc_login(request: Request, settings: Settings = Depends(get_settings)) -> RedirectResponse:
    if not settings.oidc_issuer or not settings.oidc_client_id or not settings.oidc_client_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="SSO is not configured")
    if not settings.allowed_sso_email_domains.strip():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="SSO domain allowlist is empty")

    discovery = await fetch_discovery(settings.oidc_issuer)
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(16)
    request.session["oidc_state"] = state
    request.session["oidc_nonce"] = nonce

    url = build_authorization_url(
        discovery,
        client_id=settings.oidc_client_id,
        redirect_uri=settings.oidc_redirect_uri,
        state=state,
        nonce=nonce,
    )
    return RedirectResponse(url)


@router.get("/oidc/callback")
async def oidc_callback(
    request: Request,
    code: str,
    state: str,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if not settings.oidc_issuer:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="SSO is not configured")

    sess_state = request.session.get("oidc_state")
    nonce = request.session.get("oidc_nonce")
    if not sess_state or not nonce or sess_state != state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid SSO state")

    discovery = await fetch_discovery(settings.oidc_issuer)
    try:
        tokens = await exchange_authorization_code(
            discovery,
            code=code,
            redirect_uri=settings.oidc_redirect_uri,
            client_id=settings.oidc_client_id,
            client_secret=settings.oidc_client_secret,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Token exchange failed: {exc}") from exc

    id_token = tokens.get("id_token")
    if not id_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provider did not return id_token")

    try:
        payload = decode_and_verify_id_token(
            id_token,
            discovery=discovery,
            audience=settings.oidc_client_id,
            nonce=str(nonce),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid id_token: {exc}") from exc

    email = payload.get("email") or payload.get("preferred_username")
    if not email or not isinstance(email, str):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email claim missing from identity token")

    allowed = _parse_allowed_domains(settings.allowed_sso_email_domains)
    if not _email_domain_ok(email, allowed):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your email domain is not permitted for SSO sign-in",
        )

    existing = db.query(User).filter(User.username == email).first()
    if existing and not existing.is_sso:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This email is already registered as a local account; use password login.",
        )

    if not existing:
        user = User(
            username=email,
            password_hash=hash_password(secrets.token_urlsafe(48)),
            role=Role.viewer,
            is_sso=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user = existing
        user.role = Role.viewer
        user.is_sso = True
        db.commit()
        db.refresh(user)

    token = create_access_token(settings, username=user.username, role=user.role)

    request.session.pop("oidc_state", None)
    request.session.pop("oidc_nonce", None)

    base = settings.frontend_url.rstrip("/")
    return RedirectResponse(f"{base}/oauth/callback?access_token={token}", status_code=status.HTTP_302_FOUND)
