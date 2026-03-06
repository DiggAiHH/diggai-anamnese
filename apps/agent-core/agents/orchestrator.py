"""
Master Orchestrator — Analysiert eingehende Tasks und leitet sie
an den passenden Sub-Agenten weiter.

Kein PHI in Tasks! Nur anonymisierte Task-Typen und Kontext-IDs.
"""

from loguru import logger

from agents.base_agent import BaseAgent
from agents.empfang import EmpfangsAgent
from agents.abrechnung import AbrechnungsAgent
from agents.triage import TriageAgent


class MasterOrchestrator(BaseAgent):
    name         = "orchestrator"
    display_name = "Master Orchestrator"
    description  = "Leitet Tasks an den passenden Sub-Agenten weiter"
    system_prompt = """Du bist der Master Orchestrator des DiggAI Multi-Agenten-Systems für Arztpraxen.

Deine Aufgabe:
1. Analysiere den eingehenden Task-Typ
2. Wähle den passenden Sub-Agenten aus
3. Validiere dass keine sensiblen Patientendaten (PHI) im Task enthalten sind
4. Gib eine strukturierte Routing-Entscheidung zurück

Verfügbare Agenten:
- empfang: Terminverwaltung, Checkin, FAQ
- abrechnung: GOÄ-Abrechnung, IGeL-Leistungen, Mahnwesen
- triage: Dringlichkeitsbewertung von Anfragen (NUR administrative Triage, keine Diagnosen!)

WICHTIG:
- Stelle KEINE Diagnosen
- Gib KEINE Behandlungsempfehlungen
- Bei Unsicherheit: human_review = true setzen
- Immer auf Deutsch antworten"""

    # Registry der Sub-Agenten
    _agents: dict[str, BaseAgent] = {
        "empfang":    EmpfangsAgent(),
        "abrechnung": AbrechnungsAgent(),
        "triage":     TriageAgent(),
    }

    async def handle_task(self, task_type: str, payload: dict) -> dict:
        # Direkte Weiterleitung bei bekanntem Agenten-Prefix
        for agent_name, agent in self._agents.items():
            if task_type.startswith(agent_name + ".") or task_type == agent_name:
                logger.info("[Orchestrator] Route: {} → {}", task_type, agent_name)
                return await agent.handle_task(task_type, payload)

        # Ollama-basierte Routing-Entscheidung bei unbekanntem Task-Typ
        logger.info("[Orchestrator] Unbekannter Task-Typ '{}' — LLM-Routing", task_type)
        routing_prompt = f"""Analysiere diesen Task und wähle den passenden Agenten aus.

Task-Typ: {task_type}
Task-Beschreibung: {payload.get('description', 'keine Beschreibung')}

Antworte NUR mit einem dieser JSON-Objekte:
{{"agent": "empfang", "reason": "..."}}
{{"agent": "abrechnung", "reason": "..."}}
{{"agent": "triage", "reason": "..."}}
{{"agent": "unknown", "human_review": true, "reason": "..."}}"""

        import json
        try:
            llm_response = await self.call_llm(routing_prompt)
            routing = json.loads(llm_response)
        except Exception:
            routing = {"agent": "unknown", "human_review": True, "reason": "LLM-Routing fehlgeschlagen"}

        target_agent = routing.get("agent")
        if target_agent in self._agents:
            return await self._agents[target_agent].handle_task(task_type, payload)

        return {
            "status":       "unroutable",
            "humanReview":  True,
            "reason":       routing.get("reason", "Kein passender Agent gefunden"),
            "taskType":     task_type,
        }
