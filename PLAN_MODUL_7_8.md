# PLAN Modul 7 & 8 — NFC-Praxis-Ökosystem & Advanced Patient Experience

> **Prompt 1c2** — Detaillierter Implementierungsplan  
> **Erstellt:** 2026-03-04  
> **Status:** FINAL  
> **Abhängigkeiten:** PLAN_MODUL_1_2.md, PLAN_MODUL_3_4.md, PLAN_MODUL_5_6.md

---

## Inhaltsverzeichnis

1. Executive Summary
2. Modul 7: NFC-Praxis-Ökosystem & TreatmentFlows
  - 2.1 NFC-Architektur
  - 2.2 TreatmentFlow-Engine
  - 2.3 Smart Routing & Navigation
  - 2.4 Checkout, Löschung, anonymes Feedback
  - 2.5 MFA-Kommunikation (WhatsApp-like)
  - 2.6 Praxis-Kiosk & Payment
3. Modul 8: Advanced Patient Experience
  - 3.1 Avatar- & Voice-System
  - 3.2 Voice/Video-Telemedizin
  - 3.3 Gamification & Bonusprogramme
  - 3.4 Formular-Builder & KI-Generator
  - 3.5 Private ePA (non-gematik)
  - 3.6 Anonymisierter Datenexport
4. Prisma-Schema Erweiterungen (vollständig)
5. API-Endpunkte
6. Frontend-Komponenten & Seiten
7. Socket.IO Event-Design
8. Integrationspunkte zu Modulen 1–6
9. Sicherheit, DSGVO, Compliance
10. Implementierungsreihenfolge (2g–2n)
11. Testplan
12. Migrationsstrategie

---

## 1. Executive Summary

Dieses Modul ergänzt DiggAI um ein **NFC-natives Praxis-Ökosystem** (Zero-Touch Check-in und stationäre TreatmentFlows) sowie eine **Advanced Experience-Schicht** (Avatar/Voice, Telemedizin, Gamification, Formular-KI, private ePA, anonymisierte Exporte).

Zielbild:
- Patient scannt NFC am Eingang → automatische Session-Zuordnung
- System führt den Patienten schrittweise durch Labor/EKG/Arzt/Checkout
- MFA/Arzt steuern Flows live via Dashboard + Chat/Broadcast
- Checkout enthält Payment, Löschoptionen, anonymes Feedback inkl. Eskalationslogik
- Erweiterte Patient Experience schafft höhere Bindung, bessere Verständlichkeit und höhere Completion-Rate

---

## 2. Modul 7: NFC-Praxis-Ökosystem & TreatmentFlows

### 2.1 NFC-Architektur

### Ziel
QR-Start wird um NFC erweitert. NFC ist der primäre „Ort-Trigger“ für Praxisstationen.

### NFC URL-Format

```ts
// In NFC Tag codiert:
// https://praxis.diggai.de/nfc/{locationId}?p={praxisId}&ts={unix}&sig={hmac}

interface NfcTapPayload {
  locationId: string;          // z.B. eingang, wartezimmer, labor-1, ekg-1, arzt-2, ausgang
  praxisId: string;
  timestamp: number;           // Replay-Schutz
  signature: string;           // HMAC-SHA256(locationId|praxisId|timestamp)
  optionalSessionHint?: string;
}
```

### Sicherheitsregeln
- HMAC-Signatur Pflicht
- Timestamp max. Drift: ±180 Sekunden
- Nonce-Blacklist (Redis) für 10 Minuten gegen Replay
- Inaktiv gesetzte Checkpoints (`isActive=false`) verwerfen

### Standorte
- Eingang
- Wartezimmer
- Labor
- EKG
- Behandlungszimmer 1..n
- Checkout / Ausgang

---

### 2.2 TreatmentFlow-Engine

### Ziel
Konfigurierbare Zustandsautomaten je Behandlungsfall.

### Flow-Prinzip
- Jede Session kann einen aktiven `TreatmentFlow` haben
- `FlowStep.order` bestimmt Sequenz
- Schrittwechsel durch NFC Tap oder MFA-Action
- Verzögerungen und Umleitungen werden live kommuniziert

### Beispiel „Allgemeinuntersuchung“
1. Eingang
2. Wartezimmer
3. Labor
4. EKG
5. Arztzimmer
6. Checkout

### Condition Logik
`FlowStep.condition` unterstützt JSON-Logik (z. B. Alter, Triagestufe, Versicherungsart), z. B.

