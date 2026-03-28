# DiggAI Anamnese App — Copilot Instructions

## Praxis OS — Vision

**Praxis OS** ist das übergeordnete, privacy-first Praxis-Betriebssystem für deutsche Arztpraxen.
Die **DiggAI Anamnese App** ist das erste produktive Modul innerhalb dieses Systems.

### Globale Architektur- und Sicherheitsrichtlinie

Verbindliche Single Source of Truth (Root):

- `docs/GLOBAL_AI_ARCHITECTURE_SECURITY_POLICY.md`

Dieses Modul darf keine widersprüchlichen Regeln definieren.

### 6-Layer Architektur

| Layer | Verantwortung | Beispiele |
|-------|---------------|-----------|
| Operating System | Geräte- und Arbeitsplatzbasis | Windows 11 Pro, Hyper-V, WSL |
| Local Infrastructure | Lokale, datenschutzkritische Dienste | Ollama, Tomedo-Anbindung, Tailscale, Docker |
| Agent Core | Task-Orchestrierung und Agent-Laufzeit | Heartbeats, Agent Trees, lokale Worker |
| Cloud Orchestration | Unkritische Automatisierung | GitHub Actions, GitHub Copilot, Integrationen |
| Frontend & UI | Praxisoberflächen | React, Tailwind, TypeScript, perspektivisch Tauri |
| Agent Builder | Visuelle Agent-Erstellung | Prompt-Bausteine, Templates, Workflow-Definition |

### Modul-Landkarte

| Modul | Status | Zweck |
|-------|--------|-------|
| Anamnese | Aktiv / Produktion | Digitale Patientenaufnahme, Triage, Exporte |
| Wartezimmer | Teilweise integriert | Queue, Priorisierung, perspektivisch Video-Einstieg |
| Chat | Teilweise integriert | Team-Chat, Patientenkommunikation, FAQ |
| Compliance | Geplant | Datenschutz-, Hosting- und Audit-Workflows |
| Todo | Geplant | Team-Aufgaben, Verantwortlichkeiten, Eskalationen |
| Gamification | Geplant | DSGVO-Schulung, Motivation, Badges |
| Agent Builder | Langfristig | Erstellung praxisspezifischer Agenten ohne Code |

### Privacy-First Hybrid Principle

- **PHI / Gesundheitsdaten** werden lokal oder auf DE/EU-konformer Infrastruktur verarbeitet.
- **Cloud-Automatisierung** darf nur für unkritische Orchestrierung ohne Zugriff auf Roh-Patientendaten genutzt werden.
- **Lokale KI** ist für patientennahe Intelligenz bevorzugt; externer LLM-Zugriff auf PHI ist ausgeschlossen.

### Business Tiers

| Tier | Zielgruppe | Zielbild |
|------|------------|----------|
| Starter | Einzelpraxis | Anamnese + Basis-Workflows |
| Professional | Gemeinschaftspraxis | Multi-Rollen, Queue, Chat, Auswertungen |
| Enterprise | MVZ / Klinikverbund | Multi-Standort, Agenten, tiefere Orchestrierung |

### Produkt-Richtung

- Kurzfristig: Web-App-Module mit klaren Grenzen und gemeinsamer Sicherheitsbasis
- Mittelfristig: modulare Praxis-Workbench
- Langfristig: **Tauri Desktop App** als zentrales Praxis-Cockpit

## Projekt-Kontext

**DiggAI** ist eine vollständig digitale, DSGVO-konforme Patientenaufnahme-App (Anamnese) für deutsche Arztpraxen. Sie ersetzt den papierbasierten Anamnesebogen durch ein intelligentes, mehrsprachiges, webbasiertes System.

- **Live-URL:** https://diggai-drklaproth.netlify.app
- **GitHub:** DiggAiHH/diggai-anamnese (branch: master, default: gh-pages)
- **Status:** Produktion (Beta), Phase 12 in Planung

## Tech-Stack

