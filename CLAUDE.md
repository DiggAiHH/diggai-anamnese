# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Identity

| Field | Value |
|---|---|
| **Product** | DiggAI Anamnese Platform |
| **Version** | 3.0.0 |
| **Live URL** | https://diggai.de (Vercel — pending DNS) \| API: https://api.diggai.de |
| **Purpose** | Administrative Praxis-Anmelde- und Routing-Plattform für deutsche Arztpraxen — **kein Medizinprodukt** im Sinne der MDR Art. 2(1) (siehe `docs/INTENDED_USE.md` + `docs/REGULATORY_POSITION.md`) |
| **Stack** | React 19 + TypeScript 5.9 + Vite 8 + Express 5 + Prisma 6 + PostgreSQL 16 |
| **Compliance** | DSGVO, HIPAA-style audit logging, BSI TR-03161 (Best-Practice), eIDAS. **NICHT MDR/MPDG** (administrative Software, kein Medizinprodukt) |
| **Architecture** | DiggAI Service 4 of 4 (Python Agent Core / Tauri Desktop / Monorepo / **this**) |

**SCOPE: Work EXCLUSIVELY in this repository root. Do NOT touch sibling folders.**

> **REGULATORY GUARD (Pflicht für alle Agenten):** DiggAi ist als „Kein Medizinprodukt" deklariert. **Niemals** Patient-facing-Strings hinzufügen, die Diagnose-Aussagen, Verdachts-Hypothesen, Risiko-Bewertungen oder Notfall-Erkennungs-Sprache enthalten. Verbotene Wörter im Patient-Output: *Diagnose, Verdacht, hindeuten, Notfall-Erkennung, Risiko, lebensrettend, Triage, Krankheit, Therapie, Behandlung*. Erlaubt: workflow-orientierte Sprache wie „Bitte sprechen Sie das Praxispersonal an". Vor Änderungen an `server/engine/TriageEngine.ts` (zu refactorisieren in `RoutingEngine`), an LLM-Prompts oder an Marketing-Texten zwingend `docs/REGULATORY_STRATEGY.md` lesen + Eintrag in `docs/CHANGE_LOG_REGULATORY.md` ergänzen.

---

## Build & Dev Commands

All commands run from this repository root:

```bash
# Development
npm run dev              # Vite dev server :5173 + proxy to :3001
npm run dev:server       # Express backend only (tsx watch)
npm run dev:all          # Both frontend + backend concurrently

# Build & Type Check
npm run build            # tsc -b (app + node configs) && vite build
npm run type-check       # tsc --noEmit for app, node, and server configs
npm run check-all        # type-check + lint + i18n check + prisma migrate status
npm run lint             # ESLint (frontend src/ only — server/ is excluded)

# Unit / Integration Tests (Vitest)
npm test                          # vitest (watch mode)
npm run test:run                  # vitest run (single pass)
npm run test:unit                 # frontend src/ only
npm run test:server               # server tests only (node env, vitest.server.config.ts)
npm run test:server:services      # server/services subset
npm run test:server:middleware    # server/middleware subset
npm run test:coverage             # vitest with v8 coverage report
npm run test:changed              # only files changed since last commit

# E2E Tests (Playwright — Chromium + Mobile Chrome)
npm run test:e2e                             # Full suite
npx playwright test e2e/anamnese.spec.ts     # Single spec
npx playwright test --ui                     # Interactive runner

# Python E2E Tests (pytest + Playwright — D: drive only)
# Requires: D:\Python312\python.exe, PLAYWRIGHT_BROWSERS_PATH=D:\playwright-browsers
# Requires: Vite dev server running on localhost:5173 (npm run dev)
tests_py\run_tests.bat               # Run all Python E2E tests (headed)
tests_py\run_tests.bat -k test_01    # Run only UI tests
tests_py\run_tests.bat -m encryption # Run only encryption marker
tests_py\run_tests.bat --html=report.html  # Generate HTML report

# Load Tests (k6 — requires k6 installed)
npm run test:load         # all k6 load tests
npm run test:load:api     # API endpoints
npm run test:load:websocket  # Socket.IO under load

# Database (Prisma)
npx prisma migrate dev --name <name>   # Create + apply migration
npx prisma generate                    # Regenerate client after schema change
npx prisma db seed                     # Seed 270+ questions + admin user
npm run db:seed:full                   # Comprehensive seed (50+ patients)
npm run db:seed:demo                   # Demo seed data
npx prisma studio                      # Visual DB browser GUI

# Local Infrastructure
npm run docker:up      # docker compose up -d --build (app + PostgreSQL + Redis)
npm run docker:down    # docker compose down
npm run docker:logs    # follow app container logs
npm run monitoring:up  # Prometheus + Grafana monitoring stack

# i18n
node scripts/generate-i18n.ts          # Detect missing translation keys
node compare-translations.cjs          # Compare all 10 language files

# Cross-session memory (Claude-Mem)
npm run mem:install:all                # Claude Code + Codex CLI + Copilot CLI
npm run mem:install:all:gemini         # Same install targets, Gemini provider
npm run mem:install:all:openrouter     # Same install targets, OpenRouter provider

# Deployment
npm run preflight        # Pre-deploy checks
npm run deploy           # Guided deployment script
npm run preview          # Preview production build locally
```

