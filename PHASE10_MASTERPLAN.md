# DiggAI Anamnese — Phase 10 Masterplan

> **Version:** 1.0 | **Datum:** 04.03.2026 | **Autor:** GitHub Copilot (Opus 4.6)  
> **Status:** Implementation gestartet  
> **Entscheidungen:** VPS (Hetzner/Contabo), Kein LLM (Rule-based NLU), PWA + Capacitor v2, 50+ Seed-Patienten

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Stream 1: Backend Deployment (VPS + Docker)](#2-stream-1-backend-deployment)
3. [Stream 2: Seed Data (50+ Patienten)](#3-stream-2-seed-data)
4. [Stream 3: Admin Dashboard Overhaul](#4-stream-3-admin-dashboard-overhaul)
5. [Stream 4: MFA Dashboard Enhancement](#5-stream-4-mfa-dashboard-enhancement)
6. [Stream 5: Arzt Dashboard Enhancement](#6-stream-5-arzt-dashboard-enhancement)
7. [Stream 6: Shared Tablet / Kiosk Mode](#7-stream-6-shared-tablet--kiosk-mode)
8. [Stream 7: Sprachassistent (Voice Assistant)](#8-stream-7-sprachassistent)
9. [Stream 8: Enhanced Chatbot (Rule-based NLU)](#9-stream-8-enhanced-chatbot)
10. [Stream 9: Gamified Anamnese Card](#10-stream-9-gamified-anamnese-card)
11. [Abhängigkeiten & Reihenfolge](#11-abhängigkeiten--reihenfolge)
12. [Verifizierung & Akzeptanzkriterien](#12-verifizierung)
13. [Risiken & Mitigationen](#13-risiken--mitigationen)

---

## 1. Executive Summary

### IST-Zustand

| Aspekt | Status |
|--------|--------|
| Frontend | ✅ Vollständig: 38 Komponenten, 7 Seiten, 10 Sprachen |
| Express Backend | ✅ Komplett: 30+ Endpunkte, JWT, AES-256, Triage, Socket.IO |
| Netlify Functions | ⚠️ Mock-Layer: In-Memory Arrays, keine DB, keine Encryption |
| Produktion | ⚠️ Nur Frontend auf Netlify — Backend NICHT deployed |
| Seed Data | ⚠️ Minimal: ~90 Fragen, 1-2 Staff-User, optional 1 Demo-Patient |
| Admin Dashboard | ⚠️ 100% hardcoded Konstanten — kein API-Anbindung |
| StaffTodoList | ⚠️ Kein Persistenz — Reset bei Reload |
| Chatbot | ⚠️ Keyword-Matching ohne NLU, ohne Kontext, ohne Eskalation |
| Voice | ⚠️ Nur Input (STT) auf Textfeldern — kein Output (TTS), keine Navigation |
| Kiosk | ⚠️ Nur Fullscreen-Toggle — kein Home-Screen, kein Auto-Logout |

### SOLL-Zustand (nach Phase 10)

| Aspekt | Ziel |
|--------|------|
| Backend | Docker-Container auf VPS (Hetzner/Contabo ~4€/mo), PostgreSQL, Redis |
| Seed Data | 50+ Patienten, 80+ Sessions, 500+ Antworten, Queue-Einträge |
| Admin Dashboard | Live API-Daten, ROI-Calculator, Audit-Log-Viewer, Benutzer-Verwaltung |
| Chatbot | Fuzzy NLU (Levenshtein + n-gram), Kontext-Memory, Auto-Eskalation |
| Voice | TTS-Output + Voice-Navigation + Voice-Chat + Accessibility-Modus |
| Kiosk | Home-Screen (Patient/MFA/Arzt/Lieferant), Auto-Logout, Privacy-Screen |
| Gamified | AnamnesesGame als eigenständige Service-Karte |

---

## 2. Stream 1: Backend Deployment

### 2.1 Prisma Schema Migration

**Datei:** `prisma/schema.prisma`

```diff
- provider = "sqlite"
- url      = "file:./anamnese.db"
+ provider = "postgresql"
+ url      = env("DATABASE_URL")
```

### 2.2 Docker-Setup

**Neue Dateien:**
- `Dockerfile` — Node 22 Alpine, multi-stage build (builder → production)
- `docker-compose.yml` — 4 Services: app, postgres, redis, nginx
- `docker/nginx.conf` — Reverse Proxy mit SSL, Rate Limiting, WebSocket-Support

**Compose-Architektur:**
```
┌─────────────┐     ┌───────────────┐
│   Nginx     │────▶│  Express App  │
│ (Port 443)  │     │  (Port 3001)  │
└─────────────┘     └──────┬────────┘
                           │
                    ┌──────┴────────┐
                    │               │
              ┌─────┴─────┐  ┌─────┴─────┐
              │ PostgreSQL │  │   Redis    │
              │ (5432)     │  │  (6379)    │
              └───────────┘  └───────────┘
```

### 2.3 Redis Integration

| Zweck | Aktuell | Neu |
|-------|---------|-----|
| Token-Blacklist | In-Memory Map | Redis SET mit TTL |
| Queue-State | In-Memory Array | Redis Sorted Set |
| Socket.IO Adapter | Default (single-process) | Redis Adapter (multi-process ready) |

### 2.4 Environment

**Neue Datei:** `.env.production` (Template)

| Variable | Wert |
|----------|------|
| `DATABASE_URL` | `postgresql://diggai:***@postgres:5432/anamnese_prod` |
| `REDIS_URL` | `redis://redis:6379` |
| `JWT_SECRET` | 32-Byte random |
| `ENCRYPTION_KEY` | 32-Byte random |
| `FRONTEND_URL` | `https://diggai-drklaproth.netlify.app` |
| `ARZT_PASSWORD` | Starkes Passwort |
| `NODE_ENV` | `production` |

### 2.5 Netlify Update

**Datei:** `netlify.toml` — API-Redirect ändern:

```diff
- to = "/.netlify/functions/:splat"
+ to = "https://api.diggai.de/api/:splat"
```

### 2.6 CI/CD

**Neue Datei:** `.github/workflows/deploy.yml`
- Trigger: Push to `master`
- Steps: Install → Build → Test → SSH → docker-compose pull && up -d

---

## 3. Stream 2: Seed Data

### 3.1 Comprehensive Seed Script

**Neue Datei:** `prisma/seed-comprehensive.ts`

| Entität | Anzahl | Details |
|---------|--------|---------|
| ArztUser | 3 | Dr. Klaproth (ARZT), Sandra Meier (MFA), System Admin (ADMIN) |
| Patient | 50+ | Diverse Demografie: Alter 18-85, alle Versicherungstypen |
| PatientSession | 80+ | Alle 10 Service-Typen, Status-Verteilung: 30% ACTIVE, 50% COMPLETED, 10% TRIAGE, 10% WAITING |
| Answer | 500+ | Realistische medizinische Daten für alle 270+ MedicalAtoms |
| TriageEvent | 15+ | Mix CRITICAL/WARNING, teilweise acknowledged |
| AccidentDetails | 10+ | BG-Unfälle: Arbeitsplatz, Wegeunfall, Baustelle |
| ChatMessage | 30+ | Patient↔Arzt Konversationen, MFA-Notizen |
| PatientMedication | 20+ | Metoprolol, Ramipril, Metformin, Ibuprofen, etc. |
| PatientSurgery | 10+ | Appendektomie, Cholezystektomie, Knie-Arthroskopie |
| AuditLog | 100+ | Alle Event-Typen |
| Queue | 5-8 | WAITING + CALLED + IN_TREATMENT mit Prioritäten |

### 3.2 Realistische Patienten-Profile

```
Patient 01: Maria Schmidt, 72, GKV, Diabetes Typ 2 + Hypertonie → Anamnese + Red Flag (Bewusstlosigkeit)
Patient 02: Ahmed Hassan, 34, GKV, BG-Unfall Baustelle → Unfallmeldung + AccidentDetails
Patient 03: Olga Petrova, 45, PKV, Schwangerschaft 28. Woche → Anamnese + Schwangerschafts-Check
Patient 04: Thomas Müller, 58, GKV, Brustschmerzen >20min → RED FLAG CRITICAL (ACS)
Patient 05: Fatima Al-Rashid, 29, GKV, Rezept-Anforderung → Rezepte (Routine)
...50+ weitere mit allen Edge Cases
```

### 3.3 Package.json

```json
"db:seed:full": "tsx prisma/seed-comprehensive.ts"
```

---

## 4. Stream 3: Admin Dashboard Overhaul

### 4.1 Neue Server-Routes

**Neue Datei:** `server/routes/admin.ts`

| Endpunkt | Beschreibung |
|----------|-------------|
| `GET /api/admin/stats` | Aggregierte Metriken (Patienten, Sessions, Completion-Rate, Avg. Time) |
| `GET /api/admin/sessions/timeline` | Sessions pro Tag (7d/30d) für Charts |
| `GET /api/admin/audit-log` | Paginierte, filterbare Audit-Log-Einträge |
| `GET /api/admin/users` | Staff-User CRUD (Liste) |
| `POST /api/admin/users` | Staff-User erstellen |
| `PUT /api/admin/users/:id` | Staff-User bearbeiten (Rolle, Name, Passwort-Reset) |
| `DELETE /api/admin/users/:id` | Staff-User deaktivieren |
| `GET /api/admin/analytics/services` | Service-Verteilung für Pie-Chart |
| `GET /api/admin/analytics/languages` | Sprach-Verteilung für Radar-Chart |
| `GET /api/admin/analytics/triage` | Triage-Events Timeline |

### 4.2 Dashboard Tabs (aktualisiert)

| Tab | Aktuell | Neu |
|-----|---------|-----|
| Übersicht | Hardcoded Stats | Live API: `useAdminStats()` |
| Patienten-Flow | Hardcoded Diagramm | Unverändert (statische Dokumentation) |
| Sicherheit | Hardcoded Text | Unverändert + Live Audit-Log-Widget |
| Export & Berichte | Hardcoded Text | Unverändert |
| Produktivität | Hardcoded ROI | Live ROI basierend auf echten Session-Daten |
| Architektur | Hardcoded Tech | Unverändert |
| Changelog | Hardcoded Array | Aus DB oder API |
| **NEU: Benutzer** | — | Staff-CRUD mit Rollen-Dropdown, Passwort-Reset |
| **NEU: Audit-Log** | — | Paginiert, filterbar (Datum, Typ, User, IP) |

### 4.3 Charts → Live-Daten

| Chart | Aktuell | Quelle |
|-------|---------|--------|
| Sessions/Tag (Bar) | `[65,55,89,...]` hardcoded | `GET /api/admin/sessions/timeline` |
| Service-Verteilung (Pie) | Hardcoded | `GET /api/admin/analytics/services` |
| Triage-Timeline (Area) | Hardcoded | `GET /api/admin/analytics/triage` |
| Sprach-Verteilung (Radar) | Hardcoded | `GET /api/admin/analytics/languages` |

---

## 5. Stream 4: MFA Dashboard Enhancement

| Feature | Beschreibung | Aufwand |
|---------|-------------|---------|
| Wartezeit-Berechnung | Ø Behandlungsdauer aus completed Sessions → geschätzte Wartezeit | S |
| Termin-Planung (Stub) | Neues `Appointment`-Model, Zeitraster-Panel, Drag-to-Assign | L |
| Dokument-Vorschau | PDF.js für PDFs, native img für Bilder in SessionDetail | M |
| Batch-QR | Mehrere QR-Codes gleichzeitig generieren, druckbar | S |
| Tages-Zusammenfassung | End-of-Day Stats: Sessions, Pending, Red Flags, Avg. Wait | M |

---

## 6. Stream 5: Arzt Dashboard Enhancement

| Feature | Beschreibung | Aufwand |
|---------|-------------|---------|
| AI Summary Upgrade | Besseres Keyword→ICD-10 Mapping, strukturiertes Output (Hauptdiagnose, DD, Empfehlungen) | M |
| Patienten-Timeline | Horizontale Timeline aller Sessions pro Patient, Medication-Changes | L |
| Diktat-Modus | Voice-to-Text für Arzt-Notizen (VoiceInput → ArztNotes-Textarea) | S |
| Template-Antworten | Vordefinierte Chat-Templates für häufige Patientenfragen | M |

---

## 7. Stream 6: Shared Tablet / Kiosk Mode

### 7.1 HomeScreen Komponente

**Neue Datei:** `src/components/HomeScreen.tsx`

```
┌─────────────────────────────────────────┐
│           DiggAI Praxis-System           │
│                                          │
│  ┌──────────┐  ┌──────────┐             │
│  │ 🏥       │  │ 👨‍⚕️      │             │
│  │ Patient  │  │  Arzt    │             │
│  │ Aufnahme │  │Dashboard │             │
│  └──────────┘  └──────────┘             │
│                                          │
│  ┌──────────┐  ┌──────────┐             │
│  │ 📋       │  │ 🚚       │             │
│  │  MFA     │  │Lieferant │             │
│  │Dashboard │  │  Info    │             │
│  └──────────┘  └──────────┘             │
│                                          │
│         [Datum] [Uhrzeit] [Sprache]      │
└─────────────────────────────────────────┘
```

### 7.2 Routing-Änderung

| Route | Aktuell | Neu |
|-------|---------|-----|
| `/` | LandingPage (catch-all `*`) | HomeScreen |
| `/patient` | — | LandingPage (verschoben) |
| `/patient/questionnaire` | — | Questionnaire (verschoben) |
| `/arzt` | ArztDashboard | Unverändert |
| `/mfa` | MFADashboard | Unverändert |
| `/supplier` | — | Lieferanten-Info (NEU) |

### 7.3 Sicherheitsfeatures

| Feature | Beschreibung |
|---------|-------------|
| Auto-Logout Staff | 5 Min idle → Warnung, 1 Min Countdown → Force Logout + Token löschen + Redirect zu HomeScreen |
| Privacy Screen | 3 Min keine Interaktion → Overlay blur auf Patientennamen und med. Daten |
| PIN-Login | 4-stellige PIN als Alternative zu Username/Password für Wiederhol-Logins (bcrypt Hash in ArztUser) |
| Auto-Reset Patient | 60 Sek Inaktivität auf HomeScreen → Session löschen, HomeScreen zeigen |

### 7.4 Capacitor v2 (geplant, kein Code jetzt)

- Android Kiosk Lockdown (COSU / Device Owner Mode)
- Hardware-Back-Button blockieren
- Auto-Start bei Boot
- Status-Bar Zugriff verhindern
- Bluetooth-Drucker für Wartezimmer-Nummern

---

## 8. Stream 7: Sprachassistent

### 8.1 TTS Engine

**Neue Datei:** `src/components/inputs/VoiceOutput.tsx`

- `window.speechSynthesis` API
- Sprache auto-detect aus i18n (`de-DE`, `en-US`, `ar-SA`, etc.)
- Speed/Pitch/Volume Controls
- `prefers-reduced-motion` respektieren

### 8.2 Voice Navigation

**Erweiterung:** `src/components/inputs/VoiceInput.tsx`

| Befehl (DE) | Befehl (EN) | Aktion |
|-------------|-------------|--------|
| "Weiter" | "Next" | Nächste Frage |
| "Zurück" | "Back" | Vorherige Frage |
| "Hilfe" | "Help" | Chat öffnen |
| "Vorlesen" | "Read" | Aktuelle Frage vorlesen (TTS) |
| "Stopp" | "Stop" | Spracherkennung pausieren |
| "Wiederholen" | "Repeat" | Letzte Frage nochmal vorlesen |

### 8.3 Voice-Chat

- Mikrofon-Button im ChatBubble FAQ-Tab
- Speech → Text → Bot-Input → Bot-Antwort → TTS-Output (vollständiger Kreislauf)

### 8.4 Accessibility-Modus

- Toggle in Settings
- Auto-TTS für jede neue Frage
- Voice Input auf allen Feldern
- Größere Touch-Targets (min 48x48px)
- High-Contrast Modus

---

## 9. Stream 8: Enhanced Chatbot

### 9.1 NLU Engine Architektur

**Neue Datei:** `src/utils/chatNLU.ts`

```
User Input
    │
    ▼
┌────────────────┐
│ Preprocessing   │  → Lowercase, Trim, Remove Punctuation
│ + Tokenization  │  → Split on whitespace
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Intent Matching │  → Levenshtein Distance (Typo-Toleranz)
│ + Fuzzy Search  │  → N-gram Matching (Teilwörter)
│ + Synonyms      │  → Synonym-Expansion (Arzt=Doktor=Mediziner)
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Confidence      │  → Score 0.0 - 1.0
│ Scoring         │  → Threshold: 0.4
└────────┬───────┘
         │
    ┌────┴────┐
    │ ≥ 0.4   │ < 0.4
    ▼         ▼
┌────────┐ ┌────────────┐
│ Match  │ │ Fallback    │
│ Intent │ │ + Eskalation│
└────────┘ └────────────┘
```

### 9.2 25+ Intents (erweitert von 18)

| Neue Intents | Beschreibung |
|-------------|-------------|
| `greeting` | Hallo, Guten Tag, Hi → Begrüßung + Menü |
| `goodbye` | Tschüss, Auf Wiedersehen → Abschluss |
| `frustration` | "Versteht mich keiner", "blödes System" → Empathische Antwort + Eskalation |
| `human_request` | "Mensch bitte", "echte Person" → Sofort Team-Chat |
| `status_check` | "Wie lange noch?" → Live Queue-Daten |
| `opening_hours` | "Wann haben Sie geöffnet?" → Praxis-Info |
| `directions` | "Wie komme ich zu Ihnen?" → Anfahrt-Info |

### 9.3 Kontext-Memory

- Letzte 5 Nachrichten im State
- Intent-Stack für Follow-ups: "Und wie lange?" → bezieht sich auf letztes Thema
- Slot-Filling: "Rezept für Ibuprofen" → `intent: prescription, slot: medication=Ibuprofen`

### 9.4 Auto-Eskalation

- Nach 2 ungematchten Nachrichten → "Soll ich Sie mit unserem Team verbinden?"
- "Mensch bitte" / "real person" → sofortiger Tab-Wechsel zu Team-Chat
- Kontext-Handoff: letzte 3 Bot-Nachrichten als Zusammenfassung an Team

### 9.5 Dynamische Daten

| Query | Datenquelle |
|-------|-------------|
| "Wie lange muss ich warten?" | Queue API → tatsächliche Position + geschätzte Minuten |
| "Ist mein Rezept fertig?" | Sessions API → Status-Check |
| "Wer ist mein Arzt?" | Sessions API → assigned doctor name |

### 9.6 Analytics

**Neues Prisma-Model:** `ChatAnalytics`

```prisma
model ChatAnalytics {
  id         String   @id @default(uuid())
  sessionId  String?
  queryText  String
  matchedIntent String?
  confidence Float
  wasEscalated Boolean @default(false)
  createdAt  DateTime @default(now())
}
```

---

## 10. Stream 9: Gamified Anamnese Card

### 10.1 AnamnesesGame Komponente

**Neue Datei:** `src/components/AnamnesesGame.tsx`

| Phase | Beschreibung |
|-------|-------------|
| `map` | Adventure-Map mit Stationen (Körperregionen/Themen), visueller Fortschritt |
| `station` | Fragen einer Station mit Spiel-Elementen (Timer, Punkte, Badges) |
| `achievement` | Badge-Vergabe nach Station-Abschluss mit Animation |
| `health-passport` | Digitaler Gesundheitspass als Zusammenfassung |

### 10.2 Stationen

```
🏠 Start → 📋 Basis-Daten → 💊 Medikamente → 🔬 Vorerkrankungen → 
💉 Impfungen → 🏥 Operationen → ❤️ Beschwerden → 🎯 Abschluss
```

### 10.3 LandingPage Integration

- 11. Service-Karte: "🎮 Spielerische Anamnese"  
- Beschreibung: "Anamnese als Erlebnis — besonders für junge Patienten"
- Dauer: "7-10 Min"
- Selber Backend-Flow wie Standard-Anamnese

---

## 11. Abhängigkeiten & Reihenfolge

```
Stream 1 (Backend)
    │
    ├──▶ Stream 2 (Seeds) ──▶ Stream 3 (Admin) ──▶ Stream 4 (MFA) ──▶ Stream 5 (Arzt)
    │
    └──▶ Stream 6 (Kiosk) ─── parallel ───▶ Stream 7 (Voice) ─── parallel ───▶ Stream 8 (Chatbot)
                                                                                     │
                                                                              Stream 9 (Game)
```

**Kritischer Pfad:** Stream 1 → Stream 2 → Stream 3 (Backend muss stehen bevor Seeds und Admin-API funktionieren)

**Parallel möglich:** Stream 6, 7, 8, 9 (rein Frontend, unabhängig vom Backend)

---

## 12. Verifizierung

| Stream | Akzeptanzkriterium |
|--------|-------------------|
| 1 | `docker-compose up -d` → `curl https://api.diggai.de/api/health` = `{"status":"ok","db":"connected","redis":"connected"}` |
| 2 | `npm run db:seed:full` → Prisma Studio: 50+ patients, 80+ sessions, 500+ answers |
| 3 | Admin Dashboard: Live stats, Charts mit echten Daten, Audit-Log browbar |
| 4 | MFA Dashboard: Seed-Sessions sichtbar, QR-Code, Wartezimmer mit Einträgen |
| 5 | Arzt Dashboard: AI Summary strukturiert, Chat funktional, Triage-Alerts |
| 6 | Tablet: HomeScreen → 4 Tiles, Auto-Logout nach 5min, Privacy-Overlay |
| 7 | TTS liest Fragen vor, Voice-Commands navigieren, Chat akzeptiert Voice |
| 8 | Typo "Versicherng" → Fuzzy Match, 2× unmatched → Auto-Eskalation |
| 9 | "Spielerische Anamnese" Card → Adventure-Map, Badges, gleiche API-Anbindung |
| E2E | Playwright-Tests für alle neuen Features in `e2e/` erweitert |

---

## 13. Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| VPS-Ausfall | Niedrig | Hoch | Docker health checks, auto-restart, daily backups |
| SQLite→PostgreSQL Migration Fehler | Mittel | Hoch | Umfangreiche Tests, Schema-Diff vor Migration |
| Web Speech API Browser-Support | Mittel | Mittel | Feature-Detection, Fallback auf Text-only |
| DSGVO-Konformität Voice | Niedrig | Hoch | Alle Voice-Daten lokal im Browser, kein Server-Upload |
| Seed-Daten nicht realistisch | Niedrig | Mittel | Review durch med. Fachpersonal |
| Redis Verbindungsabbruch | Niedrig | Mittel | Fallback auf In-Memory mit Warnung im Log |

---

## Neue Dateien (geplant)

| Pfad | Stream | Beschreibung |
|------|--------|-------------|
| `Dockerfile` | 1 | Multi-stage Node.js Build |
| `docker-compose.yml` | 1 | App + PostgreSQL + Redis + Nginx |
| `docker/nginx.conf` | 1 | Reverse Proxy + SSL |
| `.env.production` | 1 | Production Environment Template |
| `.github/workflows/deploy.yml` | 1 | CI/CD Pipeline |
| `prisma/seed-comprehensive.ts` | 2 | 50+ Patienten Seed |
| `server/routes/admin.ts` | 3 | Admin API Endpunkte |
| `src/components/HomeScreen.tsx` | 6 | Tablet Home-Screen |
| `src/components/SupplierPage.tsx` | 6 | Lieferanten-Info |
| `src/components/inputs/VoiceOutput.tsx` | 7 | TTS Komponente |
| `src/utils/chatNLU.ts` | 8 | Fuzzy NLU Engine |
| `src/components/AnamnesesGame.tsx` | 9 | Gamified Anamnese |

---

*Erstellt: 04.03.2026 | Nächster Schritt: Implementation ab Stream 1*
