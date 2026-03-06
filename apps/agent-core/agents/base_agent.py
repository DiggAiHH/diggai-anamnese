"""
BaseAgent — Basisklasse für alle DiggAI-Agenten.

Jeder Agent:
- Hat ein System-Prompt (definiert seine Rolle)
- Ruft Ollama lokal auf (kein PHI in den Prompts!)
- Gibt ein strukturiertes Ergebnis zurück
"""

import hashlib
import time
from abc import ABC, abstractmethod

import httpx
from loguru import logger

from config import settings


class BaseAgent(ABC):
    name: str
    display_name: str
    description: str
    system_prompt: str

    async def execute(self, task: dict) -> dict:
        """
        Führt den Task aus.
        Überschreibe `handle_task` in der Unterklasse.
        WICHTIG: Kein PHI im task-Payload!
        """
        task_type = task.get("taskType", "unknown")
        payload    = task.get("payload", {})

        logger.info("[{}] Starte Task: {} (Typ: {})", self.name, task.get("taskId"), task_type)

        start = time.time()
        result = await self.handle_task(task_type, payload)
        duration_ms = int((time.time() - start) * 1000)

        logger.info("[{}] Task abgeschlossen in {}ms", self.name, duration_ms)
        return result

    @abstractmethod
    async def handle_task(self, task_type: str, payload: dict) -> dict:
        """Implementiere die Task-Logik in der Unterklasse."""
        ...

    async def call_llm(self, user_prompt: str, override_system: str | None = None) -> str:
        """
        Ruft Ollama lokal auf.
        Sendet NIEMALS PHI an externe APIs.
        """
        system = override_system or self.system_prompt
        url = f"{settings.ollama_url}/api/generate"

        prompt_hash = hashlib.sha256(user_prompt.encode()).hexdigest()
        logger.debug("[{}] LLM-Aufruf (prompt_hash={})", self.name, prompt_hash[:12])

        try:
            async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
                response = await client.post(url, json={
                    "model":  settings.ollama_model,
                    "prompt": user_prompt,
                    "system": system,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "num_predict": 1024,
                    },
                })
                response.raise_for_status()
                data = response.json()
                return data.get("response", "").strip()

        except httpx.TimeoutException:
            logger.error("[{}] Ollama Timeout nach {}s", self.name, settings.ollama_timeout)
            raise RuntimeError(f"Ollama Timeout nach {settings.ollama_timeout}s")
        except httpx.HTTPStatusError as e:
            logger.error("[{}] Ollama HTTP-Fehler: {}", self.name, e.response.status_code)
            raise RuntimeError(f"Ollama Fehler: {e.response.status_code}")