---

## Architecture Overview

### Frontend (`src/`)

React 19 SPA with lazy-loaded pages via React Router v7. State split between Zustand (client state in `src/store/`) and TanStack React Query (server state in `src/hooks/useApi.ts`). Axios HTTP client with JWT interceptor at `src/api/client.ts`. Offline support via Dexie/IndexedDB at `src/lib/offlineDb.ts`. Realtime updates via Socket.IO client at `src/lib/socketClient.ts`. i18next for 10 languages configured in `src/i18n.ts`. Manual service worker (not VitePWA plugin — see comment in `vite.config.ts`).

Key pages: `Questionnaire.tsx` (patient intake), `ArztDashboard.tsx` (doctor), `MFADashboard.tsx` (medical assistant), `AdminDashboard.tsx`, plus sub-directories for `pwa/`, `telemedizin/`, `kiosk/`, `epa/`, `flows/`, `forms/`, `nfc/`.

### Backend (`server/`)

Express 5 with extensive security middleware stack (Helmet, CORS, rate limiting, CSRF double-submit cookie, input sanitization, HIPAA audit logging). Multi-tenant via subdomain resolution (`server/middleware/tenant.ts`).

**35+ route modules** mounted at `/api/*` in `server/index.ts`. Each route file follows the pattern: Zod validation + auth middleware + business logic + audit logging.

**Engines** (`server/engine/`): `TriageEngine.ts` (10 medical safety rules) and `QuestionFlowEngine.ts` (three-tier routing: followUpQuestions -> conditional -> static next).

**Background jobs** started on boot (all in `server/jobs/`): cleanup, ROI snapshots, medication reminders, hard-delete worker, agent orchestrator, backup scheduler/monitor, escalation worker, compliance reporter, queue auto-dispatch, billing reconciler. Each has graceful shutdown on SIGTERM.

### AI / LLM System

Runtime-configurable via `SystemSetting` DB table (key `llm_provider`): `ollama` (default, local), `openai` (API key required), or `none` (rule-based fallback). Abstraction at `server/services/ai/llm-client.ts`. Prompt templates at `server/services/ai/prompt-templates.ts`.

### Agent System

5 agents (orchestrator, empfang, triage, dokumentation, abrechnung) dispatched via `server/services/agent/agent.service.ts`. Task queue at `server/services/agent/task.queue.ts` is **in-memory only** — tasks are lost on restart. RabbitMQ is optional (graceful degradation to HTTP-only). Agent Core (Service 1) URL via `AGENT_CORE_URL` env var.

### TypeScript Config

Three project references in `tsconfig.json`: `tsconfig.app.json` (frontend, `src/`), `tsconfig.node.json` (Vite/build tooling), `tsconfig.server.json` (backend, `server/` + `prisma/`). All strict mode. ESLint config excludes `server/` — server TypeScript is checked via `tsc -p tsconfig.server.json` only.

### Test Config

- `vitest.config.ts` — jsdom env, includes both `src/**/*.test.*` and `server/**/*.test.ts`
- `vitest.server.config.ts` — node env, server tests only, 80% coverage thresholds (statements/functions/lines), 70% branches
- `playwright.config.ts` — Chromium + Mobile Chrome, locale `de-DE`, auto-starts `npm run dev`

---

## Critical Files

| Purpose | File |
|---|---|
| All API hooks (1500+ lines) | `src/hooks/useApi.ts` |
| All medical questions (1246 lines) | `src/data/questions.ts` |
| Question type definitions | `src/types/question.ts` |
| PII encryption (AES-256-GCM) | `server/services/encryption.ts` |
| JWT auth + RBAC middleware | `server/middleware/auth.ts` |
| Triage engine (10 rules) | `server/engine/TriageEngine.ts` |
| Question flow routing | `server/engine/QuestionFlowEngine.ts` |
| Database schema | `prisma/schema.prisma` |
| Express entry + all route mounts | `server/index.ts` |
| Input sanitization | `server/services/sanitize.ts` |
| CSRF middleware | `server/middleware/csrf.ts` |