```json
{
  "if": { ">=": [ {"var": "patient.age"}, 60 ] },
  "then": "include_step:ekg",
  "else": "skip_step:ekg"
}
```

---

### 2.3 Smart Routing & Navigation

### Ziele
- verständliche Raumführung ohne AR-Abhängigkeit
- sofortige Delay-Kommunikation

### Guidance-Typen
- Text: „Folgen Sie dem blauen Streifen bis Zimmer 3“
- Video: Kurze Erklärclips pro Station
- Farbcode: red/blue/green

### Live Updates
- `flow:step-changed`
- `flow:delay-update`
- `navigation:guide`

---

### 2.4 Checkout, Löschung, anonymes Feedback

### Checkout-NFC
Tap am Ausgang triggert `CheckoutWizard` mit 3 Pfaden:
1. Daten aufbewahren (z. B. 30 Tage)
2. Export (PDF/JSON)
3. Löschung (DSGVO-konform)

### Löschmodi
- **Soft Delete**: medizinisch notwendige Metadaten behalten, PII entfernt
- **Hard Delete**: vollständige Löschung inkl. Session-bezogener Inhalte

### Anonymes Feedback
- Sternbewertung 1–5
- Kategorien (Wartezeit, Kommunikation, Freundlichkeit, Organisation, Hygiene)
- Freitext

### Eskalationslogik („Strafrechtsschleuse“)
- lokale Keyword/NLU-Erkennung für Bedrohung
- Status: `NONE | REVIEW | PRAXIS_LEITUNG | EXTERNAL`
- niemals automatische Polizei-Weiterleitung
- vollständiger Audit-Trail

---

### 2.5 MFA-Kommunikation (WhatsApp-like)

### Ziel
Patienten in laufenden Flows aktiv steuern.

### Funktionen
- pro Session Chat
- Broadcast an Wartende
- Vorlagen je Flow-Schritt
- Voice-Messages (Phase 8)

### Vorlagenbeispiele
- „Bitte kommen Sie jetzt zu Labor 1.“
- „Der Arzt verspätet sich um 10 Minuten.“
- „Bitte halten Sie Ihre Versicherungskarte bereit.“

---

### 2.6 Praxis-Kiosk & Payment

### Kiosk-Modus
Erweiterung des bestehenden Fullscreen-Toggles zu echtem Kiosk:
- Auto-Reset nach Inaktivität
- Locked Route
- große Touch-Ziele
- vereinfachte Anzeige (Queue, Aufruf, Hinweise)

### Payment
Aktueller Mock wird in reale Zahlungs-Integration überführt:
- Zahlungsintent
- NFC Tap-to-Pay UI (Provider-abhängig)
- Receipt-Link
- PVS-Export-Hook (Modul 3)

---

## 3. Modul 8: Advanced Patient Experience

### 3.1 Avatar- & Voice-System

### Ziel
Digitaler Assistenz-Layer für Erklärungen und Guidance.

### Scope V1
- 2D-Avatar zuerst
- TTS multi-language
- Staff-spezifische Avatar-Konfiguration

### Scope V2
- Voice-Cloning (optional, explizite Einwilligung Mitarbeiter)
- 3D-Avatar Pipeline

---

### 3.2 Voice/Video-Telemedizin

### Ziel
Asynchrone + synchrone Kommunikation vor/nach Termin.

### Funktionen
- Symptom-Pre-Checkin
- Video/Voice-Sitzungen (WebRTC)
- optional Screen-Sharing
- optional Recording (separate Consent)

---

### 3.3 Gamification & Bonusprogramme

### Ziel
Mehr Completion, bessere Adhärenz, motivierteres Team.

### Team
- Achievements pro Mitarbeiter
- Leaderboards (daily/weekly/monthly)

### Patient
- Punktesystem für regelmäßige Vorsorge/Checks
- Streaks und Badges
- optional Kassen-/Bonus-Connector (spätere Phase)

---

### 3.4 Formular-Builder & KI-Generator

### Ziel
Praxis kann Formulare selbst bauen (oder aus Voice-Intent generieren).

### Features
- Drag&Drop Questions
- Conditional Logic
- Tag/Age-Filter
- KI-Formularvorschlag aus Prompt/Sprachinput
- Revisionshistorie + Publish Workflow

---

### 3.5 Private ePA (non-gematik)

### Ziel
Für Privatpatienten eigener Aktenbereich mit Freigaben.