| Layer | Technologie | Version |
|-------|------------|---------|
| Frontend | React + TypeScript | 19.2.0 / 5.9.3 |
| Build | Vite | 8.0.0-beta |
| Styling | Tailwind CSS | 4.2.1 |
| State | Zustand (persisted, encrypted) | 5.0.11 |
| Data Fetching | TanStack React Query | 5.90.21 |
| Routing | React Router DOM | 7.13.1 |
| i18n | i18next + HTTP Backend | 25.8.13 |
| Icons | Lucide React | 0.575.0 |
| Charts | Recharts | 3.7.0 |
| 3D Animation | Three.js (r128) / Lottie | CDN / npm |
| Signatur | signature_pad (Canvas) | npm |
| Video | WebRTC (DTLS-SRTP, E2E) | Browser API |
| Backend | Express | 5.2.1 |
| ORM | Prisma (PostgreSQL) | 6.19.2 |
| Realtime | Socket.IO | 4.8.3 |
| Auth | JWT (HS256, Algorithm Pinning) | 9.0.3 |
| Encryption | AES-256-GCM (Node.js crypto) | Built-in |
| Testing | Playwright | 1.58.2 |
| Deploy (Frontend) | Netlify | — |
| Deploy (Backend) | Docker on VPS (Hetzner/Contabo) | — |

## Projektstruktur

```
anamnese-app/
├── prisma/           # Schema, Migrations, Seeds
│   ├── schema.prisma # 13+ Models (PostgreSQL)
│   ├── seed.ts       # Basis-Seed (~90 Fragen + Users)
│   └── seed-comprehensive.ts  # 50+ Patienten (Phase 10)
├── server/           # Express Backend (Port 3001)
│   ├── index.ts      # App bootstrap + middleware
│   ├── config.ts     # Env vars (5 required)
│   ├── socket.ts     # Socket.IO setup + WebRTC Signaling (Phase 12)
│   ├── middleware/    # auth.ts, audit.ts
│   ├── routes/       # sessions, answers, atoms, arzt, mfa, admin, chats,
│   │                 # payments, export, upload, queue,
│   │                 # signatures (Phase 12), video (Phase 12)
│   └── services/     # encryption.ts, triage.ts, aiService.ts,
│                     # questionFlow.ts, signatureService.ts (Phase 12)
├── src/              # React Frontend
│   ├── App.tsx       # Router + QueryClient
│   ├── main.tsx      # Entry + SW registration
│   ├── index.css     # Tailwind + Theme vars
│   ├── api/          # client.ts (Axios), hooks.ts (React Query)
│   ├── store/        # sessionStore, modeStore, themeStore (Zustand)
│   ├── components/   # 38+ components
│   │   ├── DatenschutzGame.tsx     # ✅ Phase 10 — Phase 12: + 3D-Animationen
│   │   ├── SignaturePad.tsx        # 🆕 Phase 12 — digitale Unterschrift
│   │   ├── VideoSprechstunde.tsx   # 🆕 Phase 12 — WebRTC Videocall
│   │   └── PatientWartezimmer.tsx  # ✅ Phase 10 — Phase 12: + Video-Einstieg
│   ├── pages/        # ArztDashboard, MFADashboard, AdminDashboard, etc.
│   └── utils/        # speechSupport.ts, chatNLU.ts
├── public/           # Static assets, locales/ (10 languages), sw.js, manifest.json
│   └── assets/3d/    # 🆕 Phase 12 — Lottie/3D-Assets für DatenschutzGame
├── e2e/              # Playwright tests
├── netlify/          # Netlify Functions (legacy mock layer)
├── docker/           # Nginx config
│   └── turn/         # 🆕 Phase 12 — coturn STUN/TURN Konfiguration
├── Dockerfile        # Multi-stage Node.js build
├── docker-compose.yml # App + PostgreSQL + Redis + Nginx + coturn (Phase 12)
└── .github/          # CI/CD, copilot-instructions.md
```

## Coding-Konventionen

### TypeScript
- Strict mode enabled (`tsconfig.json`)
- No `any` — use proper types or `unknown`
- Named exports for components, default exports only for lazy-loaded pages
- Zod for runtime validation on server routes

### React
- Functional components only
- Hooks for state/effects (no class components)
- `useTranslation()` für ALLE user-facing strings — NIEMALS deutschen Text hardcoden
- Lazy loading for dashboard pages (`React.lazy` + `Suspense`)
- TanStack React Query for all API calls (mutations + queries)

