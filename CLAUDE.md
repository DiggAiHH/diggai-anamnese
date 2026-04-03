# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Identity

| Field | Value |
|---|---|
| **Product** | DiggAI Anamnese Platform |
| **Version** | 3.0.0 |
| **Live URL** | https://diggai-drklaproth.netlify.app |
| **Purpose** | DSGVO-compliant digital patient intake for German medical practices (Arztpraxis) |
| **Stack** | React 19 + TypeScript 5.9 + Vite 8 + Express 5 + Prisma 6 + PostgreSQL 16 |
| **Compliance** | DSGVO, HIPAA audit logging, BSI TR-03161, gematik TI/ePA, eIDAS |
| **Architecture** | DiggAI Service 4 of 4 (Python Agent Core / Tauri Desktop / Monorepo / **this**) |

**SCOPE: Work EXCLUSIVELY in `anamnese-app/`. Do NOT touch sibling folders.**

---

## Build & Dev Commands

All commands run from `anamnese-app/`:

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

- Site ID: `d4c9bba2-71cc-48a1-81a4-14cb9ac5cb90`
- Script: `scripts/deploy-guided.mjs` — uses `NETLIFY_AUTH_TOKEN`, falls back to `npx netlify login`
- NEVER store Netlify passwords in repo files.

---

## Quick Reference: Adding Features

**New API endpoint:** Create `server/routes/<domain>.ts` -> add auth + audit + Zod validation -> register in `server/index.ts` -> add React Query hook in `src/hooks/useApi.ts` -> `npm run build` + `npx playwright test`.

**New medical question:** Check `docs/QUESTION_CATALOG.md` for next ID -> add `QuestionAtom` to `src/data/questions.ts` -> add conditional routing -> add to all 10 locale files -> `node scripts/generate-i18n.ts` -> build + test.

**Schema change:** Edit `prisma/schema.prisma` -> `npx prisma migrate dev --name <name>` -> `npx prisma generate` -> update `server/types/` -> `npm run build`.

---

## No-Redundancy Protocol

This workspace uses a multi-agent Once-Guard system. See root `../CLAUDE.md` for the full protocol. Before creating any file, feature, or service:

```powershell
powershell -ExecutionPolicy Bypass -File ../scripts/once-guard.ps1 precheck -Task "<task-key>"
# Exit 0 = free | Exit 2 = in_progress (STOP) | Exit 3 = completed (read artifacts) | Exit 4 = file exists (read first)
```

Registry: `../shared/knowledge/task-registry.json` | Knowledge: `../shared/knowledge/knowledge-share.md`
