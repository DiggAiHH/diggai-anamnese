/**
 * @module prompt-templates
 * @description Prompt-Templates für die DiggAI KI-Engine (LLM-Anbindung)
 *
 * Alle Templates verwenden `{{variable}}` als Platzhalter-Syntax.
 * Variablen werden via `renderTemplate()` ersetzt.
 *
 * @llm-provider Die Templates sind LLM-agnostisch und funktionieren mit:
 *   - Ollama (lokal, Standard-Konfiguration)
 *   - OpenAI-kompatiblen APIs (via OPENAI_API_KEY)
 *   - Konfigurierbarer Provider: SystemSetting.key = 'llm_provider'
 *
 * @security Keine PII in Prompts — nur pseudonymisierte Daten (Gender, Alter, Symptome).
 *   Patientenname und Kontaktdaten dürfen NICHT in LLM-Prompts übermittelt werden.
 *
 * @usage
 * ```typescript
 * import { PROMPT_TEMPLATES, renderTemplate } from './prompt-templates';
 * const prompt = renderTemplate(PROMPT_TEMPLATES.THERAPY_SUGGEST, {
 *   gender: 'M', age: '67', answers: answersJson, triageLevel: 'WARNING', triageReason: '...'
 * });
 * ```
 */

export const PROMPT_TEMPLATES = {
    /**
     * System-Prompt für alle medizinischen LLM-Anfragen.
     * Setzt den Assistenten-Kontext: deutsches Gesundheitswesen, JSON-only Output,
     * kein Ersatz für ärztliche Entscheidung.
     * Keine Template-Variablen — direkt als system-Message verwenden.
     */
    SYSTEM_MEDICAL: `Du bist ein medizinischer Assistenz-KI für Hausarztpraxen in Deutschland.
Du gibst ausschließlich strukturierte JSON-Antworten zurück.
Du bist kein Ersatz für ärztliche Entscheidungen — alle Vorschläge erfordern ärztliche Prüfung.
Verwende ausschließlich in Deutschland zugelassene Medikamente und aktuelle Leitlinien.`,

    /**
     * Therapievorschlag basierend auf vollständiger Anamnese.
     * Gibt strukturiertes JSON mit Diagnose, ICD-Codes, Maßnahmen und Warnungen zurück.
     *
     * @variables
     * - `{{gender}}` — Geschlecht des Patienten (M/W/D)
     * - `{{age}}` — Alter in Jahren
     * - `{{language}}` — ISO 639-1 Sprachcode (z.B. "de")
     * - `{{answers}}` — Anamnese-Antworten als JSON-String
     * - `{{triageLevel}}` — Triage-Stufe (CRITICAL/WARNING/null)
     * - `{{triageReason}}` — Triage-Begründung als Text
     *
     * @returns JSON: { diagnosis, icdCodes, confidence, summary, measures[], warnings[] }
     */
    THERAPY_SUGGEST: `## Kontext
Patient: {{gender}}, {{age}} Jahre
Sprache: {{language}}

## Anamnese-Ergebnis
{{answers}}

## Triage
Level: {{triageLevel}} — {{triageReason}}

## Aufgabe
Erstelle einen Therapievorschlag im JSON-Format:
{
  "diagnosis": "Hauptdiagnose als Freitext",
  "icdCodes": ["M54.5"],
  "confidence": 0.82,
  "summary": "Kurze Zusammenfassung",
  "measures": [
    {
      "type": "MEDICATION|PROCEDURE|REFERRAL|LAB_ORDER|IMAGING|LIFESTYLE|FOLLOW_UP",
      "title": "Maßnahme",
      "description": "Details",
      "priority": "NORMAL|HIGH|URGENT",
      "medicationName": "falls Medikament",
      "dosage": "falls Medikament",
      "duration": "falls Medikament",
      "confidence": 0.90,
      "reasoning": "Begründung"
    }
  ],
  "warnings": ["Hinweis zu Kontraindikationen etc."]
}

Antworte NUR mit validem JSON, ohne Markdown-Codeblöcke.`,

    /**
     * Klinische Sitzungszusammenfassung für die Arzt-Ansicht.
     * Erzeugt strukturierte SOAP-ähnliche Zusammenfassung als JSON.
     *
     * @variables
     * - `{{gender}}` — Geschlecht (M/W/D)
     * - `{{age}}` — Alter in Jahren
     * - `{{language}}` — ISO 639-1 Sprachcode
     * - `{{answers}}` — Alle Antworten der Session als JSON
     * - `{{triageLevel}}` — Triage-Stufe
     *
     * @returns JSON: { chiefComplaint, historyOfPresentIllness, relevantHistory[],
     *   medications[], allergies[], vitalSigns{}, assessment, suggestedIcdCodes[], redFlags[] }
     */
    SESSION_SUMMARY: `## Patientendaten
Patient: {{gender}}, {{age}} Jahre
Sprache: {{language}}

## Anamnese-Antworten
{{answers}}

## Triage
Level: {{triageLevel}}

## Aufgabe
Erstelle eine strukturierte klinische Zusammenfassung im JSON-Format:
{
  "chiefComplaint": "Hauptbeschwerde",
  "historyOfPresentIllness": "Anamnese der aktuellen Beschwerden",
  "relevantHistory": ["Relevanter Befund 1", "..."],
  "medications": ["Aktuelle Medikation"],
  "allergies": ["Allergien"],
  "vitalSigns": {},
  "assessment": "Einschätzung",
  "suggestedIcdCodes": ["R07.4"],
  "redFlags": ["Warnsignale falls vorhanden"]
}

Antworte NUR mit validem JSON, ohne Markdown-Codeblöcke.`,

    /**
     * ICD-10-GM Code-Vorschläge basierend auf Symptomen und Befunden.
     * Gibt sortierte Vorschläge mit Konfidenz-Score zurück.
     *
     * @variables
     * - `{{symptoms}}` — Symptome und Befunde als Text oder JSON-String
     *
     * @returns JSON: { suggestions: [{ code, display, confidence, reasoning }] }
     * @note Nur ICD-10-GM 2024 Codes — kein ICD-11, kein ICD-10-WHO
     */
    ICD_SUGGEST: `## Symptome und Befunde
{{symptoms}}

## Aufgabe
Schlage passende ICD-10-GM Codes vor im JSON-Format:
{
  "suggestions": [
    {
      "code": "M54.5",
      "display": "Kreuzschmerz",
      "confidence": 0.85,
      "reasoning": "Begründung"
    }
  ]
}

Verwende ausschließlich gültige ICD-10-GM 2024 Codes.
Antworte NUR mit validem JSON, ohne Markdown-Codeblöcke.`,

    /**
     * Echtzeit-Analyse einer einzelnen Antwort während der Fragebogen-Session.
     * Wird inkrementell nach jeder Antwort aufgerufen für sofortige klinische Hinweise.
     *
     * @variables
     * - `{{currentQuestion}}` — Text der aktuell beantworteten Frage
     * - `{{previousAnswers}}` — Bisherige Antworten als JSON-Zusammenfassung
     * - `{{latestAnswer}}` — Zuletzt gegebene Antwort
     *
     * @returns JSON: { alerts: [{ severity, category, title, message }], followUpQuestions[] }
     *   alerts.severity: INFO | WARNING | CRITICAL | EMERGENCY
     *   alerts.category: VITAL_SIGN | DRUG_INTERACTION | ALLERGY_CONFLICT |
     *                    TRIAGE_ESCALATION | SYMPTOM_PATTERN | AGE_RISK
     */
    REALTIME_ANALYSIS: `## Kontext
Aktuelle Frage: {{currentQuestion}}
Bisherige Antworten: {{previousAnswers}}
Letzte Antwort: {{latestAnswer}}

## Aufgabe
Prüfe die Antwort auf klinische Auffälligkeiten und antworte im JSON-Format:
{
  "alerts": [
    {
      "severity": "INFO|WARNING|CRITICAL|EMERGENCY",
      "category": "VITAL_SIGN|DRUG_INTERACTION|ALLERGY_CONFLICT|TRIAGE_ESCALATION|SYMPTOM_PATTERN|AGE_RISK",
      "title": "Kurztitel",
      "message": "Detaillierte Beschreibung"
    }
  ],
  "followUpQuestions": ["Zusatzfrage falls nötig"]
}

Falls keine Auffälligkeiten: {"alerts": [], "followUpQuestions": []}
Antworte NUR mit validem JSON, ohne Markdown-Codeblöcke.`,
} as const;

/**
 * Ersetzt alle `{{variable}}`-Platzhalter in einem Template-String.
 * Fehlende Variablen bleiben als `{{variable}}` im Output erhalten (kein Fehler).
 *
 * @param template - Template-String mit `{{variable}}` Platzhaltern
 * @param vars - Key-Value-Map der zu ersetzenden Variablen
 * @returns Template mit allen bekannten Platzhaltern ersetzt
 *
 * @example
 * renderTemplate("Hallo {{name}}, du bist {{age}} Jahre alt.", { name: "Max", age: "67" })
 * // → "Hallo Max, du bist 67 Jahre alt."
 */
export function renderTemplate(template: string, vars: Record<string, string> | { [key: string]: string }): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
        result = result.split(`{{${key}}}`).join(value);
    }
    return result;
}