### Styling
- Tailwind CSS utility classes only — no CSS modules, no styled-components
- CSS variables for theme: `var(--bg-primary)`, `var(--text-primary)`, etc.
- Dark/Light theme via `theme-dark`/`theme-light` classes
- RTL support for Arabic (ar) and Farsi (fa)

### i18n
- 10 Sprachen: de, en, ar, tr, uk, es, fa, it, fr, pl, ru
- JSON locale files in `public/locales/{lng}/translation.json`
- Key pattern: `section.key_name` (z.B. `datenschutz.signature_hint`, `video.waiting_room`)
- ALLE neuen UI-Texte müssen Keys in ALLEN 10 Locale-Dateien haben

### Backend
- Express 5.x with async route handlers
- Prisma for all DB operations — no raw SQL
- `requireAuth` middleware on all non-public routes
- `requireRole('arzt', 'admin')` for role-gated endpoints
- `auditLogger` middleware logs every request
- AES-256-GCM encryption for PII fields via `encryptionService`
- JWT tokens: HS256 algorithm pinning, JTI for blacklist

### Security (DSGVO/BSI-konform)
- NO patient data in URLs or query strings
- NO `console.log` of sensitive data in production
- All PII encrypted at rest (AES-256-GCM)
- SHA-256 hashed emails for pseudonymization
- Token blacklist on logout
- Rate limiting on auth endpoints (10/15min)
- Global rate limit: 200/15min
- Helmet headers: HSTS, CSP, X-Frame-Options, COEP/COOP/CORP
- CORS restricted to `FRONTEND_URL`
- Signaturdaten (Phase 12): AES-256-GCM + SHA-256 Dokument-Hash + Zeitstempel
- WebRTC (Phase 12): DTLS-SRTP Ende-zu-Ende-Verschlüsselung, EU/DE Server only

### File Naming
- Components: PascalCase (`HomeScreen.tsx`, `SignaturePad.tsx`)
- Utilities: camelCase (`chatNLU.ts`, `signatureService.ts`)
- Server routes: camelCase (`signatures.ts`, `video.ts`)
- Tests: `*.spec.ts` in `e2e/`

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | YES | PostgreSQL connection string |
| `JWT_SECRET` | YES | JWT signing key (min 32 chars) |
| `ENCRYPTION_KEY` | YES | AES-256-GCM key (exactly 32 bytes) |
| `FRONTEND_URL` | YES | CORS origin (Netlify URL) |
| `ARZT_PASSWORD` | YES | Default staff password for seeding |
| `REDIS_URL` | YES (prod) | Redis for token blacklist + queue |
| `TURN_SERVER_URL` | YES (Phase 12) | coturn STUN/TURN URI (EU/DE) |
| `TURN_SERVER_SECRET` | YES (Phase 12) | coturn shared secret (HMAC-SHA1) |
| `PORT` | optional | Server port (default: 3001) |
| `NODE_ENV` | optional | development/production |

## Key Patterns

### API Hooks (Frontend)
```typescript
// In src/api/hooks.ts — use TanStack React Query
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
  });
}
```

### Server Routes (Backend)
```typescript
// Always: auth + role check + Zod validation + audit logging (auto via middleware)
router.get('/stats', requireAuth, requireRole('admin'), async (req, res) => {
  const stats = await prisma.patientSession.aggregate({ ... });
  res.json(stats);
});
```

### i18n Keys (Locales)
```json
// In ALL 10 locale files:
{
  "datenschutz": {
    "signature_title": "Bitte unterschreiben Sie hier",
    "signature_clear": "Unterschrift löschen",
    "signature_confirm": "Unterschrift bestätigen"
  },
  "video": {
    "waiting_room": "Videosprechstunde Warteraum",
    "consent_required": "Einwilligung zur Videoübertragung erforderlich"
  }
}
```

### Zustand Store Encryption
```typescript
// Persisted stores containing patient or staff context must encrypt payloads
export const useSecureStore = create<SecureState>()(
  persist(
    (set) => ({ ... }),
    {
      name: 'diggai-secure-store',
      storage: encryptedStorage,
      partialize: (state) => ({ ...state }),
    },
  ),
);
```

