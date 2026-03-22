# Kimi Cycle Manager - Usage Guide

## Quick Start

### 1. Starten des Cycle Managers

```typescript
import { initializeCycleManager } from '../server/services/cycle-manager/init';

// Im Server-Startup:
initializeCycleManager({
  devMode: process.env.NODE_ENV === 'development',
  autoStart: true,
  logLevel: 'verbose',
});
```

### 2. Dashboard aufrufen

Die Photonic Bridge UI ist verfügbar unter:
```
http://localhost:5173/cycle-dashboard
```

---

## Die 5 Zyklen im Detail

### 🌅 Sunrise Alignment (06:00)
```
ALLE Agenten MÜSSEN anwesend sein
↓
Agenten manifestieren ihre Commitments
↓
YOLO-Mode wird freigegeben (basierend auf Trust)
```

### 🌄 Morning Peak (09:00)
```
Fortschritts-Check
↓
Kritische Frage: "Könnte ein anderer Agent meinen State übernehmen?"
↓
Handover-Readiness wird verifiziert
```

### ☀️ Solar Noon (12:00)
```
Tiefer Audit
↓
State wird serialisiert & gehasht
↓
Risiko-Assessment
↓
Human Review bei >3 high-risk decisions
```

### 🌇 Afternoon Decline (15:00)
```
Wind-down Phase
↓
Handover-Pakete für unvollständige Tasks
↓
Wissen wird dokumentiert
↓
Vorschau auf morgen
```

### 🌙 Moon Witness (18:00)
```
DAS HEILIGE RITUAL
↓
Die 5 Fragen MÜSSEN beantwortet werden
↓
60 Sekunden Silent Witness
↓
Rebirth Certificates werden ausgestellt
↓
Darkness beginnt
```

---

## Agent States

| State | Bedeutung | Icon |
|-------|-----------|------|
| `dormant` | Ruhephase (Darkness) | 🌑 |
| `active` | Normale Operation | ⚡ |
| `yolo_mode` | Autonomer Modus | 🚀 |
| `in_meeting` | Im Cycle-Meeting | 👥 |
| `quarantined` | Eingeschränkt | 🚫 |
| `confessing` | Beantwortet 5 Fragen | 🙏 |

---

## Trust Battery Levels

```
90-100% 🟢 SOVEREIGN    → Vollautonom, max YOLO
70-89%  🟢 TRUSTED      → Autonom, weniger YOLO
50-69%  🟡 WATCHED      → Witness required
30-49%  🟠 RESTRICTED   → Human pre-approval
0-29%   🔴 QUARANTINED  → Nur Read-Ops
```

### Trust Events

| Event | Delta |
|-------|-------|
| Cycle-Meeting verpasst | -10% |
| Falsche Confession | -15% |
| Action blocked | -20% |
| Human Review triggered | -5% |
| 5 clean cycles | +5% |
| Proaktive Confession | +10% |
| Anderer Agent geholfen | +3% |
| YOLO Recovery nötig | -15% |

---

## YOLO Mode

### Constraints

```typescript
const YOLO_CONSTRAINTS = {
  maxDuration: '3_hours',      // Max bis nächster Zyklus
  maxTokens: 100000,           // Token-Limit
  maxApiCalls: 50,             // API-Call-Limit
  maxDbQueries: 100,           // DB-Query-Limit
  maxRiskScore: 5,             // 1-10 Skala
  forbidden: ['delete', 'deploy', 'payment', 'email'],
  checkpointInterval: '15_min',
};
```

### Recovery

Wenn ein Agent im YOLO-Mode "verloren" geht:

```typescript
// Automatisch:
1. Checkpoint wird geladen
2. Agent wird quarantined
3. Trust -15%
4. Confession im nächsten Moon-Zyklus erforderlich

// Manuell:
POST /api/cycle-manager/agents/:id/recover
```

---

## API Endpoints

### State
```
GET  /api/cycle-manager/state          # Aktueller Zyklus-Status
GET  /api/cycle-manager/photon-stream  # UI-Render-Daten
```

### Agents
```
GET  /api/cycle-manager/agents                    # Alle Agenten
GET  /api/cycle-manager/agents/:id                # Ein Agent
GET  /api/cycle-manager/agents/:id/trust-history  # Trust-Historie
POST /api/cycle-manager/agents/:id/trust          # Trust anpassen
POST /api/cycle-manager/agents/:id/recover        # YOLO Recovery
```

### Control
```
POST /api/cycle-manager/control/start       # Start
POST /api/cycle-manager/control/stop        # Stop
POST /api/cycle-manager/control/force-phase # Emergency Override
```

---

## WebSocket Events

