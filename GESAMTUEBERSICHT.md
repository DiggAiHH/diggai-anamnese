# DiggAI Anamnese App — Gesamtübersicht

> **Version:** 1.0 | **Datum:** 03.03.2026 | **Status:** Produktion (Beta)  
> **Live-URL:** [https://diggai-drklaproth.netlify.app](https://diggai-drklaproth.netlify.app)  
> **GitHub:** [DiggAiHH/diggai-anamnese](https://github.com/DiggAiHH/diggai-anamnese)  
> **Zweck:** Single Source of Truth — konsolidiert alle Projekt-, Technik- und Business-Informationen

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Tech-Stack](#2-tech-stack)
3. [Architektur](#3-architektur)
4. [Funktionsumfang](#4-funktionsumfang)
5. [Patienten-Flow](#5-patienten-flow)
6. [Triage-System](#6-triage-system)
7. [Sicherheitsarchitektur](#7-sicherheitsarchitektur)
8. [Internationalisierung](#8-internationalisierung)
9. [Dashboard-Übersicht](#9-dashboard-übersicht)
10. [API-Referenz](#10-api-referenz)
11. [DSGVO-Dokumentation](#11-dsgvo-dokumentation)
12. [Deployment](#12-deployment)
13. [Marketing & Geschäftsmodell](#13-marketing--geschäftsmodell)
14. [Roadmap](#14-roadmap)
15. [Implementierte Änderungen](#15-implementierte-änderungen)

---

## 1. Executive Summary

### Was ist DiggAI?

**DiggAI** ist eine vollständig digitale, DSGVO-konforme Patientenaufnahme-Anwendung (Anamnese) für deutsche Arztpraxen. Sie ersetzt den papierbasierten Anamnesebogen durch ein intelligentes, mehrsprachiges, webbasiertes System.

**Claim:** *„Weniger Papier. Mehr Medizin."* / *„Digitale Patientenaufnahme. Made in Germany."*

### Kernmetriken

| Metrik | Papier (alt) | DiggAI (neu) | Verbesserung |
|--------|-------------|-------------|--------------|
| Durchschnittliche Aufnahmezeit | 15–25 Min | 5–8 Min | **-65%** |
| Datenübertragungsfehler | ~12% | 0% (direkt digital) | **-100%** |
| Sprachbarrieren | Keine Lösung | 10 Sprachen (inkl. RTL) | **Gelöst** |
| Arzt-Vorbereitungszeit | 5–10 Min Lesen | Sofortige KI-Zusammenfassung | **-90%** |
| Notfall-Erkennung | Manuell (verzögert) | Echtzeit Triage (<2 Sek.) | **Lebensrettend** |
| DSGVO-Konformität | Papierlagerung | AES-256-GCM + Audit Trail | **Vollständig** |

### Produktumfang auf einen Blick

| Dimension | Wert |
|-----------|------|
| Medizinische Fragen | **270+** |
| Service-Flows | **10** |
| Fachbereiche | **13** |
| Sprachen | **10** (inkl. 2× RTL) |
| KI-Triage-Regeln | **10** (4 CRITICAL + 6 WARNING) |
| Frontend-Komponenten | **38** + 12 Input-Typen |
| Seiten/Dashboards | **7** |
| API-Endpunkte | **30+** |
| DB-Modelle | **12** |

### Zielgruppe

| Persona | Profil | Patienten/Tag | Zeitersparnis/Tag |
|---------|--------|---------------|-------------------|
| **Solo-Praxis** | 1 Arzt, 2 MFA | 25 | ~5 Std. |
| **Gemeinschaftspraxis** | 3+ Ärzte, 5–8 MFA | 40 | ~8 Std. |
| **MVZ/FAZ** | 5–10 Ärzte, IT-Manager | 80 | ~16 Std. |

### Regulatorische Positionierung

- **Explizit KEINE DiGA** (Digitale Gesundheitsanwendung)
- **KEIN Medizinprodukt** — keine CE-Kennzeichnung erforderlich
- Verwendet den Begriff *„klinische Entscheidungsunterstützung"*

---

## 2. Tech-Stack

### Frontend

| Technologie | Version | Zweck |
|------------|---------|-------|
| React | ^19.2.0 | UI-Framework |
| React DOM | ^19.2.0 | DOM-Rendering |
| TypeScript | ~5.9.3 | Typsicherheit |
| Vite | ^8.0.0-beta.13 | Build-Tool & Dev-Server (⚠️ Beta!) |
| Tailwind CSS | ^4.2.1 | Utility-First CSS (via @tailwindcss/vite) |
| React Router DOM | ^7.13.1 | Client-Side Routing |
| Zustand | ^5.0.11 | State Management |
| TanStack React Query | ^5.90.21 | Server-State / Data Fetching |
| i18next | ^25.8.13 | Internationalisierung |
| react-i18next | ^16.5.4 | React-Bindings für i18next |
| i18next-http-backend | ^3.0.2 | Übersetzungsdateien via HTTP |
| i18next-browser-languagedetector | ^8.2.1 | Automatische Spracherkennung |
| Lucide React | ^0.575.0 | Icon-Bibliothek |
| Recharts | ^3.7.0 | Charts (AdminDashboard) |
| Zod | ^4.3.6 | Runtime-Schema-Validierung |
| Axios | ^1.13.5 | HTTP-Client |
| date-fns | ^4.1.0 | Datums-Utilities |
| html5-qrcode | ^2.3.8 | QR-Code Scanner (Kamera) |
| qrcode.react | ^4.2.0 | QR-Code Generierung |
| tesseract.js | ^7.0.0 | OCR — Medikamentenplan-Scanning |
| @radix-ui/react-toast | ^1.2.15 | Accessible Toast-Benachrichtigungen |
| socket.io-client | ^4.8.3 | WebSocket-Client |

### Backend

| Technologie | Version | Zweck |
|------------|---------|-------|
| Express | ^5.2.1 | HTTP-Server |
| Prisma | ^6.19.2 | ORM + Datenbank-Toolkit |
| **SQLite** | (Prisma-Provider) | Datenbank (dateibasiert, `file:./anamnese.db`) |
| Socket.IO | ^4.8.3 | Echtzeit-WebSocket-Kommunikation |
| Helmet | ^8.1.0 | Sicherheits-Header |
| express-rate-limit | ^8.2.1 | Rate-Limiting |
| bcryptjs | ^3.0.3 | Passwort-Hashing (12 Salt-Rounds) |
| jsonwebtoken | ^9.0.3 | JWT-Authentifizierung |
| multer | ^2.0.2 | Datei-Upload |
| cors | ^2.8.6 | Cross-Origin Resource Sharing |
| dotenv | ^17.3.1 | Umgebungsvariablen |

### Dev-Tooling

| Tool | Version | Zweck |
|------|---------|-------|
| ESLint | ^9.39.1 | Linting (Flat Config) |
| typescript-eslint | ^8.48.0 | TS-aware Linting |
| Playwright | ^1.58.2 | E2E-Testing |
| tsx | ^4.21.0 | TypeScript-Ausführung (Server Dev) |
| concurrently | ^9.2.1 | Parallele Script-Ausführung |
| @vitejs/plugin-react | ^5.1.1 | Vite React Plugin |
| @netlify/functions | ^5.1.2 | Netlify Serverless Functions |

### NPM Scripts

| Script | Befehl | Zweck |
|--------|--------|-------|
| `dev` | `vite --host` | Frontend Dev-Server (LAN-Zugriff) |
| `dev:server` | `tsx watch server/index.ts` | Backend mit Hot Reload |
| `dev:all` | `concurrently "npm run dev" "npm run dev:server"` | Beides parallel |
| `build` | `tsc -b && vite build` | TypeScript-Check → Production Build |
| `lint` | `eslint .` | Gesamtes Projekt linten |
| `preview` | `vite preview` | Production Build lokal testen |
| `db:migrate` | `npx prisma migrate dev` | Prisma-Migrationen ausführen |
| `db:seed` | `tsx prisma/seed.ts` | Datenbank befüllen |
| `db:studio` | `npx prisma studio` | Prisma Studio GUI |
| `db:generate` | `npx prisma generate` | Prisma Client generieren |

---

## 3. Architektur

### 3.1 Systemarchitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  React 19 · TypeScript 5.9 · Vite 8 · Tailwind CSS 4            │
│  Zustand 5 · React Query 5 · Socket.IO Client · i18next          │
│  Lucide Icons · Tesseract.js (OCR) · html5-qrcode · Recharts     │
├────────────────────────┬────────────────────────────────────────┤
│   REST API (Axios)     │   WebSocket (Socket.IO)                │
├────────────────────────┴────────────────────────────────────────┤
│                        BACKEND (Node.js)                         │
│  Express 5 · Prisma ORM · SQLite · JWT Auth · AES-256-GCM        │
│  Helmet · Rate Limiting · Audit Logging · Multer (Uploads)        │
├─────────────────────────────────────────────────────────────────┤
│                    NETLIFY (Hosting + Functions)                   │
│  Frontend: dist/ (SPA) · Functions: netlify/functions/            │
│  Security Headers · Redirects · API Proxy → Functions             │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Verzeichnisstruktur

```
anamnese-app/
├── src/                          → React Frontend (SPA)
│   ├── main.tsx                  → App-Einstiegspunkt
│   ├── App.tsx                   → Router + QueryClient Setup
│   ├── i18n.ts                   → i18next Konfiguration (10 Sprachen)
│   ├── index.css                 → Globale Styles (Tailwind + Custom Properties)
│   ├── api/
│   │   └── client.ts             → Axios API-Client (Demo + Live Dual-Mode)
│   ├── components/               → 38 Komponenten (siehe 3.4)
│   ├── pages/                    → 7 Seiten/Dashboards (siehe 3.5)
│   ├── store/                    → 3 Zustand Stores
│   ├── hooks/                    → React Hooks (useApi, useKeyboardShortcuts)
│   ├── types/                    → TypeScript-Typdefinitionen
│   ├── utils/                    → Hilfsfunktionen
│   ├── data/                     → Fragenkataloge (questions.ts, new-questions.ts)
│   └── assets/                   → Statische Assets
├── server/                       → Express.js Backend-API
│   ├── index.ts                  → Express App Entry, Middleware-Chain
│   ├── config.ts                 → Umgebungskonfiguration
│   ├── db.ts                     → Prisma Client Singleton
│   ├── socket.ts                 → Socket.IO Setup (Chat, Triage-Alerts)
│   ├── engine/
│   │   ├── QuestionFlowEngine.ts → Frage-Routing-Engine (3-stufig)
│   │   └── TriageEngine.ts       → Medizinische Triage (10 Regeln)
│   ├── middleware/
│   │   ├── audit.ts              → HIPAA-konformes Audit-Logging
│   │   └── auth.ts               → JWT-Authentifizierung + RBAC
│   ├── routes/                   → 10 Route-Dateien
│   ├── services/
│   │   ├── encryption.ts         → AES-256-GCM Verschlüsselung
│   │   ├── aiService.ts          → KI-Integration (SIMULIERT)
│   │   └── paymentService.ts     → Stripe-Zahlung (SIMULIERT)
│   ├── jobs/
│   │   └── cleanup.ts            → Datenbank-Bereinigung
│   └── scripts/                  → Seed- und Test-Scripts
├── prisma/                       → Datenbank-Schema & Migrationen
│   ├── schema.prisma             → 12 Modelle
│   ├── seed.ts                   → Seed-Daten
│   └── migrations/               → SQLite-Migrationen
├── netlify/functions/            → Serverless-Funktionen (5 Functions)
├── public/                       → Statische Assets
│   ├── manifest.json             → PWA Manifest
│   ├── sw.js                     → Service Worker v3
│   ├── icons/                    → App-Icons (SVG)
│   └── locales/                  → 10 Übersetzungsdateien
├── e2e/                          → Playwright E2E-Tests (5 Spec-Dateien, ~45 Tests)
├── scripts/                      → i18n-Tooling
└── docs/                         → DSGVO-Dokumentation (5 Dokumente)
```

### 3.3 Routing-Übersicht

| Route | Komponente | Laden | Auth |
|-------|-----------|-------|------|
| `*` (default) | PatientApp → LandingPage / Questionnaire | Eager | Keine |
| `/arzt` | ArztDashboard | `React.lazy` | JWT (Arzt/Admin) |
| `/mfa` | MFADashboard | `React.lazy` | JWT (MFA/Admin) |
| `/admin` | AdminDashboard | `React.lazy` | JWT (Admin) |
| `/docs` | DokumentationPage | `React.lazy` | Keine |
| `/handbuch` | HandbuchPage | `React.lazy` | Keine |
| `/datenschutz` | DatenschutzPage | `React.lazy` | Keine |
| `/impressum` | ImpressumPage | `React.lazy` | Keine |

### 3.4 Komponentenbaum (38 Komponenten)

```
App.tsx
├── CookieConsent                 → TTDSG §25 Cookie-Banner
├── KeyboardShortcutsHelp         → Tastenkürzel-Referenz
│
├── /arzt ──────── ArztDashboard
├── /mfa ───────── MFADashboard
├── /admin ─────── AdminDashboard
├── /docs ──────── DokumentationPage
├── /handbuch ──── HandbuchPage
├── /datenschutz ── DatenschutzPage
├── /impressum ─── ImpressumPage
│
└── /* ─────────── PatientApp
                   ├── LandingPage
                   │   ├── DSGVOConsent
                   │   ├── LanguageSelector
                   │   ├── ThemeToggle
                   │   ├── FontSizeControl
                   │   ├── KioskToggle
                   │   └── ModeToggle
                   ├── Questionnaire
                   │   ├── ProgressBar
                   │   ├── HistorySidebar
                   │   ├── Navigation
                   │   ├── SessionTimer
                   │   ├── AutoSaveIndicator
                   │   ├── QuestionRenderer
                   │   │   └── inputs/ (12 Typen)
                   │   │       ├── TextInput (+ Voice)
                   │   │       ├── NumberInput
                   │   │       ├── RadioInput
                   │   │       ├── SelectInput
                   │   │       ├── MultiSelectInput
                   │   │       ├── DateInput
                   │   │       ├── TextAreaInput (+ Voice)
                   │   │       ├── FileInput
                   │   │       ├── VoiceInput
                   │   │       ├── CameraScanner (OCR)
                   │   │       ├── MedicationScanner
                   │   │       └── BgAccidentForm
                   │   ├── MedicationManager
                   │   ├── SurgeryManager
                   │   ├── SchwangerschaftCheck
                   │   ├── UnfallBGFlow
                   │   ├── IGelServices
                   │   ├── RedFlagOverlay (CRITICAL Triage)
                   │   ├── Celebrations (Konfetti)
                   │   └── SkeletonLoader
                   ├── AnswerSummary
                   ├── PDFExport
                   ├── SubmittedPage
                   ├── ChatBubble (FAQ-Bot + Team-Chat)
                   ├── SessionRecoveryDialog
                   ├── SessionTimeoutWarning
                   ├── WartezimmerPanel
                   ├── QRCodeDisplay
                   ├── PatientWartezimmer      ← NEU
                   ├── StaffChat               ← NEU
                   ├── StaffTodoList           ← NEU
                   ├── DatenschutzGame         ← NEU
                   └── ErrorBoundary
```

### 3.5 Datenbankmodell (12 Prisma-Modelle, SQLite)

```
Patient ──1:n── PatientSession ──1:n── Answer
   │                  │                    └── encryptedValue (AES-256-GCM)
   │                  ├── 1:n── TriageEvent
   │                  ├── 1:1── AccidentDetails (BG-Unfall)
   │                  └── 1:n── ChatMessage
   ├── 1:n── PatientMedication
   └── 1:n── PatientSurgery

ArztUser ──────── role: PATIENT | ARZT | MFA | ADMIN
AuditLog ──────── HIPAA-konformes Zugriffsprotokoll
MedicalAtom ───── Fragen-Definitionen (Server-seitig)
```

**Modell-Übersicht:**

| Modell | Zweck | Schlüsselfelder |
|--------|-------|----------------|
| **Patient** | Pseudonymisierter Patient | `id` (UUID), `hashedEmail` (SHA-256+Salt) |
| **PatientSession** | Fragebogen-Sitzung | `status` (ACTIVE/COMPLETED/SUBMITTED/EXPIRED), `encryptedName`, `selectedService`, `assignedArztId` |
| **Answer** | Einzelne Antwort | `atomId`, `value` (JSON), `encryptedValue` (AES-GCM für PII), `timeSpentMs` |
| **AccidentDetails** | BG-Unfalldaten | `bgName`, `accidentDate`, `description` |
| **TriageEvent** | Red-Flag-Alarme | `level` (WARNING/CRITICAL), `atomId`, `triggerValues`, `acknowledgedBy/At` |
| **MedicalAtom** | Master-Fragenkatalog | `questionText`, `answerType`, `section`, `isPII`, `isRedFlag`, `branchingLogic` |
| **ArztUser** | Personal-Benutzer | `username`, `passwordHash` (bcrypt), `role` |
| **AuditLog** | Audit-Trail | `action`, `resource`, `ipAddress`, `metadata` |
| **ChatMessage** | Chat-Nachrichten | `senderType` (PATIENT/ARZT/MFA), `text` |
| **PatientMedication** | Medikamenten-Liste | `name`, `dosage`, `frequency` |
| **PatientSurgery** | OP-Historie | `surgeryName`, `date`, `complications` |

### 3.6 State Management

| Store | Datei | Zweck | Persistenz |
|-------|-------|-------|-----------|
| `useSessionStore` | `store/sessionStore.ts` | Sitzungszustand, Antworten, Atome, Triage | Verschlüsseltes `localStorage` (AES-256-GCM) |
| `useModeStore` | `store/modeStore.ts` | Demo/Live-Modus | `localStorage` |
| `useThemeStore` | `store/themeStore.ts` | Dark/Light Theme | `localStorage` |

---

## 4. Funktionsumfang

### 4.1 Patienten-Funktionen

| Funktion | Beschreibung | Status |
|----------|-------------|--------|
| **Digitale Anamnese** | 270+ medizinische Fragen mit intelligentem Routing | ✅ |
| **10 Service-Flows** | Anamnese, Rezepte, AU, BG-Unfall, Überweisung, Terminabsage, Dateien/Befunde, Telefon, Dokumente, Nachricht | ✅ |
| **13 Fachmodule** | Angiologie, Atemwege, GI, Haut, Herz, Stoffwechsel, Bewegungsapparat, Neurologie, Urologie, Augen, HNO, Psyche, Gynäkologie | ✅ |
| **DSGVO-Einwilligung** | 3-Stufen Consent-Dialog (Art. 6, Art. 9, Widerruf) | ✅ |
| **Mehrsprachigkeit** | 10 Sprachen, automatische Erkennung, RTL-Unterstützung | ✅ |
| **Voice-Input** | Web Speech API (Browser-basiert, DSGVO-safe) | ✅ |
| **OCR-Scanning** | eGK-Karte + Medikamentenplan via Tesseract.js | ✅ |
| **QR-Code Onboarding** | QR scannen → Session starten | ✅ |
| **Session Recovery** | Wiederherstellung nach Abbruch | ✅ |
| **Echtzeit-Chat** | FAQ-Bot (18 Einträge) + Team-Chat via Socket.IO | ✅ |
| **Barrierefreiheit** | Schriftgröße 90–150%, Dark/Light/Kiosk-Mode, Haptic Feedback | ✅ |
| **PDF-Export** | Signatur-Canvas, A4-Layout, Praxis-Header | ✅ |
| **IGeL-Services** | 7 Selbstzahlerleistungen mit GOÄ-Preisen | ✅ |
| **BG-Unfallformular** | 5-Schritte-Formular, kaskadierend gespeichert | ✅ |
| **PatientWartezimmer** | Wartezimmer-Ansicht für Patienten | ✅ NEU |
| **DatenschutzGame** | Gamification-Element: Datenschutz-Quiz/Spiel | ✅ NEU |

### 4.2 Arzt-Funktionen

| Funktion | Beschreibung | Status |
|----------|-------------|--------|
| **Session-Übersicht** | Live-Statistiken (Aktiv, Abgeschlossen, Red Flags) | ✅ |
| **KI-Zusammenfassung** | ICD-10-Codes + medizinische Zusammenfassung | ⚠️ Simuliert |
| **Triage-Bestätigung** | Echtzeit-Alerts via Socket.IO, ACK-Button | ✅ |
| **Echtzeit-Chat** | Bidirektional mit Patienten | ✅ |
| **Daten-Export** | PDF/CSV/JSON mit DSGVO-Footer | ✅ |
| **Session-Locking** | Kollisionsvermeidung bei Multi-Arzt-Ansichten | ✅ |

### 4.3 MFA-Funktionen

| Funktion | Beschreibung | Status |
|----------|-------------|--------|
| **Patientenzuweisung** | Sitzungen an Ärzte zuweisen | ✅ |
| **QR-Code Generierung** | Für Patienten-Onboarding | ✅ |
| **Wartezimmer-Management** | 3 Prioritäten (NORMAL/URGENT/EMERGENCY) | ✅ |
| **StaffChat** | Team-interner Chat | ✅ NEU |
| **StaffTodoList** | Aufgabenverwaltung für das Praxisteam | ✅ NEU |

### 4.4 Admin-Funktionen

| Funktion | Beschreibung | Status |
|----------|-------------|--------|
| **7-Tab Analytics** | Systemdokumentation, KPIs, Sicherheitsarchitektur | ⚠️ Statische Daten |
| **Questionnaire-Flow** | Visueller Flow (Mermaid-Diagramme) | ✅ |
| **Komponentenübersicht** | Technologie-Stack Visualisierung | ✅ |
| **ROI-Rechner** | Produktivitäts-KPIs | ✅ |

### 4.5 Sicherheitsfunktionen

| Funktion | Beschreibung | Status |
|----------|-------------|--------|
| **AES-256-GCM** | Feld-basierte PII-Verschlüsselung (Server) | ✅ |
| **Client-Verschlüsselung** | AES-256-GCM via Web Crypto API (localStorage) | ✅ |
| **JWT-Authentifizierung** | HS256 gepinnt, JTI-Blacklist, 24h Expiry | ✅ |
| **RBAC** | 4 Rollen: PATIENT, ARZT, MFA, ADMIN | ✅ |
| **Passwort-Hashing** | bcrypt (12 Salt-Rounds) | ✅ |
| **Security Headers** | HSTS, CSP, X-Frame-Options, Permissions-Policy, COEP/COOP/CORP | ✅ |
| **Rate-Limiting** | Global (200/15min) + Pro-Route | ✅ |
| **Audit-Logging** | HIPAA-konform mit Retry-Logik, Log-Sanitisierung | ✅ |
| **Cookie Consent** | TTDSG §25, granulare Kategorien, versioniert | ✅ NEU |
| **WebSocket-Auth** | JWT-Prüfung bei Socket.IO-Verbindungen | ✅ FIX |
| **Logout mit Token-Invalidierung** | JTI-Blacklist basiert | ✅ NEU |

### 4.6 PWA-Funktionen

| Funktion | Beschreibung | Status |
|----------|-------------|--------|
| **Installierbar** | Standalone PWA, Portrait-Modus | ✅ |
| **Service Worker** | Stale-While-Revalidate für Assets, Network-First für i18n | ✅ |
| **Offline-Fallback** | Inline-HTML "Sie sind offline" | ✅ |
| **Offline-Fragebogen** | Fragebogen offline ausfüllen | ❌ Nicht implementiert |

---

## 5. Patienten-Flow

### 5.1 Übersicht: 10 Service-Pfade

| # | Service | Start-ID | Dauer | Beschreibung | Bestandspatienten-Pflicht |
|---|---------|----------|-------|-------------|--------------------------|
| 1 | **Termin / Anamnese** | 0000 → 1000 | 5–8 Min | Vollständige medizinische Anamnese | Nein |
| 2 | **Medikamente / Rezepte** | RES-100 | 2 Min | Folge-Rezept-Anforderung | ✅ Ja |
| 3 | **AU (Krankschreibung)** | AU-100 | 3 Min | Arbeitsunfähigkeits-Bescheinigung | ✅ Ja |
| 4 | **Unfallmeldung (BG)** | 2080 | 5 Min | Arbeits-/Wegeunfall dokumentieren | Nein |
| 5 | **Überweisung** | UEB-100 | 2 Min | Fachspezifische Überweisung | ✅ Ja |
| 6 | **Terminabsage** | ABS-100 | 1 Min | Bestehenden Termin absagen | Nein |
| 7 | **Dateien / Befunde** | DAT-100 | 2 Min | Dokumente übermitteln | ✅ Ja |
| 8 | **Telefonanfrage** | TEL-100 | 2 Min | Rückruf anfordern | Nein |
| 9 | **Dokumente anfordern** | BEF-100 | 2 Min | Befunde/Berichte anfordern | ✅ Ja |
| 10 | **Nachricht schreiben** | MS-100 | 3 Min | Allgemeine Praxis-Nachricht | Nein |

> **Neupatienten** bei Bestandspatienten-Services erhalten den Hinweis: *„Dieser Service ist nur Bestandspatienten vorbehalten."*

### 5.2 Haupt-Anamnese-Flow (Service 1)

```
LANDING PAGE (10 Service-Cards)
    │
    ▼
DSGVO-EINWILLIGUNG (3 Checkboxen) ──[Ablehnung]──▶ STOPP
    │
    ▼
IDENTIFIKATION
    ├── 0000  Bekannt? (Ja/Nein)
    ├── 0001  Nachname (PII → AES-256-GCM)
    ├── 0011  Vorname (PII → AES-256-GCM)
    ├── 0002  Geschlecht (M/W/D)
    └── 0003  Geburtsdatum
         │
    ┌────┴────────────┐
    ▼                 ▼
 NEU-PATIENT       BESTANDS-PATIENT
    │                    │
    ▼                    ▼
 ENROLLMENT          TERMINWUNSCH (TERM-100/101)
 ├─ 2000 Versicherung       │
 ├─ 3000 PLZ (PII)      MEDIKAMENTENÄNDERUNG (ALT-100)
 ├─ 3001 Ort (PII)          │
 ├─ 3002 Straße (PII)   BESUCHSGRUND (VISIT-100)
 ├─ 3003 E-Mail (PII)   ├─ Beschwerdeabklärung → 1000
 └─ 3004 Telefon (PII)  ├─ Kontrolle → 5B-100
    │                    ├─ Vorsorge → 5C-100
    │                    ├─ Therapieanpassung → 5D-100
    └────┬───────────────├─ Befunderörterung → 5E-100
         │               ├─ Tumorverdacht → 5F-100
         ▼               ├─ Begutachtung → 5G-100
    BESCHWERDEN          ├─ Unfallfolgen → 5H-100
    ├── 1000 vorhanden?  └─ Zweitmeinung → 5I-100
    ├── 1001 Seit wann?
    ├── 1004 Häufigkeit?
    ├── 1005 Auslöser? (Multiselect)
    ├── 1006 Verlauf?
    ├── 1007 Begleitsymptome (Multiselect)
    └── 1002 Körperregion (→ 13 Sub-Module)
              │
              ├── 1010 Angiologie
              ├── 1020 Atemwege
              ├── 1030 Magen-Darm
              ├── 1040 Haut
              ├── 1050 Herz-Kreislauf
              ├── 1060 Stoffwechsel
              ├── 1070 Bewegungsapparat
              ├── 1080 Neurologie
              ├── 1090 Urologie
              ├── 1A00 Augen
              ├── 1B00 HNO
              ├── 1C00 Psyche (PHQ-Style, 15 Fragen)
              └── GYN-100 Gynäkologie (showIf: W)
         │
         ▼
    ALLGEMEIN (nur Neu-Patienten)
    ├── 4000 Größe, 4001 Gewicht
    ├── 5000 Diabetes, 6000 Beeinträchtigungen
    ├── 6002 Implantate, 6004 Blutverdünner
    └── 6007 Allergien
         │
         ▼
    GEWOHNHEITEN
    ├── 4002 Rauchen, 4100 Sport
    ├── 4120 Beruf, 4130 Alkohol
    └── 4131 Drogen
         │
         ▼
    VORERKRANKUNGEN
    ├── 7000 Gesundheitsstörungen (Multiselect)
    └── 7001–7011 Detail-Follow-ups
         │
         ▼
    SCREENING (showIf Alter/Geschlecht)
    ├── 1700 Gesundheitscheck (>35 J.)
    ├── 1800 Mammografie (W, >50 J.)
    ├── 1900 Prostata (M, >44 J.)
    └── DARM-W-100 Darmkrebs (>50 J.)
         │
         ▼
    SCHWANGERSCHAFT (showIf: W, 14–50 J.)
    ├── 8800 Schwanger?
    └── 8801–8851 Details
         │
         ▼
    MEDIKAMENTE
    ├── MED-100 Strukturierte Gruppen
    └── Medikamenten-Manager (Polypharmazie-Warnung >5)
         │
         ▼
    ABSCHLUSS
    ├── 9010 Kontaktwunsch
    ├── 9500 Bewertung (optional)
    └── 9000 ENDE → Zusammenfassung → PDF-Export
```

### 5.3 Routing-Engine (3-stufig)

```
Antwort eingegeben
    │
    ▼
Stufe 1: followUpQuestions
    │  Hat die gewählte Option spezifische Sub-Fragen?
    │  JA → folge diesem Pfad
    │  NEIN ↓
    ▼
Stufe 2: Conditional Routing
    │  Prüfe Bedingungen (when/context/equals)
    │  MATCH → folge "then" Pfad
    │  NEIN ↓
    ▼
Stufe 3: Static logic.next
    │  Fester nächster Schritt
    ▼
Nächste Frage anzeigen
```

**Unterstützte Operatoren:**

| Operator | Beschreibung | Beispiel |
|----------|-------------|---------|
| `equals` | Exakte Übereinstimmung | `answer == 'ja'` |
| `notEquals` | Ungleich | `answer != 'nein'` |
| `contains` | Array enthält Wert | `['herz'].includes(...)` |
| `greaterThan` | Numerisch größer | `age > 35` |
| `lessThan` | Numerisch kleiner | `age < 6` |
| `contextEquals` | Session-Kontext prüfen | `gender == 'W'` |
| `contextGreaterThan` | Kontext-Vergleich | `age > 50` |
| `contextLessThan` | Kontext-Vergleich | `age < 14` |

---

## 6. Triage-System

### 6.1 Alle 10 Regeln

| # | Regel | Level | Auslöser | Aktion |
|---|-------|-------|----------|--------|
| 1 | **Akutes Koronarsyndrom** | 🔴 CRITICAL | Brustschmerzen + Ausstrahlung Arm/Kiefer + Dyspnoe | Vollbild-Overlay, 112-Notruf-Button, 5-Sek-Countdown |
| 2 | **Suizidalität** | 🔴 CRITICAL | PHQ-Screening positiv, Suizidgedanken (Kap. 7K) | Sofort-Alert an Arzt + Notfallpad |
| 3 | **SAH/Aneurysma** | 🔴 CRITICAL | Vernichtungskopfschmerz + Bewusstseinsstörung | 112-Notruf, Notfallprotokoll |
| 4 | **Synkope + Risiko** | 🔴 CRITICAL | Bewusstlosigkeit + Herzrhythmusstörung/Brustschmerzen | Sofort-Alert, Priorisierung |
| 5 | **GI-Blutung** | 🟡 WARNING | Blutverdünner + Bauchschmerzen/aktive Blutung | Arzt-Warnung |
| 6 | **Diabetisches Fußsyndrom** | 🟡 WARNING | Diabetes + Fußwunde/-syndrom | Arzt-Warnung |
| 7 | **Starker Raucher** | 🟡 WARNING | ≥20 Zigaretten/Tag + Alter >40 (>30 Pack-Years) | Arzt-Hinweis |
| 8 | **Schwangerschaft + Medikamente** | 🟡 WARNING | Schwanger + Blutverdünner/kontraindiziert | Arzt-Warnung |
| 9 | **Polypharmazie** | 🟡 WARNING | >5 Medikamente | Arzt-Hinweis |
| 10 | **Doppel-Antikoagulation** | 🟡 WARNING | ≥2 Antikoagulantien gleichzeitig | Arzt-Warnung |

### 6.2 Notfall-Workflow

```
Antwort eingegeben
      │
      ▼
  TriageEngine.getTriageAlert() prüft alle 10 Regeln
      │
  ┌───┴───────────┐
  ▼               ▼
WARNING         CRITICAL
  │               │
  ▼               ▼
WarningBanner   RedFlagOverlay (Vollbild)
(gelb/amber)    (rot, pulsierend)
  │               │
  │               ├── 5-Sekunden-Countdown
  │               ├── 112-Direktanruf-Button (tel:112)
  │               └── Automatische Weiterleitung
  │
  └──── Socket.IO ────→ Arzt-Dashboard
                         Triage-Tab
                         Echtzeit-Notification
```

---

## 7. Sicherheitsarchitektur

### 7.1 Verschlüsselung

```
┌─────────────────────────────────────────────────┐
│              ENCRYPTION LAYER                    │
│                                                  │
│  ┌──────────┐    ┌────────────────────────┐     │
│  │ PII-Daten │───▶│ AES-256-GCM             │     │
│  │ (Name,    │    │ • IV: 16 Bytes (random)  │     │
│  │  Adresse, │    │ • AuthTag: GCM           │     │
│  │  E-Mail,  │    │ • Key: 32 Bytes (env)    │     │
│  │  Telefon) │    │ • Format: iv:tag:cipher  │     │
│  └──────────┘    └────────────────────────┘     │
│                                                  │
│  ┌──────────┐    ┌────────────────────────┐     │
│  │ E-Mail    │───▶│ HMAC-SHA-256 + Salt      │     │
│  │ (Pseudo-  │    │ Salt aus ENCRYPTION_KEY  │     │
│  │  nym.)    │    │ abgeleitet               │     │
│  └──────────┘    └────────────────────────┘     │
│                                                  │
│  ┌──────────┐    ┌────────────────────────┐     │
│  │ Passwort  │───▶│ bcrypt (12 Salt-Rounds)  │     │
│  │ (Arzt/    │    └────────────────────────┘     │
│  │  MFA)     │                                   │
│  └──────────┘                                    │
│                                                  │
│  ┌──────────┐    ┌────────────────────────┐     │
│  │ Client    │───▶│ AES-256-GCM (Web Crypto) │     │
│  │ localStorage │ │ PBKDF2 100k Iterationen  │     │
│  └──────────┘    └────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

**PII-verschlüsselte Felder (9 Atom-IDs):**

| Atom-ID | Feld |
|---------|------|
| 0001 | Nachname |
| 0011 | Vorname |
| 3000 | PLZ |
| 3001 | Stadt |
| 3002 | Adresse |
| 3003 | E-Mail |
| 3004 | Telefon |
| 9010 | Bestätigungs-E-Mail |
| 9011 | Bestätigungs-Telefon |

### 7.2 Authentifizierung & Autorisierung

| Aspekt | Implementierung |
|--------|----------------|
| **Methode** | JWT (HS256 — explizit gepinnt, BSI TR-02102) |
| **Token-Transport** | `Authorization: Bearer <token>` |
| **Token-Speicherung** | `localStorage` |
| **Gültigkeit** | 24 Stunden |
| **Token-ID** | JTI via `crypto.randomUUID()` |
| **Token-Blacklist** | In-Memory mit 15-Min-Cleanup-Intervall |
| **Token-Refresh** | `/api/sessions/refresh-token` |
| **Logout** | `POST /api/arzt/logout` → JTI-Blacklist |
| **Rollen (RBAC)** | 4-Level: `patient`, `arzt`, `mfa`, `admin` |
| **Passwort-Hashing** | bcrypt (12 Rounds) |
| **Login-Rate-Limit** | 5 Versuche / 15 Min (Arzt) |
| **MFA-Rate-Limit** | 10 Requests / 15 Min |
| **WebSocket-Auth** | JWT-Prüfung via `io.use()` Middleware |

### 7.3 Security Headers (Netlify + Helmet)

| Header | Wert | Status |
|--------|------|--------|
| Strict-Transport-Security | `max-age=31536000; includeSubDomains; preload` | ✅ |
| X-Frame-Options | `DENY` | ✅ |
| X-Content-Type-Options | `nosniff` | ✅ |
| Referrer-Policy | `strict-origin-when-cross-origin` | ✅ |
| Permissions-Policy | `camera=(self), microphone=(), geolocation=(), payment=()` | ✅ |
| Content-Security-Policy | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' ...` | ✅ |
| Cross-Origin-Embedder-Policy | `require-corp` | ✅ |
| Cross-Origin-Opener-Policy | `same-origin` | ✅ |
| Cross-Origin-Resource-Policy | `same-origin` | ✅ |
| X-XSS-Protection | `0` (CSP übernimmt) | ✅ |

### 7.4 Rate Limiting

| Scope | Fenster | Max Requests |
|-------|---------|-------------|
| Global | 15 Min | 200 |
| Arzt-Login | 15 Min | 5 |
| MFA-Routen | 15 Min | 10 |
| Upload | 15 Min | 30 |

### 7.5 Audit-Logging

- **HIPAA-konformes** Zugriffsprotokoll (`AuditLog`-Tabelle)
- **Erfasste Daten:** Action, Resource, IP-Adresse, User-Agent, Response-Status, Dauer
- **Sanitisierung:** Sensitive Keys (token, password, secret) → `[REDACTED]`
- **Retry-Logik:** Bis zu 3 Versuche bei Schreibfehler
- **User-Agent Sanitisierung:** Newlines/Steuerzeichen entfernt (Log-Injection-Schutz)

### 7.6 CORS-Konfiguration

| Komponente | Konfiguration |
|-----------|--------------|
| Express Server | Eingeschränkt auf `config.frontendUrl`, `credentials: true` |
| Socket.IO | Gleiche Einschränkung |
| Netlify Functions | Eingeschränkt auf `diggai-drklaproth.netlify.app`, `localhost:5173/4173` |

---

## 8. Internationalisierung

### 8.1 Konfiguration

- **Bibliothek:** i18next + react-i18next + i18next-http-backend + browser-languagedetector
- **Fallback:** Deutsch (`de`)
- **Erkennung:** querystring → cookie → localStorage → navigator → htmlTag
- **Übersetzungsschlüssel pro Sprache:** ~1.433

### 8.2 Unterstützte Sprachen (10)

| # | Code | Sprache | RTL | Status |
|---|------|---------|-----|--------|
| 1 | `de` | 🇩🇪 Deutsch (Standard) | Nein | ✅ Vollständig |
| 2 | `en` | 🇬🇧 Englisch | Nein | ✅ UI-Chrome |
| 3 | `ar` | 🇸🇦 Arabisch | **Ja** | ✅ UI-Chrome |
| 4 | `tr` | 🇹🇷 Türkisch | Nein | ✅ UI-Chrome |
| 5 | `uk` | 🇺🇦 Ukrainisch | Nein | ✅ UI-Chrome |
| 6 | `es` | 🇪🇸 Spanisch | Nein | ✅ UI-Chrome |
| 7 | `fa` | 🇮🇷 Persisch/Farsi | **Ja** | ✅ UI-Chrome |
| 8 | `it` | 🇮🇹 Italienisch | Nein | ✅ UI-Chrome |
| 9 | `fr` | 🇫🇷 Französisch | Nein | ✅ UI-Chrome |
| 10 | `pl` | 🇵🇱 Polnisch | Nein | ✅ UI-Chrome |

> **Hinweis:** „UI-Chrome" bedeutet, dass die Benutzeroberfläche übersetzt ist, aber die **medizinischen Fragetexte** (270+) sind derzeit nur auf Deutsch verfügbar (hardcodiert in `questions.ts` / `new-questions.ts`).

### 8.3 RTL-Unterstützung

- Arabisch (`ar`) und Persisch (`fa`) erhalten automatisch `dir="rtl"` auf dem `<html>`-Element
- Layout-Spiegelung über CSS `direction` und `text-align`
- Kompatibel mit Tailwind CSS 4 RTL-Utilities

### 8.4 Bekannte i18n-Lücken

| Bereich | Fehlende Strings | Status |
|---------|-----------------|--------|
| Fragetexte + Optionen | ~500+ | ❌ Offen |
| AdminDashboard | ~200+ | ❌ Offen |
| ArztDashboard | ~60+ | ❌ Offen |
| MFADashboard | ~40+ | ❌ Offen |
| DSGVOConsent Rechtstext | ~15 | ❌ Offen |
| Input-Komponenten | ~30 | ❌ Offen |

---

## 9. Dashboard-Übersicht

### 9.1 Arzt-Dashboard (`/arzt`)

| Feature | Beschreibung |
|---------|-------------|
| **Session-Liste** | Letzte 100 Sitzungen mit Status-Filtern |
| **Live-Statistiken** | Aktive, abgeschlossene Sessions, Red Flags |
| **KI-Zusammenfassung** | ICD-10-Codes, Anamnese-Summary (simuliert) |
| **Triage-Events** | Echtzeit via Socket.IO, ACK-Button |
| **Echtzeit-Chat** | Bidirektional mit Patienten |
| **Daten-Export** | PDF/CSV pro Session |
| **Session-Locking** | Zeigt, wer gerade eine Akte bearbeitet |
| **Logout** | Token-Invalidierung via JTI-Blacklist |

### 9.2 MFA-Dashboard (`/mfa`)

| Feature | Beschreibung |
|---------|-------------|
| **Warteschlange** | Eingehende Patientensitzungen, 3 Prioritäten |
| **Ärzte-Liste** | Verfügbare Ärzte und deren Auslastung |
| **Schnellzuordnung** | Sitzungen per Dropdown an Ärzte zuweisen |
| **Statusübersicht** | Wartend, in Bearbeitung, abgeschlossen |
| **QR-Code Generierung** | Für Patienten-Onboarding |
| **StaffChat** | Team-interner Chat |
| **StaffTodoList** | Aufgabenverwaltung |

### 9.3 Admin-Dashboard (`/admin`)

| Tab | Inhalt |
|-----|--------|
| 1. Übersicht | System-KPIs, Patientenfluss-Statistiken |
| 2. Questionnaire-Flow | Visueller Flow mit Mermaid-Diagrammen |
| 3. Sicherheitsarchitektur | Interaktive Grafik |
| 4. Produktivitäts-KPIs | ROI-Rechner, Zeitersparnis |
| 5. Komponentenübersicht | Technologie-Stack |
| 6. i18n-Status | Übersetzungsfortschritt |
| 7. Dokumentation | Links zu DSGVO-Docs |

> ⚠️ **Hinweis:** Alle Admin-Dashboard-Daten sind derzeit **statisch/hardcodiert** — keine Live-Metriken.

### 9.4 Weitere Seiten

| Seite | Route | Beschreibung |
|-------|-------|-------------|
| **DokumentationPage** | `/docs` | Öffentliche Feature-Dokumentation |
| **HandbuchPage** | `/handbuch` | Benutzerhandbuch |
| **DatenschutzPage** | `/datenschutz` | Datenschutzerklärung (DSGVO Art. 13/14), 11 Abschnitte |
| **ImpressumPage** | `/impressum` | Impressum (§5 DDG), 8 Abschnitte |

---

## 10. API-Referenz

### 10.1 Sessions (`/api/sessions`)

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| POST | `/api/sessions` | ❌ | Neue Sitzung erstellen |
| POST | `/api/sessions/qr-token` | ✅ requireAuth | QR-Code JWT generieren |
| GET | `/api/sessions/:id/state` | ✅ Auth + Owner | Sitzungszustand abrufen |
| POST | `/api/sessions/:id/submit` | ✅ Auth + Owner | Sitzung abschließen |
| POST | `/api/sessions/:id/accident` | ✅ Auth + Owner | BG-Unfalldaten speichern |
| GET | `/api/sessions/:id/accident` | ✅ Auth | Unfalldaten abrufen |
| POST | `/api/sessions/:id/medications` | ✅ Auth + Owner | Medikamente ersetzen |
| GET | `/api/sessions/:id/medications` | ✅ Auth | Medikamente abrufen |
| POST | `/api/sessions/:id/surgeries` | ✅ Auth + Owner | OPs ersetzen |
| GET | `/api/sessions/:id/surgeries` | ✅ Auth | OPs abrufen |
| POST | `/api/sessions/refresh-token` | ✅ Auth | JWT erneuern |

### 10.2 Answers (`/api/answers`)

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| POST | `/api/answers/:id` | ✅ Auth + Owner | Antwort einreichen (Upsert), Triage-Check |

### 10.3 Atoms (`/api/atoms`)

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| GET | `/api/atoms?ids=...` | ✅ Auth | Batch-Load Frage-Definitionen |

### 10.4 Arzt (`/api/arzt`)

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| POST | `/api/arzt/login` | Rate-Limited (5/15min) | Login mit bcrypt |
| POST | `/api/arzt/logout` | ✅ Auth | Logout + JTI-Blacklist |
| GET | `/api/arzt/sessions` | ✅ Arzt/Admin | Letzte 100 Sitzungen |
| GET | `/api/arzt/sessions/:id` | ✅ Arzt/Admin/MFA | Details mit entschlüsseltem PII |
| PUT | `/api/arzt/triage/:id/ack` | ✅ Arzt/Admin | Triage bestätigen |
| PUT | `/api/arzt/sessions/:id/status` | ✅ Arzt/Admin/MFA | Status ändern |
| GET | `/api/arzt/sessions/:id/summary` | ✅ Arzt/Admin | KI-Zusammenfassung (simuliert) |

### 10.5 MFA (`/api/mfa`)

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| GET | `/api/mfa/sessions` | ✅ MFA/Admin | Sitzungsübersicht |
| GET | `/api/mfa/doctors` | ✅ MFA/Admin | Ärzte-Liste |
| POST | `/api/mfa/sessions/:id/assign` | ✅ MFA/Admin | Arzt zuweisen |

### 10.6 Chat (`/api/chats`)

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| GET | `/api/chats/:sessionId` | ✅ Auth + Owner | Chat-Verlauf abrufen |

### 10.7 Queue (`/api/queue`)

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| POST | `/api/queue/join` | ✅ requireAuth | Warteschlange beitreten |
| GET | `/api/queue` | ✅ requireAuth + Rolle | Warteschlangenstatus |
| GET | `/api/queue/position/:sessionId` | ✅ requireAuth | Position abrufen |
| PUT | `/api/queue/:id/call` | ✅ MFA/Admin/Arzt | Patient aufrufen |
| PUT | `/api/queue/:id/treat` | ✅ MFA/Admin/Arzt | In Behandlung |
| PUT | `/api/queue/:id/done` | ✅ MFA/Admin/Arzt | Fertig |
| DELETE | `/api/queue/:id` | ✅ MFA/Admin | Entfernen |

### 10.8 Payments (`/api/payments`)

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| GET | `/api/payments/services` | ✅ requireAuth | IGeL-Services-Katalog |
| POST | `/api/payments/checkout` | ✅ Auth | Stripe-Checkout (simuliert) |

### 10.9 Export (`/api/export`)

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| GET | `/api/export/sessions/:id/export/csv` | ✅ Arzt/Admin/MFA | CSV-Export (BOM, Semikolon) |
| GET | `/api/export/sessions/:id/export/pdf` | ✅ Arzt/Admin/MFA | HTML-Report (Print-to-PDF) |
| GET | `/api/export/sessions/:id/export/json` | ✅ Arzt/Admin | Raw JSON mit Klartext-PII |

### 10.10 Upload (`/api/upload`)

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| POST | `/api/upload` | ✅ Auth | Upload (JPG/PNG/PDF, max 10MB) |
| GET | `/api/upload/:filename` | ✅ Auth | Download mit Audit-Log |

### 10.11 Health (`/api/health`)

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|-------------|
| GET | `/api/health` | ❌ | Status, Version, Timestamp |

### 10.12 Socket.IO Events

| Event | Richtung | Beschreibung |
|-------|----------|-------------|
| `join:arzt` | Client → Server | Arzt-Room beitreten (nur arzt/admin/mfa) |
| `join:session` | Client → Server | Session-Room beitreten (Owner-Check) |
| `chat:message` | Bidirektional | Chat-Nachricht senden/empfangen |
| `triage:alert` | Server → Client | Triage-Event an Arzt-Room |
| `session:completed` | Server → Client | Session abgeschlossen |
| `typing` | Bidirektional | Typing-Indikator |
| `session:lock` / `unlock` | Bidirektional | Session-Locking |

---

## 11. DSGVO-Dokumentation

### 11.1 Vorhandene Dokumente

| Dokument | Datei | DSGVO-Artikel | Inhalt |
|----------|-------|---------------|--------|
| **Datenschutz-Folgenabschätzung** | `docs/DSFA.md` | Art. 35 | 5 Kapitel, 10 Risiken + Maßnahmen, TOM-Übersicht |
| **Verfahrensverzeichnis** | `docs/VERFAHRENSVERZEICHNIS.md` | Art. 30 | 6 Verarbeitungstätigkeiten (Anamnese, Auth, Chat, Audit, Consent, Wartezimmer) |
| **Auftragsverarbeitungsvertrag** | `docs/AVV_TEMPLATE.md` | Art. 28 | 9 Paragraphen, TOM, Unterauftragsverarbeiter |
| **Incident Response Plan** | `docs/INCIDENT_RESPONSE_PLAN.md` | Art. 33/34 | 4-Stufen-Klassifikation, 5-Schritt-Prozess, Meldepflichten |
| **TOM-Dokumentation** | `docs/TOM_DOKUMENTATION.md` | Art. 32 | 7 Kategorien (Vertraulichkeit, Integrität, Verfügbarkeit, etc.) |

### 11.2 Im Frontend implementiert

| Feature | Beschreibung | DSGVO/TTDSG |
|---------|-------------|-------------|
| **DSGVOConsent** | 3-Stufen Einwilligungsdialog | Art. 6 Abs. 1a, Art. 9 Abs. 2a |
| **CookieConsent** | Granularer Cookie-Banner, versioniert | TTDSG §25 |
| **DatenschutzPage** | Vollständige Datenschutzerklärung, 11 Abschnitte | Art. 13/14 |
| **ImpressumPage** | Impressum mit berufsrechtlichen Angaben | §5 DDG |
| **Automatische Löschung** | Orphan-Sessions >24h (stündlich) | Art. 5 Abs. 1e |
| **DSGVO-Bereinigung** | 90 Tage Aufbewahrungsfrist (Script) | Art. 17 |
| **Audit-Trail** | Vollständiges Zugriffsprotokoll | Art. 5 Abs. 2 |
| **Pseudonymisierung** | SHA-256 Hash + Salt für E-Mail | Art. 4 Nr. 5 |
| **Verschlüsselung** | AES-256-GCM für alle PII-Felder | Art. 32 |
| **Datenexport** | PDF/CSV/JSON Export | Art. 20 |

### 11.3 DSGVO-Konformitätsstatus

| Anforderung | Status | Anmerkung |
|-------------|--------|-----------|
| Einwilligung vor Verarbeitung | ✅ | 3-Stufen Dialog |
| Datenminimierung | ✅ | Nur medizinisch notwendige Daten |
| Pseudonymisierung | ✅ | SHA-256 + Salt |
| Verschlüsselung ruhender Daten | ✅ | AES-256-GCM |
| Datenportabilität (Art. 20) | ⚠️ | Nur für Admin/Arzt, nicht für Patienten |
| Recht auf Löschung (Art. 17) | ⚠️ | Kein Patient-Self-Service |
| Einwilligungsnachweis | ⚠️ | Nur in Browser-localStorage |
| Informierte Einwilligung (mehrsprachig) | ⚠️ | Rechtstext nur auf Deutsch |

---

## 12. Deployment

### 12.1 Netlify-Konfiguration

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"

# Security Headers (HSTS, CSP, X-Frame-Options, COEP/COOP/CORP etc.)
[[headers]]
  for = "/*"
  [headers.values]
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    X-Frame-Options = "DENY"
    Content-Security-Policy = "default-src 'self'; script-src 'self'; ..."
    # + 7 weitere Security Headers

# Cache-Control
[[headers]]
  for = "/assets/*"    → immutable (1 Jahr)
  for = "/index.html"  → no-cache, must-revalidate

# Redirects
/api/* → /.netlify/functions/:splat (200)
/*     → /index.html (200, SPA Fallback)
```

### 12.2 Deployment-Ziele

| Ziel | URL | Plattform |
|------|-----|-----------|
| **Primär (Frontend)** | `https://diggai-drklaproth.netlify.app` | Netlify |
| **Backend** | Lokal (`localhost:3001`) | Node.js + SQLite |
| **Fallback-API** | `/.netlify/functions/*` | Netlify Functions (In-Memory) |

### 12.3 Deployment-Scripts

| Script | Sprache | Methode |
|--------|---------|---------|
| `build_and_deploy.py` | Python | ZIP-Upload |
| `deploy_digest.py` | Python | SHA1-Digest (effizient) |
| `deploy_netlify_api.py` | Python | ZIP-Upload |
| `deploy-node.mjs` | Node.js | SHA1-Digest |

> ⚠️ **Kein CI/CD vorhanden** — alle Deployments sind manuelle Script-Aufrufe.

### 12.4 Umgebungsvariablen

```env
# server/.env
DATABASE_URL="file:../prisma/anamnese.db"
JWT_SECRET="<MIN 32 BYTES, ZUFÄLLIG>"
ENCRYPTION_KEY="<EXAKT 32 ASCII-ZEICHEN>"
ARZT_PASSWORD="<SICHERES_PASSWORT>"
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
PORT=3001
RETENTION_DAYS=90
```

### 12.5 Setup-Schritte

```bash
# 1. Repository klonen
git clone https://github.com/DiggAiHH/diggai-anamnese.git
cd anamnese-app

# 2. Dependencies installieren
npm install

# 3. server/.env konfigurieren (siehe oben)

# 4. Prisma einrichten
npx prisma generate
npx prisma migrate dev

# 5. Datenbank befüllen
npm run db:seed

# 6. Entwicklung starten
npm run dev:all
# → Frontend: http://localhost:5173
# → Backend:  http://localhost:3001

# 7. Production Build
npm run build
```

### 12.6 Build-Metriken

| Metrik | Wert |
|--------|------|
| Module transformiert | 2.537 |
| Build-Zeit | ~4,7 Sek. |
| Haupt-Bundle (JS) | 1.326 kB (381 kB gzip) |
| CSS | 119 kB (17 kB gzip) |
| AdminDashboard Chunk | 501 kB (138 kB gzip) |
| MFADashboard Chunk | 58 kB |
| ArztDashboard Chunk | 35 kB |

### 12.7 Architektur-Einschränkung

Das Express-Backend mit Prisma + SQLite ist **nicht auf Netlify deployt**. Die Netlify Functions dienen als leichtgewichtiger Fallback mit In-Memory-Speicher und sind **kein Ersatz für das echte Backend**. Für den Produktivbetrieb wird ein separater Node.js-Host benötigt (z.B. Railway, Render, Fly.io).

---

## 13. Marketing & Geschäftsmodell

### 13.1 Claim & Positionierung

- **Claim:** *„Weniger Papier. Mehr Medizin."* / *„Digitale Patientenaufnahme. Made in Germany."*
- **Regulatorisch:** KEINE DiGA, KEIN Medizinprodukt, KEINE CE-Kennzeichnung
- **Differenzierung:** Passive Zeitersparnis durch Automatisierung (Triage, Routing, Screening-Gates)

### 13.2 Value Proposition

**Aktive Zeitersparnis:**

| Feature | Ersparnis |
|---------|-----------|
| Digitale statt Papier-Aufnahme | -65% Aufnahmezeit |
| Intelligentes Routing | -40% der Fragen |
| OCR-Scanning (Medikamentenplan) | -90% manuelle Eingabe |
| Mehrsprachigkeit | Keine Dolmetscher-Wartezeit |

**Passive Zeitersparnis (Automatisierung):**

| Feature | Wirkung |
|---------|---------|
| KI-Triage (<2 Sek.) | Notfälle sofort erkannt |
| Screening-Gates (Alter/Geschlecht) | Relevante Vorsorge automatisch |
| Auto-Cleanup (24h/90 Tage) | DSGVO-Compliance ohne Aufwand |
| Audit-Trail | Nachweispflicht automatisch erfüllt |

### 13.3 ROI-Projektionen

**Berechnungsbasis:** MFA-Arbeitgeberkosten ~22€/Stunde

| Praxis-Typ | Patienten/Tag | Ersparnis/Tag | Ersparnis/Monat | Ersparnis/Jahr |
|------------|---------------|---------------|-----------------|----------------|
| Solo-Praxis (1 Arzt) | 25 | 5 Std. | 2.200€ | **26.400€** |
| Gemeinschaftspraxis (3 Ärzte) | 40 | 8 Std. | 3.500€ | **42.000€** |
| MVZ/FAZ (7 Ärzte) | 80 | 16 Std. | 7.000€ | **84.000€** |

### 13.4 Wettbewerbslandschaft

| Kategorie | Wettbewerber | DiggAI-Vorteil |
|-----------|-------------|----------------|
| PVS | CGM Turbomed, medatixx, Tomedo | Kein intelligentes Intake/Triage |
| Terminbuchung | Doctolib, Jameda, Samedi | Nur Terminplanung, keine Datenerfassung |
| Digitale Anamnese | Idana, Nelly, Dr. Flex | Meist statisch, kein KI-Triage, weniger Sprachen |
| Telemedizin | Teleclinic, KRY | Kein Praxis-Workflow |

### 13.5 Marketing-Materialien (erstellt)

| Material | Format | Zweck |
|----------|--------|-------|
| **Hero-Video Script** | 90 Sek., 16:9 | Website-Header, Konversion |
| **LinkedIn Short Script** | 30 Sek., 1:1 | Awareness bei Praxisinhabern |
| **YouTube Deep-Dive Script** | 3 Min, 16:9 | SEO: "Digitale Anamnese Software" |
| **Messe-Loop Script** | 60 Sek. Loop, 4K | DMEA/MEDICA Stand |
| **Print-Anzeige** | 1/1 Seite | Deutsches Ärzteblatt |
| **Landing Page** | Web | SEO + Lead-Capture |
| **E-Mail Sequence** | 4 E-Mails | Onboarding neuer Leads |
| **Messe-Flyer** | DIN A5 | DMEA/MEDICA |

### 13.6 Design-System

| Token | Hex | Verwendung |
|-------|-----|-----------|
| Primary | `#3B82F6` | Arzt-Akzent, Links |
| Secondary | `#A855F7` | MFA-Akzent, Chat |
| Admin | `#06B6D4` | System-Metriken |
| Critical | `#EF4444` | CRITICAL Triage |
| Warning | `#F59E0B` | WARNING Triage |
| Success | `#22C55E` | Abgeschlossen |

**Typografie:** Inter + Plus Jakarta Sans + Outfit  
**Spacing:** 8px Grid  
**Stil:** Glassmorphism, Gradient Borders, Backdrop Blur

### 13.7 Offene Business-Fragen

| Frage | Priorität |
|-------|----------|
| Pricing-Modell (SaaS, pro Arzt, pro Patient)? | 🔴 Hoch |
| Referenzkunden / Testimonials? | 🔴 Hoch |
| Custom Domain (.de/.com)? | 🔴 Hoch |
| ISO 27001 / BSI C5 Zertifizierung? | 🟡 Mittel |
| DiGA-Zertifizierung? | 🟡 Mittel |
| Stripe Go-Live? | 🟢 Niedrig |

---

## 14. Roadmap

### 14.1 Verbleibende offene Aufgaben

| ID | Priorität | Beschreibung | Bereich |
|----|-----------|-------------|---------|
| K-05 | 🔴 Kritisch | Input-Sanitisation mit DOMPurify/sanitize-html | Sicherheit |
| K-06 | 🔴 Kritisch | HTML-Injection in anderen Routen | Sicherheit |
| K-15 | 🔴 Kritisch | Backend-Deployment-Strategie (Railway/Render/Fly.io) | Deployment |
| M-01 | 🟡 Mittel | Vite 8.0.0-beta → stabile Version | Stabilität |
| M-02 | 🟡 Mittel | In-Memory Queue → DB-Persistenz | Architektur |
| N-01 | 🟢 Niedrig | CSS inline styles → externe CSS-Klassen | Code-Qualität |
| N-02 | 🟢 Niedrig | ARIA-Attribute korrigieren | Barrierefreiheit |

### 14.2 Kurzfristig (1–3 Monate)

| Aufgabe | Bereich |
|---------|---------|
| Pricing-Modell definieren | Business |
| CI/CD Pipeline (GitHub Actions → Netlify) | DevOps |
| Unit Tests für Geschäftslogik + Verschlüsselung | QA |
| i18n vervollständigen (Dashboards + Fragetexte) | i18n |
| DSGVO-Einwilligung serverseitig persistieren | Compliance |
| Vite stable Version | Stabilität |
| DSGVO Art. 17 Patient-Self-Service Löschung | Compliance |
| Monolithische Komponenten aufteilen | Code-Qualität |
| KI-Service mit echtem LLM ersetzen | Funktionalität |
| Custom Domain (.de/.com) | Branding |

### 14.3 Mittelfristig (3–6 Monate)

| Aufgabe | Bereich |
|---------|---------|
| Stripe Live-Integration | Zahlung |
| E-Mail-Versand (Bestätigungen, Ergebnisse) | Kommunikation |
| Passwort-Reset-Flow | Auth |
| Schema-Lücken schließen (~75–90 fehlende Fragen) | Vollständigkeit |
| Performance-Optimierung (Bundle-Splitting, Lighthouse CI) | Performance |
| Referenzkunden gewinnen | Marketing |
| Marketing-Videos produzieren | Marketing |
| Admin-Dashboard mit Live-Metriken | Funktionalität |

### 14.4 Langfristig (6–12 Monate)

| Aufgabe | Bereich |
|---------|---------|
| PVS-Integration (GDT/BDT) | Integration |
| KV-Connect / eHBA Integration | Integration |
| ISO 27001 / BSI C5 Zertifizierung | Compliance |
| DiGA-Zertifizierung evaluieren | Regulierung |
| Skalierung: PostgreSQL + horizontale Architektur | Architektur |
| Offline-Fragebogen-Funktionalität | PWA |

### 14.5 Geplante UX-Verbesserungen

| Feature | Beschreibung | Status |
|---------|-------------|--------|
| **Zero-Click Triage** | Sticky Triage-Bar, Pulse-Animation, Ctrl+Space | 📋 Geplant |
| **Smart-Assign** | Auto-Vorschlag Arzt basierend auf Fachgebiet + Auslastung | 📋 Geplant |
| **ROI Realtime Tracker** | 3 Live-Charts + Wochen-PDF | 📋 Geplant |
| **Progressive Onboarding** | Steps, Zeit, Tooltips, WCAG AAA | 📋 Geplant |
| **Mobile/PWA Optimierung** | 48px Touch-Targets, Offline-Indicator, Swipe | 📋 Geplant |

---

## 15. Implementierte Änderungen

> Vollständige Details: siehe `IMPLEMENTIERUNGS_CHANGELOG.md`

### 15.1 Sicherheitsfixes (Section 1 — 14 Fixes)

| ID | Fix | Status |
|----|-----|--------|
| K-01 | WebSocket-Authentifizierung (JWT in `io.use()` Middleware) | ✅ |
| K-02 | `.env` aus Git ausgeschlossen | ✅ |
| K-03 | Queue-Routen mit `requireAuth` + `requireRole` versehen | ✅ |
| K-04 | Payment-Routen `requireAuth` hinzugefügt | ✅ |
| K-07 | CSP `unsafe-inline` für script-src entfernt | ✅ |
| K-08 | Hardcodiertes Default-Passwort → Env-Variable | ✅ |
| K-09 | Netlify Functions abgesichert (CORS, Auth, Token-Prüfung) | ✅ |
| K-10 | Encryption Key Validierung (exakt 32 Bytes, kein Truncation) | ✅ |
| H-02 | E-Mail-Hash mit Salt (aus ENCRYPTION_KEY abgeleitet) | ✅ |
| H-03 | Rate-Limit 1000 → 200 (Produktions-Limit) | ✅ |
| H-04 | MFA-Routen Rate-Limiting (10/15min) | ✅ |
| H-05 | XSS-Schutz im PDF-Export (`escapeHtml()`) | ✅ |
| H-06 | CSV-Injection-Schutz (`escapeCsvValue()`) | ✅ |
| H-16 | E2E-Test Selector Fix (`.question-title` → `main h2`) | ✅ |

### 15.2 DSGVO-konforme Einrichtung (Section 2 — 10 Maßnahmen)

| ID | Maßnahme | Status |
|----|----------|--------|
| S2-01 | Netlify Security Headers (HSTS, CSP, COEP/COOP/CORP) | ✅ |
| S2-02 | Server Security Hardening (Helmet erweitert) | ✅ |
| S2-03 | Enhanced Audit Logging (Retry, Sanitisierung, Dauer) | ✅ |
| S2-04 | JWT Algorithm Pinning HS256 + JTI Token-Blacklist | ✅ |
| S2-05 | Logout-Endpoint mit Token-Invalidierung | ✅ |
| S2-06 | Cookie-Consent-Banner (TTDSG §25, granular, versioniert) | ✅ |
| S2-07 | Datenschutzerklärung (`/datenschutz`, 11 Abschnitte) | ✅ |
| S2-08 | Impressum (`/impressum`, 8 Abschnitte, §5 DDG) | ✅ |
| S2-09 | Routing & Footer Links (Lazy-Loaded, CookieConsent global) | ✅ |
| S2-10 | DSGVO-Rechtsdokumentation (DSFA, VVT, AVV, IRP, TOM) | ✅ |

### 15.3 Fragebogen-Korrekturen

| Kategorie | Änderungen |
|-----------|-----------|
| **Rechtschreibung** | Raynauld → Raynaud, Prostatatatsuntersuchung → Prostatatastuntersuchung, Intensivstaion → Intensivstation, Unterschenekel → Unterschenkel, Adventitiageneration → Adventitiadegeneration |
| **Strukturelle Fixes** | Geschlecht nur in 2/2D, Alterslogik → 2C, Red-Flag Brustschmerz → Notfallpad, Suizidalität (7K) → Notfallpad |
| **Serviceanliegen** | Bestandspatienten-Pflicht für Rezepte, AU, Überweisung, Befunde, Dokumente |
| **APGAR-Score** | Auswahloption „weiß nicht" ergänzt |
| **BG-Liste** | 14 Berufsgenossenschaften vervollständigt (5HB) |
| **Bewertung** | Bewertung 20 → optional (kein Pflichtfeld) |
| **Redundanzen** | Frage 7LA bereinigt |

---

## Anhang: Testing-Status

### E2E-Tests (Playwright)

| Suite | Tests | Fokus |
|-------|-------|-------|
| `anamnese.spec.ts` | 3 | Kern-Patienten-Flow, Triage, Routing |
| `security.spec.ts` | 18 | XSS, Auth, Input-Sanitisierung, HTTP |
| `penetration.spec.ts` | 4 | Triage-Modal, Kontext-Routing |
| `phase8-gaps.spec.ts` | 6 | Schema-Lücken, i18n, Datenintegrität |
| `ui-features.spec.ts` | ~14 | DSGVO-Gate, Sprache, Theme, Validierung |

### Fehlende Tests

| Kategorie | Status |
|-----------|--------|
| Unit Tests | ❌ KEINE (0% Coverage) |
| Component Tests | ❌ KEINE |
| Integration Tests | ❌ KEINE |
| Performance Tests | ❌ KEINE |
| Load Tests | ❌ KEINE |

### TypeScript-Fehler (4 verbleibend)

| Datei | Fehler |
|-------|--------|
| `server/routes/chats.ts:3` | Unbenutzter Import `requireRole` |
| `server/routes/chats.ts:16` | Prisma `StringFilter` Typmismatch |
| `server/routes/mfa.ts:87` | `string | string[]` nicht zuweisbar |
| `server/services/encryption.ts:6` | Unbenutzte Variable `AUTH_TAG_LENGTH` |

---

*Erstellt: 03.03.2026 | DiggAI Anamnese App v8.0 | Gesamtübersicht v1.0*  
*Dieses Dokument konsolidiert: PROJEKT_GESAMTANALYSE.md, PRODUCT_DOCUMENTATION.md, IMPLEMENTIERUNGS_CHANGELOG.md, DiggAI_Marketing_UX_Masterplan.md*
