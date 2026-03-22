# useApi Modularisierung

Dieses Verzeichnis enthält die modularisierten API-Hooks für die DiggAI Anamnese Platform.

## Übersicht

Die ursprüngliche `useApi.ts` (1598 Zeilen) wurde in domain-spezifische Module aufgeteilt:

```
src/hooks/useApi/
├── index.ts              # Barrel-Export (Abwärtskompatibilität)
├── types.ts              # Gemeinsame TypeScript-Typen
├── utils.ts              # Hilfsfunktionen (getErrorMessage, etc.)
├── config.ts             # API-Konfiguration und Query-Defaults
├── usePatientApi.ts      # Patient/Session/Antworten (19 Hooks)
├── useAuthApi.ts         # Authentifizierung (2 Hooks)
├── useStaffApi.ts        # Arzt/MFA/Queue/Content (24 Hooks)
├── useAdminApi.ts        # Admin/ROI/Wunschbox/Atoms (37 Hooks)
├── usePVSApi.ts          # PVS/FHIR Integration (24 Hooks)
├── useTherapyApi.ts      # Therapieplanung/AI (27 Hooks)
├── usePwaApi.ts          # Patienten-Portal (35 Hooks)
└── useSystemApi.ts       # System/TI/NFC/Flow/etc. (94 Hooks)
```

## Verwendung

### Abwärtskompatibel (bestehender Code)

```typescript
import { useCreateSession, useArztSessions } from './hooks/useApi';
// oder
import * as api from './hooks/useApi';
```

### Tree-Shaking optimiert (empfohlen für neuen Code)

```typescript
import { useCreateSession } from './hooks/useApi/usePatientApi';
import { useArztSessions } from './hooks/useApi/useStaffApi';
import { useAdminStats } from './hooks/useApi/useAdminApi';
```

## Domain-Übersicht

| Modul | Hooks | Beschreibung |
|-------|-------|--------------|
| `usePatientApi` | 19 | Session-Verwaltung, Antworten, Medikamente, OPs |
| `useAuthApi` | 2 | QR-Token, Login |
| `useStaffApi` | 24 | Arzt/MFA Dashboard, Queue, Chat, Waiting Content |
| `useAdminApi` | 37 | Stats, Users, Permissions, ROI, Wunschbox, Atoms |
| `usePVSApi` | 24 | PVS-Verbindungen, Import/Export, Mappings |
| `useTherapyApi` | 27 | Therapiepläne, Maßnahmen, Alerts, AI |
| `usePwaApi` | 35 | Patienten-Portal: Diary, Messages, Appointments |
| `useSystemApi` | 94 | System, TI, NFC, Flow, Payment, Avatar, etc. |

## Gemeinsame Utilities

### getErrorMessage

Extrahiert Fehlermeldungen aus API-Errors:

```typescript
import { getErrorMessage } from './hooks/useApi';

const errorMessage = getErrorMessage(error, 'Verbindungsfehler');
```

### STALE_TIME

Standard-Stale-Time-Werte für React Query:

```typescript
import { STALE_TIME } from './hooks/useApi';

staleTime: STALE_TIME.SLOW  // 5 Minuten
```

### REFETCH_INTERVAL

Standard-Polling-Intervalle:

```typescript
import { REFETCH_INTERVAL } from './hooks/useApi';

refetchInterval: REFETCH_INTERVAL.FAST  // 10 Sekunden
```

## Typen

Alle gemeinsamen Typen sind in `types.ts` definiert:

```typescript
import type { 
    CreateSessionPayload, 
    SubmitAnswerPayload,
    TriageAlert,
    TherapyPlan 
} from './hooks/useApi';
```

## Migration

Bestehender Code funktioniert ohne Änderungen weiterhin, da der Barrel-Export alle Hooks exportiert.

Für bessere Bundle-Größe empfehlen wir schrittweise:

1. Importe vom Barrel-Export auf direkte Datei-Imports umstellen
2. Nur benötigte Hooks importieren
3. Dead Code eliminieren

Beispiel-Migration:

```typescript
// Alt (funktioniert weiterhin)
import { useCreateSession, useArztSessions } from './hooks/useApi';

// Neu (empfohlen für besseres Tree-Shaking)
import { useCreateSession } from './hooks/useApi/usePatientApi';
import { useArztSessions } from './hooks/useApi/useStaffApi';
```

## Statistik

- **Gesamt Hooks**: 264
- **Original-Datei**: 1598 Zeilen
- **Modularisiert**: 11 Dateien (~100 Zeilen/Durchschnitt)
- **Größte Datei**: useSystemApi.ts (94 Hooks)
