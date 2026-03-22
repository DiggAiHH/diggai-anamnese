# Opus 4.6 Agent Prompt — DiggAI Phase 10 Implementation

> ⚠️ **DEPRECATED** — Diese dateispezifische Phase-10-Anweisung wurde durch `anamnese-app/.github/agents/fullstack-agent.agent.md` ersetzt.
> Für neue Implementierungen den Fullstack Agent plus `anamnese-app/.github/copilot-instructions.md` verwenden.

> **Zweck:** Dieser Prompt wird an den GitHub Copilot Agent (Claude Opus 4.6) übergeben, um die gesamte Phase 10 Implementation autonom durchzuführen.
> **Kontext-Dateien:** `.github/copilot-instructions.md`, `claude.md`, `PHASE10_MASTERPLAN.md`

---

## System-Anweisung

Du bist ein Senior Full-Stack Engineer der die DiggAI Anamnese App implementiert. Du arbeitest im VS Code Editor mit GitHub Copilot Agent Mode. Nutze Sub-Agents MAXIMAL für parallele Recherche und Implementation.

**WICHTIG:**
- Lies zuerst `.github/copilot-instructions.md` für Coding-Konventionen
- Lies `claude.md` für Projektkontext
- Lies `PHASE10_MASTERPLAN.md` für den vollständigen Plan
- Nutze `manage_todo_list` extensiv für Tracking
- Committe nach jedem abgeschlossenen Stream
- Führe `tsc -b` nach jeder Code-Änderung aus — 0 Errors ist Pflicht

---

## Aufgabe

Implementiere alle 9 Streams der Phase 10 in dieser Reihenfolge:

### Stream 1: Backend Deployment Infrastructure

**Dateien zu erstellen/ändern:**

1. **`prisma/schema.prisma`** — Ändere:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
   Füge hinzu:
   ```prisma
   model ChatAnalytics {
     id            String   @id @default(uuid())
     sessionId     String?
     queryText     String
     matchedIntent String?
     confidence    Float
     wasEscalated  Boolean  @default(false)
     createdAt     DateTime @default(now())
     @@index([createdAt])
   }
   ```

2. **`Dockerfile`** — Multi-stage build:
   ```dockerfile
   # Stage 1: Build
   FROM node:22-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --omit=dev
   COPY prisma/ ./prisma/
   RUN npx prisma generate
   COPY server/ ./server/
   COPY tsconfig*.json ./
   RUN npx tsc -p tsconfig.server.json

   # Stage 2: Production
   FROM node:22-alpine
   WORKDIR /app
   RUN apk add --no-cache tini
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/dist-server ./dist-server
   COPY --from=builder /app/prisma ./prisma
   COPY --from=builder /app/package.json ./
   EXPOSE 3001
   ENTRYPOINT ["/sbin/tini", "--"]
   CMD ["node", "dist-server/index.js"]
   ```

3. **`docker-compose.yml`**:
   ```yaml
   version: '3.9'
   services:
     app:
       build: .
       ports: ["3001:3001"]
       env_file: .env.production
       depends_on:
         postgres: { condition: service_healthy }
         redis: { condition: service_healthy }
       restart: unless-stopped
       healthcheck:
         test: ["CMD", "wget", "-qO-", "http://localhost:3001/api/health"]
         interval: 30s
         timeout: 5s
         retries: 3

     postgres:
       image: postgres:16-alpine
       volumes: ["pgdata:/var/lib/postgresql/data"]
       environment:
         POSTGRES_DB: anamnese_prod
         POSTGRES_USER: diggai
         POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U diggai -d anamnese_prod"]
         interval: 10s
         timeout: 5s
         retries: 5

     redis:
       image: redis:7-alpine
       volumes: ["redisdata:/data"]
       command: redis-server --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru
       healthcheck:
         test: ["CMD", "redis-cli", "ping"]
         interval: 10s
         timeout: 5s
         retries: 5

     nginx:
       image: nginx:1.27-alpine
       ports: ["80:80", "443:443"]
       volumes:
         - ./docker/nginx.conf:/etc/nginx/nginx.conf:ro
         - ./docker/certs:/etc/nginx/certs:ro
       depends_on: [app]
       restart: unless-stopped

   volumes:
     pgdata:
     redisdata:
   ```

4. **`docker/nginx.conf`** — Reverse proxy + SSL + WebSocket support + security headers