---

## Security Rules (Non-Negotiable)

Medical application — violations cause DSGVO fines or patient harm.

1. **NEVER log** patient names, emails, birthdates, diagnoses, or health data — use patient/session IDs only.
2. **ALWAYS use** `server/services/encryption.ts` (AES-256-GCM) for any PII field in the database.
3. **ALWAYS use** HttpOnly cookies for JWT — never localStorage/sessionStorage.
4. **ALWAYS sanitize** inputs through `server/services/sanitize.ts` before any DB write.
5. **NEVER bypass** `server/middleware/auth.ts` for routes accessing patient data.
6. **Hash patient email** with SHA-256 (via encryption.ts) before storing — no plaintext email.

---

## Database Rules

1. Always run `npx prisma migrate dev --name <name>` after any schema change — migrations are irreversible in production.
2. Never use raw SQL — Prisma ORM only. No `$queryRaw` except in health checks.
3. Never modify existing migration files — create new migrations only.
4. Run `npx prisma generate` after any `schema.prisma` change.

---

## i18n Rules

- ALL user-facing strings: `t('key')` via i18next — no hardcoded strings in JSX.
- German (`de`) is source of truth.
- New keys must be added to ALL 10 files: `public/locales/{de,en,tr,ar,uk,es,fa,it,fr,pl}/translation.json`
- RTL languages: `ar` (Arabic) and `fa` (Farsi) — test layout after UI changes.
- Run `node scripts/generate-i18n.ts` before committing to verify zero missing keys.

---

## Medical Data Rules

- All triage logic MUST go through `server/engine/TriageEngine.ts` — no inline triage checks in routes.
- All question routing MUST use `server/engine/QuestionFlowEngine.ts`.
- Question IDs are canonical routing keys — never renumber or delete existing IDs.
- TriageEngine changes require clinical sign-off (Dr. Klapproth / Dr. Al-Shdaifat) before deployment.
- 10 triage rules: 4 CRITICAL (ACS, Suizidalitaet, SAH, Syncope) + 6 WARNING. See `docs/TRIAGE_RULES.md`.

---

## Fragile Areas

| File | Risk |
|---|---|
| `src/hooks/useApi.ts` | 1500+ lines, all API hooks. Read fully before editing — changing one hook can break unrelated features. |
| `src/data/questions.ts` | 1246 lines. Adding questions is safe; renumbering/deleting BREAKS the flow engine. |
| `server/engine/QuestionFlowEngine.ts` | Three-tier implicit routing logic. Read carefully, document changes. |
| `server/engine/TriageEngine.ts` | Medical safety rules. Changes can cause missed CRITICAL alerts. Requires clinical sign-off. |
| `prisma/schema.prisma` | Any change requires migrate + restart. Irreversible in production. |
| `server/index.ts` | 470 lines, all middleware ordering + route mounts + job startup. Middleware order is security-critical. |

---

## Forbidden Actions

- DO NOT log patient health data, names, or emails.
- DO NOT hardcode secrets — use `.env`.
- DO NOT `git push --force` to `main`.
- DO NOT skip Prisma migrations after schema changes.
- DO NOT add i18n strings without updating all 10 language files.
- DO NOT modify TriageEngine without clinical review.
- DO NOT add triage logic outside TriageEngine.
- DO NOT commit `dist/`, `.env`, `anamnese.db`, `*.log`, or `build_*.txt`.
- **DO NOT add diagnostic, prognostic, or risk-assessment language to ANY patient-facing string** (UI, alerts, LLM outputs, marketing, AGB, App-Store-Beschreibungen). This would push DiggAi into MDR Class IIa/IIb. See `docs/REGULATORY_STRATEGY.md` §9.1 for verbots-wortliste.
- **DO NOT publish marketing material with phrases like "rettet Leben", "Notfall-Erkennung", "Herzinfarkt-Verdacht", "klinische Entscheidungsunterstützung", "KI-Triage"** — alle vor Veröffentlichung gegen `docs/INTENDED_USE.md` prüfen.

---

## Environment Variables

### Required