### Prisma Client Extensions
```typescript
// Prefer centralized Prisma extensions for audit, tenant scoping, and soft guards
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        return query(args);
      },
    },
  },
});
```

### Socket.IO Event Typing
```typescript
// Shared event contracts should be typed, not stringly-typed ad hoc
interface ServerToClientEvents {
  triageAlert: (payload: TriageAlertPayload) => void;
  queueUpdated: (payload: QueueSnapshot) => void;
}

interface ClientToServerEvents {
  joinSession: (sessionId: string) => void;
}
```

### Agent Orchestration

- Nutze den **Optimization Agent** für vollautonome Sessions, task-basierte Delegation und lokale Resource-First-Ausführung.
- Nutze Spezial-Agents gezielt statt eines einzigen Allzweck-Agenten.
- Starte schwere Validierungsläufe gestaffelt: gezielte Checks → betroffene Specs → Full Suite.
- Bevorzuge lokale Infrastruktur, MCPs und bestehende Workspace-Artefakte vor externen Abhängigkeiten.
- Für komplexe Aufgaben ist ein **mindestens 7-stufiger Ausführungsplan** die bevorzugte Struktur.
- Halte nach größeren Umsetzungs- oder Validierungsphasen eine kompakte Session-Zusammenfassung fest, um Kontextverlust zu vermeiden.
- Zerlege Aufgaben maximal fein, solange die Teilaufgaben noch operativ sinnvoll und überprüfbar sind.

---

## Abgeschlossene Phasen

### Phase 1–10 ✅
- 81-Problem-Analyse + 14 Security-Fixes
- 4 Feature-Komponenten: DatenschutzGame, StaffChat, StaffTodoList, PatientWartezimmer
- Schema-Korrekturen (APGAR, BG 14+1, Bestandspatienten, Red-Flag, Bewertung)
- DSGVO Section 2 (10 Tasks: Headers, Hardening, Audit, JWT, Consent, Legal Pages)
- Dokumentation + Translation-Audit (81 Keys in 10 Sprachen)
- Netlify-Deployment mit SPA-Routing-Fix
- Integration Tests (39/39 bestanden)
- Docker + Seed Data (50+ Patienten) + Admin API (10 Endpoints)
- HomeScreen, StaffAutoLogout, VoiceOutput, NLU Engine, AnamneseGame
- Redis Token Blacklist, GitHub Actions CI/CD, i18n alle 11 Locales

---

## Aktuelle Phase: Phase 11 (in Implementierung)

### Phase 11 — 7 Streams
1. **Returning Patient Fast-Track** — RPT-ID, PatientIdentify, birthDate + insuranceNumber
2. **Security Pattern Auth** — PatternLock (4x4, SHA-256 → bcrypt), CertificationModal
3. **MFA Identity Certification** — Ausweis-Prüfung, Versicherung, P-XXXXX Nummer
4. **Netlify Cleanup** — 13 obsolete Scripts entfernt, COEP-Fix, Deploy-Scripts
5. **Component Library** — Design Tokens (`src/design/tokens.ts`), 6 UI-Komponenten
6. **Seed Data Expansion** — 18 Patienten mit Chat-Nachrichten, 50+ Threads
7. **E2E Test Suite** — 14 Spec-Dateien + Shared Helpers, Mobile + Desktop

### Key Phase 11 Files

| File | Purpose |
|------|---------|
| `src/components/inputs/PatternLock.tsx` | 4x4 Dot-Grid Sicherheitsmuster (Canvas, touch+mouse+keyboard) |
| `src/components/inputs/PatientIdentify.tsx` | Bestandspatient-Identifikationsformular |
| `src/components/CertificationModal.tsx` | MFA 4-Step Patientenzertifizierung |
| `src/utils/patternAuth.ts` | SHA-256 Hashing, Validierung, Komplexitätsprüfung |
| `server/routes/patients.ts` | 5 Patienten-Endpoints (identify, verify-pattern, set-pattern, certify, get) |
| `src/design/tokens.ts` | Zentrales Design-System (Spacing, Radii, Shadows, Z-Index) |
| `src/components/ui/` | Button, Card, Input, Modal, Badge, Spinner |
| `e2e/helpers/test-utils.ts` | Playwright Shared Helpers |

---