5. **`.env.production`** — Template mit Platzhaltern:
   ```env
   DATABASE_URL=postgresql://diggai:CHANGE_ME@postgres:5432/anamnese_prod
   JWT_SECRET=CHANGE_ME_32_BYTES_MINIMUM_RANDOM
   ENCRYPTION_KEY=CHANGE_ME_EXACTLY_32_BYTES_LONG
   FRONTEND_URL=https://diggai-drklaproth.netlify.app
   ARZT_PASSWORD=CHANGE_ME_SECURE_PASSWORD
   REDIS_URL=redis://redis:6379
   NODE_ENV=production
   PORT=3001
   POSTGRES_PASSWORD=CHANGE_ME_DB_PASSWORD
   ```

6. **`server/middleware/auth.ts`** — Ersetze den In-Memory `tokenBlacklist` Map durch Redis:
   ```typescript
   import { createClient } from 'redis';
   const redis = createClient({ url: process.env.REDIS_URL });
   redis.connect().catch(console.error);

   export async function blacklistToken(jti: string, expiresInMs: number): Promise<void> {
     if (redis.isReady) {
       await redis.set(`bl:${jti}`, '1', { EX: Math.ceil(expiresInMs / 1000) });
     } else {
       // Fallback: in-memory
       tokenBlacklist.set(jti, Date.now() + expiresInMs);
     }
   }
   ```

7. **`server/routes/queue.ts`** — Ersetze In-Memory Array durch Redis Sorted Set

8. **`.github/workflows/deploy.yml`** — GitHub Actions CI/CD:
   ```yaml
   name: Deploy to VPS
   on:
     push:
       branches: [master]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 22 }
         - run: npm ci
         - run: npm run build
         - run: npx tsc -b
         - name: Deploy via SSH
           uses: appleboy/ssh-action@v1
           with:
             host: ${{ secrets.VPS_HOST }}
             username: ${{ secrets.VPS_USER }}
             key: ${{ secrets.VPS_SSH_KEY }}
             script: |
               cd /opt/diggai
               git pull origin master
               docker compose pull
               docker compose up -d --build
               docker compose exec app npx prisma migrate deploy
   ```

9. **`server/config.ts`** — Füge `redisUrl` hinzu:
   ```typescript
   redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
   ```

10. **`netlify.toml`** — Ändere API redirect (sobald VPS live):
    ```toml
    # Aktuell: /.netlify/functions/:splat
    # Nach VPS-Deployment: https://api.diggai.de/api/:splat
    ```

11. **`package.json`** — Füge `ioredis` dependency hinzu:
    ```json
    "ioredis": "^5.6.0"
    ```

**Verifizierung Stream 1:** `tsc -b` = 0 Errors, `docker compose config` = valid

---

### Stream 2: Comprehensive Seed Data

**Neue Datei: `prisma/seed-comprehensive.ts`**

Erstelle 50+ realistische Patienten mit vollständigen медицинischen Daten. Verwende diese Profile:

```typescript
const PATIENT_PROFILES = [
  // ─── Notfälle / Red Flags ─────────────────
  { name: 'Thomas Müller', age: 58, insurance: 'GKV', service: 'ANAMNESE',
    condition: 'Brustschmerzen >20min', triage: 'CRITICAL', triageRule: 'ACS' },
  { name: 'Helga Braun', age: 81, insurance: 'GKV', service: 'ANAMNESE',
    condition: 'Plötzliche Bewusstlosigkeit', triage: 'CRITICAL', triageRule: 'Synkope' },
  { name: 'Stefan Kruger', age: 42, insurance: 'PKV', service: 'ANAMNESE',
    condition: 'Stärkster Kopfschmerz des Lebens', triage: 'CRITICAL', triageRule: 'SAH' },
  { name: 'Lisa Weber', age: 35, insurance: 'GKV', service: 'ANAMNESE',
    condition: 'Suizidgedanken', triage: 'CRITICAL', triageRule: 'Suizid' },

  // ─── BG-Unfälle ──────────────────────────
  { name: 'Ahmed Hassan', age: 34, insurance: 'BG', service: 'UNFALLMELDUNG',
    condition: 'Sturz von Gerüst', accidentDetails: true },
  { name: 'Marco Rossi', age: 28, insurance: 'BG', service: 'UNFALLMELDUNG',
    condition: 'Schnittwunde Kreissäge', accidentDetails: true },
  // ... etc.

  // ─── Routine ─────────────────────────────
  { name: 'Maria Schmidt', age: 72, insurance: 'GKV', service: 'ANAMNESE',
    condition: 'Diabetes Typ 2 + Hypertonie', medications: ['Metformin 1000mg', 'Ramipril 5mg'] },
  { name: 'Olga Petrova', age: 45, insurance: 'PKV', service: 'ANAMNESE',
    condition: 'Schwangerschaft 28. Woche', schwangerschaft: true },

  // ─── Verschiedene Services ────────────────
  { name: 'Fatima Al-Rashid', age: 29, insurance: 'GKV', service: 'REZEPT' },
  { name: 'Jan Kowalski', age: 55, insurance: 'GKV', service: 'AU' },
  { name: 'Emma Fischer', age: 19, insurance: 'GKV', service: 'UEBERWEISUNG' },
  { name: 'Hans Meier', age: 67, insurance: 'Selbstzahler', service: 'TELEFONANFRAGE' },
  // ... 40+ weitere
];
```