```bash
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
JWT_SECRET="minimum-32-character-random-string"
ENCRYPTION_KEY="exactly-32-characters-for-aes256!!"
ARZT_PASSWORD="staff-seed-password"   # default staff password used by prisma/seed.ts
```

### Frontend

```bash
VITE_API_URL="https://your-backend.example.com/api"
FRONTEND_URL="https://your-frontend.example.com"
```

### Optional

```bash
REDIS_URL="redis://localhost:6379"
LLM_ENDPOINT="http://localhost:11434"          # Ollama
OPENAI_API_KEY="sk-..."                        # OpenAI-compatible
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS  # Email
VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY            # Web Push
AGENT_CORE_URL="http://localhost:8000"          # Python Agent Core
```

### Feature Flags

```bash
NFC_ENABLED="true"       # NFC reader check-in
PAYMENT_ENABLED="true"   # Payment processing
TELEMED_ENABLED="true"   # Video consultation
TI_ENABLED="false"       # Gematik TI (requires dedicated Docker profile)
```

---

## Pre-commit Hooks

Husky runs `lint-staged` on every commit:

- `src/**/*.{ts,tsx}` → ESLint `--fix`
- `public/locales/**/*.json` → JSON parse validation

Commits will fail if ESLint finds unfixable errors. Fix before committing, not after.

---

## File Naming Conventions

- **Components**: PascalCase (`SignaturePad.tsx`, `PatternLock.tsx`)
- **Utilities / services**: camelCase (`patternAuth.ts`, `signatureService.ts`)
- **Server routes**: camelCase (`signatures.ts`, `patients.ts`)
- **E2E tests**: `*.spec.ts` in `e2e/`
- **Zustand stores**: `*Store.ts` in `src/store/`

---

## Code Patterns

### New API endpoint (server)

```typescript
// server/routes/<domain>.ts
router.get('/resource', requireAuth, requireRole('arzt'), async (req, res) => {
  const { id } = req.params; // audit logger middleware handles logging
  const data = await prisma.model.findUnique({ where: { id } });
  res.json(data);
});
```

### New React Query hook (frontend)

```typescript
// src/hooks/useApi.ts — add to the relevant section
export function useResource(id: string) {
  return useQuery({
    queryKey: ['resource', id],
    queryFn: () => api.get(`/resource/${id}`).then(r => r.data),
    enabled: !!id,
  });
}
```

### Encrypted Zustand store (for PII/patient context)

```typescript
export const useSecureStore = create<SecureState>()(
  persist(
    (set) => ({ ... }),
    { name: 'diggai-secure-store', storage: encryptedStorage },
  ),
);
```

### Socket.IO event contracts

```typescript
// Always type events explicitly — no stringly-typed ad-hoc events
interface ServerToClientEvents {
  triageAlert: (payload: TriageAlertPayload) => void;
  queueUpdated: (payload: QueueSnapshot) => void;
}
```

---

## Phase 11 Key Files

| File | Purpose |
| --- | --- |
| `src/components/inputs/PatternLock.tsx` | 4×4 dot-grid security pattern (Canvas, touch+mouse+keyboard) |
| `src/components/inputs/PatientIdentify.tsx` | Returning-patient identification form |
| `src/components/CertificationModal.tsx` | MFA 4-step patient certification flow |
| `src/utils/patternAuth.ts` | SHA-256 pattern hashing + complexity validation |
| `server/routes/patients.ts` | 5 endpoints: identify, verify-pattern, set-pattern, certify, get |
| `src/design/tokens.ts` | Central design tokens (spacing, radii, shadows, z-index) |
| `src/components/ui/` | Shared UI primitives: Button, Card, Input, Modal, Badge, Spinner |
| `e2e/helpers/test-utils.ts` | Playwright shared helpers |

---

## Netlify Deployment

```bash
npm run deploy          # Guided production deploy (builds if dist/ missing)
npm run deploy:preview  # Preview deploy
```

- Site ID: `4e24807c-6ea8-482e-8bef-6c688f7172bb` (canonical, per `netlify.toml`)
- Script: `scripts/deploy-guided.mjs` — uses `NETLIFY_AUTH_TOKEN`, falls back to `npx netlify login`
- NEVER store Netlify passwords in repo files. See [`DEPLOY.md`](./DEPLOY.md) (also at workspace root) for the canonical deploy doc.

---

## Quick Reference: Adding Features

**New API endpoint:** Create `server/routes/<domain>.ts` -> add auth + audit + Zod validation -> register in `server/index.ts` -> add React Query hook in `src/hooks/useApi.ts` -> `npm run build` + `npx playwright test`.

