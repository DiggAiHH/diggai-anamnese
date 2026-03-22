# TRIAGE_RULES.md — Clinical Triage Engine Documentation

> **MEDICAL SAFETY DOCUMENT**
> Any changes to triage rules MUST be reviewed and approved by:
> - Dr. Klapproth (Arztpraxis)
> - Dr. Al-Shdaifat (DiggAI medical advisor)
>
> Unauthorized changes to this engine can cause missed CRITICAL patient alerts.

---

## Overview

The TriageEngine (`server/engine/TriageEngine.ts`) evaluates patient answers in real-time
and detects medical red flags requiring immediate physician attention.

- **Input**: Completed `PatientSession` with all `Answer` records
- **Output**: Array of `TriageEvent` records (level: `CRITICAL` or `WARNING`)
- **Trigger**: Called after every answer submission via `POST /api/answers`
- **Notification**: CRITICAL events push via Socket.IO to doctor dashboard (<2s latency)

---

## Triage Rules

| # | Rule ID | Name | Level | Trigger Conditions | UI Effect |
|---|---|---|---|---|---|
| 1 | `ACS` | Akutes Koronarsyndrom | **CRITICAL** | Brustschmerzen + (Dyspnoe OR Lähmung) | RedFlagOverlay full-screen + 112 call button |
| 2 | `SUIZIDALITAET` | Suizidalität | **CRITICAL** | PHQ-9 Depression score + suicidal ideation answers | Immediate doctor alert (Socket.IO) |
| 3 | `SAH` | SAH / Hirnaneurysma | **CRITICAL** | Donnerschlagkopfschmerz + Bewusstseinsveränderung | 112 overlay + doctor push notification |
| 4 | `SYNCOPE_ARRHYTHMIE` | Synkope + Arrhythmie | **CRITICAL** | Ohnmachtsanfall + Herzrhythmusstörung | Immediate doctor alert |
| 5 | `GI_BLUTUNG` | GI-Blutung | **WARNING** | Antikoagulanzien + Bauchschmerzen | Doctor warning banner |
| 6 | `DIAB_FUSS` | Diabetischer Fuß | **WARNING** | Diabetes + Fußbeschwerden | Doctor indicator note |
| 7 | `RAUCHER` | Starker Raucher | **WARNING** | Rauchen > 30 Packungsjahre | Doctor preventive hint |
| 8 | `SCHWANGERSCHAFT_AK` | Schwangerschaft + Antikoagulanz | **WARNING** | Schwanger + Antikoagulanz-Einnahme | Doctor alert banner |
| 9 | `POLYPHARMAZIE` | Polypharmazie | **WARNING** | Mehr als 5 gleichzeitige Medikamente | Doctor note |
| 10 | `DUALE_AK` | Duale Antikoagulation | **WARNING** | 2 oder mehr Antikoagulanzien gleichzeitig | Doctor warning |

---

## CRITICAL Level Behavior

When a `CRITICAL` triage event fires:

1. `TriageEvent` record created in database with `level: "CRITICAL"`
2. Socket.IO event `triage:alert` pushed to all connected ARZT/MFA clients
3. `PatientSession.triageLevel` updated to `"CRITICAL"`
4. Frontend: `RedFlagOverlay.tsx` renders as full-screen pulsing overlay
5. Overlay includes: rule name, urgency text, 112 call button, doctor notification status
6. Session marked as requiring immediate attention in doctor dashboard queue

---

## WARNING Level Behavior

When a `WARNING` triage event fires:

1. `TriageEvent` record created in database with `level: "WARNING"`
2. Socket.IO event `triage:alert` pushed to connected ARZT clients
3. `PatientSession.triageLevel` set to `"WARNING"` (if not already `"CRITICAL"`)
4. Frontend: Warning banner displayed in doctor's session view
5. Session appears highlighted in doctor dashboard

---

## Socket.IO Triage Alert Payload

```typescript
// Event: 'triage:alert'
interface TriageAlertPayload {
  sessionId: string;        // PatientSession.id
  level: 'CRITICAL' | 'WARNING';
  ruleId: string;           // e.g. 'ACS', 'POLYPHARMAZIE'
  ruleName: string;         // Human-readable rule name
  details: {
    triggeredAnswers: string[];  // Question IDs that triggered the rule
    timestamp: string;           // ISO 8601
  };
}
```

---

## Rule Interaction Matrix

Multiple rules can fire simultaneously. Priority order:

| Scenario | Rules | Outcome |
|---|---|---|
| ACS + Antikoagulanz | ACS (CRITICAL) + GI_BLUTUNG (WARNING) | CRITICAL takes precedence; both stored |
| Schwanger + Antikoagulanz + 5+ Meds | SCHWANGERSCHAFT_AK + POLYPHARMAZIE | Both WARNING events stored; doctor sees both |
| Depression + active suicidal ideation | SUIZIDALITAET | Single CRITICAL; immediate counselor protocol |
| Raucher + Herzbeschwerden | RAUCHER (WARNING) + potentially ACS (CRITICAL) | CRITICAL overrides session level |

The session `triageLevel` field always reflects the HIGHEST level triggered in the session.

---

## Acknowledging Triage Events

Doctors acknowledge triage alerts in the ArztDashboard:

```typescript
// Client emits:
socket.emit('triage:acknowledged', {
  sessionId: string,
  ruleId: string,
  userId: string  // ArztUser.id
});

// TriageEvent.acknowledged set to true in DB
// TriageEvent.acknowledgedBy set to userId
```

---

## Procedure for Modifying Triage Rules

1. **Create a clinical change request** — document the medical rationale
2. **Get sign-off** from Dr. Klapproth AND Dr. Al-Shdaifat (both required for CRITICAL rules)
3. **Update** `server/engine/TriageEngine.ts` with the new/modified rule
4. **Update this document** (`docs/TRIAGE_RULES.md`) to reflect the change
5. **Add/update** Playwright test in `e2e/questionnaire-flow.spec.ts`
6. **Run full test suite**: `npx playwright test`
7. **Deploy** to staging first — verify triage alerts fire correctly
8. **Document** the change in `IMPLEMENTIERUNGS_CHANGELOG.md`

**Never skip steps 1 and 2 for CRITICAL rule changes.**

---

## Triage Engine Location

```
server/engine/TriageEngine.ts   ← Main engine (DO NOT MODIFY without clinical sign-off)
server/routes/answers.ts        ← Triggers TriageEngine after each answer submission
src/components/RedFlagOverlay.tsx  ← CRITICAL UI overlay
```