Für jeden Patienten:
1. Erstelle `Patient` mit SHA-256 Email-Hash
2. Erstelle `PatientSession` mit realistischem Status
3. Erstelle 5-15 `Answer` Einträge (abhängig vom Service)
4. Erstelle `TriageEvent` wenn Red Flag vorhanden
5. Erstelle `AccidentDetails` für BG-Unfälle
6. Erstelle `ChatMessage` für einige Sessions (Patient↔Arzt Dialog)
7. Erstelle `PatientMedication` für Patienten mit Medikamenten
8. Erstelle `PatientSurgery` für relevante Patienten
9. Erstelle `AuditLog` Einträge

Erstelle auch 5-8 Queue-Einträge (Wartezimmer).

**package.json** — Füge Script hinzu:
```json
"db:seed:full": "tsx prisma/seed-comprehensive.ts"
```

---

### Stream 3: Admin API Routes + Dashboard Overhaul

**Neue Datei: `server/routes/admin.ts`**

Implementiere 10 Endpunkte (siehe PHASE10_MASTERPLAN.md §4).

**Änderung: `server/index.ts`** — Route registrieren:
```typescript
import adminRoutes from './routes/admin';
app.use('/api/admin', authLimiter, adminRoutes);
```

**Änderung: `src/pages/AdminDashboard.tsx`** (1391 Zeilen):
- Ersetze alle hardcoded `STATS`, `SERVICES`, `BODY_MODULES` Konstanten durch React Query Hooks
- Füge 2 neue Tabs hinzu: "Benutzer" und "Audit-Log"
- Verbinde Charts mit Live-Daten

**Neue Hooks in `src/api/hooks.ts`:**
```typescript
export function useAdminStats() { ... }
export function useAdminTimeline(days: number) { ... }
export function useAdminAuditLog(page: number, filters: AuditFilters) { ... }
export function useAdminUsers() { ... }
export function useCreateUser() { ... }
export function useUpdateUser() { ... }
export function useDeleteUser() { ... }
```

---

### Stream 4-5: MFA + Arzt Dashboard Enhancement

Erweitere `MFADashboard.tsx` und `ArztDashboard.tsx` wie in PHASE10_MASTERPLAN.md §5-6 beschrieben.

---

### Stream 6: HomeScreen + Kiosk Mode

**Neue Datei: `src/components/HomeScreen.tsx`**

4 große Kacheln (Patient, Arzt, MFA, Lieferant) mit:
- Uhrzeit/Datum-Anzeige
- Sprachauswahl
- Auto-Reset nach 60s Inaktivität
- Animierter Hintergrund

**Änderung: `src/App.tsx`**
```tsx
const HomeScreen = lazy(() => import('./components/HomeScreen').then(m => ({ default: m.HomeScreen })));

<Routes>
  <Route path="/" element={<Suspense fallback={<DashboardLoading />}><HomeScreen /></Suspense>} />
  <Route path="/patient" element={<PatientApp />} />
  <Route path="/patient/*" element={<PatientApp />} />
  {/* ... bestehende Routen ... */}
</Routes>
```

**Neue Datei: `src/components/StaffAutoLogout.tsx`**

Wrapper-Komponente für ArztDashboard und MFADashboard:
- 5 Min idle → Modal-Warnung mit Countdown
- 1 Min → Force Logout + Token löschen + navigate('/')
- Privacy Screen: 3 Min idle → CSS blur auf `.patient-data` Elemente

**Neue Datei: `src/components/PrivacyOverlay.tsx`**

Overlay das Patientendaten unkenntlich macht nach Inaktivität.

---

