# DiggAi Anamnese Platform

DSGVO-konforme administrative Praxis-Anmelde- und Anamnese-Erfassungs-Plattform für Arztpraxen in Deutschland. Erfasst Patienten-Stammdaten und freie Anliegen-Beschreibung in 10 Sprachen, leitet sie strukturiert an die Praxis weiter und unterstützt den Workflow mit PWA-Offline-Modus.

> **Regulatorische Position:** DiggAi ist als zwei separate Anwendungen konzipiert: **DiggAi-Capture** (administrative Datenerfassung, MDR Klasse I in Selbstverifizierung) und **DiggAi-Suite** (Praxis-Workflow-Werkzeuge mit Triage und KI-Therapie-Vorschlägen, MDR Klasse IIa über Notified Body, separater Build/Deploy). Capture liefert keine medizinische Bewertung, keine Diagnose, keine Triage-Empfehlung. Siehe `docs/STATUS_PLAN_REGULATORIK_FLIP.md` und `docs/INTENDED_USE.md`.

**Live (Stand 2026-05-06):**
- Frontend: [diggai.de](https://diggai.de) (Custom-Domain) und [diggai-anamnese.netlify.app](https://diggai-anamnese.netlify.app)
- API: [diggai-api.fly.dev](https://diggai-api.fly.dev) und [api.diggai.de](https://api.diggai.de) (DNS-Cutover seit Lauf 13)
- Datenbank: Neon Postgres EU-Frankfurt

---

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/DiggAiHH/diggai-anamnese?quickstart=1)

> **Schnellstart in der Cloud:** Klick auf den Badge → Codespace startet → `npm run dev:all` → fertig.

---

![TypeScript](https://img.shields.io/badge/TypeScript-5.9_strict-blue)
![React](https://img.shields.io/badge/React-19.2-blue)
![Express](https://img.shields.io/badge/Express-5.2-green)
![DSGVO](https://img.shields.io/badge/DSGVO-konform-green)
![HIPAA](https://img.shields.io/badge/HIPAA-Audit_Logging-green)
![eIDAS](https://img.shields.io/badge/eIDAS-Digitale_Signatur-blue)
![gematik TI](https://img.shields.io/badge/gematik_TI-ready-orange)
![License](https://img.shields.io/badge/Lizenz-Proprietär-red)

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Frontend | React 19.2, TypeScript 5.9 (strict), Vite 8, Tailwind CSS, Zustand, React Query |
| Backend | Express 5.2, Node.js 22, Prisma 6 ORM, Socket.IO |
| Datenbank | PostgreSQL 16 (Prisma), Redis 7 (optional, Cache/Rate-Limit) |
| Authentifizierung | JWT HS256, HttpOnly Cookies, bcrypt, RBAC (4 Rollen), WebAuthn |
| VerschlÃ¼sselung | AES-256-GCM (PII), SHA-256 (E-Mail-Pseudonymisierung) |
| KI / LLM | Ollama (lokal) oder OpenAI-kompatibel, runtime-konfigurierbar |
| Agenten | DiggAI 5-Agenten-System (Orchestrator, Empfang, Routing, Dokumentation, Abrechnung) · _Klinische Triage: Suite_ |
| PWA | Manueller Service Worker, Dexie IndexedDB (Offline), Web Push |
| Hosting | Netlify (Frontend), Docker VPS (Backend) |
| Testing | Playwright E2E (22 Specs), TypeScript strict type-checking |

---

---

## Feature Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| **Medical Questionnaire** | ✅ Production | 270+ questions, 10 languages |
| **Triage Engine** | ✅ Production · _Suite_ | 10 rules, real-time alerts · DECISION_SUPPORT_ENABLED |
| **AI Reporting** | ✅ Production | ICD-10 codes, SOAP summaries |
| **White-Labeling** | ✅ Production | Custom colors, logos, domains |
| **PVS Integration** | ✅ Production | Tomedo, medistar, CGM M1 |
| **Multi-Factor Auth** | ✅ Production | TOTP, Email OTP, WebAuthn |
| **Billing/Stripe** | ✅ Production | Subscriptions, invoices |
| **Telemedicine** | ✅ Production | Video calls, screen sharing |
| **Offline/PWA** | ✅ Production | IndexedDB, background sync |
| **Gamification** | ✅ Q2 2026 | Achievements, leaderboards |
| **Mobile App** | ⚠️ Q3 2026 | React Native |

---

## Getting Started

**5-minute quickstart (recommended):**
```bash
docker compose up -d
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

**Full guide:** [QUICKSTART.md](./docs/QUICKSTART.md)

---

## Documentation

| Document | Purpose |
|----------|---------|
| [QUICKSTART.md](./docs/QUICKSTART.md) | Get running in 10 minutes |
| [API_REFERENCE.md](./docs/API_REFERENCE.md) | All API endpoints with examples |
| [CUSTOMIZATION.md](./docs/CUSTOMIZATION.md) | White-label, custom questions, integrations |
| [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) | Production deployment, SSL, scaling |
| [SECURITY.md](./docs/SECURITY.md) | DSGVO, encryption, compliance |
| [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) | Common issues & fixes |
| [CHANGELOG.md](./docs/CHANGELOG.md) | Version history & upgrade guide |

---

## Schnellstart (Lokale Entwicklung)

### Voraussetzungen

- Node.js 22+
- Docker Desktop
- Git

### Setup

```bash
# 1. Clone und Dependencies installieren
git clone <repo-url>
cd anamnese-app
npm install

# 2. Umgebungsvariablen konfigurieren
cp .env.example .env
# .env bearbeiten: DATABASE_URL, JWT_SECRET (32+ Zeichen), ENCRYPTION_KEY (exakt 32 Zeichen)

# 3. Lokale Infrastruktur starten (PostgreSQL + Redis)
docker-compose -f docker-compose.local.yml up -d

# 4. Datenbank-Migrationen ausfÃ¼hren
npx prisma migrate dev --name init

# 5. Datenbank befüllen (270+ Fragen + Admin-Nutzer + Default-Tenant)
npx prisma db seed
# HINWEIS: Das Seed erstellt einen 'default'-Tenant für localhost-Entwicklung.
# Ohne diesen Tenant schlagen alle API-Calls fehl (404 Tenant-Resolution).

# 6. Entwicklungsserver starten
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
# API Docs: http://localhost:3001/api/docs (Swagger UI, dev only)
```

### Entwicklungs-Befehle

```bash
npm run dev          # Vite + Express parallel starten
npm run build        # TypeScript kompilieren + Vite bauen
npm run lint         # ESLint
npx prisma studio    # Datenbank-GUI
npx playwright test  # E2E-Tests (22 Specs)
node scripts/generate-i18n.ts  # i18n VollstÃ¤ndigkeit prÃ¼fen
```

---

## Projektstruktur

```
anamnese-app/
â”œâ”€â”€ src/                      # React Frontend
â”‚   â”œâ”€â”€ components/           # UI-Komponenten (Fragebogen, Dashboard, Triage)
â”‚   â”œâ”€â”€ pages/                # Seitenkomponenten (lazy-loaded)
â”‚   â”œâ”€â”€ data/
â”‚   â”‚   â”œâ”€â”€ questions.ts      # 270+ Fragen-Katalog (kanonische IDs)
â”‚   â”‚   â””â”€â”€ new-questions.ts  # Symptom-Erweiterungsmodule
â”‚   â”œâ”€â”€ hooks/useApi.ts       # React Query Hooks (1500+ Zeilen)
â”‚   â”œâ”€â”€ types/question.ts     # QuestionAtom TypeScript-Interface
â”‚   â””â”€â”€ i18n.ts               # 10-Sprachen-Konfiguration
â”œâ”€â”€ server/                   # Express Backend
â”‚   â”œâ”€â”€ engine/
â”‚   â”‚   â”œâ”€â”€ TriageEngine.ts   # Klinische Red-Flag-Erkennung (10 Regeln)
â”‚   â”‚   â””â”€â”€ QuestionFlowEngine.ts  # Fragebogen-Ablaufsteuerung
â”‚   â”œâ”€â”€ routes/               # 34 API-Routengruppen
â”‚   â”œâ”€â”€ middleware/auth.ts    # JWT + RBAC Middleware
â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â”œâ”€â”€ encryption.ts     # AES-256-GCM PII-VerschlÃ¼sselung
â”‚   â”‚   â””â”€â”€ ai/               # LLM-Prompts + AI-Service
â”‚   â”œâ”€â”€ agents/               # DiggAI 5-Agenten-System
â”‚   â”œâ”€â”€ jobs/reminderWorker.ts # Medikamenten-Erinnerungen (node-cron)
â”‚   â””â”€â”€ swagger.ts            # OpenAPI 3.0 Spezifikation
â”œâ”€â”€ prisma/schema.prisma      # Datenbankschema
â”œâ”€â”€ public/
â”‚   â”œâ”€â”€ locales/              # 10 Sprachen (de, en, tr, ar, uk, es, fa, it, fr, pl)
â”‚   â””â”€â”€ sw.js                 # Service Worker (PWA/Offline)
â”œâ”€â”€ docs/                     # Technische Dokumentation
â”œâ”€â”€ docker/                   # Dockerfile + Nginx-Konfig
â”œâ”€â”€ e2e/                      # Playwright E2E-Tests
â”œâ”€â”€ docker-compose.local.yml  # Lokale Entwicklung
â””â”€â”€ docker-compose.prod.yml   # Produktionsumgebung
```

---

## Features

### Patientenaufnahme-Flows (10 Services)
- **Termin / Anamnese** â€” VollstÃ¤ndige Anamnese mit 270+ Fragen in 13 Fachgebieten
- **Rezept-Anfrage** â€” Strukturierte Medikamenten-/Rezeptanforderung
- **AU-Schein** â€” Krankschreibungsantrag mit klinischer BegrÃ¼ndung
- **Ãœberweisung** â€” Ãœberweisungsanfrage an FachÃ¤rzte
- **Dateien / Befunde** â€” Anforderung von Befunden und Dokumenten
- **BG-Unfall** â€” VollstÃ¤ndige Berufsgenossenschafts-Unfall-Dokumentation
- **Terminabsage, Telefonanfrage, Nachricht, Dokumente** â€” Verwaltungsflows

### 13 Fachgebiets-Module
Kardiologie, Pulmonologie, Neurologie, Gastroenterologie, Diabetologie,
Dermatologie, Rheumatologie, Urologie, Ophthalmologie, GynÃ¤kologie,
Psychiatrie, HNO, OrthopÃ¤die

### Klinische Triage-Engine (10 Regeln) · Suite · `DECISION_SUPPORT_ENABLED=true`
Echtzeit-Erkennung von 4 CRITICAL- und 6 WARNING-Szenarien:

| Regel | Schweregrad | AuslÃ¶ser |
|---|---|---|
| ACS (Herzinfarkt-Verdacht) | CRITICAL | Brustschmerzen + Atemnot/LÃ¤hmung |
| SuizidalitÃ¤t | CRITICAL | PHQ-9 + Suizid-Ideation |
| SAH (Hirnaneurysma) | CRITICAL | Donnerschlagkopfschmerz |
| Synkope + Arrhythmie | CRITICAL | Bewusstseinsverlust |
| GI-Blutung | WARNING | Antikoagulanzien + Bauchschmerzen |
| Diabetischer FuÃŸ | WARNING | Diabetes + FuÃŸbeschwerden |
| Polypharmazie | WARNING | > 5 gleichzeitige Medikamente |
| Schwangerschaft + AK | WARNING | Schwanger + Antikoagulanzien |
| Starker Raucher | WARNING | > 30 Packungsjahre |
| Duale Antikoagulation | WARNING | 2+ Antikoagulanzien |

CRITICAL-Events lÃ¶sen sofortige Socket.IO-Benachrichtigung am Arzt-Dashboard aus.
> _Hinweis: Alle Triage-Regeln sind Suite-Features (DECISION_SUPPORT_ENABLED). Capture-Modus (Class I) löst keine klinischen Alerts aus._

### KI-Funktionen
- TherapievorschlÃ¤ge mit ICD-10-GM Codes (Konfidenz-Score) _(Suite)_
- Klinische Sitzungszusammenfassung (SOAP-Format)
- Echtzeit-Symptomanalyse wÃ¤hrend der Befragung
- LLM-Provider runtime-konfigurierbar: Ollama | OpenAI-kompatibel | none

---

## Deployment

### Frontend (Netlify â€” automatisch)

Push auf `main` â†’ Netlify baut und deployt automatisch:
```bash
git push origin main
```

### Backend (Docker VPS)

```bash
# Erstmalig:
git clone <repo-url> /opt/anamnese-app
cd /opt/anamnese-app
cp anamnese-app/.env.example anamnese-app/.env.production
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
docker-compose -f docker-compose.prod.yml exec backend npx prisma db seed

# Updates:
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --force-recreate
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

VollstÃ¤ndige Deployment-Anleitung: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## Release-Gates (Markt-Readiness)

Vor jedem produktiven Release mÃ¼ssen diese Gates grÃ¼n sein:

1. **Build & Type Safety**
   - `npm run build` erfolgreich
   - Keine TypeScript-Fehler im CI-Run

2. **Code Quality**
   - `npm run lint` erfolgreich (kein `|| true` in CI)

3. **Security-Basis**
   - `npm audit --audit-level=high` ohne High/Critical Findings
   - JWT-Secret mit mindestens 32 Zeichen
   - AES-Key exakt 32 Zeichen (`ENCRYPTION_KEY`)
   - Kein Standardpasswort in Produktion (`ARZT_PASSWORD`)

4. **BetriebsfÃ¤higkeit**
   - Health Check `/api/health` liefert `ok` oder nachvollziehbar `degraded`
   - Prisma Generate/Migrations erfolgreich

5. **Compliance-Dokumentation**
   - DSGVO-Dokumente aktuell (AVV, DSFA, TOM)
   - Ã„nderungen an DatenflÃ¼ssen im Audit nachvollziehbar dokumentiert

---

## DSGVO-Compliance

| MaÃŸnahme | Implementierung |
|---|---|
| DatenverschlÃ¼sselung | AES-256-GCM fÃ¼r alle PII-Felder (Name, Adresse, E-Mail, Telefon) |
| Pseudonymisierung | SHA-256 (gesalzen) fÃ¼r E-Mail-Hashing |
| Audit-Logging | Jeder Patientendaten-Zugriff wird in `AuditLog` protokolliert |
| Einwilligung | DSGVO-EinwilligungserklÃ¤rung + eIDAS-konforme digitale Signatur |
| Datensparsamkeit | JWT in HttpOnly-Cookies, keine PII in localStorage |
| LÃ¶schkonzept | Automatische Session-Ablauf (24h), Hard-Delete-Worker |
| Datensicherung | Automatische PostgreSQL-Backups via Docker |

Rechtsdokumente: [AVV-Template](docs/AVV_TEMPLATE.md) | [DSFA](docs/DSFA.md) | [TOM](docs/TOM_DOKUMENTATION.md)

---

## DiggAI 4-Service-Architektur

| Service | Name | Technologie | Status |
|---|---|---|---|
| Service 1 | Python Agent Core | Python FastAPI | In Entwicklung |
| Service 2 | Tauri Desktop | Rust + Tauri | Ausstehend |
| Service 3 | Monorepo | TBD | Ausstehend |
| **Service 4** | **Anamnese Platform** | **React + Express** | **Produktiv** |

Service 4 kommuniziert mit Service 1 via HTTP (`server/services/agentcore.client.ts`).

---

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Entwickler-Anweisungen fÃ¼r AI-Agenten |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System-Architektur, API-Routen, Auth-Flow |
| [docs/QUESTION_CATALOG.md](docs/QUESTION_CATALOG.md) | VollstÃ¤ndige Fragen-ID-Referenz |
| [docs/TRIAGE_RULES.md](docs/TRIAGE_RULES.md) | Klinische Triage-Regeln (medizinisch) |
| [docs/AGENT_WORKFLOWS.md](docs/AGENT_WORKFLOWS.md) | Schritt-fÃ¼r-Schritt-Workflows fÃ¼r Entwickler |
| [docs/DATA_SCHEMA.md](docs/DATA_SCHEMA.md) | Prisma-Modelle, TypeScript-Interfaces |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deployment-Anleitung + Env-Variablen |
| [docs/AVV_TEMPLATE.md](docs/AVV_TEMPLATE.md) | Auftragsverarbeitungsvertrag (DSGVO) |
| [docs/DSFA](docs/DSFA.md) | Datenschutz-FolgenabschÃ¤tzung |
| [docs/TOM_DOKUMENTATION.md](docs/TOM_DOKUMENTATION.md) | Technisch-organisatorische MaÃŸnahmen |

---

## Kontakt

**DiggAI GmbH**
E-Mail: support@diggai.de

FÃ¼r Sicherheitsmeldungen: security@diggai.de (PGP bevorzugt)