## Geplante Phase: Phase 12

### Phase 12 — 3 Feature-Streams (in Planung mit Opus 4.6)

---

### Stream 1 — 3D-Animationen im DatenschutzGame

**Ziel:** Erweiterung von `src/components/DatenschutzGame.tsx` um visuell ansprechende
giftige Pflanzen/Tiere und Vogel-Animationen zur spielerischen DSGVO-Aufklärung.

**Technologie-Entscheidung (offen — Planung läuft):**
- Lottie (leichtgewichtig, JSON-basiert, mobile-optimiert) — bevorzugt
- Three.js r128 (bereits im Stack via CDN) — für 3D-Szenen
- `prefers-reduced-motion` muss respektiert werden (Barrierefreiheit)

**Regeln:**
- Assets in `public/assets/3d/` — kein externer CDN für Assets
- Lazy Loading via `React.lazy` (konsistent mit App.tsx)
- i18n für alle Beschriftungen (alle 10 Sprachen)
- Performance: Tablets in Praxen als Zielgerät (kein High-End-GPU)

---

### Stream 2 — Digitale Unterschrift (DSGVO-konform)

**Ziel:** Patienten, Ärzte und Lieferanten müssen Datenschutzformulare mit einer
**echten digitalen Unterschrift** unterzeichnen — nicht nur per Checkbox-Klick.

**Rechtliche Grundlage:**
- Fortgeschrittene elektronische Signatur (eIDAS Art. 26) für Praxisformulare ausreichend
- §630f BGB: Dokumentationspflicht
- Aufbewahrungspflicht: 10 Jahre (§ 630f Abs. 3 BGB)
- Verknüpfung mit Patientennummer (P-XXXXX) + Session-JWT für Audit-Trail

**Technische Umsetzung:**
- `signature_pad` Library (Canvas-basiert — konsistent mit `PatternLock.tsx`)
- Signatur → Base64 PNG → AES-256-GCM verschlüsselt (konsistent mit `encryption.ts`)
- SHA-256 Hash des signierten Dokuments (Unveränderlichkeitsnachweis)
- RFC 3161-kompatibler Zeitstempel

**Neue Artefakte:**
- `src/components/SignaturePad.tsx` — Canvas Unterschriften-Pad
- `server/routes/signatures.ts` — Signature-Endpoints
- `server/services/signatureService.ts` — Signatur-Logik + Hashing
- Neues Prisma-Model: `Signature` (patientId, formType, encryptedData, docHash, timestamp, ipHash)

---

### Stream 3 — DSGVO-konforme Videosprechstunde

**Ziel:** Integration einer vollständig DSGVO-konformen Videosprechstunde,
die in einer deutschen Arztpraxis rechtlich und technisch betrieben werden darf.

**Rechtliche Anforderungen (DE, 2024/2025):**
- § 291g SGB V + KBV-Richtlinie Videosprechstunde
- BSI TR-03161 (Sicherheitsanforderungen für Videodienste im Gesundheitswesen)
- DSGVO Art. 9 (Gesundheitsdaten = besondere Kategorie → erhöhter Schutz)
- Explizite Einwilligung vor Gesprächsbeginn PFLICHT
- Aufzeichnung VERBOTEN ohne gesonderte Einwilligung
- Server-Standort: ausschließlich EU/Deutschland

**Technische Architektur:**
- WebRTC (Browser-API, DTLS-SRTP Ende-zu-Ende-Verschlüsselung)
- Signaling via bestehendem Socket.IO (`server/socket.ts` — Erweiterung)
- STUN/TURN: coturn auf bestehendem VPS (Docker-Erweiterung)
- Warteraum: Erweiterung von `PatientWartezimmer.tsx`
- Kein Cloud-Drittanbieter für Media-Relay (Hetzner/Contabo VPS, DE)

**Neue Artefakte:**
- `src/components/VideoSprechstunde.tsx` — WebRTC UI-Komponente
- `server/routes/video.ts` — Session-Management, TURN-Credentials
- Neue Prisma-Models: `VideoSession`, `VideoConsent`
- `docker/turn/turnserver.conf` — coturn Konfiguration
- `docker-compose.yml` — coturn Service hinzufügen