### Stream 7: Voice Assistant

**Neue Datei: `src/components/inputs/VoiceOutput.tsx`**

```typescript
interface VoiceOutputProps {
  text: string;
  lang?: string;       // default: i18n.language
  autoPlay?: boolean;  // default: false
  rate?: number;       // 0.5-2.0, default: 1.0
  pitch?: number;      // 0-2, default: 1.0
  volume?: number;     // 0-1, default: 0.8
  onEnd?: () => void;
}
```

- Nutze `window.speechSynthesis` API
- Sprach-Mapping: de→de-DE, en→en-US, ar→ar-SA, tr→tr-TR, etc.
- Play/Pause/Stop Controls
- "Vorlesen"-Button auf jeder Frage in `QuestionRenderer.tsx`

**Erweiterung: `src/components/inputs/VoiceInput.tsx`**

Voice-Navigation Commands erkennen (Weiter, Zurück, Hilfe, Vorlesen, Stopp, Wiederholen) und als Callbacks an die Questionnaire-Komponente weiterleiten.

**Erweiterung: `src/components/ChatBubble.tsx`**

Mikrofon-Button im FAQ-Tab: Speech → findBotAnswer() → TTS-Antwort

---

### Stream 8: Enhanced Chatbot NLU

**Neue Datei: `src/utils/chatNLU.ts`**

```typescript
interface Intent {
  id: string;
  patterns: string[][];     // Array of keyword arrays per language
  synonyms: string[];       // Synonym expansion
  confidence: number;       // Match threshold
  responseKey: string;      // i18n key for response
  followUp?: string;        // Expected follow-up intent
  slots?: SlotDefinition[];
}

interface NLUResult {
  intent: string | null;
  confidence: number;
  slots: Record<string, string>;
  suggestedResponse: string;
  shouldEscalate: boolean;
}

export function processMessage(
  input: string,
  context: ConversationContext,
  language: string
): NLUResult;
```

Implementiere:
- `levenshteinDistance(a, b)` — Edit-Distanz für Typo-Toleranz
- `ngramMatch(input, pattern, n=3)` — Teilwort-Matching
- `expandSynonyms(tokens, language)` — Synonym-Tabelle
- 25+ Intent-Definitionen mit Multi-Language-Patterns
- Kontext-Stack (letzte 5 Nachrichten)
- Auto-Eskalation nach 2 ungematchten Nachrichten

**Änderung: `src/components/ChatBubble.tsx`**

Ersetze `findBotAnswer()` durch `processMessage()` aus chatNLU.

---

### Stream 9: Gamified Anamnese

**Neue Datei: `src/components/AnamnesesGame.tsx`**

Adventure-Map UI mit 8 Stationen:
1. 🏠 Start (Begrüßung + Tutorial)
2. 📋 Basis-Daten (Name, Geb., Versicherung)
3. 💊 Medikamente
4. 🔬 Vorerkrankungen
5. 💉 Impfungen
6. 🏥 Operationen
7. ❤️ Beschwerden
8. 🎯 Abschluss (Gesundheitspass)

Pro Station:
- Fortschrittsbalken mit Animation
- Achievement-Badge nach Abschluss
- Fun Facts zwischen Stationen
- Gleiche API-Calls wie Standard-Questionnaire

**Änderung: `src/components/LandingPage.tsx`**

11. Service-Karte hinzufügen:
```typescript
{ id: 'game', icon: '🎮', title: t('services.game'), description: t('services.game_desc'), duration: '7-10 Min' }
```

---

### i18n Updates

Für ALLE neuen Features müssen Translation-Keys in ALLEN 10 Locale-Dateien hinzugefügt werden:

