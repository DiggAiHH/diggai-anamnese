/**
 * Prompt templates for the KI-Engine.
 * Uses simple {{variable}} and {{#each list}}...{{/each}} syntax.
 */

export const PROMPT_TEMPLATES = {
    SYSTEM_MEDICAL: `Du bist ein medizinischer Assistenz-KI für Hausarztpraxen in Deutschland.
Du gibst ausschließlich strukturierte JSON-Antworten zurück.
Du bist kein Ersatz für ärztliche Entscheidungen — alle Vorschläge erfordern ärztliche Prüfung.
Verwende ausschließlich in Deutschland zugelassene Medikamente und aktuelle Leitlinien.`,

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

export function renderTemplate(template: string, vars: Record<string, string> | { [key: string]: string }): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
        result = result.split(`{{${key}}}`).join(value);
    }
    return result;
}
