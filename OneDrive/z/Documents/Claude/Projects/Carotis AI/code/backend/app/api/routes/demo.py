from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_demo_token
from app.db.database import get_db
from app.db.models import AuditEvent, DemoToken

router = APIRouter(prefix="/demo", tags=["demo"])


class WalkthroughStepLog(BaseModel):
    model_config = ConfigDict(extra="forbid")

    step_id: str = Field(..., min_length=1, max_length=64)
    event: str = Field(..., min_length=1, max_length=64)
    case_id: str | None = Field(default=None, max_length=64)
    metadata: dict[str, Any] = Field(default_factory=dict)


@router.get("/whoami")
async def whoami(token: DemoToken = Depends(verify_demo_token)):
    return {
        "label": token.label,
        "expires_at": token.expires_at,
        "requests_used": token.requests_used,
        "max_requests": token.max_requests,
        "requests_remaining": max(token.max_requests - token.requests_used, 0),
    }


@router.post("/log-walkthrough-step")
async def log_walkthrough_step(
    payload: WalkthroughStepLog,
    token: DemoToken = Depends(verify_demo_token),
    db: AsyncSession = Depends(get_db),
):
    if len(payload.metadata) > 20:
        raise HTTPException(status_code=422, detail="metadata too large")

    audit = AuditEvent(
        event_type="demo_walkthrough_step",
        actor="demo_user",
        payload_json=json.dumps(
            {
                "step_id": payload.step_id,
                "event": payload.event,
                "case_id": payload.case_id,
                "metadata": {
                    "demo_token_label": token.label,
                    "client_metadata_keys": sorted(payload.metadata.keys()),
                    "logged_at": datetime.now(timezone.utc).isoformat(),
                },
            }
        ),
    )
    db.add(audit)
    await db.commit()
    return {"status": "ok", "audit_id": audit.id}