### Features
- Dokumenttypen (Anamnese, Befund, Labor, OP)
- Share-Links mit Ablaufzeit
- Consent-Versionierung

---

### 3.6 Anonymisierter Datenexport

### Ziel
Patient kann strukturierte, anonymisierte Zusammenfassungen exportieren.

### Formate
- Markdown
- JSON
- optional PDF

### Inhalte
- Verlauf
- Medikation
- Eingriffe
- ohne direkte Identifikatoren

---

## 4. Prisma-Schema Erweiterungen (vollständig)

```prisma
model NfcCheckpoint {
  id           String   @id @default(uuid())
  locationId   String   @unique
  praxisId     String
  type         String   // ENTRANCE | WAITING | ROOM | LAB | CHECKOUT
  roomName     String?
  coordinates  Json?
  nfcUid       String   @unique
  secretRef    String?  // Referenz auf HMAC Secret Version
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  scans        NfcScan[]

  @@index([praxisId, type])
}

model NfcScan {
  id            String   @id @default(uuid())
  checkpointId  String
  checkpoint    NfcCheckpoint @relation(fields: [checkpointId], references: [id])
  sessionId     String?
  session       PatientSession? @relation(fields: [sessionId], references: [id])
  scannedAt     DateTime @default(now())
  deviceInfo    String?
  ipHash        String?
  scanStatus    String   @default("ACCEPTED") // ACCEPTED | REJECTED | REPLAY_BLOCKED
  rejectReason  String?

  @@index([sessionId, scannedAt])
  @@index([checkpointId, scannedAt])
}

model TreatmentFlow {
  id            String   @id @default(uuid())
  praxisId      String
  name          String
  description   String?
  serviceType   String?  // anamnese|prescription|...
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  steps         FlowStep[]
  progressItems PatientFlowProgress[]

  @@index([praxisId, isActive])
}

model FlowStep {
  id               String   @id @default(uuid())
  flowId           String
  flow             TreatmentFlow @relation(fields: [flowId], references: [id], onDelete: Cascade)
  order            Int
  type             String   // WAITING|REGISTRATION|LAB|EKG|CONSULTATION|CHECKOUT|PAYMENT
  roomType         String?
  specificRoomId   String?
  estimatedMinutes Int      @default(15)
  bufferMinutes    Int      @default(5)
  requiredStaff    String[]
  instructions     Json
  preparationVideo String?
  nfcCheckpointId  String?
  condition        String?
  isSkippable      Boolean  @default(true)

  @@index([flowId, order])
}

model PatientFlowProgress {
  id                  String   @id @default(uuid())
  sessionId           String   @unique
  session             PatientSession @relation(fields: [sessionId], references: [id])
  flowId              String
  flow                TreatmentFlow @relation(fields: [flowId], references: [id])
  currentStep         Int      @default(0)
  status              String   @default("ACTIVE") // ACTIVE|PAUSED|COMPLETED|CANCELLED
  stepHistory         Json[]
  estimatedCompletion DateTime?
  actualCompletion    DateTime?
  delayMinutes        Int      @default(0)
  delayReason         String?

  @@index([status])
}

model AnonymousFeedback {
  id               String   @id @default(uuid())
  praxisId         String
  sessionId        String?
  rating           Int
  text             String?
  categories       String[]
  containsThreats  Boolean  @default(false)
  threatKeywords   String[]
  escalationStatus String   @default("NONE") // NONE|REVIEW|PRAXIS_LEITUNG|EXTERNAL
  reviewedBy       String?
  reviewedAt       DateTime?
  createdAt        DateTime @default(now())

  @@index([praxisId, createdAt])
  @@index([containsThreats, escalationStatus])
}

model PraxisChatMessage {
  id           String   @id @default(uuid())
  sessionId    String
  senderType   String   // PATIENT|MFA|ARZT|SYSTEM
  senderId     String?
  contentType  String   // TEXT|VOICE|VIDEO|SYSTEM_NOTIFICATION
  content      String
  isTemplate   Boolean  @default(false)
  templateId   String?
  readAt       DateTime?
  createdAt    DateTime @default(now())

  @@index([sessionId, createdAt])
  @@index([senderType, createdAt])
}

model PaymentTransaction {
  id               String   @id @default(uuid())
  sessionId        String
  patientId        String
  amount           Float
  currency         String   @default("EUR")
  type             String   // SELBSTZAHLER|IGEL|PRIVAT|COPAYMENT
  status           String   @default("PENDING") // PENDING|COMPLETED|FAILED|REFUNDED
  paymentProvider  String
  providerIntentId String?
  nfcCardToken     String?
  receiptUrl       String?
  createdAt        DateTime @default(now())
  completedAt      DateTime?

  @@index([sessionId, status])
  @@index([patientId, createdAt])
}

model StaffAvatar {
  id                 String   @id @default(uuid())
  staffId            String   @unique
  staff              ArztUser @relation(fields: [staffId], references: [id])
  voiceCloneId       String?
  voiceSettings      Json?
  avatarUrl          String?
  avatarType         String   @default("2D") // 2D|3D|REAL_PHOTO
  supportedLanguages String[]
  accentSettings     Json?
  consentSignedAt    DateTime?
  isActive           Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model TelemedicineSession {
  id              String   @id @default(uuid())
  patientId       String
  staffId         String
  type            String   // VIDEO|VOICE|SCREEN_SHARE
  status          String   @default("SCHEDULED")
  scheduledAt     DateTime
  startedAt       DateTime?
  endedAt         DateTime?
  recordingConsent Boolean @default(false)
  recordingUrl    String?
  encryptionMeta  Json?
  createdAt       DateTime @default(now())

  @@index([patientId, scheduledAt])
  @@index([staffId, scheduledAt])
}

model StaffAchievement {
  id          String   @id @default(uuid())
  staffId     String
  type        String   // TASK_COMPLETED|PATIENT_RATING|SPEED_BONUS|ZERO_WAIT_DAY
  points      Int
  description String
  earnedAt    DateTime @default(now())

  @@index([staffId, earnedAt])
}

model StaffLeaderboard {
  id           String   @id @default(uuid())
  praxisId     String
  period       String   // DAILY|WEEKLY|MONTHLY
  staffId      String
  totalPoints  Int
  rank         Int
  calculatedAt DateTime @default(now())

  @@index([praxisId, period, calculatedAt])
}

model CustomForm {
  id           String   @id @default(uuid())
  praxisId     String
  createdBy    String
  name         String
  description  String?
  aiGenerated  Boolean  @default(false)
  aiPrompt     String?
  logic        Json
  questions    Json[]
  tags         String[]
  ageRange     Json?
  usageCount   Int      @default(0)
  isActive     Boolean  @default(true)
  version      Int      @default(1)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([praxisId, isActive])
}

model PrivateEPA {
  id              String   @id @default(uuid())
  patientId       String   @unique
  patient         Patient  @relation(fields: [patientId], references: [id])
  consentSignedAt DateTime?
  consentVersion  String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  documents       EpaDocument[]
  shares          EpaShare[]
}

model EpaDocument {
  id          String   @id @default(uuid())
  epaId       String
  epa         PrivateEPA @relation(fields: [epaId], references: [id], onDelete: Cascade)
  type        String   // ANAMNESE|BEFUND|LABOR|BILD|OP_BERICHT
  title       String
  content     String?
  fileUrl     String?
  createdBy   String
  createdAt   DateTime @default(now())
  validUntil  DateTime?

  @@index([epaId, createdAt])
}

model EpaShare {
  id            String   @id @default(uuid())
  epaId         String
  epa           PrivateEPA @relation(fields: [epaId], references: [id], onDelete: Cascade)
  sharedWith    String
  accessScope   String[]
  accessToken   String   @unique
  expiresAt     DateTime
  createdAt     DateTime @default(now())
  revokedAt     DateTime?

  @@index([epaId, expiresAt])
}

model AnonymizedExport {
  id          String   @id @default(uuid())
  patientId   String
  exportType  String   // FULL_HISTORY|LAST_VISIT|MEDICATION_PLAN
  content     String
  hash        String
  createdAt   DateTime @default(now())
  expiresAt   DateTime

  @@index([patientId, createdAt])
}
```