**New medical question:** Check `docs/QUESTION_CATALOG.md` for next ID -> add `QuestionAtom` to `src/data/questions.ts` -> add conditional routing -> add to all 10 locale files -> `node scripts/generate-i18n.ts` -> build + test.

**Schema change:** Edit `prisma/schema.prisma` -> `npx prisma migrate dev --name <name>` -> `npx prisma generate` -> update `server/types/` -> `npm run build`.

---

## No-Redundancy Protocol

This workspace uses a multi-agent Once-Guard system. See the workspace-root `CLAUDE.md` for the full protocol. Before creating any file, feature, or service:

```powershell
node scripts/once-guard.mjs precheck --task "<task-key>"
# Exit 0 = free | Exit 2 = in_progress (STOP) | Exit 3 = completed (read artifacts)

# Windows wrapper (same workflow, same storage)
scripts\once-guard.cmd precheck --task "<task-key>"
```

Registry: `shared/knowledge/task-registry.json` | Knowledge: `shared/knowledge/knowledge-share.md` | Checkpoints: `shared/knowledge/checkpoints/`

Claude-Mem cross-session bootstrap: run `npm run mem:install:all` once per machine so persistent memory is available to Claude and non-Claude CLI sessions.

## Welcome-Back Protocol

Long tasks must be split into small packs and checkpointed so work survives editor crashes or context resets.

Rules:

- One pack = one user-visible outcome.
- Target <= 3 edited files or <= 30 minutes before writing a checkpoint.
- Always checkpoint after validation, before risky refactors, and before leaving an unfinished task.

Checkpoint command:

```powershell
node scripts/once-guard.mjs checkpoint --task "<task-key>" --agent "copilot" --session "<YYYY-MM-DD-topic>" --batch <n> --summary "What is true right now" --done "finished item" --next "next item" --artifacts "relative/path.ts"
```

Resume command:

```powershell
node scripts/once-guard.mjs status --task "<task-key>"
```

Checkpoints are stored in `shared/knowledge/checkpoints/<task-key>.md`.

## graphify

This project uses a graphify knowledge graph in graphify-out/.

Rules:
- At session start, if graphify-out/GRAPH_REPORT.md exists, read it before broad file search.
- Query-first navigation for architecture questions: graphify query "<question>", graphify path "<A>" "<B>", graphify explain "<concept>".
- Do not trigger full re-extraction blindly. For code-only changes run graphify update . (AST-only, no API cost).
- For non-code changes (docs/images/pdfs), run /graphify --update in the assistant to refresh semantic nodes.
- After substantial changes, verify graphify-out/graph.json exists and is current.
- Privacy note: AST extraction is local; semantic extraction for non-code content can use the assistant model API.


---

## Definition of Done — Memory Discipline (REQUIRED for every prompt)

A prompt with an observable outcome (commit, file change, PR, deployment, decision) is NOT done until you append a 5-line run-log entry at:

```
Ananmese/diggai-anamnese-master/memory/runs/YYYY-MM-DD_<agent>_<model>-<run>.md
```

**Naming rules.**
- `<agent>` = lowercase short name. Established: `claude-code`, `copilot`, `codex`, `kimi`, `gemini`, `cursor`. Pick one and reuse it.
- `<model>` = short tag. Examples: `opus-4-7`, `sonnet-4-6`, `gpt-5`, `gemini-2-5`, `kimi-k2`.
- `<run>` = monotonic counter for that (agent, model) pair on this calendar day. `01`, `02`, …

**Format (matches existing Kimi pattern in `memory/runs/`):**

```markdown
YYYY-MM-DDTHH:MM+02:00 | Lauf <agent>-<run> | <one-line topic>
---
- Aktion: <what you did, concrete>
- Blocker: <what tripped you, or "—">
- Fix: <how you got past it, or "—">
- Ergebnis: <observable outcome — commit hash, PR #, file path>
- Out: <verified state — "tests green", "PR #N open", "blocked on F1-F8", …>
```

**Why this is non-negotiable.** Agents lose context between sessions but the run-log persists. The next agent reads the last 3 entries and knows what was tried, what works on this machine, and what is still open. Without this log the engineering-harness advantage is forfeited and the next agent re-discovers the same footguns.

See workspace-root [`AGENT_PREFLIGHT_PROTOCOL.md`](../AGENT_PREFLIGHT_PROTOCOL.md) §10 for the full preflight context (boot checklist, tool decision tree, machine footguns, append-log).
