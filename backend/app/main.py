from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.v1 import access, admin_console, approvals, audit_logs, auth, catalog, kafka_topics, oidc, redis_ops
from app.config import get_settings
from app.core.security import hash_password
from app.db import SessionLocal, engine
from app.models import Base, Role, User


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(title="Relay Platform API", version="0.1.0")

    application.add_middleware(SessionMiddleware, secret_key=settings.jwt_secret, same_site="lax", https_only=False)

    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins if origins else ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(auth.router, prefix="/api/v1")
    application.include_router(oidc.router, prefix="/api/v1")
    application.include_router(admin_console.router, prefix="/api/v1")
    application.include_router(catalog.router, prefix="/api/v1")
    application.include_router(access.router, prefix="/api/v1")
    application.include_router(kafka_topics.router, prefix="/api/v1")
    application.include_router(redis_ops.router, prefix="/api/v1")
    application.include_router(approvals.router, prefix="/api/v1")
    application.include_router(audit_logs.router, prefix="/api/v1")

    @application.on_event("startup")
    def _startup() -> None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            def upsert_user(username: str, password: str, role: Role) -> None:
                existing = db.query(User).filter(User.username == username).first()
                if existing:
                    return
                db.add(User(username=username, password_hash=hash_password(password), role=role))

            upsert_user(settings.admin_username, settings.admin_password, Role.admin)
            upsert_user(settings.dev_username, settings.dev_password, Role.developer)
            db.commit()
        finally:
            db.close()

    return application


app = create_app()