### Erweiterungen bestehender Modelle

```prisma
model Patient {
  // ... existing fields
  hasPrivateEPA Boolean @default(false)
  bonusPoints   Int     @default(0)
}

model PatientSession {
  // ... existing fields
  currentFlowId String?
  flowProgress  PatientFlowProgress?
}

model ArztUser {
  // ... existing fields
  avatar      StaffAvatar?
  // achievements relation via staffId in StaffAchievement
}
```

---

## 5. API-Endpunkte

### NFC & Flow
- `POST /api/nfc/scan`
- `GET /api/nfc/checkpoints`
- `POST /api/nfc/checkpoints`
- `PUT /api/nfc/checkpoints/:id`
- `GET /api/flows`
- `POST /api/flows`
- `PUT /api/flows/:id`
- `GET /api/flows/:id/progress/:sessionId`
- `POST /api/flows/advance`
- `POST /api/flows/delay`
- `POST /api/flows/call-patient`

### Checkout & Feedback
- `POST /api/checkout/:sessionId`
- `POST /api/checkout/:sessionId/delete-data`
- `POST /api/feedback/anonymous`
- `GET /api/feedback/threat-analysis` (admin)
- `POST /api/feedback/:id/escalate` (admin)

### Chat
- `GET /api/chat/:sessionId`
- `POST /api/chat/send`
- `POST /api/chat/broadcast`
- `POST /api/chat/template`

