"""
FastAPI Routes — HTTP API für den Agent-Core.
Wird von Express via localhost HTTP aufgerufen.
"""

import hashlib
from uuid import uuid4
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from loguru import logger
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

from config import settings
from agents.orchestrator import MasterOrchestrator

router = APIRouter()
orchestrator = MasterOrchestrator()

# Prometheus Metriken
TASK_COUNTER   = Counter("agent_tasks_total", "Gesamte Tasks", ["agent", "status"])
TASK_DURATION  = Histogram("agent_task_duration_seconds", "Task-Dauer", ["agent"])


# ─── Schemas ─────────────────────────────────────────────────

class TaskRequest(BaseModel):
    taskId:    str = Field(default_factory=lambda: str(uuid4()))
    agentName: str = "orchestrator"
    taskType:  str
    priority:  str = "normal"
    payload:   dict = {}
    sessionRef: str | None = None
    patientRef: str | None = None
    requestedBy: str | None = None


class TaskResponse(BaseModel):
    taskId:     str
    agentName:  str
    status:     str
    result:     dict
    durationMs: int
    timestamp:  str


# ─── Auth ────────────────────────────────────────────────────

def verify_secret(x_agent_secret: str | None = Header(default=None)):
    if settings.environment == "production" and x_agent_secret != settings.agent_core_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True


# ─── Endpoints ───────────────────────────────────────────────

@router.get("/health")
async def health():
    """Health-Check mit Ollama + RabbitMQ Status."""
    ollama_ok     = await _check_ollama()
    return {
        "status":    "ok" if ollama_ok else "degraded",
        "ollama":    "connected" if ollama_ok else "disconnected",
        "timestamp": _now_iso(),
        "version":   "1.0.0",
    }


@router.get("/metrics")
async def metrics():
    """Prometheus Metriken."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@router.post("/tasks", response_model=TaskResponse)
async def create_task(req: TaskRequest, _auth=Depends(verify_secret)):
    """Führt einen Task direkt aus (synchron, für Express-IPC)."""
    import time
    start = time.time()

    logger.info("Task: {} (Agent: {}, Typ: {})", req.taskId, req.agentName, req.taskType)

    try:
        task_data = {
            "taskId":     req.taskId,
            "agentName":  req.agentName,
            "taskType":   req.taskType,
            "priority":   req.priority,
            "payload":    req.payload,
            "sessionRef": req.sessionRef,
            "patientRef": req.patientRef,
            "requestedBy": req.requestedBy,
        }

        result = await orchestrator.execute(task_data)
        duration_ms = int((time.time() - start) * 1000)

        TASK_COUNTER.labels(agent=req.agentName, status="success").inc()
        TASK_DURATION.labels(agent=req.agentName).observe(time.time() - start)

        return TaskResponse(
            taskId=req.taskId,
            agentName=req.agentName,
            status="completed",
            result=result,
            durationMs=duration_ms,
            timestamp=_now_iso(),
        )

    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        TASK_COUNTER.labels(agent=req.agentName, status="error").inc()
        logger.error("Task {} fehlgeschlagen: {}", req.taskId, e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str, _auth=Depends(verify_secret)):
    """Gibt den Status eines Tasks zurück (Stub — vollständig via DB)."""
    return {"taskId": task_id, "status": "unknown", "note": "Bitte Prisma-DB abfragen"}


@router.get("/agents")
async def list_agents(_auth=Depends(verify_secret)):
    """Listet alle verfügbaren Agenten."""
    return {
        "agents": [
            {
                "name":        "orchestrator",
                "displayName": "Master Orchestrator",
                "description": "Leitet Tasks an Sub-Agenten weiter",
                "status":      "online",
            },
            {
                "name":        "empfang",
                "displayName": "Empfangs-Agent",
                "description": "Terminverwaltung, Checkin, FAQ",
                "status":      "online",
            },
            {
                "name":        "abrechnung",
                "displayName": "Abrechnungs-Agent",
                "description": "GOÄ-Informationen, IGeL, Mahnwesen",
                "status":      "online",
            },
            {
                "name":        "triage",
                "displayName": "Triage-Agent",
                "description": "Administrative Prioritätsbewertung (keine Diagnosen)",
                "status":      "online",
            },
        ]
    }


# ─── Hilfsfunktionen ─────────────────────────────────────────

async def _check_ollama() -> bool:
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(f"{settings.ollama_url}/api/tags")
            return r.status_code == 200
    except Exception:
        return False


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