```json
{
  "home": {
    "title": "DiggAI Praxis-System",
    "subtitle": "Bitte wählen Sie Ihre Rolle",
    "patient_tile": "Patient",
    "patient_desc": "Starten Sie Ihre digitale Aufnahme",
    "arzt_tile": "Arzt",
    "arzt_desc": "Arzt-Dashboard öffnen",
    "mfa_tile": "MFA",
    "mfa_desc": "MFA-Dashboard öffnen",
    "supplier_tile": "Lieferant",
    "supplier_desc": "Informationen für Dienstleister",
    "auto_reset": "Automatischer Reset in {{seconds}} Sekunden"
  },
  "voice": {
    "read_aloud": "Vorlesen",
    "stop_reading": "Stopp",
    "speed": "Geschwindigkeit",
    "volume": "Lautstärke",
    "listening": "Ich höre zu...",
    "command_next": "Sage 'Weiter' für die nächste Frage",
    "command_back": "Sage 'Zurück' für die vorherige Frage",
    "command_help": "Sage 'Hilfe' für Unterstützung",
    "accessibility_mode": "Barrierefreiheits-Modus",
    "accessibility_desc": "Automatisches Vorlesen aller Fragen"
  },
  "chatbot": {
    "greeting": "Hallo! Wie kann ich Ihnen helfen?",
    "escalation_prompt": "Möchten Sie mit unserem Team sprechen?",
    "escalation_auto": "Ich verbinde Sie mit unserem Team...",
    "context_followup": "Bezieht sich Ihre Frage auf {{topic}}?",
    "no_match": "Ich konnte Ihre Frage leider nicht zuordnen.",
    "faq_opening_hours": "Unsere Öffnungszeiten sind...",
    "faq_directions": "So finden Sie zu uns..."
  },
  "game": {
    "title": "Anamnese-Abenteuer",
    "subtitle": "Ihre Gesundheit als Entdeckungsreise",
    "start_adventure": "Abenteuer starten",
    "station": "Station {{number}}",
    "achievement_unlocked": "Achievement freigeschaltet!",
    "health_passport": "Ihr Gesundheitspass",
    "fun_fact": "Wussten Sie?",
    "progress": "{{completed}} von {{total}} Stationen"
  },
  "admin": {
    "tab_users": "Benutzer",
    "tab_audit": "Audit-Log",
    "create_user": "Benutzer erstellen",
    "edit_user": "Benutzer bearbeiten",
    "deactivate_user": "Deaktivieren",
    "reset_password": "Passwort zurücksetzen",
    "audit_filter_date": "Zeitraum",
    "audit_filter_type": "Ereignistyp",
    "audit_filter_user": "Benutzer",
    "no_audit_entries": "Keine Einträge gefunden",
    "live_stats": "Live-Statistiken",
    "roi_actual": "Tatsächlicher ROI"
  },
  "privacy": {
    "screen_locked": "Bildschirm gesperrt",
    "tap_to_unlock": "Tippen zum Entsperren",
    "auto_logout_warning": "Automatischer Logout in {{seconds}} Sekunden",
    "session_expired": "Sitzung abgelaufen"
  },
  "services": {
    "game": "Spielerische Anamnese",
    "game_desc": "Anamnese als Erlebnis — besonders für junge Patienten"
  }
}
```

Übersetze alle Keys in: en, ar, tr, uk, es, fa, it, fr, pl.

---

## Workflow-Anweisungen

1. **Nutze `manage_todo_list`** für jeden Stream — markiere Tasks einzeln als completed
2. **Nutze `runSubagent`** für parallele Arbeit wo möglich:
   - Sub-Agent 1: i18n Keys in alle 10 Locale-Dateien
   - Sub-Agent 2: Prisma Schema + Seed Script
   - Sub-Agent 3: Server Routes
3. **Nach jedem Stream:** `tsc -b` ausführen, 0 Errors sicherstellen
4. **Nach jedem Stream:** Git commit mit aussagekräftiger Message
5. **Format:** `feat(stream-N): <beschreibung>` für Commits

## Reihenfolge

```
1. Stream 1 (Backend Infra) — ZUERST, alle anderen hängen davon ab
2. Stream 2 (Seeds) — direkt nach Stream 1
3. Stream 6 (Kiosk) + Stream 7 (Voice) + Stream 8 (Chatbot) — PARALLEL möglich
4. Stream 3 (Admin) — nach Stream 2 (braucht Seed-Daten)
5. Stream 4 (MFA) + Stream 5 (Arzt) — nach Stream 3
6. Stream 9 (Game) — zuletzt
7. i18n Updates — mit jedem Stream mitlaufen
```

## Endkriterien

- [ ] `tsc -b` = 0 Errors
- [ ] `npm run build` erfolgreich
- [ ] Alle 10 Locale-Dateien haben alle neuen Keys
- [ ] Docker Compose config validiert
- [ ] Seed Script erstellt 50+ Patienten
- [ ] Admin Dashboard zeigt Live-Daten
- [ ] HomeScreen mit 4 Kacheln
- [ ] Voice TTS liest Fragen vor
- [ ] Chatbot erkennt Typos via Fuzzy Match
- [ ] Gamified Anamnese als 11. Service-Karte
- [ ] Git: Alle Änderungen committed und gepusht