### Payment
- `POST /api/payment/intent`
- `POST /api/payment/nfc-charge`
- `POST /api/payment/webhook`
- `GET /api/payment/receipt/:id`

### Avatar/Voice
- `GET /api/avatar/:staffId`
- `PUT /api/avatar/:staffId`
- `POST /api/avatar/speak`
- `POST /api/avatar/clone/start`

### Telemedizin
- `POST /api/telemedicine/sessions`
- `GET /api/telemedicine/sessions/:id`
- `POST /api/telemedicine/sessions/:id/join`
- `POST /api/telemedicine/sessions/:id/end`

### Formular-Builder
- `GET /api/forms`
- `POST /api/forms`
- `PUT /api/forms/:id`
- `POST /api/forms/generate`
- `POST /api/forms/:id/submit`
- `GET /api/forms/stats`

### Private ePA & Export
- `GET /api/private-epa/:patientId`
- `POST /api/private-epa/:patientId/documents`
- `POST /api/private-epa/:patientId/shares`
- `POST /api/export/anonymized/:patientId`
- `GET /api/export/anonymized/:exportId`

---

## 6. Frontend-Komponenten & Seiten

```txt
src/
  pages/
    nfc/
      NfcLanding.tsx
      NfcStepView.tsx
    flows/
      TreatmentFlowBuilder.tsx
      PatientFlowLiveBoard.tsx
    checkout/
      CheckoutWizard.tsx
      AnonymousFeedbackForm.tsx
      DataDeletionConfirm.tsx
    kiosk/
      KioskDashboard.tsx
    telemedicine/
      TelemedicineRoom.tsx
      PreCheckinForm.tsx
    forms/
      FormBuilderPage.tsx
      FormRunnerPage.tsx
    epa/
      PrivateEpaDashboard.tsx
  components/
    nfc/
      NfcCheckinOverlay.tsx
      FlowProgressBar.tsx
      NavigationGuide.tsx
    chat/
      MfaChatInterface.tsx
      VoiceMessagePlayer.tsx
    avatar/
      AvatarPlayer.tsx
      VoiceCloneSettings.tsx
    gamification/
      AchievementBadge.tsx
      LeaderboardTable.tsx
      PointsDisplay.tsx
    payment/
      NfcPaymentTerminal.tsx
      PaymentSuccess.tsx
```

---

## 7. Socket.IO Event-Design

### Client → Server
- `nfc:tap` `{ locationId, praxisId, signature, timestamp }`
- `flow:advance` `{ sessionId, fromStep, toStep, reason }`
- `flow:delay` `{ sessionId, delayMinutes, reason }`
- `flow:call-patient` `{ sessionId, targetRoom, message }`
- `chat:broadcast` `{ message, target: 'waiting'|'all' }`
- `kiosk:heartbeat` `{ kioskId, status }`

### Server → Client
- `flow:step-changed` `{ sessionId, currentStep, roomName, instructions }`
- `flow:delay-update` `{ sessionId, delayMinutes, reason }`
- `navigation:guide` `{ sessionId, type, content, pathColor }`
- `checkout:ready` `{ sessionId, options }`
- `feedback:escalation` `{ feedbackId, escalationStatus }`
- `payment:status` `{ transactionId, status }`

---

## 8. Integrationspunkte zu Modulen 1–6

