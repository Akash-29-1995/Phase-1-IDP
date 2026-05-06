from __future__ import annotations

import time
from typing import Any
from urllib.parse import urlencode

import httpx
import jwt as pyjwt
from jwt import PyJWKClient

_discovery_cache: dict[str, dict[str, Any]] = {}
_discovery_loaded_at: float = 0.0
CACHE_TTL_SEC = 3600


async def fetch_discovery(issuer: str) -> dict[str, Any]:
    issuer = issuer.rstrip("/")
    now = time.time()
    global _discovery_loaded_at
    if issuer in _discovery_cache and now - _discovery_loaded_at < CACHE_TTL_SEC:
        return _discovery_cache[issuer]

    url = f"{issuer}/.well-known/openid-configuration"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    _discovery_cache[issuer] = data
    _discovery_loaded_at = now
    return data


def build_authorization_url(discovery: dict[str, Any], *, client_id: str, redirect_uri: str, state: str, nonce: str) -> str:
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": "openid email profile",
        "state": state,
        "nonce": nonce,
    }
    return f"{discovery['authorization_endpoint']}?{urlencode(params)}"


async def exchange_authorization_code(
    discovery: dict[str, Any],
    *,
    code: str,
    redirect_uri: str,
    client_id: str,
    client_secret: str,
) -> dict[str, Any]:
    token_url = discovery["token_endpoint"]
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            token_url,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": client_id,
                "client_secret": client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        return resp.json()


def decode_and_verify_id_token(
    id_token: str,
    *,
    discovery: dict[str, Any],
    audience: str,
    nonce: str,
) -> dict[str, Any]:
    jwks_uri = discovery["jwks_uri"]
    issuer = discovery["issuer"]
    jwk_client = PyJWKClient(jwks_uri)
    signing_key = jwk_client.get_signing_key_from_jwt(id_token)
    payload = pyjwt.decode(
        id_token,
        signing_key.key,
        algorithms=["RS256"],
        audience=audience,
        issuer=issuer,
    )
    if payload.get("nonce") != nonce:
        raise ValueError("invalid nonce in id_token")
    return payload
