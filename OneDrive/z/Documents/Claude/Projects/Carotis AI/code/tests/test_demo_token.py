from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.core.security import hash_demo_token
from app.db.database import get_session_factory
from app.db.models import AuditEvent, DemoToken

DEMO_TOKEN = "rohde-demo-token-32-byte-minimum"


async def _insert_demo_token(
    *,
    raw_token: str = DEMO_TOKEN,
    label: str = "rohde-2026-04-30",
    expires_at: datetime | None = None,
    requests_used: int = 0,
    max_requests: int = 100,
) -> None:
    async with get_session_factory()() as session:
        session.add(
            DemoToken(
                token_hash=hash_demo_token(raw_token),
                label=label,
                expires_at=expires_at
                or datetime.now(timezone.utc) + timedelta(days=30),
                requests_used=requests_used,
                max_requests=max_requests,
            )
        )
        await session.commit()


@pytest.mark.asyncio
async def test_demo_token_hashing_is_sha256_hex() -> None:
    token_hash = hash_demo_token(DEMO_TOKEN)
    assert len(token_hash) == 64
    assert token_hash == hash_demo_token(DEMO_TOKEN)
    assert token_hash != DEMO_TOKEN


@pytest.mark.asyncio
async def test_demo_token_whitelist_lookup_accepts_valid_token(test_client) -> None:
    await _insert_demo_token(label="rohde-valid")
    resp = await test_client.get(
        "/api/v1/demo/whoami", headers={"X-Demo-Token": DEMO_TOKEN}
    )
    assert resp.status_code == 200
    assert resp.json()["label"] == "rohde-valid"


@pytest.mark.asyncio
async def test_expired_demo_token_rejected(test_client) -> None:
    await _insert_demo_token(
        raw_token="expired-demo-token-32-byte-minimum",
        expires_at=datetime.now(timezone.utc) - timedelta(seconds=1),
    )
    resp = await test_client.get(
        "/api/v1/demo/whoami",
        headers={"X-Demo-Token": "expired-demo-token-32-byte-minimum"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_demo_token_rate_limit_enforced(test_client) -> None:
    await _insert_demo_token(
        raw_token="quota-demo-token-32-byte-minimum",
        requests_used=1,
        max_requests=1,
    )
    resp = await test_client.get(
        "/api/v1/demo/whoami",
        headers={"X-Demo-Token": "quota-demo-token-32-byte-minimum"},
    )
    assert resp.status_code == 429


@pytest.mark.asyncio
async def test_demo_walkthrough_audit_tag_persisted(test_client) -> None:
    await _insert_demo_token(raw_token="audit-demo-token-32-byte-minimum")
    resp = await test_client.post(
        "/api/v1/demo/log-walkthrough-step",
        headers={"X-Demo-Token": "audit-demo-token-32-byte-minimum"},
        json={
            "step_id": "trust-panel",
            "event": "viewed",
            "case_id": "synthetic-case-001",
            "metadata": {"screen": "demo"},
        },
    )
    assert resp.status_code == 200

    async with get_session_factory()() as session:
        result = await session.execute(
            select(AuditEvent).where(AuditEvent.event_type == "demo_walkthrough_step")
        )
        audit = result.scalar_one()
        payload = json.loads(audit.payload_json)
        assert payload["metadata"]["demo_token_label"] == "rohde-2026-04-30"
        assert "screen" in payload["metadata"]["client_metadata_keys"]


@pytest.mark.asyncio
async def test_demo_whoami_returns_quota(test_client) -> None:
    await _insert_demo_token(raw_token="whoami-demo-token-32-byte-minimum")
    resp = await test_client.get(
        "/api/v1/demo/whoami",
        headers={"X-Demo-Token": "whoami-demo-token-32-byte-minimum"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["requests_used"] == 1
    assert data["max_requests"] == 100
    assert data["requests_remaining"] == 99