| Modul | Integration |
|------|-------------|
| Modul 1 | WaitingContent wird in FlowStep `WAITING` eingebunden |
| Modul 2 | Permission-System steuert NFC/Flow/Avatar/Form-Admin |
| Modul 3 | Payment- und Flow-Exporte an PVS/FHIR Adapter |
| Modul 4 | Therapiepläne werden als FlowStep-Kontext angezeigt |
| Modul 5 | PWA nutzt NFC-Landing + Chat + Checkout |
| Modul 6 | Lokalmodus hostet NFC/Telemedizin/Payment-Prozesse on-prem |

---

## 9. Sicherheit, DSGVO, Compliance

### Grundsatz
Kein Diagnosesystem, nur Organisations- und Kommunikationsunterstützung.

### Kritische Anforderungen
- NFC Manipulationsschutz via HMAC + Timestamp + Nonce
- Threat-Analyse lokal, kein externer Textversand
- Payment nur tokenisiert (PCI DSS, keine Kartendaten in DB)
- Voice/Video Recording nur mit expliziter Einwilligung
- Avatar/Voice-Cloning nur mit Mitarbeiter-Consent + Widerruf
- AuditLog für Eskalation, Flow Overrides, Checkout-Löschung

### Rollen/Permissions (neu)
- `nfc.manage`
- `flow.manage`
- `flow.override`
- `chat.broadcast`
- `feedback.review`
- `feedback.escalate`
- `payment.manage`
- `avatar.manage`
- `telemedicine.manage`
- `forms.ai.generate`
- `private_epa.manage`
- `export.anonymized`

---

## 10. Implementierungsreihenfolge (2g–2n)

### Phase 2g — NFC Basis
1. Prisma: `NfcCheckpoint`, `NfcScan`
2. API: `/api/nfc/*`
3. Frontend: NFC Landing + Overlay
4. Socket Events für Tap + Step Change

### Phase 2h — TreatmentFlow Engine
5. Prisma: `TreatmentFlow`, `FlowStep`, `PatientFlowProgress`
6. Flow CRUD + Advance/Delay APIs
7. Live Board für MFA/Arzt

### Phase 2i — Checkout + Feedback
8. `AnonymousFeedback`
9. Checkout Wizard + Löschmodi
10. Threat Detection + Escalation Workflow

### Phase 2j — Kiosk + Payment
11. Echter Kiosk Mode
12. `PaymentTransaction` + Intent/Webhook
13. Receipt + PVS Hook

### Phase 2k — Avatar + Voice
14. `StaffAvatar`
15. Avatar Player + TTS Endpoint
16. Voice Clone optional (Feature Flag)

### Phase 2l — Telemedizin
17. `TelemedicineSession`
18. WebRTC Signaling API
19. Room UI + Consent Handling

### Phase 2m — Gamification + Forms
20. `StaffAchievement`, `StaffLeaderboard`, `CustomForm`
21. Form Builder + AI Generate Endpoint
22. Stats + A/B Insights

### Phase 2n — Private ePA + Anon Export
23. `PrivateEPA`, `EpaDocument`, `EpaShare`, `AnonymizedExport`
24. Share + Token + Expiry Flow
25. Export Markdown/JSON/PDF

Geschätzte Agent-Zeit: ~28–34h

---

## 11. Testplan

### Unit
- NFC Signatur-Validierung
- Replay-Schutz
- Flow Engine (Advance/Skip/Condition)
- Threat Filter
- Payment Status Mapping
- Export Anonymizer

### Integration
- NFC Eingang→Checkout End-to-End
- Delay Broadcast
- Chat Broadcast + Read Receipts
- Checkout Delete/Export
- Form AI Generate + Submit

### E2E (Playwright)
- `e2e/nfc-flow.spec.ts`
- `e2e/checkout-feedback.spec.ts`
- `e2e/kiosk-payment.spec.ts`
- `e2e/avatar-voice.spec.ts`
- `e2e/telemedicine.spec.ts`
- `e2e/forms-ai.spec.ts`
- `e2e/private-epa-export.spec.ts`

---

## 12. Migrationsstrategie

1. Migration `add_module_7_8_models`
2. Feature Flags default OFF (`NFC_ENABLED`, `PAYMENT_ENABLED`, `AVATAR_ENABLED`, `TELEMED_ENABLED`)
3. Pilotpraxis mit 1 Flow + 3 NFC Checkpoints
4. Monitoring + Audit + Nutzerfeedback
5. Stufenweise Aktivierung je Funktion

---

> **Ende PLAN_MODUL_7_8.md**  
> **Nächster Schritt:** Prompt 1d — Konsolidierung aller Module (1–8) inkl. Master-Roadmap für Prompt 2+
