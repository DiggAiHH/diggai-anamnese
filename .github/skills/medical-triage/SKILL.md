---
name: medical-triage
description: "Clinical triage rules, question flow routing, red-flag detection, and medical intake logic for DiggAI Anamnese. Use when modifying triage rules, question routing, symptom scoring, BG accident logic, pregnancy flows, or any medically sensitive intake behavior. CRITICAL: Changes require clinical approval."
metadata:
  author: diggai
  version: "1.0"
  domain: medical
---

# Medical Triage Skill

## WARNUNG

**Änderungen an Triage-Logik erfordern klinische Freigabe** durch Dr. Klapproth oder Dr. Al-Shdaifat.
Jede Änderung kann Patientensicherheit beeinflussen.

## Kritische Dateien

| Datei | Risiko | Beschreibung |
|-------|--------|--------------|
| `server/engine/TriageEngine.ts` | KRITISCH | 10 klinische Triage-Regeln, Red-Flag-Erkennung |
| `server/engine/QuestionFlowEngine.ts` | HOCH | 3-Stufen-Routing-Logik, implizite Abhängigkeiten |
| `src/data/questions.ts` | HOCH | 270+ Fragen, kanonische IDs = Routing-Keys |
| `src/data/new-questions.ts` | MITTEL | Symptom-Erweiterungen |

## Architektur

```
Patient-Eingabe
    ↓
QuestionFlowEngine (3 Stufen)
    ├── Stufe 1: Basisfragen (Demographie, Versicherung)
    ├── Stufe 2: Symptomspezifisch (je nach Besuchsgrund)
    └── Stufe 3: Vertiefung (Follow-ups, Konditional-Logik)
    ↓
TriageEngine (10 Regeln)
    ├── Red Flags → Sofortige Eskalation
    ├── Scoring → Dringlichkeitsstufe
    └── Queue-Priorisierung
    ↓
Arzt-Dashboard (priorisierte Patientenliste)
```

## Harte Regeln

1. **Question IDs sind kanonisch** — NIEMALS neu nummerieren oder löschen
2. **Red-Flag-Logik darf nicht abgeschwächt werden** durch UX-/Refactoring-Änderungen
3. **Alle Triage-Checks gehen durch `TriageEngine.ts`** — keine Inline-Triage in Routen
4. **Alle Fragen-Routing geht durch `QuestionFlowEngine.ts`**
5. **BG-Unfall, Schwangerschaft, Notfall** = Sonderpfade, immer respektieren
6. **Triage-Latenz unter 2 Sekunden** halten
7. **Medizinische Pflichtfelder** dürfen nicht optional werden

## Prüfmatrix vor Änderungen

- [ ] Verändert die Änderung Triage-Auslösung oder Priorisierung?
- [ ] Bleiben medizinische Pflichtfelder vollständig?
- [ ] Sind Follow-up-Fragen fachlich korrekt eingebunden?
- [ ] Werden Sonderfälle (BG, Schwangerschaft, Notfall) korrekt erkannt?
- [ ] Passen Datenmodell und UI-Flow zueinander?
- [ ] Ist die Änderung klinisch genehmigt?

## Frage-Routing-Patterns

```typescript
// Kanonische Question-ID Referenz
// NIEMALS IDs ändern — sie sind System-weite Routing-Keys
const question = {
  id: "q_pain_location",     // Kanonisch! Nie ändern!
  module: "schmerz",
  type: "body_map",
  required: true,
  followUps: ["q_pain_intensity", "q_pain_duration"]
};
```

## Triage-Stufen

| Stufe | Name | Bedeutung | Reaktionszeit |
|-------|------|-----------|---------------|
| 1 | Notfall | Lebensbedrohlich | Sofort |
| 2 | Dringend | Hohes Risiko | < 15 min |
| 3 | Normal | Standard | < 60 min |
| 4 | Niedrig | Routine | Planbar |
| 5 | Elektiv | Vorsorge/Beratung | Nächster Termin |
