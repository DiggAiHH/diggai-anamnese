# Anamnese App – Digitaler Patienten-Fragebogen

Ein DSGVO-konformes, Full-Stack-System für die digitale Patientenanamnese in Arztpraxen.

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Express](https://img.shields.io/badge/Express-5-green)
![SQLite](https://img.shields.io/badge/SQLite-dateibasiert-003B57)

---

## 🏥 Funktionsumfang

### Patienten-Frontend
- **10 Service-Flows**: Anamnese, Rezepte, AU, BG-Unfall (NEU!), Überweisung, Absage, Telefon, Befundanforderung, Dateien, Nachricht
- **270+ medizinische Fragen** mit dynamischer Navigation (13 Fachmodule + Sub-Chains)
- **Strukturierte Medikamenten-Eingabe** (Wirkstoff + Dosierung + Schema)
- **Schwangerschafts-Check** (automatisch für W, 15-50 Jahre)
- **Red Flag System**: Vollbild-Notfall-Overlay bei CRITICAL Alerts (ACS, Suizid, SAH, Syncope)
- **DSGVO-Einwilligungserklärung** vor dem Start
- **PDF-Export** mit Unterschriftenfeld (Touch + Maus)
- **Zurück-Navigation** und Sidebar-Verlauf
- **10 Sprachen** (DE/EN/TR/AR/UK/ES/FA/IT/FR/PL) inkl. RTL
- **Cookie-Consent-Banner** (TTDSG §25)
- **Datenschutzerklärung** (Art. 13/14 DSGVO)
- **Impressum** (§5 DDG)
- **DatenschutzGame** – Interaktives Datenschutz-Quiz

### Backend (Express/Prisma)
- **AES-256-GCM Verschlüsselung** für personenbezogene Daten
- **JWT Authentication** mit HttpOnly Cookies
- **10 Triage-Regeln** (4 CRITICAL + 6 WARNING)
- **Socket.io** für Live-Alerts an das Arzt-Dashboard
- **HIPAA-konformes Audit Logging**
- **Prisma ORM** mit SQLite (dateibasiert)

### Arzt-Dashboard (`/arzt`)
- Session-Übersicht mit Stats
- Echtzeit-Triage-Events mit "Als gesehen" Markierung
- Anonymisierte Patientendaten
- Login: `admin` / `praxis2026`

---

## 🚀 Schnellstart

### Voraussetzungen
- Node.js 20+
- SQLite (dateibasiert – keine separate Installation nötig)

### 1. Installation

```bash
cd anamnese-app
npm install
```

### 2. Umgebungsvariablen

Die `.env` Datei ist bereits mit Entwicklungswerten vorkonfiguriert. Für Produktion anpassen:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="mindestens-32-zeichen-langes-geheimnis"
ENCRYPTION_KEY="genau-32-zeichen-fuer-aes256-key"
VITE_API_URL="https://dein-backend.example.com/api"
```

### 3. Datenbank einrichten

```bash
# Prisma Client generieren
npm run db:generate

# Migration ausführen (erstellt alle Tabellen)
npm run db:migrate

# Seed: 270+ Fragen + Admin-Arzt einfügen
npm run db:seed
```

### 4. Starten

```bash
# Frontend (Port 5173)
npm run dev

# Backend (Port 3001) – in zweitem Terminal
npm run dev:server

# Oder beides gleichzeitig
npm run dev:all
```

### 5. Aufrufen

| Route | Beschreibung |
|:------|:------------|
| `http://localhost:5173` | Patienten-Portal |
| `http://localhost:5173/arzt` | Arzt-Dashboard |
| `http://localhost:5173/mfa` | MFA-Dashboard |
| `http://localhost:5173/admin` | Admin-Dashboard |
| `http://localhost:5173/datenschutz` | Datenschutzerklärung |
| `http://localhost:5173/impressum` | Impressum |
| `http://localhost:5173/docs` | Dokumentation |
| `http://localhost:5173/handbuch` | Handbuch |
| `http://localhost:3001/api/health` | Backend Health-Check |

---

## 📁 Projektstruktur

```
anamnese-app/
├── prisma/
│   ├── schema.prisma          # Datenbank-Schema (7 Models)
│   └── seed.ts                # Seed-Daten (270+ Fragen + Arzt)
├── server/
│   ├── index.ts               # Express Server Entry Point
│   ├── config.ts              # Environment Config
│   ├── socket.ts              # Socket.io Setup
│   ├── engine/
│   │   ├── QuestionFlowEngine.ts  # Routing-Logik
│   │   └── TriageEngine.ts        # 10 Red Flag Regeln
│   ├── middleware/
│   │   ├── auth.ts            # JWT + RBAC
│   │   └── audit.ts           # HIPAA Audit Log
│   ├── routes/
│   │   ├── sessions.ts        # Session CRUD
│   │   ├── answers.ts         # Antwort-Speicherung
│   │   ├── atoms.ts           # Fragen-API
│   │   └── arzt.ts            # Dashboard-API
│   └── services/
│       └── encryption.ts      # AES-256-GCM + SHA-256
├── src/
│   ├── App.tsx                # React Router + Providers
│   ├── api/
│   │   └── client.ts          # Axios + JWT Interceptor
│   ├── store/
│   │   └── sessionStore.ts    # Zustand State Management
│   ├── hooks/
│   │   └── useApi.ts          # React Query Hooks
│   ├── components/
│   │   ├── LandingPage.tsx        # Service-Auswahl
│   │   ├── Questionnaire.tsx      # Haupt-Fragebogen
│   │   ├── QuestionRenderer.tsx   # Frage-Typen
│   │   ├── DSGVOConsent.tsx       # Datenschutz-Dialog
│   │   ├── RedFlagOverlay.tsx     # Notfall-Overlay
│   │   ├── MedicationManager.tsx  # Medikamenten-Eingabe
│   │   ├── SchwangerschaftCheck.tsx # Schwangerschafts-Abfrage
│   │   ├── UnfallBGFlow.tsx       # BG-Unfallmeldung
│   │   ├── PDFExport.tsx          # Bericht-Export
│   │   ├── SubmittedPage.tsx      # Bestätigungsseite
│   │   ├── AnswerSummary.tsx      # Zusammenfassung
│   │   ├── HistorySidebar.tsx     # Navigations-Verlauf
│   │   └── ProgressBar.tsx        # Fortschrittsbalken
│   ├── pages/
│   │   └── ArztDashboard.tsx      # Arzt-Übersicht
│   ├── data/
│   │   └── questions.ts           # 270+ Fragen-Definitionen
│   ├── utils/
│   │   └── questionLogic.ts       # Frontend-Logik-Engine
│   └── types/
│       └── question.ts            # TypeScript Interfaces
├── .env                           # Umgebungsvariablen
├── .env.example                   # Template
├── tsconfig.server.json           # Backend TS Config
└── vite.config.ts                 # Vite + API Proxy
```

---

## 🔒 Sicherheit

| Maßnahme | Implementierung |
|:---------|:----------------|
| **Verschlüsselung PII** | AES-256-GCM (Name, Adresse, E-Mail) |
| **Pseudonymisierung** | SHA-256 Hash der E-Mail |
| **Auth** | JWT mit Rollen (patient/arzt/admin) |
| **Transport** | TLS 1.3 (Produktion) |
| **API-Schutz** | Helmet.js + Rate Limiting (100 req/15min) |
| **Audit** | HIPAA-konformes Logging aller Zugriffe |
| **DSGVO** | Einwilligungsdialog + Widerrufsrecht |
| **Session** | Ablauf nach 24h, Ownership-Prüfung |

---

## 🏗️ Produktion

### Docker Deployment (empfohlen)

```bash
# SQLite benötigt keinen separaten DB-Container.
# Die Datenbankdatei wird automatisch unter prisma/dev.db angelegt.

# .env anpassen (DATABASE_URL="file:./dev.db"), dann:
npm run db:migrate
npm run db:seed
npm run build
npm run dev:server
```

### Netlify Deployment (Frontend)

Diese App wird auf Netlify als statische SPA deployed. Das Backend (Express/Prisma + Socket.io) muss separat laufen.

1. `anamnese-app` als Site mit Netlify verbinden
2. Build Settings:
  - Build command: `npm run build`
  - Publish directory: `dist`
3. Environment Variables in Netlify setzen:
  - `VITE_API_URL=https://dein-backend.example.com/api`
4. Deploy starten und danach direkt testen:
  - Patient: `/`
  - Arzt: `/arzt`
  - MFA: `/mfa`

### Checkliste für Praxis-Einsatz

- [ ] SQLite-Datenbankdatei sicher speichern (z.B. /data/anamnese.db)
- [ ] `.env` mit echten Secrets konfigurieren
- [ ] `npm run db:migrate` + `npm run db:seed`
- [ ] TLS/SSL Zertifikat (Let's Encrypt)
- [ ] Arzt-Passwort ändern
- [ ] Praxisname in DSGVOConsent anpassen
- [ ] Backup-Strategie für SQLite-Datei
- [ ] Datenschutzbeauftragten benennen

---

## 📋 Triage-Regeln

| # | Name | Level | Auslöser |
|:--|:-----|:------|:---------|
| 1 | Akutes Koronarsyndrom | CRITICAL | Brustschmerzen UND (Atemnot ODER Lähmung) |
| 2 | Suizidalität | CRITICAL | Depression + spezifische Indikatoren |
| 3 | SAH/Aneurysma | CRITICAL | Kopfschmerzen + Bewusstseinsstörung |
| 4 | Syncope mit Risiko | CRITICAL | Ohnmacht + Herzrhythmusstörung |
| 5 | GI-Blutung | WARNING | Blutverdünner + Bauchschmerzen |
| 6 | Diabetisches Fußsyndrom | WARNING | Diabetes + Fußsyndrom |
| 7 | Starker Raucher | WARNING | >30 Pack-Years |
| 8 | Schwangerschaft + Medikamente | WARNING | Schwanger + Blutverdünner |
| 9 | Polypharmazie | WARNING | >5 Medikamente |
| 10 | Doppel-Blutverdünner | WARNING | ≥2 Antikoagulantien |

---

## 🛠️ Tech Stack

**Frontend:** React 19, TypeScript (Strict), Vite, Tailwind CSS 4, Zustand, TanStack React Query, React Router DOM, Axios, Socket.io Client  
**Backend:** Node.js, Express 5, TypeScript, Prisma ORM, JWT, bcryptjs, Socket.io  
**Datenbank:** SQLite (dateibasiert) mit Prisma ORM  
**Sicherheit:** AES-256-GCM, SHA-256, Helmet.js, Rate Limiting, HIPAA Audit Trail

---

*Entwickelt für den sicheren Einsatz in deutschen Arztpraxen. Alle Angaben ohne Gewähr. Vor dem Produktiveinsatz ist eine Prüfung durch einen Datenschutzbeauftragten erforderlich.*
