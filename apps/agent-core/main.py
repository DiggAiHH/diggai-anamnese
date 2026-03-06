"""
DiggAI Agent-Core — FastAPI Hauptanwendung

Startet:
1. HTTP API (Port 8000) — für Express-Backend IPC
2. RabbitMQ Consumer — für asynchrone Task-Verarbeitung
"""

import asyncio
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from config import settings
from api.routes import router
from broker.rabbitmq import broker
from agents.orchestrator import MasterOrchestrator


orchestrator = MasterOrchestrator()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("DiggAI Agent-Core startet...")
    logger.info("Ollama URL: {}", settings.ollama_url)
    logger.info("RabbitMQ: {}", settings.rabbitmq_url.split("@")[-1])

    # RabbitMQ verbinden (optional — App läuft auch ohne)
    try:
        await broker.connect()
        await broker.start_consuming(orchestrator.execute)
        logger.success("RabbitMQ Consumer aktiv")
    except Exception as e:
        logger.warning("RabbitMQ nicht verfügbar: {} — HTTP-only Modus", e)

    yield

    # Shutdown
    logger.info("Agent-Core fährt herunter...")
    await broker.disconnect()


app = FastAPI(
    title="DiggAI Agent-Core",
    version="1.0.0",
    description="Multi-Agenten-System für Arztpraxen — Lokale KI-Verarbeitung (kein PHI in der Cloud)",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None,
)

# CORS: Nur Express-Backend (localhost) darf zugreifen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://app:3001"],
    allow_methods=["GET", "POST"],
    allow_headers=["X-Agent-Secret", "Content-Type"],
)

app.include_router(router)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )
