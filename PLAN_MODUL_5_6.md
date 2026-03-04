# PLAN Modul 5 & 6 — Patienten-PWA & Lokaler Modus / gematik / ePA

> **Prompt 1c** — Detaillierter Implementierungsplan  
> **Erstellt:** 2026-03-04  
> **Status:** FINAL  
> **Abhängigkeiten:** PLAN_MODUL_1_2.md (Queue-Persistenz), PLAN_MODUL_3_4.md (FHIR-Adapter, KIM)

---

## Inhaltsverzeichnis

1. [Modul 5: Patienten-PWA](#modul-5-patienten-pwa)
   - 5.1 [IST-Zustand PWA-Readiness](#51-ist-zustand-pwa-readiness)
   - 5.2 [Prisma-Schema Erweiterungen](#52-prisma-schema-erweiterungen)
   - 5.3 [Backend: API-Endpunkte](#53-backend-api-endpunkte)
   - 5.4 [Backend: Services](#54-backend-services)
   - 5.5 [Frontend: Komponenten & Routen](#55-frontend-komponenten--routen)
   - 5.6 [Offline-Architektur](#56-offline-architektur)
   - 5.7 [Push-Notifications](#57-push-notifications)
   - 5.8 [Patienten-Authentifizierung](#58-patienten-authentifizierung)
   - 5.9 [Datenschutz & Sicherheit](#59-datenschutz--sicherheit)
2. [Modul 6: Lokaler Modus / gematik / ePA](#modul-6-lokaler-modus--gematik--epa)
   - 6.1 [IST-Zustand Deployment](#61-ist-zustand-deployment)
   - 6.2 [Deployment-Modi Architektur](#62-deployment-modi-architektur)
   - 6.3 [Prisma-Schema Erweiterungen](#63-prisma-schema-erweiterungen)
   - 6.4 [TI-Konnektor Integration](#64-ti-konnektor-integration)
   - 6.5 [ePA-Integration (FHIR R4)](#65-epa-integration-fhir-r4)
   - 6.6 [KIM-Integration](#66-kim-integration)
   - 6.7 [Backend: API-Endpunkte](#67-backend-api-endpunkte)
   - 6.8 [Backend: Services](#68-backend-services)
   - 6.9 [Frontend: Admin-Erweiterungen](#69-frontend-admin-erweiterungen)
   - 6.10 [Docker / On-Premise Erweiterungen](#610-docker--on-premise-erweiterungen)
   - 6.11 [Backup & Recovery](#611-backup--recovery)
   - 6.12 [BSI-Compliance](#612-bsi-compliance)
3. [Querschnittsthemen](#querschnittsthemen)
   - 7.1 [i18n-Erweiterungen](#71-i18n-erweiterungen)
   - 7.2 [Berechtigungen (Modul 2)](#72-berechtigungen-modul-2)
   - 7.3 [Abhängigkeiten zwischen Modulen](#73-abhängigkeiten-zwischen-modulen)
4. [Implementierungsreihenfolge](#implementierungsreihenfolge)
5. [Neue Dependencies](#neue-dependencies)
6. [Testplan](#testplan)
7. [Migrations-Strategie](#migrations-strategie)

---

# Modul 5: Patienten-PWA

## 5.1 IST-Zustand PWA-Readiness

### ✅ Vorhanden (solide Basis)

| Asset | Datei | Status |
|-------|-------|--------|
| `manifest.json` | `public/manifest.json` | `standalone`, 192/512 SVG-Icons, `lang: "de"`, categories `medical/health` |
| Service Worker v3 | `public/sw.js` | stale-while-revalidate für Assets, network-first für HTML/Locales, Offline-Fallback |
| SW-Registrierung | `src/main.tsx` L20-48 | Lifecycle, 5min Update-Polling, `controllerchange` Auto-Reload |
| PWA Meta-Tags | `index.html` L22-29 | manifest-Link, theme-color, apple-mobile-web-app |
| Encrypted Storage | `src/utils/secureStorage.ts` | AES-256-GCM via Web Crypto, PBKDF2 Key-Derivation |
| Demo-Modus | `src/api/client.ts` | Kompletter localStorage-Mock — direkt wiederverwendbar für Offline |
| React Query Offline | `src/App.tsx` | `networkMode: 'offlineFirst'` konfiguriert |
| Session Recovery | Komponente vorhanden | `SessionRecoveryDialog` für unterbrochene Sitzungen |

### ❌ Fehlend für vollwertige Patienten-PWA

| Feature | Priorität | Lösung |
|---------|-----------|--------|
| IndexedDB | KRITISCH | `dexie` für strukturierten Offline-Datenspeicher |
| Background Sync | HOCH | Workbox Background Sync für queued Submissions |
| Push Notifications | HOCH | `web-push` Server + Push-API Client |
| Persistente Patienten-Accounts | KRITISCH | Neues `PatientAccount`-Modell + Login-Flow |
| `vite-plugin-pwa` | MITTEL | Workbox-Integration, Precaching, auto SW-Update |
| WebAuthn/Biometrie | MITTEL | FIDO2 Passkeys für Mobile-Login |
| PNG-Icons | NIEDRIG | Raster-Icons für ältere Android/iOS |

---

## 5.2 Prisma-Schema Erweiterungen

### Neues Modell: `PatientAccount`

```prisma
model PatientAccount {
  id                String    @id @default(uuid())
  email             String    @unique            // Login-Identifikator (gehashed in Patient.hashedEmail)
  passwordHash      String                       // bcrypt
  patientId         String    @unique
  patient           Patient   @relation(fields: [patientId], references: [id])
  
  // WebAuthn (optional)
  webauthnCredentialId  String?
  webauthnPublicKey     Bytes?
  webauthnCounter       Int       @default(0)
  
  // Account-Status
  isVerified        Boolean   @default(false)
  verificationToken String?
  verifiedAt        DateTime?
  lastLoginAt       DateTime?
  loginCount        Int       @default(0)
  
  // DSGVO
  consentPush       Boolean   @default(false)
  consentHealthData Boolean   @default(false)
  consentGivenAt    DateTime?
  
  // Geräte & Push
  pushSubscriptions PushSubscription[]
  diaryEntries      HealthDiaryEntry[]
  reminders         MedicationReminder[]
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?                    // Soft-Delete für DSGVO-Löschung

  @@index([email])
  @@map("patient_accounts")
}
```

### Neues Modell: `HealthDiaryEntry`

```prisma
model HealthDiaryEntry {
  id              String    @id @default(uuid())
  accountId       String
  account         PatientAccount @relation(fields: [accountId], references: [id])
  
  date            DateTime  @default(now())
  type            String                         // "symptom" | "vitals" | "mood" | "note" | "photo"
  
  // Verschlüsselt (AES-256-GCM)
  encryptedData   String                         // JSON: { symptom, severity, notes, values... }
  
  // Suchbare Metadaten (nicht-PII)
  category        String?                        // "schmerz" | "schlaf" | "bewegung" | "ernaehrung"
  severity        Int?                           // 1-10 (für Trend-Analyse)
  
  // Vitaldaten (Klartext für Aggregation / Arzt-Einsicht)
  bloodPressureSys  Int?
  bloodPressureDia  Int?
  heartRate         Int?
  temperature       Float?
  weight            Float?
  bloodSugar        Float?
  oxygenSaturation  Int?
  
  // Sync
  syncedAt        DateTime?
  offlineCreated  Boolean   @default(false)      // Offline erstellt → sync pending
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([accountId, date])
  @@index([accountId, type])
  @@map("health_diary_entries")
}
```

### Neues Modell: `MedicationReminder`

```prisma
model MedicationReminder {
  id              String    @id @default(uuid())
  accountId       String
  account         PatientAccount @relation(fields: [accountId], references: [id])
  medicationId    String
  medication      PatientMedication @relation(fields: [medicationId], references: [id])
  
  // Zeitplan
  scheduleCron    String                         // Cron-Ausdruck: "0 8 * * *" (täglich 8 Uhr)
  scheduleLabel   String                         // "Morgens", "Abends", "Alle 8 Stunden"
  timezone        String    @default("Europe/Berlin")
  isActive        Boolean   @default(true)
  
  // Push-Config
  pushEnabled     Boolean   @default(true)
  pushTitle       String?                        // Custom-Titel (sonst Medikamentenname)
  pushBody        String?                        // Custom-Text
  
  // Adhärenz-Tracking
  reminderLogs    ReminderLog[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([accountId, isActive])
  @@map("medication_reminders")
}

model ReminderLog {
  id              String    @id @default(uuid())
  reminderId      String
  reminder        MedicationReminder @relation(fields: [reminderId], references: [id])
  
  scheduledAt     DateTime
  status          String                         // "sent" | "confirmed" | "skipped" | "missed"
  confirmedAt     DateTime?
  skipReason      String?
  
  createdAt       DateTime  @default(now())

  @@index([reminderId, scheduledAt])
  @@map("reminder_logs")
}
```

### Neues Modell: `PushSubscription`

```prisma
model PushSubscription {
  id              String    @id @default(uuid())
  accountId       String
  account         PatientAccount @relation(fields: [accountId], references: [id])
  
  endpoint        String    @unique              // Push-Service-URL
  p256dh          String                         // Public Key
  auth            String                         // Auth Secret
  
  deviceLabel     String?                        // "iPhone 15", "Samsung S24"
  userAgent       String?
  isActive        Boolean   @default(true)
  
  lastUsedAt      DateTime?
  createdAt       DateTime  @default(now())

  @@index([accountId, isActive])
  @@map("push_subscriptions")
}
```

### Neues Modell: `SecureMessage`

```prisma
model SecureMessage {
  id              String    @id @default(uuid())
  
  // Absender/Empfänger
  fromType        String                         // "patient" | "arzt" | "mfa" | "system"
  fromId          String                         // PatientAccount.id oder ArztUser.id
  toType          String                         // "patient" | "arzt" | "mfa" | "praxis"
  toId            String                         // Empfänger-ID oder "praxis" für allgemein
  
  // Inhalt (E2E-verschlüsselt)
  encryptedSubject String?
  encryptedBody    String                        // AES-256-GCM
  
  // Metadaten (Klartext)
  category        String    @default("general")  // "general" | "appointment" | "prescription" | "lab" | "urgent"
  priority        String    @default("normal")   // "normal" | "high" | "urgent"
  hasAttachment   Boolean   @default(false)
  
  // Status
  readAt          DateTime?
  archivedAt      DateTime?
  
  // Thread
  parentId        String?
  parent          SecureMessage? @relation("thread", fields: [parentId], references: [id])
  replies         SecureMessage[] @relation("thread")
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([toType, toId, readAt])
  @@index([fromType, fromId])
  @@index([parentId])
  @@map("secure_messages")
}
```

### Erweiterung: `Patient` (bestehend)

```prisma
// Neu hinzufügen:
model Patient {
  // ... bestehende Felder ...
  account         PatientAccount?                // 1:1 Relation zur PWA
}
```

### Erweiterung: `PatientMedication` (bestehend)

```prisma
model PatientMedication {
  // ... bestehende Felder ...
  reminders       MedicationReminder[]           // Erinnerungen
  isActive        Boolean   @default(true)       // Aktiv/Abgesetzt
  startDate       DateTime?
  endDate         DateTime?
  prescribedBy    String?                        // Arzt-Name
}
```

---

## 5.3 Backend: API-Endpunkte

### Neue Datei: `server/routes/pwa.ts`

#### Patienten-Auth

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `POST` | `/api/pwa/register` | Keine | Registrierung: E-Mail + Passwort + Patienten-Verknüpfung |
| `POST` | `/api/pwa/login` | Keine | Login → JWT mit `role: 'patient_pwa'`, TTL 30d |
| `POST` | `/api/pwa/verify-email` | Keine | E-Mail-Verifizierung via Token |
| `POST` | `/api/pwa/forgot-password` | Keine | Passwort-Reset-Link senden |
| `POST` | `/api/pwa/reset-password` | Keine | Neues Passwort setzen |
| `POST` | `/api/pwa/webauthn/register` | `patient_pwa` | WebAuthn-Credential registrieren |
| `POST` | `/api/pwa/webauthn/authenticate` | Keine | WebAuthn-Login (Biometrie/PIN) |
| `POST` | `/api/pwa/refresh-token` | `patient_pwa` | Token-Refresh (30d Rotation) |
| `DELETE` | `/api/pwa/account` | `patient_pwa` | DSGVO Konto-Löschung (Soft-Delete + Daten-Purge) |

**Request/Response-Beispiel: Register**
```json
// POST /api/pwa/register
{
  "email": "patient@example.de",
  "password": "Min8Chars!1",
  "patientNumber": "P-10001",       // Aus Praxisbesuch bekannt
  "birthDate": "1985-03-15",        // Verifikation
  "consentHealthData": true,
  "consentPush": false
}
// → 201 { accountId, verificationEmailSent: true }
```

#### Gesundheits-Tagebuch

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `GET` | `/api/pwa/diary` | `patient_pwa` | Einträge abrufen (Pagination, Filter nach type/date) |
| `POST` | `/api/pwa/diary` | `patient_pwa` | Neuen Eintrag erstellen |
| `PUT` | `/api/pwa/diary/:id` | `patient_pwa` | Eintrag bearbeiten |
| `DELETE` | `/api/pwa/diary/:id` | `patient_pwa` | Eintrag löschen |
| `GET` | `/api/pwa/diary/trends` | `patient_pwa` | Trend-Daten (Aggregation über Zeitraum) |
| `POST` | `/api/pwa/diary/sync` | `patient_pwa` | Batch-Sync von Offline-Einträgen |

**Request/Response-Beispiel: Trends**
```json
// GET /api/pwa/diary/trends?metric=bloodPressure&period=30d
// → 200
{
  "metric": "bloodPressure",
  "period": "30d",
  "dataPoints": [
    { "date": "2026-02-03", "systolic": 128, "diastolic": 82 },
    { "date": "2026-02-04", "systolic": 125, "diastolic": 80 }
  ],
  "average": { "systolic": 126.5, "diastolic": 81 },
  "trend": "improving"     // "improving" | "stable" | "worsening"
}
```

#### Medikamenten-Erinnerungen

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `GET` | `/api/pwa/reminders` | `patient_pwa` | Alle aktiven Erinnerungen |
| `POST` | `/api/pwa/reminders` | `patient_pwa` | Neue Erinnerung erstellen |
| `PUT` | `/api/pwa/reminders/:id` | `patient_pwa` | Erinnerung bearbeiten |
| `DELETE` | `/api/pwa/reminders/:id` | `patient_pwa` | Erinnerung deaktivieren |
| `POST` | `/api/pwa/reminders/:id/confirm` | `patient_pwa` | Einnahme bestätigen |
| `POST` | `/api/pwa/reminders/:id/skip` | `patient_pwa` | Einnahme überspringen (mit Grund) |
| `GET` | `/api/pwa/reminders/adherence` | `patient_pwa` | Adhärenz-Statistiken |

**Request/Response-Beispiel: Adhärenz**
```json
// GET /api/pwa/reminders/adherence?period=30d
// → 200
{
  "period": "30d",
  "overall": 0.87,          // 87% Adhärenz
  "byMedication": [
    { "name": "Metoprolol", "adherence": 0.93, "missedCount": 2 },
    { "name": "Ramipril", "adherence": 0.80, "missedCount": 6 }
  ],
  "streak": 5,              // Aktuelle Serie ohne Missed
  "bestStreak": 14
}
```

#### Secure Messaging

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `GET` | `/api/pwa/messages` | `patient_pwa` | Nachrichten-Inbox (Pagination) |
| `GET` | `/api/pwa/messages/:id` | `patient_pwa` | Einzelne Nachricht + Thread |
| `POST` | `/api/pwa/messages` | `patient_pwa` | Nachricht an Praxis senden |
| `PUT` | `/api/pwa/messages/:id/read` | `patient_pwa` | Als gelesen markieren |
| `DELETE` | `/api/pwa/messages/:id` | `patient_pwa` | Archivieren |
| `GET` | `/api/pwa/messages/unread-count` | `patient_pwa` | Ungelesene Anzahl (für Badge) |

#### Termine

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `GET` | `/api/pwa/appointments` | `patient_pwa` | Eigene Termine |
| `POST` | `/api/pwa/appointments` | `patient_pwa` | Termin-Anfrage (nicht direkt buchen) |
| `PUT` | `/api/pwa/appointments/:id/cancel` | `patient_pwa` | Termin absagen |
| `GET` | `/api/pwa/appointments/available-slots` | `patient_pwa` | Verfügbare Zeitfenster |

#### Push-Subscriptions

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `POST` | `/api/pwa/push/subscribe` | `patient_pwa` | Push-Subscription registrieren |
| `DELETE` | `/api/pwa/push/subscribe` | `patient_pwa` | Push abbestellen |
| `POST` | `/api/pwa/push/test` | `patient_pwa` | Test-Push senden |
| `GET` | `/api/pwa/push/vapid-key` | Keine | VAPID Public Key abrufen |

---

## 5.4 Backend: Services

### `server/services/pwa/patientAuth.service.ts`

```
Verantwortlichkeit:
- Registrierung: Email-Validierung, Passwort-Hashing (bcrypt, cost=12), 
  Verknüpfung mit bestehendem Patient via patientNumber + birthDate
- Login: bcrypt-Verify, JWT-Generierung (role: 'patient_pwa', TTL: 30d)
- WebAuthn: Credential-Registration, Challenge-Generierung, Assertion-Validierung
- Email-Verifizierung: Token-Generierung (crypto.randomBytes), Versand via Nodemailer
- Passwort-Reset: Time-limited Token (1h TTL), Rate-Limiting (3/h)
- Account-Löschung: Soft-Delete → 30d Grace Period → Hard-Delete aller Daten

Abhängigkeiten:
- server/services/encryption.ts (bestehend)
- server/middleware/auth.ts (erweitert um 'patient_pwa' Rolle)
- Neues npm-Paket: @simplewebauthn/server
```

### `server/services/pwa/diary.service.ts`

```
Verantwortlichkeit:
- CRUD für HealthDiaryEntry
- Verschlüsselung sensibler Felder via bestehender encryption.ts
- Trend-Berechnung: Aggregation nach Zeitraum (7d/30d/90d/365d)
- Trend-Erkennung: Lineare Regression über Vital-Datenpunkte → "improving"/"stable"/"worsening"
- Batch-Sync: Offline-Einträge einfügen mit Conflict Resolution (last-write-wins + timestamp)
- Export: JSON/CSV/PDF für Arzt-Besuch

Abhängigkeiten:
- prisma (HealthDiaryEntry)
- server/services/encryption.ts
```

### `server/services/pwa/reminder.service.ts`

```
Verantwortlichkeit:
- CRUD für MedicationReminder
- Cron-Schedule Parsing und nächster Zeitpunkt-Berechnung
- Push-Versand: web-push an alle aktiven PushSubscriptions des Accounts
- Adhärenz-Berechnung: confirmed / (confirmed + missed) pro Zeitraum
- Streak-Tracking: Konsekutive Tage ohne Missed
- Reminder-Worker: node-cron Job (jede Minute prüfen, fällige Reminder → Push senden)

Abhängigkeiten:
- server/services/pwa/push.service.ts
- node-cron
- web-push
```

### `server/services/pwa/push.service.ts`

```
Verantwortlichkeit:
- VAPID Key-Pair Management (aus ENV: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL)
- Subscription-Verwaltung: Speichern, Validieren, Aufräumen ungültiger Endpoints (410 Gone)
- Push senden: web-push.sendNotification mit Payload-Verschlüsselung
- Batch-Push: An alle Devices eines Accounts
- Notification-Typen:
  - medication_reminder: "Zeit für Metoprolol 47.5mg"
  - appointment_reminder: "Morgen 10:00 Uhr Termin bei Dr. Schmidt"
  - message_received: "Neue Nachricht von Ihrer Praxis"
  - health_alert: "Ihr Blutdruck-Trend zeigt Auffälligkeiten"

Abhängigkeiten:
- web-push (npm)
- PushSubscription (Prisma)
```

### `server/services/pwa/messaging.service.ts`

```
Verantwortlichkeit:
- Nachrichten-CRUD mit E2E-Verschlüsselung (AES-256-GCM, Key = shared secret)
- Thread-Management: parentId-basiertes Threading
- Unread-Counter: Redis-cached Counter pro Account
- Real-Time: Socket.IO Event 'pwa:message:new' an Patient-Room
- Praxis-Seite: Integration in bestehendes ChatMessage-System (Adapter-Pattern)
- Benachrichtigung: Push an Patient bei neuer Nachricht von Praxis

Abhängigkeiten:
- server/services/encryption.ts
- server/socket.ts (neuer Room: pwa:{accountId})
- server/services/pwa/push.service.ts
```

### `server/jobs/reminderWorker.ts`

```
Verantwortlichkeit:
- Cron-Job: Jede Minute ausführen
- Abfrage: Alle aktiven Reminders mit scheduleCron
- Für jeden fälligen Reminder:
  1. ReminderLog erstellen (status: 'sent')
  2. Push-Notification senden
  3. Nach 2h ohne Confirmation → status: 'missed'
- Cleanup: Alte ReminderLogs nach RETENTION_DAYS löschen

Integration:
- Gestartet in server/index.ts beim Server-Start
- Läuft im gleichen Prozess (node-cron), kein separater Worker nötig
```

---

## 5.5 Frontend: Komponenten & Routen

### Router-Erweiterung in `src/App.tsx`

```
/pwa                         → PWA-Layout (eigenes Shell mit BottomNav)
/pwa/login                   → PatientLogin
/pwa/register                → PatientRegister
/pwa/verify-email/:token     → EmailVerification
/pwa/dashboard               → PatientDashboard (geschützt)
/pwa/diary                   → HealthDiary (geschützt)
/pwa/diary/new               → DiaryEntryForm (geschützt)
/pwa/diary/trends             → DiaryTrends (geschützt)
/pwa/medications              → MedicationList (geschützt)
/pwa/medications/:id/reminders → ReminderConfig (geschützt)
/pwa/appointments             → AppointmentList (geschützt)
/pwa/appointments/new         → AppointmentRequest (geschützt)
/pwa/messages                 → MessageInbox (geschützt)
/pwa/messages/:id             → MessageThread (geschützt)
/pwa/messages/new             → MessageCompose (geschützt)
/pwa/profile                  → PatientProfile (geschützt)
/pwa/settings                 → PWASettings (geschützt)
```

### Neue Komponenten

#### Layout-Shell: `src/components/pwa/PWAShell.tsx`

```
┌─────────────────────────────────┐
│ ← Zurück    DiggAI    [🔔] [⚙]│  ← Top-Bar mit Unread-Badge
├─────────────────────────────────┤
│                                 │
│         <Outlet />              │  ← React Router Outlet
│                                 │
│                                 │
├─────────────────────────────────┤
│ 🏠  📔  💊  📅  ✉️             │  ← BottomNavigation (5 Tabs)
│ Home Diary Meds Termine  Post  │
└─────────────────────────────────┘

Props: keine (verwendet usePatientAccountStore für Auth-Status)
Features:
- Offline-Indikator (Banner: "Offline — Daten werden synchronisiert")
- Update-Prompt (neuer SW verfügbar)
- Install-Prompt (A2HS auf Android/iOS)
```

#### Dashboard: `src/pages/pwa/PatientDashboard.tsx`

```
┌─────────────────────────────────┐
│ Guten Morgen, [Vorname]!        │
│ Ihr nächster Termin: 15.03. 10h │
├─────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐     │
│ │ 💊   │ │ 📔   │ │ ✉️    │     │  ← Quick-Action Cards
│ │2 Med.│ │ Tag- │ │3 neue│     │
│ │fällig│ │ buch │ │Nachr.│     │
│ └──────┘ └──────┘ └──────┘     │
├─────────────────────────────────┤
│ Vitaldaten (letzte 7 Tage)     │
│ ┌─────────────────────────────┐ │
│ │   📈 Blutdruck-Chart       │ │  ← recharts Mini-Chart
│ │   128/82 → 125/80 ↓        │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Nächste Erinnerungen            │
│ • 14:00 Metoprolol 47.5mg      │
│ • 20:00 Ramipril 5mg           │
└─────────────────────────────────┘

Features:
- Daten via React Query mit staleTime: 60s
- Pull-to-Refresh (touch-basiert)
- Offline: Cached Daten anzeigen, Sync-Status
```

#### Gesundheits-Tagebuch: `src/pages/pwa/HealthDiary.tsx`

```
┌─────────────────────────────────┐
│ Tagebuch           [Trends 📈]  │
├─────────────────────────────────┤
│ Filter: [Alle ▾] [Zeitraum ▾]  │
├─────────────────────────────────┤
│ 04.03.2026                      │
│ ┌─────────────────────────────┐ │
│ │ 🩸 Blutdruck    128/82     │ │
│ │ ❤️ Puls         72 bpm     │ │
│ │ 😊 Stimmung     Gut (7/10) │ │
│ │ 📝 "Leichte Kopfschmerzen" │ │
│ └─────────────────────────────┘ │
│ 03.03.2026                      │
│ ┌─────────────────────────────┐ │
│ │ 🩸 Blutdruck    132/85     │ │
│ │ 💤 Schlaf       6.5h       │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│         [＋ Neuer Eintrag]      │  ← FAB
└─────────────────────────────────┘
```

#### Tagebuch-Formular: `src/pages/pwa/DiaryEntryForm.tsx`

```
┌─────────────────────────────────┐
│ Neuer Eintrag                   │
├─────────────────────────────────┤
│ Typ: [Vitaldaten ▾]            │
│                                 │
│ Blutdruck (systolisch): [___]   │
│ Blutdruck (diastolisch): [___]  │
│ Puls: [___] bpm                 │
│ Temperatur: [___] °C            │
│ Gewicht: [___] kg               │
│ Blutzucker: [___] mg/dl         │
│ SpO₂: [___] %                   │
│                                 │
│ Stimmung: 😞 😐 😊 😄 🤩       │  ← Emoji-Slider (1-5)
│                                 │
│ Notizen: [                 ]    │
│          [                 ]    │
│                                 │
│ [Speichern]  [Abbrechen]       │
└─────────────────────────────────┘

Validierung:
- Zod-Schema: systolisch 60-280, diastolisch 30-180, Puls 30-250
- Typ-spezifische Felder ein-/ausblenden
- Offline: In IndexedDB speichern → Sync-Queue
```

#### Trends: `src/pages/pwa/DiaryTrends.tsx`

```
┌─────────────────────────────────┐
│ Trends                          │
│ Zeitraum: [7d] [30d] [90d] [1J]│
├─────────────────────────────────┤
│ Blutdruck                       │
│ ┌─────────────────────────────┐ │
│ │  140─     ╱╲                │ │
│ │  130─  ──╱  ╲───╱─         │ │  ← LineChart (recharts)
│ │  120─                       │ │
│ │   80─  ──────────────       │ │
│ │      M  D  M  D  F  S  S   │ │
│ └─────────────────────────────┘ │
│ Ø 128/82  Trend: ↗ Stabil      │
├─────────────────────────────────┤
│ Gewicht                         │
│ ┌─────────────────────────────┐ │
│ │  82─  ╲                     │ │
│ │  80─    ╲──────             │ │
│ │  78─                        │ │
│ └─────────────────────────────┘ │
│ Ø 80.2 kg  Trend: ↘ Abnehmend  │
├─────────────────────────────────┤
│ [PDF für Arztbesuch exportieren]│
└─────────────────────────────────┘

Datenquelle: GET /api/pwa/diary/trends
Charts: recharts (bereits installiert)
Export: jsPDF (falls installiert) oder Server-Side PDF
```

#### Medikamenten-Liste: `src/pages/pwa/MedicationList.tsx`

```
┌─────────────────────────────────┐
│ Meine Medikamente               │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 💊 Metoprolol 47.5mg       │ │
│ │    Morgens + Abends         │ │
│ │    ⏰ Nächste: 14:00        │ │
│ │    Adhärenz: 93% ████████░  │ │
│ │    [Einnahme bestätigen ✓]  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 💊 Ramipril 5mg            │ │
│ │    Morgens                   │ │
│ │    ✅ Heute eingenommen      │ │
│ │    Adhärenz: 80% ██████░░  │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Gesamtadhärenz: 87% 🏆         │
│ Serie: 5 Tage ununterbrochen    │
└─────────────────────────────────┘
```

#### Termin-Übersicht: `src/pages/pwa/AppointmentList.tsx`

```
┌─────────────────────────────────┐
│ Meine Termine                   │
├─────────────────────────────────┤
│ Kommende                        │
│ ┌─────────────────────────────┐ │
│ │ 📅 15.03.2026 — 10:00      │ │
│ │ Kontrolluntersuchung        │ │
│ │ Dr. Schmidt                  │ │
│ │ [Absagen] [In Kalender]     │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Vergangene                      │
│ ┌─────────────────────────────┐ │
│ │ 📅 01.02.2026 — 09:30 ✓    │ │
│ │ Anamnese-Erstgespräch       │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│     [＋ Termin anfragen]        │
└─────────────────────────────────┘
```

#### Nachrichten: `src/pages/pwa/MessageInbox.tsx`

```
┌─────────────────────────────────┐
│ Nachrichten                     │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 🔵 Praxis Dr. Schmidt      │ │  ← Ungelesen = blauer Punkt
│ │ Ihre Laborergebnisse        │ │
│ │ Vor 2 Stunden               │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ○ Praxis Dr. Schmidt        │ │
│ │ Termin-Bestätigung          │ │
│ │ Gestern                      │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│     [✉️ Neue Nachricht]         │
└─────────────────────────────────┘

Features:
- Real-Time via Socket.IO (pwa:{accountId} Room)
- Push-Notification bei neuer Nachricht (wenn App im Hintergrund)
- Offline: Gesendete Nachrichten in Queue → Sync bei Reconnect
```

#### Auth-Komponenten

| Komponente | Datei | Beschreibung |
|-----------|-------|-------------|
| `PatientLogin` | `src/pages/pwa/PatientLogin.tsx` | E-Mail + Passwort, "Angemeldet bleiben", WebAuthn-Option |
| `PatientRegister` | `src/pages/pwa/PatientRegister.tsx` | 3-Schritt: Daten → Verifikation → Consent |
| `EmailVerification` | `src/pages/pwa/EmailVerification.tsx` | Token aus URL → API-Call → Redirect zu Login |
| `PatientProfile` | `src/pages/pwa/PatientProfile.tsx` | Name, E-Mail, Passwort ändern, WebAuthn verwalten |
| `PWASettings` | `src/pages/pwa/PWASettings.tsx` | Push an/aus, Sprache, Theme, Daten löschen |

### Neuer Store: `src/store/patientAccountStore.ts`

```typescript
interface PatientAccountState {
  accountId: string | null;
  patientId: string | null;
  email: string | null;
  isAuthenticated: boolean;
  token: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  
  // Offline
  offlineQueue: OfflineAction[];
  addToOfflineQueue: (action: OfflineAction) => void;
  processOfflineQueue: () => Promise<void>;
}

// Persistiert via secureStorage (encrypted localStorage)
// + IndexedDB für größere Daten (Diary, Messages)
```

### Neuer Hook: `src/hooks/usePWAInstall.ts`

```
Verantwortlichkeit:
- `beforeinstallprompt` Event abfangen
- Install-Prompt anzeigen (Custom UI, nicht Browser-Default)
- iOS Safari: Anleitung "Zum Home-Bildschirm" zeigen
- Tracking: Installation-Status in Analytics
```

### Neuer Hook: `src/hooks/useOfflineSync.ts`

```
Verantwortlichkeit:
- `navigator.onLine` + 'online'/'offline' Events
- Offline-Status in UI anzeigen
- Bei Reconnect: Offline-Queue verarbeiten (FIFO)
- Conflict Resolution: Server-Timestamp gewinnt bei Merge-Konflikten
- Retry mit exponential Backoff (3 Versuche)
```

---

## 5.6 Offline-Architektur

### Schichtenmodell

```
┌──────────────────────────────────────────────┐
│              React Components                 │
│  (zeigen cached Daten + Sync-Status)          │
├──────────────────────────────────────────────┤
│           React Query Cache                   │
│  (In-Memory, staleTime: 60s-5min)            │
├──────────────────────────────────────────────┤
│         Zustand + secureStorage              │
│  (Auth-State, Preferences, kleine Daten)      │
├──────────────────────────────────────────────┤
│              IndexedDB (Dexie)               │
│  ┌────────────┬───────────┬──────────────┐   │
│  │diary_entries│medications│ messages     │   │
│  │(encrypted)  │(encrypted)│ (encrypted)  │   │
│  ├────────────┼───────────┼──────────────┤   │
│  │offline_queue│sync_status│ push_config  │   │
│  └────────────┴───────────┴──────────────┘   │
├──────────────────────────────────────────────┤
│          Service Worker (Workbox)             │
│  ┌──────────────┬────────────────────────┐   │
│  │ Static Cache  │ Background Sync Queue │   │
│  │ (precache)    │ (API Requests)        │   │
│  └──────────────┴────────────────────────┘   │
└──────────────────────────────────────────────┘
```

### Dexie-Schema: `src/lib/offlineDb.ts`

```typescript
import Dexie from 'dexie';

class PWADatabase extends Dexie {
  diaryEntries!: Table<EncryptedDiaryEntry>;
  medications!: Table<EncryptedMedication>;
  messages!: Table<EncryptedMessage>;
  offlineQueue!: Table<OfflineAction>;
  syncStatus!: Table<SyncRecord>;

  constructor() {
    super('diggai-pwa');
    this.version(1).stores({
      diaryEntries: 'id, accountId, date, type, [accountId+date], syncStatus',
      medications: 'id, accountId, isActive, [accountId+isActive]',
      messages: 'id, threadId, fromId, toId, createdAt, readAt',
      offlineQueue: '++id, type, status, createdAt',
      syncStatus: 'entityType, lastSyncAt'
    });
  }
}
```

### Sync-Strategie

```
ONLINE:
  React Query → API → Server → Response → Update IndexedDB + Cache

OFFLINE:
  React Query → IndexedDB (cached) → Return cached data
  User-Aktion → IndexedDB (pending) + offlineQueue (action)

RECONNECT:
  1. navigator.onLine → true
  2. processOfflineQueue():
     for each action in offlineQueue (FIFO):
       try:
         POST /api/pwa/diary/sync (batch) oder einzeln
         Mark as synced in IndexedDB
         Remove from offlineQueue
       catch (409 Conflict):
         Server-Version gewinnt, lokale Version aktualisieren
       catch (Network Error):
         Retry mit exponential Backoff
  3. Full refresh: GET aktuelle Daten → IndexedDB aktualisieren
```

### Workbox-Konfiguration: `vite.config.ts` Erweiterung

```typescript
// vite-plugin-pwa Konfiguration
{
  registerType: 'prompt',           // User bestätigt Update
  includeAssets: ['icons/*.svg', 'icons/*.png'],
  manifest: false,                  // Bestehende manifest.json verwenden
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^\/api\/pwa\/.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pwa-api',
          expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
          networkTimeoutSeconds: 5
        }
      },
      {
        urlPattern: /^\/locales\/.*/,
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'locales' }
      }
    ],
    // Background Sync für Offline-Submissions
    backgroundSync: [{
      name: 'pwa-sync-queue',
      options: { maxRetentionTime: 7 * 24 * 60 }  // 7 Tage
    }]
  }
}
```

---

## 5.7 Push-Notifications

### Architektur

```
┌──────────┐     ┌──────────┐     ┌──────────────────┐
│  Patient  │────▶│  Browser │────▶│  Push Service     │
│  (PWA)    │     │ Push API │     │ (Mozilla/Google)   │
└──────────┘     └──────────┘     └──────────────────┘
      ▲                                    │
      │ Display                            │ Delivery
      │ Notification                       ▼
┌──────────┐                     ┌──────────────────┐
│  Service  │◀────────────────── │  DiggAI Server    │
│  Worker   │   Push Event       │ (web-push lib)    │
└──────────┘                     └──────────────────┘
```

### VAPID Key-Setup

```
# Server .env
VAPID_PUBLIC_KEY=BN...    # Generated via web-push generate-vapid-keys
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:admin@diggai.de
```

### Push-Payload-Schema

```json
{
  "type": "medication_reminder",     // Notification-Typ
  "title": "💊 Metoprolol fällig",
  "body": "Zeit für Ihre Metoprolol 47.5mg Dosis",
  "icon": "/icons/icon-192.svg",
  "badge": "/icons/badge-72.png",
  "tag": "reminder-abc123",          // Deduplizierung
  "data": {
    "url": "/pwa/medications",       // Klick-Ziel
    "reminderId": "abc123",
    "actions": [
      { "action": "confirm", "title": "✓ Eingenommen" },
      { "action": "snooze", "title": "⏰ In 30 Min" }
    ]
  }
}
```

### SW Push-Handler (in generiertem Service Worker)

```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      actions: data.data?.actions,
      data: data.data
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { action } = event;
  const { url, reminderId } = event.notification.data;
  
  if (action === 'confirm') {
    // POST /api/pwa/reminders/:id/confirm via fetch
    event.waitUntil(confirmReminder(reminderId));
  } else if (action === 'snooze') {
    // Snooze: Reschedule in 30 min
    event.waitUntil(snoozeReminder(reminderId));
  } else {
    // Notification-Click → App öffnen
    event.waitUntil(clients.openWindow(url));
  }
});
```

---

## 5.8 Patienten-Authentifizierung

### Registrierungs-Flow

```
Patient besucht Praxis
       │
       ▼
Anamnese ausfüllen → Patient-Datensatz erstellt (P-10001)
       │
       ▼
Am Ende: "Möchten Sie die DiggAI-App nutzen?"
       │  QR-Code → /pwa/register?ref=P-10001
       ▼
┌─ PWA Registrierung ────────────────────────┐
│ Schritt 1: Identifikation                   │
│   • Patienten-Nr: P-10001 (vorausgefüllt)   │
│   • Geburtsdatum: [__.__.____]               │
│   → Prüfung: patientNumber + birthDate Match │
│                                               │
│ Schritt 2: Account erstellen                 │
│   • E-Mail: [________________]               │
│   • Passwort: [________________] (min 8, 1↑) │
│   • Passwort bestätigen: [______]            │
│                                               │
│ Schritt 3: Einwilligung                      │
│   • ☐ Gesundheitsdaten speichern (DSGVO)     │
│   • ☐ Push-Benachrichtigungen erlauben       │
│   • ☐ AGB + Datenschutzerklärung akzeptiert  │
│                                               │
│ [Registrieren] → Verifizierungs-E-Mail       │
└───────────────────────────────────────────────┘
```

### Token-Strategie

```
Patient-PWA JWT:
{
  sub: accountId,
  role: "patient_pwa",
  pid: patientId,        // Für Daten-Zugriff
  iat: ...,
  exp: ... (+30d),       // Lange TTL für Mobile
  jti: ...,              // Für Blacklist/Rotation
  dev: deviceFingerprint // Token-Binding
}

Refresh: Alle 7 Tage automatisch rotieren
Revocation: Bei Logout → Redis-Blacklist
```

### WebAuthn-Flow (Optional, für Biometrie)

```
Registrierung:
1. POST /api/pwa/webauthn/register → Challenge
2. navigator.credentials.create({ publicKey }) → Fingerabdruck/FaceID
3. POST /api/pwa/webauthn/register/complete → Credential gespeichert

Login:
1. POST /api/pwa/webauthn/authenticate → Challenge
2. navigator.credentials.get({ publicKey }) → Biometrie-Check
3. POST /api/pwa/webauthn/authenticate/complete → JWT zurück

Bibliothek: @simplewebauthn/server + @simplewebauthn/browser
```

---

## 5.9 Datenschutz & Sicherheit

### DSGVO-Maßnahmen

| Anforderung | Implementierung |
|-------------|----------------|
| Datenminimierung | IndexedDB cacht nur eigene Daten, automatische Bereinigung nach 90d |
| Einwilligung | Granulare Consent-Checkboxen bei Registrierung, jederzeit widerrufbar |
| Auskunftsrecht (Art. 15) | `GET /api/pwa/account/data-export` → ZIP mit allen Daten |
| Löschrecht (Art. 17) | `DELETE /api/pwa/account` → Soft-Delete → 30d → Hard-Delete |
| Datenportabilität (Art. 20) | Export als JSON/CSV |
| Widerruf Push | Settings-Seite → Push deaktivieren, Subscription löschen |

### Verschlüsselung

| Schicht | Algorithmus | Key-Management |
|---------|-------------|----------------|
| Server-DB (PII) | AES-256-GCM | ENCRYPTION_KEY aus .env |
| IndexedDB (Client) | AES-256-GCM | PBKDF2 von Device-Fingerprint (bestehend) |
| Nachrichten (E2E) | AES-256-GCM | Shared Secret: PBKDF2(AccountPassword + PraxisKey) |
| Transit | TLS 1.2/1.3 | Zertifikat via Netlify/Let's Encrypt |

### BSI TR-03161 (Mobile Gesundheits-App)

| Anforderung | Maßnahme |
|-------------|----------|
| Sichere Datenhaltung | IndexedDB verschlüsselt, kein Klartext-Cache |
| Authentifizierung | Passwort-Policy (8+ Zeichen, Komplexität) + optional WebAuthn |
| Kommunikationssicherheit | TLS 1.2+ erzwungen, HSTS, Certificate Pinning erwägen |
| Integritätsschutz | SRI für externe Ressourcen, CSP strict |
| Logging & Audit | Alle Zugriffe in AuditLog (bestehend) |

---

# Modul 6: Lokaler Modus / gematik / ePA

## 6.1 IST-Zustand Deployment

### Cloud-Modus (aktuell produktiv)

```
┌────────────┐     ┌──────────┐     ┌──────────────┐
│  Browser   │────▶│ Netlify  │     │              │
│  (Patient) │     │ CDN      │     │  Backend     │
│            │     │ (SPA)    │     │  (wo?)       │
└────────────┘     └──────────┘     └──────────────┘
                                         ❌ Nicht deployed!
```

**Problem:** Backend ist NICHT deployed — nur Frontend auf Netlify. Demo-Modus überbrückt dies mit localStorage.

### Docker-Setup (vorhanden, nicht im Einsatz)

```
docker-compose.yml:
  nginx:1.27 (:80/:443) → app:3001 (Node 22)
  postgres:16-alpine (:5432)
  redis:7-alpine (:6379)
  
Dockerfile: Multi-Stage Build (builder → production)
docker/nginx.conf: SSL + Rate-Limiting + WebSocket-Proxy
```

---

## 6.2 Deployment-Modi Architektur

### Drei Modi

```
┌─────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT_MODE                           │
├──────────────┬──────────────────┬───────────────────────────┤
│    "cloud"   │    "hybrid"      │     "local"               │
│              │                   │                           │
│ Netlify CDN  │ CDN Frontend     │ Alles on-premise          │
│ + Cloud API  │ + Lokaler Server │ Docker-Stack              │
│ + Cloud DB   │ + Lokale DB      │ Kein Internet nötig       │
│              │ + TI-Konnektor   │ + TI-Konnektor            │
│ Kein TI      │ + ePA optional   │ + ePA                     │
│ kein ePA     │                   │ + KIM                     │
│              │                   │ + Lokales Backup          │
│              │                   │ + Optional: Lokales LLM   │
│              │                   │                           │
│ Zielgruppe:  │ Zielgruppe:      │ Zielgruppe:               │
│ Demo/Test    │ Praxis Lite      │ Praxis Pro                │
└──────────────┴──────────────────┴───────────────────────────┘
```

### Environment-Variable

```bash
# Neuer .env Block
DEPLOYMENT_MODE=local          # "cloud" | "hybrid" | "local"

# TI-Konnektor
TI_ENABLED=true
TI_KONNEKTOR_URL=https://192.168.1.100:443/connector.sds
TI_CLIENT_CERT=/certs/institution.p12
TI_CLIENT_CERT_PASS=...
TI_MANDANT_ID=m001
TI_CLIENT_SYSTEM_ID=cs001
TI_WORKPLACE_ID=wp001

# ePA
EPA_ENABLED=true
EPA_FHIR_ENDPOINT=https://konnektor.local/epa/fhir

# KIM
KIM_ENABLED=true
KIM_ADDRESS=praxis.schmidt@kim.telematik
KIM_SMTP_HOST=kim-clientmodul.local
KIM_SMTP_PORT=465
KIM_POP3_HOST=kim-clientmodul.local
KIM_POP3_PORT=995

# Lokales Backup
LOCAL_BACKUP_ENABLED=true
LOCAL_BACKUP_PATH=/backups
LOCAL_BACKUP_ENCRYPTION_KEY=...  # Separater Key für Backups
LOCAL_BACKUP_SCHEDULE=0 2 * * *  # Täglich 2 Uhr

# Lokales LLM (Pro-Modus)
LOCAL_LLM_ENABLED=false
LOCAL_LLM_URL=http://localhost:11434   # Ollama
LOCAL_LLM_MODEL=medllama2:13b
```

---

## 6.3 Prisma-Schema Erweiterungen

### Neues Modell: `TIConnection`

```prisma
model TIConnection {
  id              String    @id @default(uuid())
  
  // Konnektor-Konfiguration
  konnektorUrl    String
  mandantId       String
  clientSystemId  String
  workplaceId     String
  
  // Status
  status          String    @default("disconnected")  // "connected" | "disconnected" | "error"
  lastPingAt      DateTime?
  lastErrorMsg    String?
  
  // Smartcard-Status
  smcbStatus      String?   // "inserted" | "not_present" | "blocked" | "unknown"
  smcbIccsn       String?   // Chip-Kartennummer (ICCSN)
  smcbExpiry      DateTime?
  ehbaStatus      String?
  ehbaHolder      String?   // Arzt-Name auf eHBA
  
  // Zertifikat
  certFingerprint String?
  certValidUntil  DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@map("ti_connections")
}
```

### Neues Modell: `EPADocument`

```prisma
model EPADocument {
  id              String    @id @default(uuid())
  patientId       String
  patient         Patient   @relation(fields: [patientId], references: [id])
  
  // ePA-Referenz
  epaDocumentId   String    @unique              // ID im ePA-System
  epaFolderId     String?                        // Akte/Ordner in ePA
  
  // Metadaten
  documentType    String                         // "anamnese_report" | "lab_result" | "prescription" | "discharge_letter"
  title           String
  mimeType        String    @default("application/pdf")
  
  // Richtung
  direction       String                         // "uploaded" | "downloaded"
  
  // Status
  status          String    @default("pending")  // "pending" | "success" | "error"
  errorMessage    String?
  
  // Audit
  performedBy     String                         // ArztUser.id (wer hat Zugriff ausgelöst)
  patientConsent  Boolean   @default(false)      // Patient hat am Konnektor zugestimmt
  consentTimestamp DateTime?
  
  createdAt       DateTime  @default(now())

  @@index([patientId])
  @@index([epaDocumentId])
  @@map("epa_documents")
}
```

### Neues Modell: `KIMMessage`

```prisma
model KIMMessage {
  id              String    @id @default(uuid())
  
  // Adressen
  fromAddress     String                         // praxis.schmidt@kim.telematik
  toAddress       String                         // empfaenger@kim.telematik
  
  // Inhalt (verschlüsselt in KIM-Transport, Klartext in DB)
  subject         String
  body            String                         // MIME/Multipart
  
  // Referenzen
  patientId       String?
  patient         Patient?  @relation(fields: [patientId], references: [id])
  sessionId       String?
  
  // Anhänge
  attachmentCount Int       @default(0)
  attachmentRefs  String?                        // JSON-Array von Datei-Referenzen
  
  // Status
  direction       String                         // "sent" | "received"
  status          String    @default("draft")    // "draft" | "sent" | "delivered" | "read" | "error"
  errorMessage    String?
  
  // KIM-Metadaten
  kimMessageId    String?   @unique              // KIM Message-ID
  kimDicomTag     String?                        // DICOM-Referenz falls Bildversand
  
  sentAt          DateTime?
  receivedAt      DateTime?
  createdAt       DateTime  @default(now())

  @@index([fromAddress])
  @@index([toAddress])
  @@index([patientId])
  @@map("kim_messages")
}
```

### Neues Modell: `SystemConfig`

```prisma
model SystemConfig {
  id              String    @id @default(uuid())
  key             String    @unique              // "deployment_mode", "ti_status", "backup_last_run"
  value           String                         // JSON-serialisiert
  category        String                         // "deployment" | "ti" | "backup" | "llm" | "general"
  
  description     String?
  isEncrypted     Boolean   @default(false)      // Werte wie Keys werden verschlüsselt
  
  updatedAt       DateTime  @updatedAt
  updatedBy       String?                        // ArztUser.id

  @@index([category])
  @@map("system_config")
}
```

### Neues Modell: `BackupRecord`

```prisma
model BackupRecord {
  id              String    @id @default(uuid())
  
  type            String                         // "full" | "incremental" | "config_only"
  status          String    @default("running")  // "running" | "completed" | "failed"
  
  filePath        String?                        // /backups/backup-2026-03-04T02-00.enc
  fileSize        BigInt?                        // Bytes
  checksum        String?                        // SHA-256 des Backup-Files
  
  tablesIncluded  String?                        // JSON-Array ["Patient", "Answer", ...]
  recordCount     Int?                           // Gesamtzahl gesicherter Datensätze
  
  startedAt       DateTime  @default(now())
  completedAt     DateTime?
  errorMessage    String?
  
  triggeredBy     String                         // "system" (cron) | ArztUser.id (manuell)

  @@index([status, startedAt])
  @@map("backup_records")
}
```

### Erweiterung: `Patient` (bestehend)

```prisma
model Patient {
  // ... bestehende Felder ...
  epaDocuments    EPADocument[]
  kimMessages     KIMMessage[]
  epaKvnr        String?        // Krankenversichertennummer (verschlüsselt) für ePA-Zuordnung
}
```

---

## 6.4 TI-Konnektor Integration

### Konnektor-Architektur

```
┌─────────────────────┐
│    DiggAI Server     │
│  (Node.js/Express)   │
│                      │
│  ┌────────────────┐  │     mTLS (Client-Cert)     ┌──────────────────┐
│  │ TI-Konnektor   │──────────────────────────────▶│  Konnektor       │
│  │ Client Service │  │                             │  (TI-Gateway)    │
│  └────────────────┘  │                             │                  │
│          │           │                             │  ☐ SMC-B         │
│          ▼           │                             │  ☐ eHBA          │
│  ┌────────────────┐  │                             │  ☐ eGK (Patient) │
│  │ SOAP/REST      │  │                             └──────────────────┘
│  │ Adapter        │  │                                     │
│  └────────────────┘  │                                     ▼
│          │           │                             ┌──────────────────┐
│          ▼           │                             │  TI-Zentral      │
│  ┌────────────────┐  │                             │  (gematik)       │
│  │ Card Service   │  │                             │  • VSDM          │
│  │ Auth Service   │  │                             │  • ePA           │
│  │ Cert Service   │  │                             │  • KIM           │
│  │ EPA Service    │  │                             │  • eRezept       │
│  └────────────────┘  │                             └──────────────────┘
└─────────────────────┘
```

### Konnektor-SDS (Service Discovery)

```
GET https://{konnektor}:443/connector.sds
→ XML mit allen verfügbaren Diensten:
  - AuthSignatureService (eHBA-Signatur)
  - CardService (Karten-Management)
  - CertificateService (Zertifikate)
  - EventService (Ereignisse)
  - SignatureService (QES)
```

### SOAP-Client: `server/services/ti/konnektorClient.ts`

```
Verantwortlichkeit:
- mTLS-Verbindung zum Konnektor (Institution-Zertifikat SMC-B)
- SOAP-Envelope-Generierung für gematik-Operationen
- Context-Header: MandantId, ClientSystemId, WorkplaceId
- GetCards: Liste aller gesteckten Karten (SMC-B, eHBA, eGK)
- VerifyPin: PIN-Eingabe für eHBA/eGK (am Kartenterminal)
- ReadVSD: Versichertenstammdaten von eGK lesen (VSDM)
- ExternalAuthenticate: Authentifizierung via eHBA
- SignDocument: Qualifizierte Elektronische Signatur (QES)

Technische Details:
- SOAP 1.1 + WS-Security
- mTLS via Node.js https.Agent mit PFX/P12
- Timeout: 30s (Konnektor kann langsam sein)
- Retry: 3x mit 5s Delay

Bibliothek: soap (npm) + custom WSDL-Loader
```

### Card-Service: `server/services/ti/cardService.ts`

```
Verantwortlichkeit:
- Karten-Status abfragen (GetCards → FilterByType)
- SMC-B Verfügbarkeit prüfen → TI-Verbindungsstatus
- eHBA erkennen → Arzt-Identifikation
- eGK lesen → Versichertenstammdaten (VSD):
  - KVNR (Krankenversichertennummer)
  - Name, Geburtsdatum, Geschlecht
  - Versicherung (IK-Nummer, Name)
  - Postleitzahl
- eGK-Daten → Patient-Modell Mapping

Schnittstelle:
  getCardStatus(): Promise<{ smcb: CardInfo, ehba?: CardInfo, egk?: CardInfo }>
  readEGK(cardHandle: string): Promise<PatientVSD>
  verifyPin(cardType: string, pin: string): Promise<boolean>
```

### Konnektor-Health-Check: Integration in `server/index.ts`

```
GET /api/health (erweitert)
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "ti": {                          // NEU
    "enabled": true,
    "konnektor": "connected",      // "connected" | "disconnected" | "error"
    "smcb": "inserted",            // "inserted" | "not_present"
    "ehba": "inserted",
    "lastPing": "2026-03-04T10:30:00Z"
  }
}
```

---

## 6.5 ePA-Integration (FHIR R4)

### ePA-Architektur

```
DiggAI Server
     │
     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ ePA-FHIR     │────▶│ Konnektor    │────▶│ ePA-Aktensys │
│ Client       │     │ (PHR-Proxy)  │     │ (zentral)    │
│              │     │              │     │              │
│ FHIR R4      │     │ VAU-Kanal    │     │ Patient-Akte │
│ DE-Basispro- │     │ (verschlüs-  │     │ Dokumente    │
│ fil          │     │  selt)       │     │ MIOs          │
└──────────────┘     └──────────────┘     └──────────────┘
```

### FHIR-Operationen

| Operation | FHIR-Endpunkt | Beschreibung |
|-----------|---------------|-------------|
| Akte öffnen | `POST /epa/authz` | Autorisierung mit eGK-PIN |
| Dokument hochladen | `POST /epa/fhir/DocumentReference` | Anamnese-Bericht als PDF → ePA |
| Dokumente abrufen | `GET /epa/fhir/DocumentReference?patient={kvnr}` | Vorhandene Dokumente listen |
| Dokument lesen | `GET /epa/fhir/Binary/{id}` | Dokument-Inhalt abrufen |
| MIO schreiben | `POST /epa/fhir/Bundle` | Medizinisches Informationsobjekt |
| Akte schließen | `POST /epa/authz/close` | Session beenden |

### ePA-Client: `server/services/ti/epaClient.ts`

```
Verantwortlichkeit:
- FHIR R4 Client für ePA-Zugriff über Konnektor-Proxy
- Autorisierungsflow: eGK stecken → PIN eingeben → VAU-Kanal aufbauen
- DocumentReference erstellen: Anamnese-Bericht → PDF → Base64 → FHIR
- Metadaten-Mapping:
    DiggAI PatientSession → FHIR DocumentReference
    {
      resourceType: "DocumentReference",
      status: "current",
      type: { coding: [{ system: "http://loinc.org", code: "11506-3" }] },  // Anamnese
      subject: { identifier: { value: kvnr } },
      content: [{ attachment: { contentType: "application/pdf", data: base64 } }],
      context: { event: [{ coding: [{ system: "http://snomed.info/sct", code: "XXXXX" }] }] }
    }
- Dokument-Download: Binary abrufen → entschlüsseln → an Frontend

DE-Basisprofile:
- Patient: http://fhir.de/StructureDefinition/Patient
- KVNR Identifier: http://fhir.de/sid/gkv/kvid-10
- IK Nummer: http://fhir.de/sid/arge-ik/iknr

Bibliothek: fhir-kit-client (npm) oder custom fetch mit FHIR-Typen
```

### Anamnese → ePA Mapping

```
DiggAI Session                    →  ePA DocumentReference
─────────────────────────────────────────────────────────────
PatientSession.id                 →  identifier[0].value
PatientSession.completedAt        →  date
PatientSession.selectedService    →  type.coding (Service → LOINC)
Patient.encryptedName (entschl.)  →  subject.display
Answers[] → PDF (via PDFExport)   →  content[0].attachment.data
Patient.insuranceNumHash          →  subject.identifier (KVNR)

Service → LOINC Mapping:
  "Anamnese"     → 11506-3 (History of present illness)
  "Vorsorge"     → 11369-6 (History of immunization)
  "Rezept"       → 57833-6 (Prescription)
  "AU"           → 64297-5 (Certificate of incapacity)
  "BG-Unfall"    → 55111-9 (Accident report)
```

---

## 6.6 KIM-Integration

### KIM-Architektur

```
DiggAI Server
     │
     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ KIM-Client   │────▶│ KIM-Client-  │────▶│ KIM-Fach-    │
│ Service      │     │ modul        │     │ dienst       │
│              │     │ (SMTP/POP3)  │     │ (gematik)    │
│ Nodemailer   │     │              │     │              │
│ + POP3       │     │ S/MIME + TI  │     │ Routing      │
└──────────────┘     └──────────────┘     └──────────────┘
```

### KIM-Client: `server/services/ti/kimClient.ts`

```
Verantwortlichkeit:
- SMTP-Versand über KIM-Clientmodul (Port 465, TLS)
- POP3-Empfang über KIM-Clientmodul (Port 995, TLS)
- Nachrichtentypen:
  - Arztbrief / Befundübermittlung
  - eArztbrief (strukturiert, HL7 CDA)
  - Anamnese-Bericht weiterleiten
  - Überweisungsnachricht
- Attachment-Handling: PDF, CDA-XML, FHIR-Bundle als MIME-Anhang
- Adressbuch: KIM-Directory-Abfrage (LDAP über Konnektor)

KIM-Nachrichten-Aufbau:
  From: praxis.schmidt@kim.telematik
  To: labor.hamburg@kim.telematik
  Subject: Anamnese-Bericht Patient P-10001
  Content-Type: multipart/mixed
  
  Part 1: text/plain (Begleittext)
  Part 2: application/pdf (Anamnese-Bericht)
  Part 3: application/fhir+json (FHIR Bundle, optional)

Verschlüsselung: S/MIME durch KIM-Clientmodul automatisch
(DiggAI sendet Klartext → Clientmodul verschlüsselt mit TI-Zertifikat)

Bibliothek: nodemailer (SMTP) + poplib/node-pop3 (POP3)
```

### KIM-Adressbuch-Suche

```
GET /api/ti/kim/directory?name=Labor&city=Hamburg&specialty=Labormedizin
→ {
    results: [
      {
        kimAddress: "labor.hamburg@kim.telematik",
        displayName: "MVZ Labordiagnostik Hamburg",
        specialty: "Labormedizin",
        telematikId: "3-SMC-B-Testkarte-883110000116873"
      }
    ]
  }

Technisch: LDAP-Abfrage über Konnektor → VZD (Verzeichnisdienst)
```

---

## 6.7 Backend: API-Endpunkte

### Neue Datei: `server/routes/ti.ts`

#### TI-Konnektor Status

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `GET` | `/api/ti/status` | `admin` | Konnektor-Status + Karten-Info |
| `POST` | `/api/ti/connect` | `admin` | Konnektor-Verbindung herstellen |
| `POST` | `/api/ti/disconnect` | `admin` | Verbindung trennen |
| `GET` | `/api/ti/cards` | `arzt` | Gesteckte Karten auflisten |
| `POST` | `/api/ti/cards/:handle/verify-pin` | `arzt` | PIN am Terminal verifizieren |

#### eGK (Elektronische Gesundheitskarte)

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `POST` | `/api/ti/egk/read` | `mfa` | VSD von gesteckter eGK lesen |
| `POST` | `/api/ti/egk/match-patient` | `mfa` | eGK-Daten mit Patient.* matchen |

**Request/Response-Beispiel: eGK lesen**
```json
// POST /api/ti/egk/read
{ "cardHandle": "card-handle-123" }
// → 200
{
  "kvnr": "A123456789",
  "givenName": "Max",
  "familyName": "Mustermann",
  "birthDate": "1985-03-15",
  "gender": "M",
  "insurance": {
    "ikNr": "109034270",
    "name": "Techniker Krankenkasse",
    "type": "GKV"
  },
  "postalCode": "20095"
}
```

#### ePA

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `POST` | `/api/ti/epa/authorize` | `arzt` | ePA-Zugriff autorisieren (Patient-PIN) |
| `GET` | `/api/ti/epa/documents` | `arzt` | Dokumente in ePA auflisten |
| `GET` | `/api/ti/epa/documents/:id` | `arzt` | Einzelnes Dokument abrufen |
| `POST` | `/api/ti/epa/upload` | `arzt` | Anamnese-Bericht in ePA hochladen |
| `POST` | `/api/ti/epa/close` | `arzt` | ePA-Session beenden |

**Request/Response-Beispiel: Upload**
```json
// POST /api/ti/epa/upload
{
  "sessionId": "session-uuid",
  "documentType": "anamnese_report",
  "patientKvnr": "A123456789",
  "title": "Anamnese-Bericht 04.03.2026"
}
// → 201
{
  "epaDocumentId": "epa-doc-uuid",
  "status": "success",
  "message": "Dokument erfolgreich in ePA hochgeladen"
}
```

#### KIM

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `GET` | `/api/ti/kim/inbox` | `arzt` | KIM-Eingang abrufen |
| `GET` | `/api/ti/kim/inbox/:id` | `arzt` | Einzelne KIM-Nachricht |
| `POST` | `/api/ti/kim/send` | `arzt` | KIM-Nachricht senden |
| `GET` | `/api/ti/kim/directory` | `arzt` | KIM-Adressbuch durchsuchen |
| `DELETE` | `/api/ti/kim/inbox/:id` | `arzt` | KIM-Nachricht löschen |

**Request/Response-Beispiel: Senden**
```json
// POST /api/ti/kim/send
{
  "to": "labor.hamburg@kim.telematik",
  "subject": "Anamnese-Bericht Patient P-10001",
  "body": "Anbei der Anamnese-Bericht zur Weiterbehandlung.",
  "attachSessionId": "session-uuid",     // PDF automatisch generieren & anhängen
  "patientId": "patient-uuid"            // Für Audit-Log
}
// → 201
{
  "kimMessageId": "kim-msg-uuid",
  "status": "sent"
}
```

### Neue Datei: `server/routes/system.ts`

#### System-Konfiguration (Lokaler Modus)

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| `GET` | `/api/system/config` | `admin` | Alle System-Einstellungen |
| `PUT` | `/api/system/config/:key` | `admin` | Einstellung ändern |
| `GET` | `/api/system/deployment-mode` | `admin` | Aktueller Modus |
| `POST` | `/api/system/backup` | `admin` | Manuelles Backup auslösen |
| `GET` | `/api/system/backups` | `admin` | Backup-Historie |
| `POST` | `/api/system/restore/:backupId` | `admin` | Backup wiederherstellen |
| `GET` | `/api/system/logs` | `admin` | System-Logs (letzte 1000) |
| `GET` | `/api/system/network` | `admin` | Netzwerk-Status (LAN/Internet/TI) |

---

## 6.8 Backend: Services

### `server/services/ti/konnektorClient.ts`

(Siehe 6.4 — SOAP-Client für Konnektor)

### `server/services/ti/cardService.ts`

(Siehe 6.4 — Smartcard-Management)

### `server/services/ti/epaClient.ts`

(Siehe 6.5 — FHIR-Client für ePA)

### `server/services/ti/kimClient.ts`

(Siehe 6.6 — SMTP/POP3 für KIM)

### `server/services/system/deploymentManager.ts`

```
Verantwortlichkeit:
- Deployment-Modus erkennen und Feature-Flags setzen
- Feature-Gates:
    isCloud(): boolean     → Netlify CDN, kein TI
    isHybrid(): boolean    → Lokaler Server, optionaler TI
    isLocal(): boolean     → Full on-premise, TI + ePA + KIM
    isTIEnabled(): boolean → TI-Features verfügbar?
    isEPAEnabled(): boolean
    isKIMEnabled(): boolean
    isLLMEnabled(): boolean
- Middleware: featureGate('ti') → 403 wenn TI nicht aktiviert
- Startup-Checks: Konnektor erreichbar? Karten gesteckt? DB-Verbindung?

Verwendung:
  app.use('/api/ti/*', featureGate('ti'));
  app.use('/api/ti/epa/*', featureGate('epa'));
  app.use('/api/ti/kim/*', featureGate('kim'));
```

### `server/services/system/backupService.ts`

```
Verantwortlichkeit:
- Full Backup: pg_dump → AES-256-GCM verschlüsselt → /backups/
- Incremental Backup: Nur Änderungen seit letztem Backup (WAL-basiert)
- Config-Only Backup: SystemConfig + .env (ohne Patientendaten)
- Restore: Entschlüsseln → pg_restore → Prisma migrate
- Retention: Automatische Löschung nach X Tagen (konfigurierbar)
- Verification: SHA-256 Checksum nach Backup, Integrity-Check vor Restore
- Schedule: node-cron (Default: täglich 2:00 Uhr)
- Notification: Bei Fehler → Admin-Dashboard Alert + optional KIM-Nachricht

Backup-Format:
  /backups/
    backup-2026-03-04T02-00-full.enc        (verschlüsselt)
    backup-2026-03-04T02-00-full.sha256     (Checksum)
    backup-2026-03-04T02-00-full.meta.json  (Metadaten)
```

### `server/services/system/networkMonitor.ts`

```
Verantwortlichkeit:
- Periodischer Health-Check (alle 60s):
  - Internet: DNS-Lookup + HTTPS-Request zu bekanntem Endpunkt
  - LAN: Gateway-Ping
  - TI: Konnektor-SDS abrufbar?
  - Datenbank: Prisma $queryRaw("SELECT 1")
  - Redis: redis.ping()
- Status-Events via Socket.IO: 'system:network:status'
- Alert bei Ausfällen → Admin-Dashboard

Statusmodell:
{
  internet: { status: "up"|"down", latencyMs: 12 },
  lan: { status: "up", gateway: "192.168.1.1" },
  ti: { status: "connected", lastPing: "..." },
  database: { status: "up", connectionPool: 8 },
  redis: { status: "up" }
}
```

### `server/services/llm/localLLM.ts` (Pro-Modus)

```
Verantwortlichkeit:
- HTTP-Client für lokales Ollama/LM Studio
- Modell-Management: verfügbare Modelle abfragen, laden, entladen
- Prompt-Templates für medizinische Anwendungsfälle:
  - Anamnese-Zusammenfassung
  - Differentialdiagnose-Vorschlag
  - Medikamenten-Wechselwirkungsprüfung
  - Therapieplan-Entwurf
- Streaming-Response via Socket.IO: 'llm:stream:chunk'
- Rate-Limiting: Max 1 gleichzeitige Anfrage (GPU-Auslastung)
- Timeout: 120s (lokale LLMs können langsam sein)
- Fallback: Wenn LLM nicht verfügbar → Feature elegant deaktivieren

API-Kompatibilität:
  - OpenAI-kompatibel (/v1/chat/completions) → Ollama, LM Studio, localai
  - Modell-Empfehlung: medllama2:13b oder mistral:7b (für 8GB VRAM)
  
Sicherheit:
  - Keine Patientendaten an LLM senden (nur Symptome, keine Namen/IDs)
  - Anonymisierung vor LLM-Prompt
  - Disclaimer: "KI-Vorschlag, keine medizinische Diagnose"
```

---

## 6.9 Frontend: Admin-Erweiterungen

### Neue Admin-Tabs (Integration in AdminDashboard aus Modul 2)

#### Tab: TI-Status — `src/components/admin/TIStatusPanel.tsx`

```
┌─────────────────────────────────────────────────┐
│ Telematik-Infrastruktur                          │
├─────────────────────────────────────────────────┤
│                                                  │
│ Konnektor-Status                                 │
│ ┌─────────────────────────────────────────────┐  │
│ │ 🟢 Verbunden — 192.168.1.100:443            │  │
│ │ Letzter Ping: vor 30 Sekunden               │  │
│ │ Zertifikat gültig bis: 15.12.2027           │  │
│ └─────────────────────────────────────────────┘  │
│                                                  │
│ Smartcards                                       │
│ ┌───────────────┐  ┌───────────────┐            │
│ │ 💳 SMC-B      │  │ 💳 eHBA       │            │
│ │ ✅ Gesteckt   │  │ ✅ Gesteckt   │            │
│ │ ICCSN: 8031.. │  │ Dr. Schmidt   │            │
│ │ Bis: 12/2028  │  │ Bis: 06/2027  │            │
│ └───────────────┘  └───────────────┘            │
│                                                  │
│ Dienste                                          │
│ ┌─────────────────────────────────────────────┐  │
│ │ ePA   ✅ Aktiv    KIM  ✅ Aktiv              │  │
│ │ VSDM  ✅ Aktiv    eRezept ⬜ Nicht konfigur. │  │
│ └─────────────────────────────────────────────┘  │
│                                                  │
│ [Verbindung testen]  [Konfiguration bearbeiten]  │
└─────────────────────────────────────────────────┘

Datenquelle: GET /api/ti/status (Polling alle 30s)
Socket.IO: system:ti:status Events
```

#### Tab: ePA — `src/components/admin/EPAPanel.tsx`

```
┌─────────────────────────────────────────────────┐
│ Elektronische Patientenakte                      │
├─────────────────────────────────────────────────┤
│                                                  │
│ Patient auswählen: [Suche... ▾]                  │
│                                                  │
│ Patient: Max Mustermann (P-10001)                │
│ KVNR: A123456789                                 │
│                                                  │
│ ⚠️ eGK muss gesteckt sein + PIN bestätigt       │
│ [ePA-Zugriff autorisieren]                       │
│                                                  │
│ ── ePA-Dokumente ──                              │
│ ┌─────────────────────────────────────────────┐  │
│ │ 📄 Anamnese-Bericht 01.02.2026             │  │
│ │    Hochgeladen von: DiggAI                   │  │
│ │    [Ansehen] [Herunterladen]                 │  │
│ ├─────────────────────────────────────────────┤  │
│ │ 📄 Laborbefund 15.01.2026                   │  │
│ │    Quelle: Labor Hamburg                     │  │
│ │    [Ansehen] [Herunterladen]                 │  │
│ └─────────────────────────────────────────────┘  │
│                                                  │
│ [Aktuellen Anamnese-Bericht hochladen]           │
└─────────────────────────────────────────────────┘
```

#### Tab: KIM — `src/components/admin/KIMPanel.tsx`

```
┌─────────────────────────────────────────────────┐
│ KIM — Kommunikation im Medizinwesen              │
├─────────────────────────────────────────────────┤
│                                                  │
│ Postfach: praxis.schmidt@kim.telematik           │
│                                                  │
│ [Eingang (3)] [Gesendet] [Verfassen]             │
│                                                  │
│ ── Eingang ──                                    │
│ ┌─────────────────────────────────────────────┐  │
│ │ 🔵 Labor Hamburg                             │  │
│ │    Laborbefund Patient Mustermann            │  │
│ │    04.03.2026 09:15   📎 1 Anhang            │  │
│ ├─────────────────────────────────────────────┤  │
│ │ ○ Überweiser Dr. Meier                       │  │
│ │    Überweisung + Anamnese                    │  │
│ │    03.03.2026 16:30   📎 2 Anhänge           │  │
│ └─────────────────────────────────────────────┘  │
│                                                  │
│ ── Verfassen ──                                  │
│ An: [KIM-Adresse suchen...        ]              │
│ Betreff: [_________________________]             │
│ Patient: [Zuordnung optional ▾]                  │
│ Text: [                            ]             │
│ Anhänge: [+ Anamnese-Bericht anhängen]           │
│                                                  │
│ [Senden via KIM]                                 │
└─────────────────────────────────────────────────┘
```

#### Tab: System — `src/components/admin/SystemPanel.tsx`

```
┌─────────────────────────────────────────────────┐
│ Systemeinstellungen                              │
├─────────────────────────────────────────────────┤
│                                                  │
│ Deployment-Modus: [Lokal ▾]                      │
│                                                  │
│ Netzwerk-Status                                  │
│ ┌─────────────────────────────────────────────┐  │
│ │ Internet:  🟢 Verbunden (12ms)              │  │
│ │ LAN:       🟢 Gateway 192.168.1.1           │  │
│ │ TI:        🟢 Konnektor verbunden            │  │
│ │ Datenbank: 🟢 PostgreSQL (Pool: 8/20)       │  │
│ │ Redis:     🟢 Verbunden                      │  │
│ └─────────────────────────────────────────────┘  │
│                                                  │
│ Backup                                           │
│ ┌─────────────────────────────────────────────┐  │
│ │ Letztes Backup: 04.03.2026 02:00 ✅         │  │
│ │ Größe: 45.2 MB  •  1,234 Datensätze          │  │
│ │ Nächstes: 05.03.2026 02:00                   │  │
│ │                                               │  │
│ │ [Jetzt sichern] [Backup-Historie] [Restore]  │  │
│ └─────────────────────────────────────────────┘  │
│                                                  │
│ Lokales LLM                                      │
│ ┌─────────────────────────────────────────────┐  │
│ │ Status: 🟡 Deaktiviert                       │  │
│ │ Modell: medllama2:13b                        │  │
│ │ GPU: NVIDIA RTX 4060 (8GB VRAM)             │  │
│ │ [Aktivieren] [Modell wechseln]               │  │
│ └─────────────────────────────────────────────┘  │
│                                                  │
│ [System-Logs anzeigen]  [Diagnose ausführen]     │
└─────────────────────────────────────────────────┘
```

---

## 6.10 Docker / On-Premise Erweiterungen

### Erweiterte `docker-compose.yml`

```yaml
# Neue Services zum bestehenden Stack:

services:
  # ... bestehende: app, nginx, postgres, redis ...
  
  # TI-Konnektor Proxy (optional, wenn TI_ENABLED=true)
  ti-proxy:
    image: diggai/ti-proxy:latest
    build:
      context: .
      dockerfile: docker/Dockerfile.ti-proxy
    environment:
      - TI_KONNEKTOR_URL=${TI_KONNEKTOR_URL}
    volumes:
      - ./certs:/certs:ro           # SMC-B Zertifikat
    networks:
      - backend
      - ti-network                  # Separates Netzwerk für TI
    restart: unless-stopped
  
  # Backup-Service (optional)
  backup:
    image: diggai/backup:latest
    build:
      context: .
      dockerfile: docker/Dockerfile.backup
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - BACKUP_ENCRYPTION_KEY=${LOCAL_BACKUP_ENCRYPTION_KEY}
      - BACKUP_SCHEDULE=${LOCAL_BACKUP_SCHEDULE:-0 2 * * *}
    volumes:
      - backup-data:/backups
      - pgdata:/var/lib/postgresql/data:ro
    depends_on:
      - postgres
    networks:
      - backend
    restart: unless-stopped
  
  # Ollama LLM (optional, nur Pro-Modus)
  ollama:
    image: ollama/ollama:latest
    environment:
      - OLLAMA_HOST=0.0.0.0:11434
    volumes:
      - ollama-data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    profiles:
      - llm                         # Nur mit --profile llm starten
    networks:
      - backend
    restart: unless-stopped

volumes:
  # ... bestehende: pgdata, redisdata, uploads ...
  backup-data:
  ollama-data:

networks:
  # ... bestehend: backend ...
  ti-network:
    driver: bridge
    internal: true                  # Kein Internet-Zugang
```

### Docker-Compose Profile

```bash
# Minimal (Cloud-Modus Simulation)
docker compose up

# Standard (Lokal ohne TI)
docker compose up

# Mit TI-Konnektor
docker compose --profile ti up

# Mit LLM
docker compose --profile llm up

# Vollständig (Pro-Modus)
docker compose --profile ti --profile llm up
```

### Nginx-Erweiterung: `docker/nginx.conf`

```nginx
# Neue Location-Blöcke:

# TI-API (nur aus lokalem Netzwerk)
location /api/ti/ {
    allow 192.168.0.0/16;
    allow 10.0.0.0/8;
    allow 172.16.0.0/12;
    deny all;
    proxy_pass http://app:3001;
}

# System-API (nur Admin aus LAN)
location /api/system/ {
    allow 192.168.0.0/16;
    allow 10.0.0.0/8;
    deny all;
    proxy_pass http://app:3001;
}

# LLM-Proxy (wenn aktiviert)
location /api/llm/ {
    proxy_pass http://ollama:11434;
    proxy_read_timeout 120s;      # LLM-Timeouts
}

# PWA-spezifisch
location /pwa {
    try_files $uri $uri/ /index.html;
}

# mTLS für Konnektor (separater Server-Block)
server {
    listen 8443 ssl;
    ssl_client_certificate /certs/ti-ca.pem;
    ssl_verify_client on;
    
    location /konnektor-proxy/ {
        proxy_pass https://ti-proxy:443;
    }
}
```

---

## 6.11 Backup & Recovery

### Backup-Strategie

```
┌─────────────────────────────────────────────────────┐
│                 Backup-Pipeline                      │
│                                                      │
│  Täglich 02:00 (Cron)                               │
│       │                                              │
│       ▼                                              │
│  pg_dump --format=custom                             │
│       │                                              │
│       ▼                                              │
│  AES-256-GCM Verschlüsselung                        │
│  (separater Backup-Key aus ENV)                      │
│       │                                              │
│       ▼                                              │
│  SHA-256 Checksum berechnen                          │
│       │                                              │
│       ├──▶ /backups/backup-{timestamp}-full.enc     │
│       ├──▶ /backups/backup-{timestamp}-full.sha256  │
│       └──▶ BackupRecord in DB                        │
│                                                      │
│  Retention: 30 Tage (konfigurierbar)                 │
│  Ältere automatisch gelöscht                         │
└─────────────────────────────────────────────────────┘
```

### Restore-Flow

```
Admin wählt Backup aus Liste
       │
       ▼
Checksum verifizieren (SHA-256)
       │ ✅
       ▼
⚠️ Warnung: "Alle aktuellen Daten werden überschrieben"
       │ Bestätigung
       ▼
Entschlüsseln (AES-256-GCM mit Backup-Key)
       │
       ▼
pg_restore --clean --if-exists
       │
       ▼
prisma migrate deploy (ausstehende Migrationen)
       │
       ▼
Server-Neustart
       │
       ▼
✅ Restore abgeschlossen
```

---

## 6.12 BSI-Compliance

### BSI TR-03161 (Mobile Gesundheits-App) — Modul 5

| Anforderung | Maßnahme |
|-------------|----------|
| O.Auth_1 — Authentifizierung | Passwort-Policy (8+, Komplexität) + WebAuthn |
| O.Auth_2 — Token-Management | JWT mit Rotation, Redis-Blacklist, Device-Binding |
| O.Cryp_1 — Verschlüsselung | AES-256-GCM für PII, TLS 1.2+ |
| O.Cryp_2 — Schlüsselverwaltung | PBKDF2 Key-Derivation, kein Klartext in Storage |
| O.Data_1 — Datenspeicherung | IndexedDB verschlüsselt, kein Klartext-Cache |
| O.Data_2 — Datenminimierung | Nur benötigte Daten cachen, automatische Bereinigung |
| O.Ntwk_1 — Netzwerksicherheit | TLS 1.2+, HSTS, CSP, Certificate Pinning |
| O.Paid_1 — Logging | AuditLog für alle Zugriffe (bestehend) |
| O.Plat_1 — Plattform | Mindest-Browser-Version, Feature-Detection |

### BSI TR-02102 (Kryptografie) — Modul 6

| Anforderung | Maßnahme |
|-------------|----------|
| Symmetrische Verschlüsselung | AES-256-GCM (bereits implementiert) |
| Hashfunktionen | SHA-256 für Integrität (bereits implementiert) |
| Schlüssellängen | 256 Bit AES, 2048+ Bit RSA für TI |
| TLS | 1.2 minimum, 1.3 bevorzugt, BSI-Cipher-Suites |
| Zertifikat-Validierung | mTLS für Konnektor, Chain-Validation |

---

# Querschnittsthemen

## 7.1 i18n-Erweiterungen

### Neue i18n Namespaces

| Namespace | Datei | Schlüssel (ca.) |
|-----------|-------|-----------------|
| `pwa` | `locales/{lang}/pwa.json` | ~120 Keys |
| `ti` | `locales/{lang}/ti.json` | ~60 Keys |
| `system` | `locales/{lang}/system.json` | ~40 Keys |

### Beispiel-Keys `pwa.json`

```json
{
  "dashboard": {
    "greeting": "Guten {{timeOfDay}}, {{name}}!",
    "nextAppointment": "Ihr nächster Termin",
    "quickActions": "Schnellzugriff",
    "medicationsDue": "{{count}} Medikamente fällig",
    "unreadMessages": "{{count}} neue Nachrichten"
  },
  "diary": {
    "title": "Gesundheits-Tagebuch",
    "newEntry": "Neuer Eintrag",
    "trends": "Trends",
    "types": {
      "symptom": "Symptom",
      "vitals": "Vitaldaten",
      "mood": "Stimmung",
      "note": "Notiz"
    },
    "vitals": {
      "bloodPressure": "Blutdruck",
      "heartRate": "Puls",
      "temperature": "Temperatur",
      "weight": "Gewicht",
      "bloodSugar": "Blutzucker",
      "oxygenSaturation": "Sauerstoffsättigung"
    },
    "trend": {
      "improving": "Verbesserung",
      "stable": "Stabil",
      "worsening": "Verschlechterung"
    }
  },
  "medications": {
    "title": "Meine Medikamente",
    "confirmIntake": "Einnahme bestätigen",
    "skip": "Überspringen",
    "adherence": "Adhärenz",
    "streak": "{{count}} Tage ununterbrochen"
  },
  "messages": {
    "title": "Nachrichten",
    "compose": "Neue Nachricht",
    "to": "An",
    "subject": "Betreff",
    "send": "Senden"
  },
  "auth": {
    "login": "Anmelden",
    "register": "Registrieren",
    "email": "E-Mail-Adresse",
    "password": "Passwort",
    "forgotPassword": "Passwort vergessen?",
    "biometricLogin": "Mit Biometrie anmelden",
    "verifyEmail": "E-Mail bestätigen"
  },
  "offline": {
    "banner": "Offline — Daten werden bei Verbindung synchronisiert",
    "syncing": "Synchronisiere...",
    "syncComplete": "Alle Daten synchronisiert",
    "syncError": "Synchronisierung fehlgeschlagen"
  }
}
```

### Beispiel-Keys `ti.json`

```json
{
  "status": {
    "title": "Telematik-Infrastruktur",
    "connected": "Verbunden",
    "disconnected": "Nicht verbunden",
    "error": "Fehler"
  },
  "cards": {
    "smcb": "Praxisausweis (SMC-B)",
    "ehba": "Heilberufsausweis (eHBA)",
    "egk": "Gesundheitskarte (eGK)",
    "inserted": "Gesteckt",
    "notPresent": "Nicht vorhanden",
    "blocked": "Gesperrt"
  },
  "epa": {
    "title": "Elektronische Patientenakte",
    "authorize": "Zugriff autorisieren",
    "pinRequired": "Bitte Patient-PIN am Terminal eingeben",
    "upload": "In ePA hochladen",
    "uploadSuccess": "Dokument erfolgreich hochgeladen",
    "documents": "ePA-Dokumente"
  },
  "kim": {
    "title": "KIM — Kommunikation im Medizinwesen",
    "inbox": "Eingang",
    "sent": "Gesendet",
    "compose": "Verfassen",
    "send": "Senden via KIM",
    "searchDirectory": "KIM-Adressbuch durchsuchen"
  }
}
```

**Sprachen:** DE, EN, TR, AR, UK, ES, FA, IT, FR, PL (10 Sprachen, bestehend)

---

## 7.2 Berechtigungen (Modul 2)

### Neue Permissions für Module 5+6

| Code | Beschreibung | Admin | Arzt | MFA |
|------|-------------|-------|------|-----|
| `pwa.accounts.view` | PWA-Accounts einsehen | ✅ | ✅ | ✅ |
| `pwa.accounts.manage` | PWA-Accounts verwalten | ✅ | ❌ | ❌ |
| `pwa.messages.send` | Nachrichten an Patienten | ✅ | ✅ | ✅ |
| `pwa.messages.read` | Patienten-Nachrichten lesen | ✅ | ✅ | ✅ |
| `ti.status.view` | TI-Status einsehen | ✅ | ✅ | ✅ |
| `ti.config.manage` | TI-Konfiguration ändern | ✅ | ❌ | ❌ |
| `ti.egk.read` | eGK auslesen | ✅ | ✅ | ✅ |
| `ti.epa.read` | ePA-Dokumente lesen | ✅ | ✅ | ❌ |
| `ti.epa.write` | In ePA schreiben | ✅ | ✅ | ❌ |
| `ti.kim.send` | KIM-Nachrichten senden | ✅ | ✅ | ❌ |
| `ti.kim.receive` | KIM-Eingang lesen | ✅ | ✅ | ✅ |
| `system.config.view` | System-Einstellungen sehen | ✅ | ❌ | ❌ |
| `system.config.manage` | System-Einstellungen ändern | ✅ | ❌ | ❌ |
| `system.backup.manage` | Backups erstellen/restore | ✅ | ❌ | ❌ |
| `system.logs.view` | System-Logs einsehen | ✅ | ❌ | ❌ |
| `llm.use` | Lokales LLM nutzen | ✅ | ✅ | ❌ |

---

## 7.3 Abhängigkeiten zwischen Modulen

```
Modul 5 (PWA) benötigt:
  → Modul 1: Queue-Persistenz (QueueEntry) für Termin-Status-Push
  → Modul 2: Permission-System für PWA-spezifische Rechte
  → Modul 2: Admin-Dashboard für PWA-Account-Verwaltung

Modul 6 (Lokal/TI) benötigt:
  → Modul 2: Admin-Dashboard für TI-Status/System-Panels
  → Modul 3 (PLAN_MODUL_3_4): FHIR-Adapter für ePA (direkt wiederverwendbar!)
  → Modul 3 (PLAN_MODUL_3_4): KIM-Integration (in Modul 3/4 bereits spezifiziert)
  → Modul 4 (PLAN_MODUL_3_4): Therapieplan-Export für ePA-Upload

Modul 5 + 6 zusammen:
  → PWA braucht lokalen Server (Modul 6) für Offline-Sync im On-Premise-Modus
  → ePA-Zugriff von PWA aus: Nur wenn lokal deployed (Konnektor nicht cloud-erreichbar)
```

---

# Implementierungsreihenfolge

## Phase-Übersicht

```
Phase 4a: PWA-Basis (Auth + Offline)           ~6h Agent-Zeit
Phase 4b: PWA-Features (Diary + Reminders)      ~5h Agent-Zeit
Phase 4c: PWA-Messaging + Push                  ~4h Agent-Zeit
Phase 4d: Lokaler Modus (Docker + Config)       ~4h Agent-Zeit
Phase 4e: TI-Integration (Konnektor + eGK)      ~6h Agent-Zeit
Phase 4f: ePA + KIM + LLM                       ~5h Agent-Zeit
                                         ─────────────────
                                    TOTAL: ~30h Agent-Zeit
```

### Phase 4a: PWA-Basis (Patienten-Auth + Offline-Infrastruktur)

```
Reihenfolge:
1. Prisma: PatientAccount + PushSubscription Modelle
2. Backend: patientAuth.service.ts (Register, Login, Verify)
3. Backend: server/routes/pwa.ts (Auth-Endpunkte)
4. Frontend: patientAccountStore.ts (Zustand-Store)
5. Frontend: PatientLogin.tsx, PatientRegister.tsx
6. Vite: vite-plugin-pwa Integration
7. IndexedDB: src/lib/offlineDb.ts (Dexie-Setup)
8. SW: Workbox-Migration von handgeschriebenem SW
9. Hooks: useOfflineSync.ts, usePWAInstall.ts
10. Layout: PWAShell.tsx + BottomNavigation
11. Tests: Auth-Flow E2E, Offline-Persist, SW-Lifecycle
```

### Phase 4b: PWA-Features (Tagebuch + Medikamente + Termine)

```
Reihenfolge:
1. Prisma: HealthDiaryEntry, MedicationReminder, ReminderLog
2. Backend: diary.service.ts, reminder.service.ts
3. Backend: Diary + Reminder API-Endpunkte
4. Frontend: HealthDiary.tsx, DiaryEntryForm.tsx, DiaryTrends.tsx
5. Frontend: MedicationList.tsx, ReminderConfig.tsx
6. Frontend: AppointmentList.tsx, AppointmentRequest.tsx
7. Offline: IndexedDB-Sync für Diary + Medications
8. Tests: Diary CRUD, Trend-Berechnung, Reminder-Scheduling
```

### Phase 4c: PWA-Messaging + Push-Notifications

```
Reihenfolge:
1. Prisma: SecureMessage Modell
2. Backend: messaging.service.ts, push.service.ts
3. Backend: Message + Push API-Endpunkte
4. Backend: reminderWorker.ts (Cron-Job)
5. Frontend: MessageInbox.tsx, MessageThread.tsx, MessageCompose.tsx
6. Socket.IO: pwa:{accountId} Room + Events
7. Push: SW Push-Handler, Notification-Actions
8. Tests: E2E Messaging, Push-Delivery, Offline-Queue
```

### Phase 4d: Lokaler Modus (Docker + System-Config)

```
Reihenfolge:
1. Prisma: SystemConfig, BackupRecord Modelle
2. Backend: deploymentManager.ts (Feature-Gates)
3. Backend: backupService.ts, networkMonitor.ts
4. Backend: server/routes/system.ts Endpunkte
5. Docker: docker-compose.yml Erweiterungen (Profiles)
6. Nginx: Erweiterte nginx.conf (TI/LAN-Restrictions)
7. Frontend: SystemPanel.tsx
8. Tests: Feature-Gate Logik, Backup/Restore, Network-Monitor
```

### Phase 4e: TI-Integration (Konnektor + eGK)

```
Reihenfolge:
1. Prisma: TIConnection Modell
2. Backend: konnektorClient.ts (SOAP mTLS)
3. Backend: cardService.ts (SMC-B, eHBA, eGK)
4. Backend: server/routes/ti.ts (Status + Cards)
5. Frontend: TIStatusPanel.tsx
6. Docker: ti-proxy Service + Zertifikate
7. Tests: Mock-Konnektor, Card-Status, VSD-Parsing

Hinweis: Für Entwicklung wird ein gematik-Testsimulator benötigt
  (https://github.com/gematik/app-Authenticator oder RU-Umgebung)
```

### Phase 4f: ePA + KIM + LLM

```
Reihenfolge:
1. Prisma: EPADocument, KIMMessage Modelle
2. Backend: epaClient.ts (FHIR R4 über Konnektor)
3. Backend: kimClient.ts (SMTP/POP3)
4. Backend: localLLM.ts (Ollama-Client)
5. Backend: ePA + KIM Endpunkte in ti.ts
6. Frontend: EPAPanel.tsx, KIMPanel.tsx
7. Frontend: LLM-Integration in ArztDashboard
8. Docker: Ollama-Service (Profile: llm)
9. Tests: FHIR-Mapping, KIM-Versand, LLM-Prompt

Hinweis: KIM nutzt die in PLAN_MODUL_3_4 definierte Adapter-Schicht
```

---

# Neue Dependencies

## npm-Pakete (zu installieren)

| Paket | Version | Zweck | Modul |
|-------|---------|-------|-------|
| `vite-plugin-pwa` | ^1.0 | Workbox-Integration, auto SW | 5 |
| `dexie` | ^4.0 | IndexedDB-Abstraktion | 5 |
| `web-push` | ^3.7 | Server-side Push-Notifications | 5 |
| `@simplewebauthn/server` | ^13.0 | WebAuthn Registration/Assertion | 5 |
| `@simplewebauthn/browser` | ^13.0 | WebAuthn Client-Side | 5 |
| `node-cron` | ^3.0 | Reminder-Scheduling, Backup-Cron | 5+6 |
| `nodemailer` | ^7.0 | E-Mail-Versand (Verifizierung, KIM) | 5+6 |
| `soap` | ^1.1 | SOAP-Client für Konnektor | 6 |
| `fhir-kit-client` | ^2.0 | FHIR R4 Client für ePA | 6 |
| `poplib` / `node-pop3` | ^0.3 | POP3-Client für KIM-Empfang | 6 |

## DevDependencies

| Paket | Zweck |
|-------|-------|
| `@types/web-push` | TypeScript-Typen |
| `@types/nodemailer` | TypeScript-Typen |
| `@types/node-cron` | TypeScript-Typen |
| `msw` | Mock Service Worker für PWA-API-Tests |

---

# Testplan

## Modul 5: PWA-Tests

### Unit-Tests

| Test | Datei | Beschreibung |
|------|-------|-------------|
| PatientAuth | `server/__tests__/pwa/auth.test.ts` | Registrierung, Login, WebAuthn, Token-Rotation |
| DiaryService | `server/__tests__/pwa/diary.test.ts` | CRUD, Trend-Berechnung, Batch-Sync |
| ReminderService | `server/__tests__/pwa/reminder.test.ts` | Cron-Parsing, Adhärenz, Push-Versand |
| PushService | `server/__tests__/pwa/push.test.ts` | Subscription, VAPID, Payload-Format |
| OfflineSync | `src/__tests__/offlineSync.test.ts` | Queue-Management, Conflict Resolution |
| IndexedDB | `src/__tests__/offlineDb.test.ts` | Dexie CRUD, Encryption |

### E2E-Tests (Playwright)

| Test | Datei | Beschreibung |
|------|-------|-------------|
| PWA-Install | `e2e/pwa-install.spec.ts` | Manifest, SW-Registrierung, A2HS |
| PWA-Auth | `e2e/pwa-auth.spec.ts` | Register → Verify → Login → Dashboard |
| PWA-Diary | `e2e/pwa-diary.spec.ts` | Eintrag erstellen, Trends ansehen |
| PWA-Offline | `e2e/pwa-offline.spec.ts` | Offline-Modus, Queue, Reconnect-Sync |
| PWA-Push | `e2e/pwa-push.spec.ts` | Push-Subscription, Notification-Display |
| PWA-Medication | `e2e/pwa-medication.spec.ts` | Reminder erstellen, Einnahme bestätigen |

## Modul 6: TI/System-Tests

### Unit-Tests

| Test | Datei | Beschreibung |
|------|-------|-------------|
| DeploymentManager | `server/__tests__/system/deployment.test.ts` | Feature-Gates, Modus-Erkennung |
| BackupService | `server/__tests__/system/backup.test.ts` | Encrypt/Decrypt, Checksum, Restore |
| KonnektorClient | `server/__tests__/ti/konnektor.test.ts` | SOAP-Envelope, mTLS, SDS-Parsing |
| CardService | `server/__tests__/ti/cards.test.ts` | VSD-Parsing, Karten-Status |
| EPAClient | `server/__tests__/ti/epa.test.ts` | FHIR-Mapping, Upload/Download |
| KIMClient | `server/__tests__/ti/kim.test.ts` | SMTP-Versand, POP3-Empfang, Adressbuch |
| LocalLLM | `server/__tests__/llm/localLLM.test.ts` | Prompt-Templates, Streaming, Anonymisierung |

### Integration-Tests

| Test | Datei | Beschreibung |
|------|-------|-------------|
| TI-Roundtrip | `e2e/ti-integration.spec.ts` | Konnektor → eGK → ePA (mit Mock-Konnektor) |
| KIM-Roundtrip | `e2e/kim-integration.spec.ts` | Senden → Empfangen (mit Mock-KIM) |
| Backup-Restore | `e2e/backup-restore.spec.ts` | Full Backup → Restore → Daten intakt |
| LLM-Integration | `e2e/llm-integration.spec.ts` | Prompt → Stream → Response (mit Mock-Ollama) |

---

# Migrations-Strategie

## Prisma-Migration

```bash
# Neue Migration erstellen
npx prisma migrate dev --name add_pwa_and_ti_models

# Enthält:
# - PatientAccount (+ Relation zu Patient)
# - HealthDiaryEntry
# - MedicationReminder + ReminderLog
# - PushSubscription
# - SecureMessage
# - TIConnection
# - EPADocument
# - KIMMessage
# - SystemConfig
# - BackupRecord
# - Erweiterungen: Patient.epaKvnr, PatientMedication.isActive/.startDate/.endDate
```

## Bestehende Dateien: Änderungen

| Datei | Änderung |
|-------|----------|
| `prisma/schema.prisma` | +10 neue Modelle, +3 Feld-Erweiterungen |
| `server/index.ts` | Route-Imports (pwa.ts, ti.ts, system.ts), Feature-Gate Middleware, Reminder-Worker Start |
| `server/middleware/auth.ts` | Neue Rolle `patient_pwa`, angepasste Token-TTLs |
| `server/socket.ts` | Neuer Room `pwa:{accountId}`, Events für Messaging + Push |
| `src/App.tsx` | `/pwa/*` Routen, `vite-plugin-pwa` Integration |
| `vite.config.ts` | PWA-Plugin Konfiguration |
| `public/manifest.json` | Screenshots, Shortcuts, Share-Target |
| `public/sw.js` | → Ersetzt durch Workbox-generierten SW |
| `docker-compose.yml` | +3 Services (ti-proxy, backup, ollama), Profiles |
| `docker/nginx.conf` | TI/System Location-Blöcke, mTLS Server-Block |
| `server/.env.example` | +20 neue ENV-Variablen |
| `package.json` | +10 neue Dependencies |

## Datenmigration

### Bestehende Patienten → PWA-Accounts

```
NICHT automatisch migrieren!

Ablauf:
1. Patient besucht Praxis → erhält QR-Code für PWA-Registrierung
2. Patient registriert sich selbst (Self-Service)
3. Verknüpfung via patientNumber + birthDate (Verifikation)
4. Bestehende Daten (Medications, Sessions) werden sichtbar

Kein Datenverlust, kein Zwang, vollständig opt-in.
```

### Cloud → Lokal Migration

```
Für Praxen die von Cloud auf On-Premise umsteigen:
1. Cloud-Daten exportieren (Admin → Backup → Export)
2. Docker-Stack lokal aufsetzen
3. Import: docker exec -i postgres pg_restore < export.dump
4. prisma migrate deploy
5. TI-Konnektor konfigurieren
6. DNS/IP umstellen

Dokumentiert in: docs/MIGRATION_CLOUD_TO_LOCAL.md (zu erstellen)
```

---

## Neue Dateien — Gesamtübersicht

### Backend

```
server/
  routes/
    pwa.ts                              ← PWA-API (Auth, Diary, Reminders, Messages, Push)
    ti.ts                               ← TI-API (Status, Cards, ePA, KIM)
    system.ts                           ← System-API (Config, Backup, Logs)
  services/
    pwa/
      patientAuth.service.ts            ← Registrierung, Login, WebAuthn
      diary.service.ts                  ← Gesundheits-Tagebuch CRUD + Trends
      reminder.service.ts               ← Medikamenten-Erinnerungen + Adhärenz
      push.service.ts                   ← Web-Push Versand + Subscription-Management
      messaging.service.ts              ← Secure Messaging E2E
    ti/
      konnektorClient.ts               ← SOAP mTLS Client für Konnektor
      cardService.ts                   ← SMC-B/eHBA/eGK Management
      epaClient.ts                     ← FHIR R4 Client für ePA
      kimClient.ts                     ← SMTP/POP3 für KIM
    system/
      deploymentManager.ts             ← Feature-Gates, Modus-Erkennung
      backupService.ts                 ← Backup/Restore/Checksum
      networkMonitor.ts                ← Periodische Health-Checks
    llm/
      localLLM.ts                      ← Ollama-Client, Prompt-Templates
  jobs/
    reminderWorker.ts                  ← Cron: Reminder-Push versenden
```

### Frontend

```
src/
  pages/pwa/
    PatientLogin.tsx                    ← E-Mail + Passwort + WebAuthn
    PatientRegister.tsx                 ← 3-Schritt Registrierung
    EmailVerification.tsx               ← Token-Verifizierung
    PatientDashboard.tsx                ← Quick-Actions, Vital-Charts, Reminders
    HealthDiary.tsx                     ← Tagebuch-Liste + Filter
    DiaryEntryForm.tsx                  ← Eintrag erstellen/bearbeiten
    DiaryTrends.tsx                     ← Trend-Charts + Export
    MedicationList.tsx                  ← Medikamente + Adhärenz
    ReminderConfig.tsx                  ← Erinnerung konfigurieren
    AppointmentList.tsx                 ← Termine + Anfragen
    AppointmentRequest.tsx              ← Termin anfragen
    MessageInbox.tsx                    ← Nachrichten-Inbox
    MessageThread.tsx                   ← Thread-Ansicht
    MessageCompose.tsx                  ← Nachricht verfassen
    PatientProfile.tsx                  ← Profil + WebAuthn
    PWASettings.tsx                     ← Push, Sprache, Theme, Löschen
  components/pwa/
    PWAShell.tsx                        ← Layout mit BottomNav + TopBar
    BottomNavigation.tsx                ← 5-Tab Navigation
    OfflineBanner.tsx                   ← Offline-Indikator
    InstallPrompt.tsx                   ← A2HS Promotion
    SyncStatus.tsx                      ← Sync-Fortschritt
    VitalChart.tsx                      ← Wiederverwendbarer Vital-Chart
    MoodSlider.tsx                      ← Emoji-basierter Stimmungs-Slider
    AdherenceBar.tsx                    ← Adhärenz-Fortschrittsbalken
    MessageBubble.tsx                   ← Chat-Blase für Messaging
  components/admin/
    TIStatusPanel.tsx                   ← Konnektor + Karten Status
    EPAPanel.tsx                        ← ePA Dokumenten-Verwaltung
    KIMPanel.tsx                        ← KIM Postfach + Compose
    SystemPanel.tsx                     ← Deployment, Backup, Network, LLM
  store/
    patientAccountStore.ts              ← PWA Auth-State
  hooks/
    usePWAInstall.ts                    ← Install-Prompt Management
    useOfflineSync.ts                   ← Offline-Erkennung + Sync
    usePushNotifications.ts             ← Push-Subscription Management
  lib/
    offlineDb.ts                        ← Dexie IndexedDB Setup
```

### Docker / Config

```
docker/
  Dockerfile.ti-proxy                   ← TI-Konnektor mTLS Proxy
  Dockerfile.backup                     ← Backup-Worker
  nginx.conf                            ← Erweitert (TI, LAN, mTLS)

locales/
  de/pwa.json                           ← ~120 Keys
  de/ti.json                            ← ~60 Keys
  de/system.json                        ← ~40 Keys
  (+ 9 weitere Sprachen)
```

---

> **Ende PLAN_MODUL_5_6.md**  
> **Nächster Schritt:** Prompt 1d — Konsolidierung aller Pläne + Projekt-Gesamtplan  
> **Oder:** Direkt Prompt 2 — Implementierung starten (Phase 2a aus PLAN_MODUL_1_2)
