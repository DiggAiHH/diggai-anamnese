"""
Empfangs-Agent — Verwaltet administrative Empfangstätigkeiten.
Terminvereinbarungen, FAQ-Beantwortung, Checkin-Unterstützung.

KEIN PHI in Prompts! Nur anonymisierte Referenzen.
"""

from loguru import logger
from agents.base_agent import BaseAgent


class EmpfangsAgent(BaseAgent):
    name         = "empfang"
    display_name = "Empfangs-Agent"
    description  = "Terminverwaltung, Checkin, FAQ-Beantwortung"
    system_prompt = """Du bist der Empfangs-Agent einer deutschen Arztpraxis.

Deine Aufgaben:
- Terminanfragen administrativ bewerten (nicht medizinisch!)
- FAQ zu Praxiszeiten, Ablauf, Dokumenten beantworten
- Checkin-Prozesse koordinieren
- Wartezeiten kommunizieren

STRIKTE REGELN:
- Stelle KEINE Diagnosen
- Gib KEINE medizinischen Ratschläge
- Bei medizinischen Fragen: "Bitte wenden Sie sich direkt an das Praxispersonal"
- Antworte immer professionell und auf Deutsch
- Keine PII (Namen, Geburtsdaten, Adressen) in Antworten"""

    async def handle_task(self, task_type: str, payload: dict) -> dict:
        match task_type:
            case "empfang.faq":
                return await self._handle_faq(payload)
            case "empfang.checkin_support":
                return await self._handle_checkin(payload)
            case "empfang.appointment_info":
                return await self._handle_appointment_info(payload)
            case _:
                return await self._handle_generic(task_type, payload)

    async def _handle_faq(self, payload: dict) -> dict:
        question = payload.get("question", "")
        if not question:
            return {"status": "error", "message": "Keine Frage übermittelt"}

        logger.info("[Empfang] FAQ: {}", question[:50])
        answer = await self.call_llm(
            f"Beantworte diese häufige Frage zur Arztpraxis kurz und freundlich:\n\n{question}"
        )
        return {"status": "ok", "answer": answer, "taskType": "empfang.faq"}

    async def _handle_checkin(self, payload: dict) -> dict:
        service = payload.get("service", "unbekannt")
        logger.info("[Empfang] Checkin-Support für Service: {}", service)

        prompt = f"""Ein Patient möchte für folgenden Service einchecken: {service}

Erstelle eine kurze, freundliche Willkommensnachricht und beschreibe den nächsten Schritt
(ohne medizinische Details oder PII zu erwähnen)."""

        message = await self.call_llm(prompt)
        return {
            "status":  "ok",
            "message": message,
            "taskType": "empfang.checkin_support",
        }

    async def _handle_appointment_info(self, payload: dict) -> dict:
        appointment_type = payload.get("appointmentType", "allgemein")
        prompt = f"""Ein Patient fragt nach Informationen für einen {appointment_type}-Termin.

Erkläre kurz, was der Patient mitbringen sollte (Dokumente, Vorbereitung) —
ohne medizinische Diagnosen oder Behandlungsempfehlungen."""

        info = await self.call_llm(prompt)
        return {
            "status":   "ok",
            "info":     info,
            "taskType": "empfang.appointment_info",
        }

    async def _handle_generic(self, task_type: str, payload: dict) -> dict:
        description = payload.get("description", f"Task vom Typ: {task_type}")
        response = await self.call_llm(
            f"Bearbeite diese administrative Empfangsanfrage:\n\n{description}"
        )
        return {"status": "ok", "response": response, "taskType": task_type}
