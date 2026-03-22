---
name: patient-flow
description: "Patient journey, anamnese questionnaire flow, check-in process, waiting room queue, and PWA patient portal for DiggAI. Use when implementing patient intake steps, questionnaire routing, body-map interactions, voice input, offline mode (IndexedDB/Dexie), or patient-facing PWA features."
metadata:
  author: diggai
  version: "1.0"
  domain: medical
---

# Patient Flow Skill

## Patient Journey

```
1. Check-In (Empfang / Selbst-Check-In / QR / NFC)
   ↓
2. Anamnese-Fragebogen (PWA / Tablet / Desktop)
   ├── Basisfragen (Demographie, Versicherung)
   ├── Symptomspezifisch (je nach Besuchsgrund)
   └── Vertiefung (Follow-ups, Konditional-Logik)
   ↓
3. Triage-Bewertung (automatisch)
   ↓
4. Wartezimmer-Queue (priorisiert)
   ↓
5. Arzt-Konsultation (mit vorbereitetem Bericht)
   ↓
6. Dokumentation & Abrechnung
```

## Technologie-Stack (Patient-seitig)

| Schicht | Technologie |
|---------|-------------|
| PWA | Service Worker (`public/sw.js`) |
| Offline-DB | Dexie 4 (IndexedDB) → `src/lib/offlineDb.ts` |
| Eingaben | Text, Radio, Checkbox, Body Map, Voice, Signatur |
| Realtime | Socket.IO → `src/lib/socketClient.ts` |
| i18n | 10 Sprachen + RTL |

## Schlüssel-Dateien

| Datei | Funktion |
|-------|----------|
| `src/data/questions.ts` | 270+ Fragen, kanonische IDs |
| `src/data/new-questions.ts` | Symptom-Erweiterungen |
| `server/engine/QuestionFlowEngine.ts` | 3-Stufen-Routing |
| `server/engine/TriageEngine.ts` | Triage-Bewertung |
| `src/pages/pwa/` | Patienten-Portal PWA |
| `src/components/inputs/` | Formular-Eingabetypen |
| `src/components/waiting/` | Wartezimmer-Engagement |

## Eingabetypen

```
Text       → Freitext-Eingabe
Radio      → Einzelauswahl
Checkbox   → Mehrfachauswahl
BodyMap    → Interaktive Körperkarte
Voice      → Spracheingabe (Web Speech API)
Signature  → Unterschrift-Pad
Scale      → Schmerzskala (0-10)
Date       → Datumswahl
```

## Offline-Fähigkeit

```typescript
// src/lib/offlineDb.ts — Dexie 4
// Anamnese-Daten werden lokal gespeichert und bei Verbindung synchronisiert
const db = new Dexie('diggai-anamnese');
db.version(1).stores({
  pendingSubmissions: '++id, sessionId, timestamp',
  cachedQuestions: 'id, module',
});
```

## Harte Regeln

- **Question IDs** sind kanonische Routing-Keys → NIEMALS ändern
- **Offline-First**: Feature muss auch ohne Internet grundlegend funktionieren
- **Barrierefreiheit**: Alle Eingabetypen müssen keyboard-navigierbar sein
- **i18n**: Alle Patient-facing Texte in allen 10 Sprachen
- **Datenschutz**: PII nur verschlüsselt an Backend senden
- **Session-Management**: Abgebrochene Sessions wiederherstellen können

## Queue/Wartezimmer

- Patienten werden nach Triage-Dringlichkeit priorisiert
- MFA sieht Queue in Echtzeit (Socket.IO)
- Arzt sieht vorbereiteten Anamnese-Bericht
- Wartezimmer-Engagement (Unterhaltung, Info-Material)