**Dokumentation (Phase 12 Deliverable):**
- DSGVO-Konformitätsnachweis (technisch + rechtlich)
- Datenschutz-Folgeabschätzung (DSFA) nach Art. 35 DSGVO (Gliederung)
- Praxis-Leitfaden: Einrichtung, Testbetrieb, Inbetriebnahme
- Performance-Metriken: Latenz, Bandbreite, max. Teilnehmer

---

## NO-REDUNDANCY PROTOCOL (MANDATORY FOR ALL AGENTS/SESSIONS)

Goldene Regel: Alles darf nur einmal gemacht werden.

Before creating any file, feature, route, service, or component:

```powershell
# From repo root (Anamnese-kimi/):
# 1. Precheck
powershell -ExecutionPolicy Bypass -File scripts/once-guard.ps1 precheck -Task "<task-key>"
# Exit 0 = free  |  Exit 2 = IN PROGRESS by another agent  |  Exit 3 = ALREADY DONE

# 2. Claim
powershell -ExecutionPolicy Bypass -File scripts/once-guard.ps1 claim -Task "<task-key>" -Agent "copilot" -SessionId "<YYYY-MM-DD-topic>"

# 3. Read shared knowledge
# shared/knowledge/knowledge-share.md   (decisions + lessons learned)
# shared/knowledge/task-registry.json   (all tasks registry)

# 4. Do the work.

# 5. Complete
powershell -ExecutionPolicy Bypass -File scripts/once-guard.ps1 complete -Task "<task-key>" -Agent "copilot" -Artifacts @("relative/path/artifact.ts")
```

Exit 2 = STOP — another agent owns it. Exit 3 = STOP — already done, extend don't rebuild.

Policy: `SESSIONS_ONCE_POLICY.md` | Brainstorm flow: `AGENT_BRAINSTORM_FLOW.md`

---

## Don'ts

- Kein externes LLM (kein OpenAI, DeepSeek, Kimi) — NLU ist rule-based
- Kein externer LLM-Zugriff auf PHI/Gesundheitsdaten — patientennahe KI nur lokal oder auf explizit freigegebener DE/EU-Infrastruktur
- Keine Sprachdaten auf dem Server — Speech Processing ausschließlich im Browser (DSGVO)
- Kein SQLite — Projekt auf PostgreSQL migriert
- Kein i18n-Skip — jeder UI-String braucht Keys in allen 10 Locales
- Kein `any` Type — proper TypeScript types
- Keine Dependencies ohne Bundle-Size-Check
- Kein Auth-Middleware-Bypass auf sensiblen Routes
- Keine modulübergreifende Kopplung ohne klare Vertragsgrenzen — gemeinsame Typen/Contracts statt Copy-Paste
- Keine Praxis-OS-Module bauen, die nur als einmalige Sonderlösung funktionieren — immer auf Wiederverwendbarkeit für weitere Module achten
- **Phase 12 neu:** Kein Drittanbieter-Cloud für WebRTC Media-Relay (DSGVO!)
- **Phase 12 neu:** Signaturdaten NIEMALS unverschlüsselt persistieren
- **Phase 12 neu:** Videoaufzeichnung NIEMALS ohne explizite Consent-Erfassung starten

---

## Netlify Deploy (Secure)

- Netlify Site ID: `d4c9bba2-71cc-48a1-81a4-14cb9ac5cb90`
- Deploy Status Badge: `https://api.netlify.com/api/v1/badges/d4c9bba2-71cc-48a1-81a4-14cb9ac5cb90/deploy-status`
- Bevorzugte Deploy-Kommandos:
  - `npm run deploy` (geführter Production-Deploy)
  - `npm run deploy:preview` (geführter Preview-Deploy)
- Geführtes Script: `scripts/deploy-guided.mjs`
  - Baut automatisch wenn `dist/` fehlt
  - Nutzt `NETLIFY_AUTH_TOKEN` für non-interaktiven Deploy
  - Fallback auf interaktiven Login (`npx netlify login`) wenn kein Token

**Sicherheitsregel:** Netlify-Passwörter NIEMALS in Repository-Dateien speichern.
Nur Umgebungsvariablen (`NETLIFY_AUTH_TOKEN`) oder lokalen CLI-Login-State nutzen.
