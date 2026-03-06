"""
Abrechnungs-Agent — Unterstützt bei administrativen Abrechnungsaufgaben.
GOÄ-Informationen, IGeL-Leistungen, Mahnwesen-Unterstützung.

WICHTIG: Kein Direktzugriff auf Patientendaten — nur anonymisierte Task-Daten.
"""

from loguru import logger
from agents.base_agent import BaseAgent


class AbrechnungsAgent(BaseAgent):
    name         = "abrechnung"
    display_name = "Abrechnungs-Agent"
    description  = "GOÄ-Informationen, IGeL-Leistungen, Mahnwesen-Unterstützung"
    system_prompt = """Du bist der Abrechnungs-Assistent einer deutschen Arztpraxis.

Deine Aufgaben:
- GOÄ-Ziffern zu Leistungsbeschreibungen vorschlagen
- IGeL-Leistungen erklären und beschreiben
- Abrechnungs-FAQs beantworten
- Mahnwesen-Texte formulieren

STRIKTE REGELN:
- Keine Patientendaten (PII) verarbeiten oder nennen
- Keine Diagnosen stellen
- GOÄ-Empfehlungen sind nur Vorschläge — finale Entscheidung beim Arzt
- Antworte immer auf Deutsch
- Bei Unsicherheit: "Bitte prüfen Sie mit dem behandelnden Arzt"

HINWEIS: Alle Vorschläge müssen von qualifiziertem Personal geprüft werden."""

    async def handle_task(self, task_type: str, payload: dict) -> dict:
        match task_type:
            case "abrechnung.goae_lookup":
                return await self._handle_goae_lookup(payload)
            case "abrechnung.igel_info":
                return await self._handle_igel_info(payload)
            case "abrechnung.mahnung":
                return await self._handle_mahnung(payload)
            case _:
                return await self._handle_generic(task_type, payload)

    async def _handle_goae_lookup(self, payload: dict) -> dict:
        leistung = payload.get("leistungsBeschreibung", "")
        if not leistung:
            return {"status": "error", "message": "Keine Leistungsbeschreibung angegeben"}

        logger.info("[Abrechnung] GOÄ-Lookup: {}", leistung[:50])
        prompt = f"""Welche GOÄ-Ziffer(n) passen zu dieser ärztlichen Leistung:

"{leistung}"

Antworte mit:
- Empfohlene GOÄ-Ziffer(n)
- Kurze Begründung
- Hinweis: Finale Entscheidung liegt beim Arzt

Format: Strukturierter Text, kein JSON."""

        suggestion = await self.call_llm(prompt)
        return {
            "status":     "ok",
            "suggestion": suggestion,
            "disclaimer": "Vorschlag des KI-Systems — Pflichtprüfung durch Arzt erforderlich",
            "taskType":   "abrechnung.goae_lookup",
        }

    async def _handle_igel_info(self, payload: dict) -> dict:
        leistung = payload.get("leistung", "")
        prompt = f"""Erkläre diese IGeL-Leistung kurz und patientenverständlich:

"{leistung}"

Inhalt: Was ist es, warum wird es angeboten, was kostet es typischerweise (Bereich).
Keine medizinischen Diagnosen."""

        info = await self.call_llm(prompt)
        return {"status": "ok", "info": info, "taskType": "abrechnung.igel_info"}

    async def _handle_mahnung(self, payload: dict) -> dict:
        mahnung_stufe = payload.get("stufe", 1)
        betrag        = payload.get("betrag", "")
        prompt = f"""Formuliere einen professionellen deutschen Mahnbrief (Stufe {mahnung_stufe}).

Offener Betrag: {betrag} EUR
Ton: Professionell aber freundlich (Stufe 1) / Bestimmt (Stufe 2-3)

WICHTIG:
- Keine Patientennamen einfügen (Platzhalter [Name] verwenden)
- Rechnungsnummer als [Rechnungsnr.] angeben
- Standard-Praxis-Mahnbrief"""

        text = await self.call_llm(prompt)
        return {
            "status":   "ok",
            "text":     text,
            "stufe":    mahnung_stufe,
            "taskType": "abrechnung.mahnung",
        }

    async def _handle_generic(self, task_type: str, payload: dict) -> dict:
        description = payload.get("description", f"Abrechnungstask: {task_type}")
        response = await self.call_llm(
            f"Bearbeite diese administrative Abrechnungsanfrage:\n\n{description}"
        )
        return {"status": "ok", "response": response, "taskType": task_type}
