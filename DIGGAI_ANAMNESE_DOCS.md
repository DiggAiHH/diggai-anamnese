# DiggAI Anamnese — Gesamtdokumentation / Complete Documentation

> **Version**: 2.0 | **Stand / Date**: 05.03.2026  
> **Status**: Konsolidierte Single Source of Truth / Consolidated SSOT  
> **Deployment-Ziel / Target**: Docker Compose (all-in-one)  
> **Sprache / Language**: Deutsch + English (bilingual)

---

## Inhaltsverzeichnis / Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technische Architektur / Technical Architecture](#2-technische-architektur--technical-architecture)
3. [Datenbank-Schema / Database Schema](#3-datenbank-schema--database-schema)
4. [API-Referenz / API Reference](#4-api-referenz--api-reference)
5. [Frontend-Features](#5-frontend-features)
6. [Backend-Services](#6-backend-services)
7. [Sicherheit & Compliance / Security & Compliance](#7-sicherheit--compliance--security--compliance)
8. [Fragebogen-Logik / Questionnaire Logic](#8-fragebogen-logik--questionnaire-logic)
9. [Internationalisierung / Internationalization (i18n)](#9-internationalisierung--internationalization-i18n)
10. [Fehlerkatalog / Error Catalog](#10-fehlerkatalog--error-catalog)
11. [Fehlende Features / Missing Features Gap Analysis](#11-fehlende-features--missing-features-gap-analysis)
12. [Deployment & Infrastruktur / Infrastructure](#12-deployment--infrastruktur--infrastructure)
13. [Deployment-Plan (fehlerfreies Go-Live)](#13-deployment-plan-fehlerfreies-go-live)
14. [Roadmap & Next Steps](#14-roadmap--next-steps)
15. [Marketing & Geschäftsmodell / Business Model](#15-marketing--geschäftsmodell--business-model)
16. [Appendix](#16-appendix)

---

## 1. Executive Summary

### DE — Projektübersicht

**DiggAI Anamnese** ist eine volldigitale, KI-gestützte Anamnese-Plattform für Arztpraxen. Sie ersetzt den klassischen Papier-Fragebogen durch einen interaktiven, mehrsprachigen, barrierefreien digitalen Fragebogen mit Echtzeit-Triage, intelligenter Patientensteuerung und nahtloser Integration in Praxisverwaltungssysteme (PVS).

### EN — Project Overview

**DiggAI Anamnese** is a fully digital, AI-powered medical history platform for physician practices. It replaces paper-based questionnaires with an interactive, multilingual, accessible digital questionnaire system featuring real-time triage, intelligent patient routing, and seamless practice management system (PVS) integration.

### Kernzahlen / Key Metrics

| Metrik / Metric | Wert / Value |
| --- | --- |
| Medizinische Fragen / Medical Questions | 270+ in 13 Modulen/modules |
| Unterstützte Sprachen / Supported Languages | 10 (DE, EN, AR, TR, UK, ES, FA, IT, FR, PL) |
| API-Endpoints | 30+ REST + Socket.IO |
| Datenbank-Modelle / Database Models | 45 Prisma models |
| Frontend-Komponenten / Components | 60+ React components |
| Frontend-Routen / Routes | 30+ |
| Triage-Regeln / Triage Rules | 10 (4 CRITICAL + 6 WARNING) |
| Eingabetypen / Input Types | 15 spezialisierte/specialized |
| i18n Schlüssel / Translation Keys | ~1.812 |
| Sicherheitsmaßnahmen / Security Measures | AES-256-GCM, JWT HS256, bcrypt, CSP, HSTS |

### Modul-Status-Übersicht / Module Status Overview

| Modul | Name | Fertigstellung / Completion | Status |
| ------- | ------ | ---------------------------- | -------- |
| **Core** | Fragebogen + Triage + Export | **85%** | ✅ Produktiv / Production-ready |
| **M1** | Queue & Wartezimmer / Waiting Room | **60%** | ⚠️ Teilweise / Partial |
| **M2** | Admin Dashboard | **50%** | ⚠️ Teilweise / Partial |
| **M3** | PVS Integration | **30%** | 🔧 Boilerplate |
| **M4** | Therapieplanung / Therapy Planning | **25%** | 📋 Schema only |
| **M5** | Patient PWA Portal | **30%** | 🔧 UI-Skeleton |
| **M6** | Lokales Deploy + TI / Local + TI | **20%** | 🐳 Docker vorhanden |
| **M7** | NFC & Behandlungsflows / Treatment Flows | **15%** | ⚡ Minimal |
| **M8** | Advanced UX (Avatar, Telemedizin) | **25%** | 🔧 Mixed |

---

## 2. Technische Architektur / Technical Architecture

### 2.1 Tech-Stack

| Schicht / Layer | Technologie / Technology | Version |
| --- | --- | --- |
| **Frontend Framework** | React | 19.2 |
| **Build Tool** | Vite | 8.0-beta.13 |
| **Styling** | TailwindCSS | 4.2 |
| **State Management** | Zustand | 5.0 |
| **Data Fetching** | TanStack React Query | 5.90 |
| **Routing** | React Router | 7.13 |
| **i18n** | i18next + react-i18next | 25.8 / 16.5 |
| **Charts** | Recharts | 3.7 |
| **Icons** | Lucide React | 0.575 |
| **Backend Framework** | Express.js | 5.2 |
| **ORM** | Prisma | 6.19 |
| **Database (Prod)** | PostgreSQL | 16 Alpine |
| **Database (Dev)** | SQLite | — |
| **Cache / Queue** | Redis | 7 Alpine |
| **Real-time** | Socket.IO | 4.8 |
| **Auth** | JWT (jsonwebtoken) | 9.0 |
| **Encryption** | AES-256-GCM (native crypto) | — |
| **Input Validation** | Zod | 4.3 |
| **HTTP Client** | Axios | 1.13 |
| **OCR** | Tesseract.js | 7.0 |
| **QR Code** | html5-qrcode + qrcode.react | 2.3 / 4.2 |
| **AI (lokal)** | Ollama | 0.5 |
| **TypeScript** | TypeScript | 5.9 |
| **Testing** | Playwright | 1.58 |
| **Containerization** | Docker + Docker Compose | Multi-stage |
| **Reverse Proxy** | Nginx | 1.27 Alpine |

### 2.2 Verzeichnisstruktur / Directory Structure

```text
anamnese-app/
├── prisma/
│   ├── schema.prisma           # Datenbank-Schema (45 Models)
│   ├── seed.ts                 # Basis-Seed (270+ Atoms)
│   ├── seed-comprehensive.ts   # Vollständiger Seed (50+ Patienten)
│   └── seed-content.ts         # Wartezimmer-Inhalte
│
├── server/                     # Express.js Backend
│   ├── index.ts                # Entry Point + 30 Route-Module
│   ├── config.ts               # Environment Validation
│   ├── db.ts                   # Prisma Client Singleton
│   ├── socket.ts               # Socket.IO Setup
│   ├── redis.ts                # Redis Client
│   ├── middleware/
│   │   ├── auth.ts             # JWT + RBAC + Token-Blacklist
│   │   └── audit.ts            # HIPAA Audit Logging
│   ├── engine/
│   │   ├── TriageEngine.ts     # 10 Red-Flag Regeln
│   │   └── QuestionFlowEngine.ts # 3-Stufen Routing
│   ├── routes/                 # 30+ API Route-Module
│   │   ├── sessions.ts, answers.ts, atoms.ts, arzt.ts, mfa.ts
│   │   ├── admin.ts, patients.ts, chats.ts, queue.ts
│   │   ├── export.ts, upload.ts, content.ts, roi.ts
│   │   ├── pvs.ts, therapy.ts, pwa.ts, system.ts, ti.ts
│   │   ├── nfc.ts, flows.ts, feedback.ts, payment.ts
│   │   ├── praxis-chat.ts, avatar.ts, telemedizin.ts
│   │   ├── gamification.ts, forms.ts, epa.ts, wunschbox.ts
│   │   └── payments.ts
│   ├── services/               # Business Logic
│   │   ├── encryption.ts       # AES-256-GCM + SHA-256
│   │   ├── sanitize.ts         # HTML Input Sanitization
│   │   ├── queueService.ts     # Queue Lifecycle
│   │   ├── roiService.ts       # ROI Calculation
│   │   ├── ai/                 # LLM Integration (Ollama)
│   │   ├── avatar/             # Staff Avatar + TTS
│   │   ├── epa/                # ePA Document Management
│   │   ├── forms/              # Form Builder Backend
│   │   ├── gamification/       # Achievement System
│   │   ├── nfc/                # NFC Tag Handling
│   │   ├── payment/            # Stripe/Adyen
│   │   ├── pvs/                # PVS Adapters (GDT/FHIR/KIM)
│   │   ├── pwa/                # Patient Portal Backend
│   │   ├── system/             # System Monitoring
│   │   ├── telemedizin/        # Video Consultation
│   │   ├── therapy/            # Therapy Plan Engine
│   │   └── ti/                 # TI Connector
│   └── jobs/
│       ├── cleanup.ts          # DB Cleanup (cron)
│       └── roiSnapshot.ts      # ROI Metric Snapshots
│
├── src/                        # React Frontend
│   ├── main.tsx                # Entry Point + Service Worker
│   ├── App.tsx                 # Router (30+ Routes)
│   ├── i18n.ts                 # i18next Config (10 Sprachen)
│   ├── index.css               # TailwindCSS + Custom Properties
│   ├── api/
│   │   └── client.ts           # Axios + JWT Interceptor + Demo-API
│   ├── store/
│   │   ├── sessionStore.ts     # Zustand: Patient Session
│   │   ├── themeStore.ts       # Zustand: Dark/Light Theme
│   │   └── modeStore.ts        # Zustand: Demo/Live Mode
│   ├── stores/
│   │   └── pwaStore.ts         # Zustand: PWA Patient Auth
│   ├── hooks/
│   │   ├── useApi.ts           # React Query Hooks (30+)
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useVoiceNavigation.ts # Web Speech API
│   │   ├── useFullscreen.ts
│   │   └── useSocketEvents.ts  # Socket.IO Event Types
│   ├── components/             # 60+ Komponenten
│   │   ├── LandingPage.tsx     # Service-Auswahl + DSGVO
│   │   ├── Questionnaire.tsx   # Haupt-Fragebogen
│   │   ├── QuestionRenderer.tsx # Dynamische Frage-Darstellung
│   │   ├── AnswerSummary.tsx   # Medizinischer Bericht
│   │   ├── PDFExport.tsx       # Signatur + A4 Print
│   │   ├── RedFlagOverlay.tsx  # CRITICAL Triage Alerts
│   │   ├── PatientWartezimmer.tsx # Wartezimmer-Display
│   │   ├── ChatBubble.tsx      # FAQ Bot + Team Chat
│   │   ├── inputs/             # 15 spezialisierte Eingaben
│   │   ├── admin/              # 12 Admin-Panels
│   │   ├── waiting/            # 8 Wartezimmer-Entertainment
│   │   ├── pvs/                # 8 PVS-Integrationskomponenten
│   │   ├── therapy/            # 9 Therapie-Komponenten
│   │   ├── ai/                 # 4 KI-Features
│   │   ├── avatar/             # 2 Avatar-Komponenten
│   │   ├── gamification/       # 3 Gamification
│   │   ├── nfc/, payment/, pwa/, telemedizin/, chat/
│   │   └── ui/                 # Basis-UI (Button, Card, etc.)
│   ├── pages/                  # 19+ Seiten-Komponenten
│   │   ├── AdminDashboard.tsx, ArztDashboard.tsx, MFADashboard.tsx
│   │   ├── checkout/, epa/, flows/, forms/, kiosk/
│   │   ├── nfc/, pwa/, staff/, telemedizin/
│   │   └── DatenschutzPage.tsx, ImpressumPage.tsx
│   ├── data/
│   │   ├── questions.ts        # 270+ Frage-Definitionen
│   │   └── new-questions.ts
│   ├── utils/                  # Business Logic Utilities
│   │   ├── questionLogic.ts    # Branching & Validation
│   │   ├── exportUtils.ts      # PDF/CSV/JSON Export
│   │   ├── chatNLU.ts          # Rule-based NLU
│   │   ├── secureStorage.ts    # AES-256-GCM localStorage
│   │   ├── patternAuth.ts      # SHA-256 Pattern Auth
│   │   ├── haptics.ts          # Vibration API
│   │   └── speechSupport.ts    # Web Speech API
│   ├── lib/
│   │   ├── socketClient.ts     # Socket.IO Client
│   │   └── offlineDb.ts        # IndexedDB Offline Storage
│   └── types/
│       ├── question.ts         # TypeScript Interfaces
│       └── admin.ts
│
├── docker/
│   └── nginx/                  # Nginx Config + TLS
├── public/
│   ├── manifest.json           # PWA Manifest
│   ├── sw.js                   # Service Worker v3
│   └── locales/                # i18n Translation JSON Files
├── docker-compose.yml          # 6 Services (app, postgres, redis, nginx, ...)
├── Dockerfile                  # Multi-Stage Build (node:22-alpine)
├── netlify.toml                # Static Frontend Deployment
├── vite.config.ts              # Build + Dev + Proxy Config
├── tsconfig.json               # TypeScript Project References
├── tsconfig.app.json           # Frontend TS Config
├── tsconfig.server.json        # Backend TS Config
├── tsconfig.node.json          # Build Tools TS Config
├── eslint.config.js            # ESLint Flat Config
└── package.json                # Dependencies + Scripts

```

### 2.3 State Management (4 Zustand Stores)

| Store | Datei / File | Zweck / Purpose | Persistenz / Persistence |
| --- | --- | --- | --- |
| **sessionStore** | `store/sessionStore.ts` | Patient Session: sessionId, token, flowStep, atoms, answers, alerts, progress | Memory (Prisma-backed via API) |
| **themeStore** | `store/themeStore.ts` | Dark/Light Theme Toggle | localStorage |
| **modeStore** | `store/modeStore.ts` | Demo/Live API Switching | localStorage |
| **pwaStore** | `stores/pwaStore.ts` | PWA Patient Auth: token, accountId | localStorage |

### 2.4 Routing / Frontend Routes

#### Öffentliche Routen / Public Routes

| Route | Komponente / Component | Zweck / Purpose |
| --- | --- | --- |
| `/` | HomeScreen | Kiosk-Einstieg mit 3 Kacheln / Kiosk entry with 3 tiles |
| `/patient` | PatientApp (Landing → Questionnaire) | Patienten-Fragebogen / Patient questionnaire |
| `/datenschutz` | DatenschutzPage | DSGVO Art. 13/14 Datenschutzerklärung |
| `/impressum` | ImpressumPage | §5 DDG Impressum |
| `/nfc` | NfcLanding | NFC Check-in Hub |
| `/flows/live` | PatientFlowLiveBoard | Echtzeit-Warteschlangenstatus / Real-time queue |
| `/checkout/:sessionId` | CheckoutWizard | Zahlung + Feedback / Payment + feedback |
| `/feedback` | AnonymousFeedbackForm | Anonymes Feedback |
| `/telemedizin` | TelemedizinScheduler | Video-Sprechstunde planen / Schedule video consultation |
| `/telemedizin/room/:sessionId` | VideoRoom | WebRTC Video-Raum |
| `/forms/builder` | FormBuilderPage | Benutzerdefinierte Formulare / Custom forms |
| `/forms/run/:formId` | FormRunnerPage | Formular ausfüllen / Fill out form |
| `/epa/shared/:token` | SharedEpaView | Geteilte ePA-Ansicht / Shared ePA view |
| `/pwa/login` | PwaLogin | PWA Patient Login |

#### Geschützte Routen / Protected Routes (RBAC)

| Route | Rollen / Roles | Komponente / Component |
| --- | --- | --- |
| `/verwaltung/login` | — | StaffLogin |
| `/verwaltung/arzt` | arzt, admin | ArztDashboard |
| `/verwaltung/mfa` | mfa, admin | MFADashboard |
| `/verwaltung/admin` | admin | AdminDashboard |
| `/verwaltung/docs` | arzt, mfa, admin | DokumentationPage |
| `/verwaltung/handbuch` | arzt, mfa, admin | HandbuchPage |
| `/verwaltung/system` | admin | SystemPanel |
| `/verwaltung/ti` | arzt, admin | TIStatusPanel |
| `/flows/builder` | arzt, admin | TreatmentFlowBuilder |
| `/kiosk` | mfa, arzt, admin | KioskDashboard |
| `/epa/:patientId` | arzt, admin | PrivateEpaDashboard |
| `/pwa/*` | patient (PWA auth) | PwaDashboard, PwaDiary, PwaMeasures, PwaMessages, PwaSettings |

---

## 3. Datenbank-Schema / Database Schema

### 3.1 Übersicht / Overview

**ORM**: Prisma 6.19 | **Provider**: PostgreSQL 16 (Prod) / SQLite (Dev)

**45 Models** in folgenden Domänen / in the following domains:

| Domäne / Domain | Models | Status |
| --- | --- | --- |
| **Core** (Patient, Session, Answer, Atom) | 6 | ✅ Vollständig / Complete |
| **Triage & Alerts** | 2 | ✅ Vollständig |
| **Staff & Auth** | 4 | ✅ Vollständig |
| **Queue & Waiting** | 3 | ⚠️ API teilweise / partial |
| **PVS Integration** (M3) | 4 | ⚠️ Schema vorhanden, API teilweise |
| **Therapy** (M4) | 3 | ⚠️ Schema vorhanden, API minimal |
| **Patient Portal/PWA** (M5) | 4 | ⚠️ Schema vorhanden, API teilweise |
| **TI/gematik** (M6) | 3 | ⚠️ Schema vorhanden, API minimal |
| **NFC/Flows** (M7) | 5 | ⚠️ Schema vorhanden, API minimal |
| **Advanced UX** (M8) | 5 | ⚠️ Schema vorhanden, API teilweise |
| **Admin/Analytics** | 6 | ⚠️ Gemischt / Mixed |

### 3.2 Core Models (Vollständig / Complete)

#### Patient

```text
Patient {
  id, encryptedName, birthDate, gender
  insuranceType (GKV/PKV/SELBST/BG)
  insuranceNumHash (SHA-256)
  securityPattern (bcrypt)
  sessionCount, hasPrivateEPA, bonusPoints
  → sessions[], medications[], surgeries[]
  → therapyPlans[], clinicalAlerts[]
  → account (PatientAccount), privateEpa (PrivateEPA)
}
```

#### PatientSession

```text
PatientSession {
  id, patientId, selectedService
  isNewPatient, language, status (ACTIVE/COMPLETED/SUBMITTED/EXPIRED)
  progress, startedAt, completedAt, submittedAt
  assignedArztId, calledAt, deviceFingerprint
  pvsExported, pvsExportRef
  → answers[], triageEvents[], chatMessages[]
  → queueEntry, appointment
  → therapyPlans[], clinicalAlerts[]
  → flowProgress (PatientFlowProgress)
}
```

#### Answer

```text
Answer {
  id, sessionId, atomId
  value (raw), encryptedValue (AES-256-GCM)
  isEncrypted, skipped
  answeredAt, responseTimeMs
}
```

#### MedicalAtom

```text
MedicalAtom {
  id (z.B. "0001"), module, section, subsection
  questionDE, questionEN, questionAR, questionTR (+6 more)
  questionType (TEXT/NUMBER/SELECT/MULTISELECT/DATE/RADIO/TEXTAREA/BOOLEAN/FILE/VOICE/CAMERA)
  options (JSON), validationRules (JSON), branchingLogic (JSON)
  isPII, isCritical, isActive
  orderIndex, helpText, placeholder
}
```

### 3.3 Models mit fehlenden APIs / Models Missing API Endpoints

| Model | API Status | Fehlend / Missing |
| --- | --- | --- |
| WaitingContent | ⚠️ Teilweise | Admin CRUD |
| WaitingAnalytics | ❌ | Tracking endpoint |
| Permission / RolePermission | ❌ | Permission management |
| PatientAccount | ⚠️ | PIN login, email verification |
| HealthDiaryEntry | ❌ | CRUD endpoints |
| MedicationReminder | ❌ | Scheduler + push |
| PushSubscription | ❌ | Subscription management |
| TherapyPlan / TherapyMeasure | ⚠️ | Full CRUD |
| ClinicalAlert | ⚠️ | Alert engine |
| PvsConnection / PvsTransferLog | ⚠️ | Real adapter connections |
| PvsFieldMapping / PvsPatientLink | ❌ | Mapping CRUD |
| PatientFlowStep / PatientFlowProgress | ❌ | Flow execution engine |
| FlowTransition / TreatmentFlow | ⚠️ | Step transitions |
| PaymentTransaction | ❌ | Transaction tracking |
| StaffAvatar | ⚠️ | TTS/Voice cloning |
| FormTemplate | ❌ | Template library |
| PrivateEPA / EpaDocument | ⚠️ | Real document storage |
| WunschboxEntry | ⚠️ | AI processing |

---

## 4. API-Referenz / API Reference

### 4.1 Übersicht / Overview

**Base URL**: `http://localhost:3001/api`  
**Auth**: JWT Bearer Token (HS256)  
**Rate Limiting**: 200 req/15min (global), 10 req/15min (auth endpoints)

### 4.2 Core Endpoints

#### Sessions

| Method | Endpoint | Auth | Status | Beschreibung / Description |
| --- | --- | --- | --- | --- |
| POST | `/api/sessions` | — | ✅ | Session erstellen / Create session |
| POST | `/api/sessions/qr-token` | Token | ✅ | QR-Token für Ärzte / QR token for physicians |
| GET | `/api/sessions/:id/state` | Token+Owner | ✅ | Session-State + Antworten / Session state + answers |

#### Answers

| Method | Endpoint | Auth | Status | Beschreibung |
| --- | --- | --- | --- | --- |
| POST | `/api/answers/:sessionId` | Token+Owner | ✅ | Antwort absenden + Triage / Submit answer + triage |

#### Atoms (Medical Questions)

| Method | Endpoint | Auth | Status | Beschreibung |
| --- | --- | --- | --- | --- |
| GET | `/api/atoms` | Token | ✅ | Batch-Laden / Batch load questions |
| GET | `/api/atoms/:id` | Token | ✅ | Einzelfrage / Single question |
| PUT | `/api/atoms/reorder` | Admin | ✅ | Reihenfolge ändern / Reorder |
| PUT | `/api/atoms/:id/toggle` | Admin | ✅ | Aktivieren/Deaktivieren / Toggle active |
| POST | `/api/atoms/draft` | Admin | ✅ | Draft speichern / Save draft |

### 4.3 Staff Endpoints

#### Arzt (Physician Dashboard)

| Method | Endpoint | Auth | Status | Beschreibung |
| --- | --- | --- | --- | --- |
| POST | `/api/arzt/login` | Rate limit (5/15min) | ✅ | Staff Login |
| POST | `/api/arzt/logout` | Token | ✅ | Token Blacklist |
| GET | `/api/arzt/sessions` | Arzt/Admin | ✅ | Alle Sessions / All sessions |
| GET | `/api/arzt/sessions/:id` | Arzt/Admin/MFA | ✅ | Session-Detail + entschlüsselte PII |

#### MFA (Medical Frontend Assistant)

| Method | Endpoint | Auth | Status | Beschreibung |
| --- | --- | --- | --- | --- |
| GET | `/api/mfa/sessions` | MFA/Admin | ✅ | Session-Liste |
| GET | `/api/mfa/doctors` | MFA/Admin | ✅ | Verfügbare Ärzte / Available doctors |
| POST | `/api/mfa/sessions/:id/assign` | MFA/Admin | ✅ | Session zuweisen / Assign session |

#### Admin

| Method | Endpoint | Auth | Status | Beschreibung |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/stats` | Admin | ✅ | Dashboard KPIs |
| GET | `/api/admin/sessions/timeline` | Admin | ✅ | 30-Tage Trend |
| GET | `/api/admin/analytics/services` | Admin | ✅ | Service-Verteilung / Service breakdown |
| GET | `/api/admin/analytics/triage` | Admin | ✅ | Triage-Events Timeline |

### 4.4 Feature Endpoints

#### Queue / Wartezimmer

| Method | Endpoint | Auth | Status |
| --- | --- | --- | --- |
| POST | `/api/queue/join` | Token | ✅ |
| GET | `/api/queue` | Arzt/Admin/MFA | ✅ |
| GET | `/api/queue/position/:sessionId` | Token | ✅ |
| GET | `/api/queue/flow-config/:sessionId` | Token | ✅ |
| PUT | `/api/queue/:id/call` | MFA/Admin | ✅ |
| PUT | `/api/queue/:id/treat` | — | ⚠️ Teilweise |
| POST | `/api/queue/:id/feedback` | — | ⚠️ Teilweise |

#### Content / Wartezimmer-Inhalte

| Method | Endpoint | Auth | Status |
| --- | --- | --- | --- |
| GET | `/api/content/waiting` | Token | ✅ |
| POST | `/api/content/waiting/:id/view` | Token | ✅ |
| POST | `/api/content/waiting/:id/like` | — | ⚠️ Teilweise |
| POST | `/api/content/waiting/quiz/:id/answer` | — | ⚠️ Teilweise |

#### Export

| Method | Endpoint | Auth | Status |
| --- | --- | --- | --- |
| GET | `/api/export/:sessionId` | Arzt | ✅ PDF/CSV/JSON |

#### Upload

| Method | Endpoint | Auth | Status |
| --- | --- | --- | --- |
| POST | `/api/upload` | Token | ✅ Max 10MB (JPG/PNG/PDF) |
| GET | `/api/upload/:filename` | Token | ✅ Download |

#### Payment

| Method | Endpoint | Auth | Status |
| --- | --- | --- | --- |
| POST | `/api/payment/intent` | — | ✅ Stripe/Adyen Intent |
| POST | `/api/payment/nfc-charge` | — | ✅ NFC Tap-to-Pay |
| POST | `/api/payment/webhook` | — | ⚠️ Signatur nicht verifiziert |

#### PVS Integration

| Method | Endpoint | Auth | Status |
| --- | --- | --- | --- |
| GET/POST | `/api/pvs/connection` | Admin | ✅ |
| PUT/DELETE | `/api/pvs/connection/:id` | Admin | ✅ |
| POST | `/api/pvs/connection/:id/test` | Admin | ✅ |
| GET | `/api/pvs/connection/:id/capabilities` | Admin | ✅ |
| GET/POST | `/api/pvs/mapping` | — | ⚠️ Teilweise |
| POST/GET | `/api/pvs/transfer` | — | ⚠️ Teilweise |

#### Therapy

| Method | Endpoint | Auth | Status |
| --- | --- | --- | --- |
| POST | `/api/therapy/plans` | Arzt/Admin | ✅ |
| GET/PATCH | `/api/therapy/plans/:id` | — | ⚠️ Teilweise |
| POST | `/api/therapy/plans/:id/measures` | — | ⚠️ Teilweise |
| GET/POST | `/api/therapy/templates` | — | ⚠️ Teilweise |
| GET/PATCH | `/api/therapy/alerts` | — | ⚠️ Teilweise |

#### PWA Patient Portal

| Method | Endpoint | Auth | Status |
| --- | --- | --- | --- |
| POST | `/api/pwa/register` | — | ✅ |
| POST | `/api/pwa/login` | — | ✅ |
| POST | `/api/pwa/login/pin` | — | ⚠️ Teilweise |
| POST/GET | `/api/pwa/diary` | PatientAuth | ✅ |
| POST | `/api/pwa/sync` | — | ⚠️ Teilweise |

#### EPA (Electronic Patient Record)

| Method | Endpoint | Auth | Status |
| --- | --- | --- | --- |
| GET | `/api/epa/:patientId` | Token | ✅ |
| POST/GET | `/api/epa/:patientId/documents` | Token | ✅ |
| GET/DELETE | `/api/epa/:patientId/documents/:docId` | Token | ✅ |
| POST/GET | `/api/epa/:patientId/shares` | Token | ✅ |
| DELETE | `/api/epa/:patientId/shares/:shareId` | Token | ✅ |
| POST | `/api/epa/:patientId/export` | Token | ✅ |

#### Telemedizin

| Method | Endpoint | Auth | Status |
| --- | --- | --- | --- |
| POST | `/api/telemedizin/session` | Token | ✅ |
| GET | `/api/telemedizin/session/:id` | Token | ✅ |
| POST | `/api/telemedizin/session/:id/join` | Token | ✅ |
| POST | `/api/telemedizin/session/:id/end` | Token | ✅ |
| POST | `/api/telemedizin/session/:id/cancel` | Token | ✅ |

#### TI (Telematik-Infrastruktur)

| Method | Endpoint | Auth | Status |
| --- | --- | --- | --- |
| GET | `/api/ti/status` | Token | ✅ |
| POST | `/api/ti/ping` | Token | ✅ |
| POST | `/api/ti/refresh` | Admin | ✅ |
| GET | `/api/ti/cards` | Token | ✅ |
| POST | `/api/ti/egk/read` | Token | ✅ |

#### Gamification

| Method | Endpoint | Auth | Status |
| --- | --- | --- | --- |
| POST | `/api/gamification/achievement` | — | ✅ |
| GET | `/api/gamification/staff/:staffId` | — | ✅ |
| GET | `/api/gamification/leaderboard` | — | ✅ |
| GET | `/api/gamification/stats` | — | ✅ |

#### Weitere / Additional

| Bereich / Area | Endpoints | Status |
| --- | --- | --- |
| Patients (Identifikation) | POST `/api/patients/identify` | ✅ |
| Chats | GET `/api/chats/:sessionId` | ✅ |
| ROI | GET `/api/roi/today`, `/roi/history`, `/roi/config`, `/roi/projection` | ✅ |
| System | GET/PUT `/api/system/deployment`, `/system/features`, `/system/config` | ✅ |
| Wunschbox | POST/GET `/api/wunschbox` | ✅ |
| Feedback | POST `/api/feedback/anonymous`, GET `/api/feedback` | ✅ |
| NFC | POST `/api/nfc/scan`, CRUD `/api/nfc/checkpoints` | ✅ |
| Flows | CRUD `/api/flows`, POST `/api/flows/start` | ✅ |
| Forms | CRUD `/api/forms`, POST `/api/forms/ai-generate` | ✅ |
| Praxis-Chat | GET/POST `/api/praxis-chat/...` | ✅ |
| Avatar | CRUD `/api/avatar/...` | ⚠️ Teilweise |
| IGEL Services | GET `/api/payments/services`, POST `/api/payments/checkout` | ✅ |

### 4.5 Socket.IO Events

| Event | Richtung / Direction | Beschreibung / Description |
| --- | --- | --- |
| `queue:position` | Server → Client | Warteschlangen-Update / Queue position update |
| `queue:called` | Server → Client | Patient aufgerufen / Patient called |
| `queue:mood-check` | Server → Client | Stimmungs-Abfrage / Mood check prompt |
| `triage:alert` | Server → Arzt Room | Kritischer Triage Alert |
| `join:session` | Client → Server | Session-Raum beitreten |
| `staff:presence` | Bidirectional | Online/Away/Busy Status |

---

## 5. Frontend-Features

### 5.1 Patienten-Journey / Patient Journey

```text
HomeScreen (Kiosk)
    ↓
LandingPage (Service-Auswahl + DSGVO-Einwilligung)
    ↓ 8 Services: Termin, Rezept, AU, Unfall, Überweisung, Absage, Unterlagen, Rückruf
Questionnaire (Fragebogen-Flow)
    ├── QuestionRenderer (dynamische Frage-Typen)
    ├── HistorySidebar (Navigation + Zurück)
    ├── ProgressBar (Fortschrittsanzeige)
    ├── MedicationManager (strukturierte Medikamenten-Eingabe)
    ├── SurgeryManager (OP-Historie)
    ├── SchwangerschaftCheck (Schwangerschafts-Screening)
    ├── UnfallBGFlow (BG-Unfallformular, 5 Schritte)
    ├── RedFlagOverlay (CRITICAL Triage Alerts)
    ├── CameraScanner (OCR via Tesseract.js)
    ├── InfoBreak (Wartezeit-Entertainment)
    └── SessionRecoveryDialog (Unterbrochene Session wiederherstellen)
    ↓
AnswerSummary (Strukturierter medizinischer Bericht)
    ↓
PDFExport (Signatur-Canvas + A4 Druck)
    ↓
SubmittedPage (Bestätigung + QR-Code)
    ↓
CheckoutWizard (Zahlung + Feedback + Datenlöschung)
```

### 5.2 Eingabe-Komponenten / Input Components (15)

| Komponente / Component | Typ / Type | Besonderheit / Feature |
| --- | --- | --- |
| TextInput | Textfeld | + Spracheingabe (Web Speech API) |
| NumberInput | Zahleneingabe | Min/Max Validation |
| SelectInput | Dropdown | Searchable |
| MultiSelectInput | Mehrfachauswahl | Chips UI |
| RadioInput | Einzelauswahl | Accessible Radio Group |
| DateInput | Datumsauswahl | Age-dependent validation |
| TextAreaInput | Mehrzeiliger Text | + Spracheingabe |
| FileInput | Datei-Upload | Drag & Drop, Max 10MB |
| VoiceInput | Sprache-zu-Text | Web Speech API |
| VoiceOutput | Text-zu-Sprache | Native TTS |
| CameraScanner | QR/Barcode Scanner | + OCR via Tesseract.js |
| MedicationScanner | Medikamenten-Scan | Barcode → Medication DB |
| PatternLock | Muster-Sperre | SHA-256 Pattern Auth |
| BgAccidentForm | BG-Unfallformular | 5-Step Wizard |
| PatientIdentify | Patienten-ID | Insurance# + DOB Lookup |

### 5.3 Admin-Panels (12)

| Panel | Zweck / Purpose |
| --- | --- |
| AtomEditorPanel | Fragen bearbeiten / Edit questions |
| AtomListPanel | Fragenkatalog / Question library |
| AuditLogTab | Compliance-Tracking |
| BranchingLogicEditor | Bedingte Logik / Conditional logic |
| FragebogenBuilder | Fragebogen-Komposition / Questionnaire composer |
| PermissionMatrix | Rollenbasierte Zugriffskontrolle / RBAC |
| PvsAdminPanel | PVS-Verbindungsmanagement / PVS connection management |
| ROIDashboard | Return-on-Investment Analytik |
| TherapyAnalyticsTab | Behandlungsergebnisse / Treatment outcomes |
| UserManagementTab | Benutzerverwaltung / Staff administration |
| WaitingContentTab | Wartezimmer-Inhalte / Entertainment content |
| WunschboxTab | Feature-Wünsche / Feature requests |

### 5.4 Wartezimmer-Entertainment / Waiting Room (8 Components)

| Komponente | Zweck |
| --- | --- |
| QueueStatusCard | Position + geschätzte Wartezeit |
| HealthTipCarousel | Gesundheitstipps-Karussell |
| WaitingGames | Mini-Spiele |
| MiniQuiz | Bildungs-Quiz |
| MoodCheck | Stimmungsabfrage |
| BreathingExercise | Atemübungen |
| InfoBreak | Bildungsinhalte |
| PraxisNewsFeed | Praxis-Nachrichten |

### 5.5 Dashboards

| Dashboard | Rollen | Features |
| --- | --- | --- |
| **ArztDashboard** | Arzt, Admin | Patienten-Übersicht, Triage-Alerts, Session-Details, Export |
| **MFADashboard** | MFA, Admin | Patienten-Zuweisung, Warteschlange, Staff-Chat |
| **AdminDashboard** | Admin | 7 Tabs: Stats, Users, Atoms, Audit, Therapy, Wunschbox, Content |

---

## 6. Backend-Services

### 6.1 Middleware-Stack

| Middleware | Zweck / Purpose | Details |
| --- | --- | --- |
| **Helmet** | Security Headers | CSP, HSTS (1yr, preload), X-Frame-Options: DENY |
| **CORS** | Cross-Origin | Nur Frontend-URL, kein Wildcard |
| **Rate Limiter** | Brute-Force Schutz | 200 req/15min global, 10/15min auth |
| **sanitizeBody** | Input Sanitization | HTML-Tags entfernen |
| **auditMiddleware** | HIPAA Audit Log | Jeder Request wird in DB geloggt |
| **requireAuth** | JWT Verification | Bearer Token + Blacklist-Check |
| **requireRole** | RBAC | patient/arzt/mfa/admin |
| **requireSessionOwner** | Ownership | Patienten nur eigene Sessions |

### 6.2 Triage Engine (10 Red-Flag Regeln)

| # | Regel / Rule | Level | Auslöser / Trigger |

| --- | --- | --- | --- |
| 1 | Brustschmerzen / Chest pain | CRITICAL | atom 7001 specific values |
| 2 | Suizidalität / Suicidality | CRITICAL | atom 7501 specific values |
| 3 | Atemnot / Dyspnea | CRITICAL | atom 7101 specific values |
| 4 | Bewusstlosigkeit / Loss of consciousness | CRITICAL | atom 7601 specific values |
| 5 | Hohes Fieber / High fever | WARNING | Temperature > 39.5°C |
| 6 | Schwangerschaftskomplikationen | WARNING | Pregnancy + specific symptoms |
| 7 | Starke Blutung / Severe bleeding | WARNING | atom 7301 specific values |
| 8 | Allergische Reaktion / Allergic reaction | WARNING | atom 6001 specific values |
| 9 | Kopfverletzung / Head injury | WARNING | Accident + head trauma |
| 10 | Akuter Bauchschmerz / Acute abdominal pain | WARNING | atom 7201 specific values |

### 6.3 Background Jobs

| Job | Schedule | Zweck |
| --- | --- | --- |
| **cleanup** | Täglich / Daily | Abgelaufene Sessions entfernen, Token-Blacklist bereinigen |
| **roiSnapshot** | Stündlich / Hourly | ROI-Metriken speichern |

### 6.4 Encryption Service

| Funktion / Function | Algorithmus | Zweck |
| --- | --- | --- |
| `encrypt(text)` | AES-256-GCM | PII-Felder in Answers verschlüsseln |
| `decrypt(encryptedData)` | AES-256-GCM | PII für Arzt-Ansicht entschlüsseln |
| `hashEmail(email)` | SHA-256 + Salt | E-Mail-Pseudonymisierung |
| `isPIIAtom(atomId)` | Lookup | Prüft ob Atom PII enthält (Name, Tel, etc.) |

---

## 7. Sicherheit & Compliance / Security & Compliance

### 7.1 Implementierte Sicherheitsmaßnahmen / Implemented Security Measures

| Maßnahme / Measure | Implementation | Status |
| --- | --- | --- |
| **Verschlüsselung at Rest** | AES-256-GCM für PII-Felder | ✅ |
| **Verschlüsselung in Transit** | TLS 1.3 (Nginx) | ✅ |
| **Authentifizierung** | JWT HS256 mit JTI + Token-Blacklist + httpOnly Cookies | ✅ |
| **Autorisierung** | RBAC (patient/arzt/mfa/admin) | ✅ |
| **Payment Webhook** | Stripe HMAC-SHA256 Signatur-Verifikation + Replay-Schutz | ✅ |
| **Passwort-Hashing** | bcrypt (saltRounds: 12) | ✅ |
| **Input Sanitization** | sanitize-html + Regex | ✅ |
| **XSS Prevention** | CSP Headers + HTML Escaping | ✅ |
| **CSV Injection Prevention** | Formula char prefixing | ✅ |
| **Rate Limiting** | express-rate-limit (200/15min) | ✅ |
| **Security Headers** | Helmet.js (HSTS, CSP, X-Frame, Referrer-Policy) | ✅ |
| **CORS** | Restricted to frontend URL | ✅ |
| **File Upload Security** | UUID filenames, path traversal protection, MIME validation | ✅ |
| **Audit Logging** | Every API request logged (HIPAA) | ✅ |
| **Sensitive Data Redaction** | Passwords, tokens, secrets redacted in logs | ✅ |
| **Session Management** | Timeout, expiry, recovery | ✅ |
| **Cookie Consent** | TTDSG §25 Banner | ✅ |
| **DSGVO Consent** | 3-Step Dialog with version tracking, 10-Sprachen-Übersetzung | ✅ |

### 7.2 DSGVO-Compliance / GDPR Compliance

| Anforderung / Requirement | Status | Details |
| --- | --- | --- |
| **Art. 6 - Rechtsgrundlage** | ✅ | Einwilligung vor Datenverarbeitung |
| **Art. 7 - Einwilligungsbedingungen** | ✅ | Widerrufbar, granular |
| **Art. 13/14 - Informationspflichten** | ✅ | /datenschutz Page |
| **Art. 17 - Recht auf Löschung** | ⚠️ | UI vorhanden, Backend teilweise |
| **Art. 20 - Datenportabilität** | ✅ | JSON/PDF Export |
| **Art. 25 - Privacy by Design** | ✅ | Pseudonymisierung, Verschlüsselung |
| **Art. 30 - Verzeichnis** | ✅ | Audit-Log in DB |
| **Art. 32 - Technische Maßnahmen** | ✅ | See 7.1 |
| **Art. 35 - DSFA** | ⚠️ | Dokument vorhanden, nicht formalisiert |

### 7.3 Bekannte Sicherheitslücken / Known Security Issues

#### KRITISCH / Critical (16)

| ID | Problem | Impact |
| --- | --- | --- |
| K-01 | WebSocket fehlte Auth (behoben) | Unauthorized data access |
| K-02 | .env war in Git (behoben) | Credential exposure |
| K-03 | Queue/Payment Routen ohne Auth | Unauthorized access |
| K-04 | CSP hatte unsafe-inline (behoben) | XSS vector |
| K-07 | Netlify Functions ungesichert | API bypass |
| K-09 | Kein Art. 17 (Löschrecht) Backend | DSGVO-Verstoß |
| K-10 | DSGVO-Einwilligung nur Deutsch (behoben — 10 Sprachen) | ~~Non-compliant~~ ✅ Fixed |
| K-14 | Backend nicht deployed | No production backend |

#### HOCH / High (20)

| ID | Problem | Impact |
| --- | --- | --- |
| H-01 | JWT in localStorage (behoben — httpOnly Cookie) | ~~XSS token theft~~ ✅ Fixed |
| H-02 | Email Hash ohne Salt (behoben) | Rainbow table attack |
| H-03 | Rate Limit war 1000 (behoben auf 200) | Brute force |
| H-05 | PDF Export hatte XSS (behoben) | Script injection |
| H-06 | CSV Injection möglich (behoben) | Formula injection |
| H-07 | OCR loggt PII | Data leakage in logs |
| H-09 | Kein CI/CD (behoben — GitHub Actions CI + Deploy) | ~~No checks~~ ✅ Fixed |
| H-12 | 2/6 E2E Tests fehlerhaft | Undetected regressions |
| H-14 | Bundle Size > 1.3 MB | Performance impact |

---

## 8. Fragebogen-Logik / Questionnaire Logic

### 8.1 3-Stufen Routing Engine / 3-Level Routing Engine

```text
Level 1: Service-basiert / Service-based
  └── Besuchsgrund bestimmt initiale Fragenblöcke
      (Termin→Core, AU→Core+Arbeitsunfähigkeit, Unfall→BG-Flow, etc.)

Level 2: Antwort-abhängig / Answer-dependent
  └── branchingLogic in jedem Atom evaluiert:
      condition: {atomId, operator, value} → nextAtomId / skipToAtom

Level 3: Profil-basiert / Profile-based
  └── Alter, Geschlecht, Versicherungstyp → Fragen ein-/ausblenden
      (z.B. Schwangerschaft nur bei weiblich, < 6 Jahre → Kinder-Modul)
```

### 8.2 Frage-Module / Question Modules

| Modul | Atoms | Inhalt / Content |
| --- | --- | --- |
| 00 | 0001-0015 | Stammdaten / Demographics |
| 01 | 0101-0106 | Versicherung / Insurance |
| 02 | 0201-0206 | Besuchsgrund / Visit reason |
| 03 | 0301-0315 | Vorerkrankungen / Pre-existing conditions |
| 04 | 0401-0406 | Allergien / Allergies |
| 05 | 0501-0510 | Medikamente / Medications |
| 06 | 0601-0610 | Sonstiges / Other |
| 07A-L | 7001-7999 | Fachspezifisch / Specialty-specific (12 Submodule) |
| 08 | 8001-8010 | Schwangerschaft / Pregnancy |
| 09 | 9001-9010 | AU-Bescheinigung / Sick note |
| 10 | 1001-1010 | Allgemein (Neupatienten) / General (new patients) |
| 15-16 | — | Kinder / Pediatric (< 6 Jahre) |

### 8.3 Validierung / Validation

| Regel / Rule | Beispiel / Example |
| --- | --- |
| Required | `{ required: true }` |
| Min/Max Number | `{ min: 0, max: 200 }` |
| Pattern (Regex) | `{ pattern: "^\\d{10}$" }` (KVNR) |
| Age-conditional | `{ ageOver: 18, ageConditionalMin: 0 }` |
| Cross-field | `{ atLeastOneRequired: ["0401", "0402"] }` |

---

## 9. Internationalisierung / Internationalization (i18n)

### 9.1 Konfiguration / Configuration

- **Framework**: i18next + react-i18next + i18next-browser-languagedetector
- **Backend**: i18next-http-backend (lädt JSON aus `/locales/{lang}/`)
- **Fallback**: `de` → `en`
- **Namespaces**: `translation` (Haupt / Main)

### 9.2 Unterstützte Sprachen / Supported Languages

| Code | Sprache / Language | Status | RTL |
| --- | --- | --- | --- |
| `de` | Deutsch / German | ✅ Vollständig | Nein |
| `en` | English | ✅ ~95% | No |
| `ar` | العربية / Arabic | ✅ ~90% | ✅ Ja |
| `tr` | Türkçe / Turkish | ✅ ~90% | No |
| `uk` | Українська / Ukrainian | ✅ ~85% | No |
| `es` | Español / Spanish | ✅ ~85% | No |
| `fa` | فارسی / Persian | ✅ ~85% | ✅ Ja |
| `it` | Italiano / Italian | ✅ ~85% | No |
| `fr` | Français / French | ✅ ~85% | No |
| `pl` | Polski / Polish | ✅ ~85% | No |

### 9.3 Bekannte Lücken / Known Gaps

| Bereich / Area | Problem |
| --- | --- |
| AdminDashboard | ~95% nicht übersetzt / untranslated |
| MFADashboard | Teilweise / Partial |
| BgAccidentForm | Deutsch only |
| CameraScanner | Hardcoded DE labels |
| DSGVO Consent Text | Nur Deutsch |
| 350+ hardcoded strings | Nicht in t() Calls |
| Therapie/PVS/NFC Namespaces | Komplett fehlend |

---

## 10. Fehlerkatalog / Error Catalog

### 10.1 Build-Blocker (behoben / fixed)

| # | Datei / File | Fehler / Error | Fix | Status |

| --- | --- | --- | --- | --- |
| 1 | `tsconfig.server.json` | Map-Iteration (3 Dateien) | `"downlevelIteration": true` hinzugefügt | ✅ Behoben |
| 2 | Prisma Schema | `epa_documents` Namenskonflikt | `@@map("private_epa_documents")` | ✅ Behoben |
| 3 | Prisma Schema | Fehlende Reverse-Relations (PrivateEPA, PatientFlowProgress) | `patient` / `session` Relations hinzugefügt | ✅ Behoben |
| 4 | Prisma Client | `waitingContent` Typ fehlt | `npx prisma generate` | ✅ Behoben |

### 10.2 Frontend-Logik (behoben / fixed)

| # | Datei / File | Fehler / Error | Fix | Status |

| --- | --- | --- | --- | --- |
| 5 | `PatientWartezimmer.tsx` L58/62 | `useWaitingContent` mit 2 Args statt 1 | Zweites Argument entfernt | ✅ Behoben |
| 6 | `PatientWartezimmer.tsx` L157 | `quizId` statt `contentId` | `{ contentId: quizId, ... }` | ✅ Behoben |
| 7 | `Questionnaire.tsx` L144 | `useWaitingContent` mit 2 Args | Zweites Argument entfernt | ✅ Behoben |
| 8 | `useSocketEvents.ts` L4 | Unbenutzter `useCallback` Import | Import entfernt | ✅ Behoben |

### 10.3 node_modules Fehler (ignorierbar / ignorable)

| Fehler | Ursache | Status |
| --- | --- | --- |
| zod v4 locales esModuleInterop | zod interne .d.cts Dateien | Ignoriert via `skipLibCheck: true` |
| @prisma/client private identifiers | Prisma internals | Ignoriert via `skipLibCheck: true` |
| socket.io http default export | socket.io Typ-Definitionen | Ignoriert via `skipLibCheck: true` |

### 10.4 A11y / Lint Warnungen (offen / open)

| Kategorie | Anzahl | Betroffene Dateien |
| --- | --- | --- |
| Buttons ohne `aria-label`/`title` | 20+ | AtomEditorPanel, PvsExportDialog, PvsTransferLog, VideoRoom, TelemedizinScheduler, TreatmentFlowBuilder, PvsFieldMapper, PvsPatientLink |
| Fehlende Form-Labels | 15+ | PvsConnectionWizard, PvsFieldMapper, TherapyMeasureForm, TreatmentFlowBuilder, PvsAdminPanel |
| Inline-Styles statt CSS | 15+ | QueueStatusCard, InfoBreak, AtomListPanel, TherapyAnalyticsTab, ArztDashboard, ChatBubble, AdminDashboard |
| ARIA-Wert ungültig | 3 | Questionnaire, LanguageSelector, AdminDashboard |

---

## 11. Fehlende Features / Missing Features Gap Analysis

### 11.1 Modul-Detail-Analyse

#### Core (85% fertig)

- ✅ Fragebogen-Flow komplett
- ✅ Triage-System funktional
- ✅ PDF/CSV/JSON Export
- ✅ Session Management
- ❌ Hook-Signaturen waren fehlerhaft (behoben)

#### M1: Queue & Wartezimmer (60%)

- ✅ Queue Join/Position/Call
- ✅ Entertainment-Komponenten (8 Stück)
- ✅ Socket.IO Real-time Updates
- ❌ StaffTodoList hat keine DB-Persistenz (nur React State)
- ❌ Entertainment-Rotation-Logik unvollständig

#### M2: Admin Dashboard (50%)

- ✅ Stats, Timeline, Service Analytics
- ✅ Audit-Log API
- ✅ User Management API (CRUD)
- ❌ ROI Dashboard zeigt nur Demo-Daten
- ❌ WunschboxTab ohne vollständige API-Integration
- ❌ AdminDashboard.tsx ist 1.373 Zeilen (God Component)

#### M3: PVS Integration (30%)

- ✅ PVS Connection CRUD + Test
- ✅ GDT-Parser Boilerplate
- ✅ 8 PVS-Typen definiert
- ❌ GDT Writer nicht implementiert
- ❌ FHIR R4 Engine nur Skeleton
- ❌ KIM (Secure Email) 0%
- ❌ BDT 2.0 Support 0%
- ❌ Auto-Discovery 0%

#### M4: Therapieplanung (25%)

- ✅ Prisma Models (TherapyPlan, TherapyMeasure, ClinicalAlert)
- ✅ Frontend-Komponenten (9 Stück)
- ⚠️ API Routes teilweise implementiert
- ❌ Clinical Alert Engine 0%
- ❌ AI-Assisted Therapy nur Platzhalter

#### M5: Patient PWA (30%)

- ✅ Login/Register UI + API
- ✅ Diary UI vorhanden
- ✅ PWA Manifest + Service Worker
- ❌ PIN Login nicht implementiert
- ❌ Diary APIs unvollständig
- ❌ MedicationReminder 0%
- ❌ Push Notifications 0%
- ❌ Offline Sync 0%

#### M6: Lokales Deploy + TI (20%)

- ✅ Docker Compose (6 Services)
- ✅ Dockerfile Multi-Stage
- ✅ TI Status/Ping/Refresh APIs
- ❌ TI-Konnektor echte Integration 0%
- ❌ Backup/Restore 0%
- ❌ BSI-Compliance Checks 0%

#### M7: NFC & Flows (15%)

- ✅ NFC Scan/Checkpoints API
- ✅ Flow CRUD + Start API
- ✅ Frontend Flow-Komponenten
- ❌ NFC Tap State Machine 0%
- ❌ Flow Execution Engine 0%
- ❌ Checkout Wizard nur Skeleton

#### M8: Advanced UX (25%)

- ✅ Avatar UI + CRUD API
- ✅ Telemedizin Session API (5 Endpoints)
- ✅ FormBuilder UI + API
- ✅ Gamification API (4 Endpoints)
- ❌ TTS/Voice Cloning Backend 0%
- ❌ WebRTC Signaling Server 0%
- ❌ ePA Dashboard nur Mock-Daten
- ❌ Advanced Form Logic 0%

### 11.2 Mock/Simulierte Features

| Feature | Datei | Problem |
| --- | --- | --- |
| PrivateEpaDashboard | `pages/epa/PrivateEpaDashboard.tsx` | `MOCK_DOCUMENTS`, `MOCK_SHARES`, `MOCK_EXPORTS` |
| SharedEpaView | `pages/epa/SharedEpaView.tsx` | Simulierte Zugangsverifizierung |
| Admin Dashboard Metriken | `pages/AdminDashboard.tsx` | Hardcoded Werte |
| AI Services | `services/ai/*` | Simulierte LLM-Antworten |
| Payment/Stripe | `services/payment/paymentService.ts` | Kein echtes Stripe SDK |
| Avatar TTS | `services/avatar/avatarService.ts` | Kein echtes TTS-Backend |

---

## 12. Deployment & Infrastruktur / Infrastructure

### 12.1 Docker Compose Architektur

```text
┌──────────────────────────────────────────────────┐
│                   nginx (Port 80/443)             │
│              Reverse Proxy + TLS                  │
│                                                    │
│    ┌─────────┐    ┌──────────┐    ┌───────────┐  │
│    │ Frontend │    │ Backend  │    │ Static    │  │
│    │ (dist/) │───→│ (3001)   │    │ Assets    │  │
│    └─────────┘    └────┬─────┘    └───────────┘  │
│                        │                           │
│              ┌─────────┴──────────┐               │
│              │                    │                │
│         ┌────┴────┐        ┌─────┴────┐          │
│         │PostgreSQL│        │  Redis   │          │
│         │  (5432)  │        │  (6379)  │          │
│         └─────────┘        └──────────┘          │
│                                                    │
│  Optional Profiles:                                │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐    │
│  │  Ollama  │  │ TI-Proxy  │  │  Backup    │    │
│  │  (LLM)   │  │ (Konnektor│  │ (pg_dump)  │    │
│  └──────────┘  └───────────┘  └────────────┘    │
└──────────────────────────────────────────────────┘
```

### 12.2 Docker Compose Services

| Service | Image | Port | Beschreibung |
| --- | --- | --- | --- |
| **app** | Custom (Dockerfile) | 3001 | Express Backend + API |
| **postgres** | postgres:16-alpine | 5432 | PostgreSQL Datenbank |
| **redis** | redis:7-alpine | 6379 | Token-Blacklist, Cache |
| **nginx** | nginx:1.27-alpine | 80, 443 | Reverse Proxy + TLS |
| **backup** | Custom (Profile: backup) | — | pg_dump Backup |
| **ti-proxy** | Custom (Profile: ti) | — | TI-Konnektor Proxy |
| **ollama** | ollama/ollama (Profile: llm) | 11434 | Lokales LLM |

### 12.3 Dockerfile (Multi-Stage Build)

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npx tsc -p tsconfig.server.json

# Stage 2: Production
FROM node:22-alpine
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist/server ./dist/server
COPY --from=builder /app/dist ./dist   # Frontend build
RUN mkdir -p uploads && adduser -D appuser
USER appuser
EXPOSE 3001
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:3001/api/health || exit 1
ENTRYPOINT ["tini", "--"]
CMD ["npx", "tsx", "dist/server/index.js"]
```

### 12.4 Environment Variables (.env Template)

```env
# ─── Database ─────────────────────────────────────
DATABASE_URL="postgresql://diggai:CHANGE_ME@postgres:5432/anamnese_prod?schema=public"

# ─── Redis ────────────────────────────────────────
REDIS_URL="redis://redis:6379"

# ─── JWT ──────────────────────────────────────────
JWT_SECRET="CHANGE_ME_minimum_32_characters_random_string"

# ─── Encryption ───────────────────────────────────
ENCRYPTION_KEY="CHANGE_ME_exactly_32_characters_"

# ─── Server ───────────────────────────────────────
PORT=3001
NODE_ENV=production
FRONTEND_URL="https://your-domain.de"
CORS_ORIGIN="https://your-domain.de"

# ─── Deployment Mode ─────────────────────────────
DEPLOYMENT_MODE=local       # local | cloud | hybrid

# ─── Optional: TI Connector ──────────────────────
TI_ENABLED=false
TI_KONNEKTOR_URL=""

# ─── Optional: Stripe ────────────────────────────
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# ─── Optional: Ollama (LLM) ──────────────────────
OLLAMA_URL="http://ollama:11434"
AI_ENABLED=false
```

---

## 13. Deployment-Plan (fehlerfreies Go-Live)

### 13.1 Voraussetzungen-Checkliste / Prerequisites Checklist

- [ ] Docker + Docker Compose installiert
- [ ] Node.js 22+ installiert (für Build)
- [ ] PostgreSQL-Passwort gewählt (min. 16 Zeichen)
- [ ] JWT_SECRET generiert (min. 32 Zeichen, z.B. `openssl rand -hex 32`)
- [ ] ENCRYPTION_KEY generiert (exakt 32 Zeichen)
- [ ] Domain + DNS konfiguriert (optional für TLS)
- [ ] TLS-Zertifikat vorhanden (Let's Encrypt oder selbstsigniert)
- [ ] `.env` Datei erstellt (siehe 12.4)

### 13.2 Schritt-für-Schritt Deployment / Step-by-Step

| # | Schritt / Step | Kommando / Command | Verifizierung / Verification |

| --- | --- | --- | --- |
| 1 | Repository klonen | `git clone ...` | `ls anamnese-app/` |
| 2 | Dependencies installieren | `npm ci` | `node_modules/` existiert |
| 3 | Prisma Client generieren | `npx prisma generate` | `✔ Generated Prisma Client` |
| 4 | TypeScript Build prüfen | `npx tsc -b` | 0 Fehler |
| 5 | Vite Frontend Build | `npm run build` | `dist/` Ordner erzeugt |
| 6 | `.env` erstellen | Vorlage aus 12.4 ausfüllen | Alle Werte gesetzt |
| 7 | Docker Images bauen | `docker compose build --no-cache` | Alle Images erfolgreich |
| 8 | Services starten | `docker compose up -d` | Alle Container "running" |
| 9 | DB migrieren | `docker compose exec app npx prisma migrate deploy` | Schema aktuell |
| 10 | DB seeden | `docker compose exec app npx tsx prisma/seed.ts` | 270+ Atoms inserted |
| 11 | Health-Check | `curl http://localhost:3001/api/health` | `{"status":"ok"}` |
| 12 | Frontend prüfen | Browser → `http://localhost` | HomeScreen sichtbar |
| 13 | Staff Login testen | `/verwaltung/login` → admin/admin123 | Dashboard lädt |
| 14 | TLS einrichten | Zertifikate in `docker/nginx/certs/` | HTTPS funktioniert |

### 13.3 Smoke-Test Suite / Acceptance Tests

| # | Test | Erwartung / Expected |

| --- | --- | --- |
| 1 | `GET /api/health` | `{"status":"ok","db":"connected","redis":"connected"}` |
| 2 | HomeScreen lädt | 3 Kacheln sichtbar (Patient, PWA, Telemedizin) |
| 3 | Patient Session erstellen | Session-ID + Token erhalten |
| 4 | Fragebogen durchlaufen | Fragen laden, Antworten speichern, Progress steigt |
| 5 | Zusammenfassung anzeigen | Medizinischer Bericht mit Fragen+Antworten |
| 6 | PDF Export | A4-formatiertes PDF generiert |
| 7 | Staff Login | ArztDashboard zeigt Sessions |
| 8 | Admin Dashboard | 7 Tabs laden, Stats angezeigt |
| 9 | Sprachauswahl | 10 Sprachen verfügbar, UI wechselt |
| 10 | Dark Mode | Theme wechselt korrekt |

### 13.4 Rollback-Strategie

```bash
# Bei Problemen:
docker compose down          # Services stoppen
docker compose up -d         # Neustart (Volumes bleiben erhalten)

# Komplett zurücksetzen (ACHTUNG: Datenverlust!):
docker compose down -v       # + Volumes löschen
docker compose up -d --build # Neu aufbauen

```

### 13.5 Monitoring

| Metrik / Metric | Endpoint / Method | Schwellenwert / Threshold |
| --- | --- | --- |
| API Health | `GET /api/health` (alle 30s) | Status != "ok" → Alert |
| DB Connection | Health-Check inkludiert | "disconnected" → Alert |
| Redis Connection | Health-Check inkludiert | "disconnected" → Alert |
| Container Status | `docker compose ps` | Nicht "running" → Alert |
| Response Time | Nginx access.log | > 2s → Warning |
| Error Rate | Audit Log | > 5% → Alert |

### 13.6 Netlify Deployment (Frontend-Only)

Das Frontend kann separat auf Netlify deployed werden. Die Konfiguration ist in `netlify.toml` vorbereitet:

| Einstellung / Setting | Wert / Value |
| --- | --- |
| **Build Command** | `npm run build` |
| **Publish Directory** | `dist` |
| **Node Version** | 20 |
| **SPA Redirect** | `/* → /index.html` (200) |
| **API Proxy** | `/api/* → /.netlify/functions/:splat` (200) |
| **Security Headers** | HSTS, CSP, X-Frame-Options, Permissions-Policy |
| **Asset Caching** | `/assets/*` → immutable, 1 Jahr |

**Deploy-Kommandos / Deploy Commands:**

```bash
# Erstmaliges Setup:
npx netlify login
npx netlify link --id d4c9bba2-71cc-48a1-81a4-14cb9ac5cb90

# Deploy:
npm run build
npx netlify deploy --prod --dir=dist
```

> **Hinweis / Note**: Das Backend (Express + PostgreSQL + Redis) benötigt separate Infrastruktur (VPS/Docker). Netlify hostet nur das SPA-Frontend und leitet API-Calls an Netlify Functions oder ein externes Backend weiter.

---

## 14. Roadmap & Next Steps

### Sprint 1: Build-Stabilität + Sicherheit (1 Woche / 1 week)

| # | Aufgabe / Task | Priorität | Status |

| --- | --- | --- | --- |
| 1.1 | tsconfig.server.json `downlevelIteration` | CRITICAL | ✅ Done |
| 1.2 | Prisma Schema Naming Conflicts | CRITICAL | ✅ Done |
| 1.3 | Prisma Client regenerieren | CRITICAL | ✅ Done |
| 1.4 | Frontend Hook-Signatur Fixes | HIGH | ✅ Done |
| 1.5 | Unused Imports bereinigen | MEDIUM | ✅ Done |
| 1.6 | Payment Webhook Signatur-Verifizierung | CRITICAL | ✅ Done |
| 1.7 | Art. 17 Löschrecht Backend | CRITICAL | ❌ TODO |
| 1.8 | DSGVO Consent Übersetzung (10 Sprachen) | CRITICAL | ✅ Done |
| 1.9 | CI/CD Pipeline (GitHub Actions) | HIGH | ✅ Done |
| 1.10 | JWT von localStorage nach httpOnly Cookie | HIGH | ✅ Done |

### Sprint 2: Core Features vervollständigen (2 Wochen / 2 weeks)

| # | Aufgabe / Task | Modul |

| --- | --- | --- |
| 2.1 | StaffTodoList Persistenz (API Backend) | M1 | ✅ Done |
| 2.2 | Admin Dashboard echte Daten (ROI, Metrics) | M2 | ✅ Done (Schema Fix) |
| 2.3 | AdminDashboard.tsx aufteilen (God Component → 7 Module) | M2 | ❌ TODO |
| 2.4 | User Management vollständige API | M2 | ❌ TODO |
| 2.5 | A11y Fixes (20+ fehlende Labels) | Core | ❌ TODO |
| 2.6 | Inline Styles → CSS Klassen (15+ Dateien) | Core | ❌ TODO |
| 2.7 | i18n für AdminDashboard + MFADashboard | i18n | ❌ TODO |
| 2.8 | Socket.IO Answer/Progress Events | Core | ✅ Done |

### Sprint 3: M3-M4 PVS + Therapie (3 Wochen / 3 weeks)

| # | Aufgabe / Task | Modul |

| --- | --- | --- |
| 3.1 | GDT 3.0 Writer (Import + Export) | M3 |
| 3.2 | FHIR R4 Client (Patient, Observation, DocumentReference) | M3 |
| 3.3 | PVS Field Mapping Engine | M3 |
| 3.4 | TherapyPlan CRUD APIs vollständig | M4 |
| 3.5 | Clinical Alert Engine (Vital Signs, Lab Values) | M4 |
| 3.6 | AI-Assisted Therapy Suggestions (Ollama) | M4 |

### Sprint 4: M5-M6 PWA + TI (2 Wochen / 2 weeks)

| # | Aufgabe / Task | Modul |

| --- | --- | --- |
| 4.1 | PIN Login Flow | M5 |
| 4.2 | Health Diary CRUD APIs | M5 |
| 4.3 | Medication Reminder (cron + push) | M5 |
| 4.4 | Offline Sync (IndexedDB + Background Sync) | M5 |
| 4.5 | Web Push Notifications | M5 |
| 4.6 | Backup/Restore Service | M6 |
| 4.7 | TI-Konnektor Basis-Integration | M6 |

### Sprint 5: M7-M8 NFC + Advanced (2 Wochen / 2 weeks)

| # | Aufgabe / Task | Modul |

| --- | --- | --- |
| 5.1 | NFC Tap State Machine | M7 |
| 5.2 | Flow Execution Engine | M7 |
| 5.3 | Checkout Wizard vollständig | M7 |
| 5.4 | TTS Backend (Web Speech API Server-Side) | M8 |
| 5.5 | WebRTC Signaling Server | M8 |
| 5.6 | PrivateEPA echte Document Storage | M8 |
| 5.7 | FormBuilder Advanced Conditional Logic | M8 |

### Sprint 6: Go-Live + Monitoring (1 Woche)

| # | Aufgabe / Task |

| --- | --- |
| 6.1 | Penetration Test |
| 6.2 | Performance Optimization (Bundle < 500KB) |
| 6.3 | Load Testing (100 concurrent users) |
| 6.4 | DNS + TLS + Domain Setup |
| 6.5 | Monitoring Dashboard (Health, Error Rate, Response Time) |
| 6.6 | Backup-Schedule (täglich/daily) |
| 6.7 | Go-Live ✅ |

---

## 15. Marketing & Geschäftsmodell / Business Model

### 15.1 Value Proposition

| Metrik / Metric | Wert / Value |
| --- | --- |
| Zeitersparnis pro Patient / Time saved per patient | ~65% (20min → 7min) |
| Monatliche Einsparung (MFA) / Monthly savings | ~€8.750 |
| ROI Break-Even | ~3 Monate / months |
| Fehlerreduktion / Error reduction | ~80% (Pflichtfelder + Validierung) |
| Patientenzufriedenheit / Patient satisfaction | +40% (mehrsprachig, barrierefrei) |

### 15.2 Zielgruppen / Target Personas

| Persona | Rolle | Pain Point | Lösung / Solution |
| --- | --- | --- | --- |
| **Dr. Schmidt** | Allgemeinmediziner, 55J | 3h/Tag Papier-Anamnese | Digitaler Fragebogen, Triage, Auto-Summary |
| **MFA Lisa** | Medizinische Fachangestellte | Wartezimmer-Chaos, Telefon-Stress | Queue-Management, Chat, NFC Check-in |
| **Praxismanager Tom** | IT-affiner Verwalter | KV-Abrechnung, PVS-Integration | ROI Dashboard, GDT-Export, Admin-Panel |

### 15.3 Preismodell (geplant / planned)

| Paket / Package | Preis / Price | Features |
| --- | --- | --- |
| **Starter** | €149/Monat | Core Fragebogen, 1 Arzt, Export |
| **Professional** | €349/Monat | + PVS, Wartezimmer, 5 Ärzte |
| **Enterprise** | €599/Monat | + TI, Telemedizin, PWA, unbegrenzt |
| **Self-Hosted** | Einmalig €4.999 | Docker-Paket, eigene Infrastruktur |

### 15.4 Marketing-Assets (vorhanden / available)

- 4 Video-Scripts (Hero 90s, LinkedIn 30s, YouTube 3min, Messe 60s)
- Print-Anzeige (Deutsches Ärzteblatt)
- Landing Page SEO-Content
- 4-Email Onboarding-Sequenz
- Messe-Flyer (DIN A5)
- 5 UX Dashboard Specs

---

## 15.5 Implementierungs-Changelog (Sprint 1+2)

| Datum | Änderung / Change | Dateien / Files |
| --- | --- | --- |
| 09.07.2025 | **Payment Webhook Signatur-Verifizierung**: Stripe HMAC-SHA256 mit Replay-Schutz (5 Min), timing-safe Vergleich, Produktions-Enforcement | `server/routes/payment.ts` |
| 09.07.2025 | **DSGVO Consent 10-Sprachen-Übersetzung**: 17 i18n-Keys (6 Policys + 5 technische Maßnahmen + Security-Note) für DE, EN, AR, TR, UK, ES, FA, IT, FR, PL | `src/components/DSGVOConsent.tsx`, `public/locales/*/translation.json` |
| 09.07.2025 | **Socket.IO Answer/Progress Events**: `answer:submitted` und `session:progress` Events für Echtzeit-Dashboard-Updates | `server/socket.ts`, `server/routes/answers.ts` |
| 09.07.2025 | **StaffTodoList DB-Persistenz**: Neues Prisma-Model `StaffTodo`, vollständige CRUD API (`/api/todos`), Frontend von `useState` auf API migriert | `prisma/schema.prisma`, `server/routes/todos.ts`, `src/components/StaffTodoList.tsx` |
| 09.07.2025 | **ROI Dashboard Schema-Fix**: `messagesCount` Default-Wert in `ROISnapshot` (verhindert Runtime-Fehler bei `createDailySnapshot`) | `prisma/schema.prisma` |
| 09.07.2025 | **JWT httpOnly Cookie Migration**: Token in httpOnly/Secure/SameSite Cookie statt localStorage, cookie-parser Middleware, Backward-kompatibel (Header + Cookie) | `server/middleware/auth.ts`, `server/routes/arzt.ts`, `server/routes/sessions.ts`, `server/index.ts`, `src/api/client.ts` |
| 09.07.2025 | **CI/CD Pipeline**: GitHub Actions CI Workflow (TypeScript Check + Lint + Build + Artifact Upload) für Push+PR | `.github/workflows/ci.yml` |
| 09.07.2025 | **Markdown-Lint Fixes**: 9 Heading/List-Spacing-Korrekturen im Roadmap-Abschnitt | `DIGGAI_ANAMNESE_DOCS.md` |

---

## 16. Appendix

### A: Konsolidierungs-Index / Consolidation Index

Diese Dokumentation konsolidiert folgende Einzeldokumente:

| Quelle / Source | Kapitel / Chapters | Status |
| --- | --- | --- |
| `GESAMTUEBERSICHT.md` (v1.0, 03.03.2026) | 1, 2, 5, 6, 9, 12 | ✅ Integriert |
| `DiggAi.md` (v1.0, 03.03.2026) | 1, 7, 10, 11, 14, 15 | ✅ Integriert |
| `PRODUCT_DOCUMENTATION.md` (v14.0) | 1, 2, 4, 8 | ✅ Integriert |
| `DOCUMENTATION.md` | 2, 8 | ✅ Integriert |
| `Anamnese_Implementierungs_Prompt.md` | 8 | ✅ Integriert |
| `Anamnese_Struktur_Analyse.md` | 8 | ✅ Integriert |
| `COMPREHENSIVE_AUDIT.md` (24.07.2025) | 10 | ✅ Integriert |
| `AUDIT_REPORT.md` (22.07.2025) | 10 | ✅ Integriert |
| `AUDIT_REPORT_v2.md` (01.03.2026) | 10 | ✅ Integriert |
| `TECHNICAL_AUDIT.md` | 10, 11 | ✅ Integriert |
| `IMPLEMENTIERUNGS_CHANGELOG.md` | 7, 10, 14 | ✅ Integriert |
| `TRANSLATION_AUDIT_REPORT.md` | 9 | ✅ Integriert |
| `INTEGRATION_TEST_REPORT.md` (03.03.2026) | 13 | ✅ Integriert |
| `DiggAI_Marketing_UX_Masterplan.md` (v2.0) | 15 | ✅ Referenziert |
| `OPUS_AGENT_PROMPT.md` | 14 | ✅ Integriert |

### B: npm Scripts Referenz

| Script | Kommando | Beschreibung |
| --- | --- | --- |
| `npm run dev` | `vite --host` | Frontend Dev Server (Port 5173) |
| `npm run dev:server` | `tsx watch server/index.ts` | Backend Dev Server (Port 3001) |
| `npm run dev:all` | `concurrently "dev" "dev:server"` | Beides parallel |
| `npm run build` | `tsc -b && vite build` | Production Build |
| `npm run lint` | `eslint .` | ESLint Check |
| `npm run db:migrate` | `prisma migrate dev` | Migration erstellen |
| `npm run db:seed` | `tsx prisma/seed.ts` | Basis-Seed |
| `npm run db:seed:full` | `tsx prisma/seed-comprehensive.ts` | Vollständiger Seed |
| `npm run db:studio` | `prisma studio` | DB GUI (Browser) |
| `npm run db:generate` | `prisma generate` | Client-Types generieren |
| `npm run db:deploy` | `prisma migrate deploy` | Migration in Prod |
| `npm run docker:up` | `docker compose up -d --build` | Docker starten |
| `npm run docker:down` | `docker compose down` | Docker stoppen |

### C: Glossar / Glossary

| Begriff / Term | DE / EN | Beschreibung / Description |
| --- | --- | --- |
| **Atom** | Medizinisches Atom / Medical Atom | Einzelne Frage im Fragenkatalog |
| **Triage** | Triage | Priorisierung nach klinischer Dringlichkeit |
| **Red Flag** | Warnzeichen | Kritischer klinischer Befund |
| **PVS** | Praxisverwaltungssystem / Practice Management System | Software für Arztpraxen |
| **GDT** | Gerätedatentransfer / Device Data Transfer | Kommunikationsstandard für Medizingeräte |
| **FHIR** | Fast Healthcare Interoperability Resources | Internationaler Gesundheitsdaten-Standard |
| **KIM** | Kommunikation im Medizinwesen | Sichere E-Mail für das Gesundheitswesen |
| **TI** | Telematikinfrastruktur | Digitale Infrastruktur des deutschen Gesundheitswesens |
| **ePA** | Elektronische Patientenakte | Persönliche digitale Gesundheitsakte |
| **eGK** | Elektronische Gesundheitskarte | Deutsche Krankenversicherungskarte |
| **HBA** | Heilberufsausweis | Digitaler Ausweis für Ärzte |
| **KVNR** | Krankenversichertennummer | 10-stellige Versicherungsnummer |
| **MFA** | Medizinische Fachangestellte | Arzthelferin / Medical assistant |
| **DSGVO** | Datenschutz-Grundverordnung / GDPR | EU-Datenschutzrecht |
| **TTDSG** | Telekommunikation-Telemedien-Datenschutz-Gesetz | Deutsches Cookie-Gesetz |
| **BSI** | Bundesamt für Sicherheit in der Informationstechnik | German Federal Office for IT Security |
| **AU** | Arbeitsunfähigkeitsbescheinigung | Sick note / Certificate of incapacity |
| **BG** | Berufsgenossenschaft | Workers' compensation |
| **IGel** | Individuelle Gesundheitsleistungen | Self-pay medical services |
| **PWA** | Progressive Web App | Installierbare Web-Anwendung |
| **NFC** | Near Field Communication | Kontaktlose Nahfeldkommunikation |
| **OCR** | Optical Character Recognition | Optische Zeichenerkennung |
| **TTS** | Text-to-Speech | Sprachsynthese |
| **WebRTC** | Web Real-Time Communication | Browser-basierte Echtzeit-Kommunikation |

---

> **Erstellt / Created**: 05.03.2026  
> **Zuletzt aktualisiert / Last updated**: 09.07.2025 — Sprint 1+2 Implementierung  
> **Konsolidiert aus / Consolidated from**: 15 Einzeldokumenten / 15 individual documents  
> **Nächste Aktualisierung / Next Update**: Nach Sprint 3  
> **Maintainer**: DiggAI Team (DiggAiHH)