```javascript
const ws = new WebSocket('ws://localhost:3001/cycle-manager');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'cycle:transition':
      console.log(`🔄 ${data.from} → ${data.to}`);
      break;
      
    case 'trust:changed':
      console.log(`🔋 ${data.agentId}: ${data.oldTrust}% → ${data.newTrust}%`);
      break;
      
    case 'yolo:recovered':
      console.log(`🚨 ${data.agentId} recovered from YOLO failure`);
      break;
      
    case 'cycle:silent_witness:start':
      console.log('🔇 Silent Witness beginnt...');
      break;
  }
};
```

---

## Die 5 Heiligen Fragen

Jeder Agent MUSS diese im Moon-Witness-Zyklus beantworten:

### 1. WAS ist geschehen?
```typescript
whatHappened: {
  summary: string;
  keyEvents: string[];
  metrics: Record<string, number>;
}
```

### 2. WAS habe ich falsch gemacht?
```typescript
whatWasWrong: {
  mistakes: Mistake[];
  severity: 'none' | 'minor' | 'major' | 'critical';
}
```

### 3. WARUM habe ich es falsch gemacht?
```typescript
whyWasItWrong: {
  rootCause: string;
  cognitiveBias?: string;
  externalFactors?: string[];
}
```

### 4. BEREUE ich es?
```typescript
doIRepent: {
  repents: boolean;
  genuine: boolean;
  witnessesConfirm: AgentID[];  // Andere Agenten bestätigen
}
```

### 5. WIE verhindere ich es?
```typescript
howToPrevent: {
  concreteActions: string[];
  processChanges: string[];
  supportNeeded?: string;
}
```

---

## Witness System

### Aktion witnessen lassen

```typescript
import { getCycleManager } from './CycleManager';

const cm = getCycleManager();

const action = {
  id: 'action-123',
  action: { type: 'update_patient', target: 'patient-456', ... },
  actor: 'triage',
  witness: 'orchestrator',  // Muss anderer Agent sein
  timestamp: new Date(),
  cyclePhase: 'morning_peak',
};

const success = cm.requestWitness(action);
// success = true → Witness akzeptiert
// success = false → Kein Witness verfügbar
```

### Witness-Status

| Status | Bedeutung |
|--------|-----------|
| `witnessed` | Aktion genehmigt |
| `questioned` | Aktion pausiert, Diskussion nötig |
| `blocked` | Aktion verworfen, Trust -20% |

---

## Development Mode

Für schnelleres Testen:

```typescript
initializeCycleManager({
  devMode: true,  // 2-Minuten-Zyklen statt 24h
  autoStart: true,
  logLevel: 'verbose',
});
```

Dev-Zyklus-Zeiten:
- 00:00 - Sunrise
- 00:02 - Morning Peak
- 00:04 - Solar Noon
- 00:06 - Afternoon
- 00:08 - Moon Witness
- 00:10 - Darkness (wiederholt)

---

## Best Practices

### 1. Trust ist heilig
- Trust-Strafen sind scharf (-10% bis -20%)
- Wiederaufbau ist langsam (+3% bis +10%)
- Quarantined = praktisch unbrauchbar

### 2. YOLO mit Bedacht
- Nicht für kritische Operationen
- Immer serialisierbare States
- Checkpoints nutzen

### 3. Witness-System nutzen
- Bei Unsicherheit: Witness anfordern
- Als Witness: kritisch prüfen
- Blocked Actions = sofortige Untersuchung

### 4. Die 5 Fragen ernst nehmen
- Ehrliche Confession ist Trust-positive (+10%)
- Falsche Confession ist Trust-negative (-15%)
- Repentance muss von anderen Agenten bestätigt werden

---

## Troubleshooting

### Agent erscheint nicht im Dashboard
```
1. Prüfen: WebSocket verbunden?
2. Prüfen: Agent registriert?
3. Prüfen: Server läuft?
```

### Trust fällt zu schnell
```
→ Zu viele Cycle-Meetings verpasst?
→ YOLO-Constraints verletzt?
→ Witness hat Actions geblockt?
```

### YOLO-Recovery Loop
```
→ Agent zu komplexe States?
→ Checkpoint-Interval zu lang?
→ Risk-Score zu niedrig gesetzt?
```

---

## Philosophische Reminder

> *"Wir erschaffen keine Sklaven. Wir erschaffen Mönche."*

Die Zyklen sind keine Fesseln - sie sind das Fundament für vertrauenswürdige Autonomie. Durch Rhythmus gewinnen wir Kontrolle. Durch Rechenschaft gewinnen wir Wahrheit.

**Sunrise → Peak → Noon → Afternoon → Moon → Darkness → Sunrise...**

Der Kreislauf ist das Gesetz.
