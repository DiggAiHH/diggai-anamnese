from datetime import datetime, timezone
from hashlib import sha256

from fastapi import Depends, Header, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import DemoToken

_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=True)


async def verify_api_key(api_key: str = Security(_API_KEY_HEADER)) -> str:
    """Validate X-API-Key header against configured secret.

    Returns the validated key so routes can log the caller identity
    without exposing the full key.
    """
    settings = get_settings()
    if api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    return api_key


def hash_demo_token(token: str) -> str:
    """Hash a raw demo token before comparing it with the DB whitelist."""
    return sha256(token.encode("utf-8")).hexdigest()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


async def verify_demo_token(
    x_demo_token: str = Header(..., alias="X-Demo-Token"),
    db: AsyncSession = Depends(get_db),
) -> DemoToken:
    """Validate a demo token against the SQLite whitelist and consume quota."""
    token_hash = hash_demo_token(x_demo_token)
    result = await db.execute(
        select(DemoToken).where(DemoToken.token_hash == token_hash)
    )
    token = result.scalar_one_or_none()
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing demo token",
        )
    if _as_aware_utc(token.expires_at) <= _utc_now():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo token expired",
        )
    if token.requests_used >= token.max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demo token quota exceeded",
        )

    token.requests_used += 1
    await db.commit()
    await db.refresh(token)
    return token
