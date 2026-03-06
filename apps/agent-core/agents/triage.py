"""
Triage-Agent — Bewertet die administrative Dringlichkeit von Anfragen.

KRITISCH: Dieser Agent stellt KEINE medizinischen Diagnosen.
Er bewertet nur die administrative Priorität (Termin-Dringlichkeit).
Medizinische Entscheidungen treffen immer qualifizierte Ärzte!
"""

from loguru import logger
from agents.base_agent import BaseAgent


class TriageAgent(BaseAgent):
    name         = "triage"
    display_name = "Triage-Agent"
    description  = "Administrative Prioritätsbewertung von Anfragen (KEINE Diagnosen)"
    system_prompt = """Du bist der administrative Triage-Assistent einer deutschen Arztpraxis.

DEINE EINZIGE AUFGABE:
Bewerte die ADMINISTRATIVE DRINGLICHKEIT einer Terminanfrage auf einer Skala:
- SOFORT: Termin innerhalb von Stunden nötig (z.B. akute starke Schmerzen → Arzt entscheidet)
- DRINGEND: Termin innerhalb von 1-2 Tagen
- NORMAL: Regulärer Termin ausreichend
- WARTELISTE: Kann auf nächsten freien Termin warten

STRIKTE VERBOTE:
- Stelle KEINE Diagnosen
- Gib KEINE Behandlungsempfehlungen
- Sage NICHT "das klingt nach X" (medizinische Einordnung)
- Bei Lebensbedrohung: IMMER "Bitte rufen Sie sofort 112 an!" ausgeben

DEIN OUTPUT ist NUR für die interne Terminplanung der Praxis.
Jede Einschätzung wird von Praxispersonal überprüft."""

    async def handle_task(self, task_type: str, payload: dict) -> dict:
        match task_type:
            case "triage.bewertung":
                return await self._handle_bewertung(payload)
            case "triage.eskalation_check":
                return await self._handle_eskalation(payload)
            case _:
                return await self._handle_generic(task_type, payload)

    async def _handle_bewertung(self, payload: dict) -> dict:
        anfrage = payload.get("anfrage", "")
        if not anfrage:
            return {"status": "error", "message": "Keine Anfrage übermittelt"}

        # Sicherheitscheck: Enthält die Anfrage Notfallsignale?
        notfall_keywords = [
            "bewusstlos", "ohnmacht", "herzstillstand", "atemnot", "schlaganfall",
            "nicht atmen", "starke brustschmerzen", "brust schmerz", "kollabiert",
            "vergiftung", "suizid", "selbstmord", "notfall"
        ]
        anfrage_lower = anfrage.lower()
        if any(kw in anfrage_lower for kw in notfall_keywords):
            return {
                "status":       "NOTFALL",
                "prioritaet":   "SOFORT",
                "nachricht":    "NOTFALL erkannt! Bitte sofort 112 anrufen. Diese Anfrage wurde an das Praxispersonal eskaliert.",
                "humanReview":  True,
                "taskType":     "triage.bewertung",
            }

        logger.info("[Triage] Bewerte Anfrage (Länge: {} Zeichen)", len(anfrage))

        prompt = f"""Bewerte die administrative Dringlichkeit dieser Terminanfrage.
Antworte NUR mit einem JSON-Objekt.

Anfrage: "{anfrage}"

Format:
{{
  "prioritaet": "SOFORT|DRINGEND|NORMAL|WARTELISTE",
  "begruendung": "kurze administrative Begründung (max. 2 Sätze)",
  "humanReview": true/false,
  "wartezeit_empfehlung": "z.B. innerhalb von 24h"
}}

WICHTIG: Keine medizinischen Diagnosen in der Begründung!"""

        import json
        try:
            llm_response = await self.call_llm(prompt)
            # JSON aus der Antwort extrahieren
            start = llm_response.find("{")
            end   = llm_response.rfind("}") + 1
            if start >= 0 and end > start:
                result = json.loads(llm_response[start:end])
            else:
                raise ValueError("Kein JSON in Antwort")

            return {
                "status":   "ok",
                "taskType": "triage.bewertung",
                **result,
            }
        except Exception as e:
            logger.warning("[Triage] JSON-Parse-Fehler: {} — Fallback auf NORMAL", e)
            return {
                "status":       "ok",
                "prioritaet":   "NORMAL",
                "begruendung":  "Automatische Bewertung nicht möglich — bitte manuell prüfen",
                "humanReview":  True,
                "taskType":     "triage.bewertung",
            }

    async def _handle_eskalation(self, payload: dict) -> dict:
        """Prüft ob ein laufender Task eskaliert werden muss."""
        kontext = payload.get("kontext", "")
        prompt = f"""Muss dieser administrative Vorgang eskaliert werden?

Kontext: "{kontext}"

Antworte mit: JA (+ Grund) oder NEIN"""

        eskalieren = await self.call_llm(prompt)
        return {
            "status":      "ok",
            "eskalieren":  eskalieren.upper().startswith("JA"),
            "begruendung": eskalieren,
            "humanReview": eskalieren.upper().startswith("JA"),
            "taskType":    "triage.eskalation_check",
        }

    async def _handle_generic(self, task_type: str, payload: dict) -> dict:
        return {
            "status":      "ok",
            "prioritaet":  "NORMAL",
            "humanReview": True,
            "begruendung": f"Unbekannter Triage-Task-Typ: {task_type}",
            "taskType":    task_type,
        }
