# CLAUDE.md — Developer Instructions for DiggAI Anamnese Platform

> This file is the authoritative developer reference for AI agents and human developers.
> It supersedes all previous planning notes. Last updated: 2026-03-07.

---

## 2a. PROJECT IDENTITY

| Field | Value |
|---|---|
| **Product** | DiggAI Anamnese Platform |
| **Version** | 3.0.0 |
| **Live URL** | https://diggai-drklaproth.netlify.app |
| **Purpose** | DSGVO-compliant digital patient intake for German medical practices (Arztpraxis) |
| **Stack** | React 19 + TypeScript 5.9 + Vite 8 + Express 5 + Prisma 6 + PostgreSQL 16 |
| **Compliance** | DSGVO, HIPAA audit logging, BSI TR-03161, gematik TI/ePA, eIDAS |
| **Architecture** | Part of DiggAI Service 4 (4-service distributed system) |
| **Contacts** | Dr. Klapproth / Dr. Al-Shdaifat (clinical review), DiggAI GmbH (technical) |

**DiggAI 4-Service Architecture:**
- Service 1: Python Agent Core (`diggai-agent-core/`) — in progress
- Service 2: Tauri Desktop App (`diggai-desktop/`) — pending
- Service 3: Monorepo (`diggai-monorepo/`) — pending
- Service 4: **This project** (`Anamnese-kimi/anamnese-app/`) — production

**SCOPE: Work EXCLUSIVELY in `anamnese-app/`. Do NOT touch sibling folders.**

---

## 2b. DEV COMMANDS

All commands must be run from `anamnese-app/`:

```bash
# Development
npm run dev                                        # Vite dev server :5173 + proxy to :3001
npm run build                                      # tsc -b && vite build (frontend + server types)
npm run lint                                       # ESLint check

# Database
npx prisma studio                                  # Visual DB browser GUI
npx prisma migrate dev --name <descriptive-name>   # Run AFTER schema changes (always)
npx prisma generate                                # Regenerate Prisma client after schema changes
npx prisma db seed                                 # Seed 270+ questions + admin user

# Local infrastructure
docker-compose -f docker-compose.local.yml up -d   # Start PostgreSQL 16 + Redis 7 locally
docker-compose -f docker-compose.local.yml down    # Stop local infra

# Testing
npx playwright test                                # Full E2E suite (22 specs)
npx playwright test e2e/anamnese.spec.ts           # Single spec
npx playwright test --ui                           # Interactive test runner

# i18n
node scripts/generate-i18n.ts                      # Detect missing translation keys
node compare-translations.cjs                      # Compare all 10 language files

# Preview
npm run preview                                    # Preview production build locally
```

---

## 2c. ARCHITECTURE OVERVIEW

### Frontend (`src/`)

| Layer | Technology | Location |
|---|---|---|
| Framework | React 19.2 + TypeScript 5.9 strict | `src/` |
| Routing | React Router v7 (lazy-loaded pages) | `src/App.tsx` |
| Global State | Zustand 5 (persisted stores) | `src/store/` |
| Server State | TanStack React Query 5 | `src/hooks/useApi.ts` |
| HTTP Client | Axios 1.13 + JWT interceptor | `src/api/client.ts` |
| Realtime | Socket.IO 4 client | `src/lib/socketClient.ts` |
| Offline DB | Dexie 4 (IndexedDB) | `src/lib/offlineDb.ts` |
| i18n | i18next 25 + react-i18next | `src/i18n.ts` |
| Build | Vite 8-beta + Tailwind CSS 4 | `vite.config.ts` |

### Backend (`server/`)

| Layer | Technology | Location |
|---|---|---|
| Framework | Express 5.2 | `server/index.ts` |
| ORM | Prisma 6.19 | `prisma/schema.prisma` |
| Auth | JWT HS256 + HttpOnly cookies + RBAC | `server/middleware/auth.ts` |
| Realtime | Socket.IO 4 server | `server/socket.ts` |
| Cache | Redis via ioredis (optional) | `server/redis.ts` |
| Encryption | AES-256-GCM (all PII fields) | `server/services/encryption.ts` |
| Security | Helmet 8 + rate limiting + CORS | `server/index.ts` |
| Audit | HIPAA-compliant middleware | `server/middleware/audit.ts` |
| Config | Centralized env loader | `server/config.ts` |

### AI / LLM System

The LLM provider is **runtime-configurable** via the `SystemSetting` database table.
No code changes needed to switch providers.

| Provider | Config Key | Notes |
|---|---|---|
| Ollama (local) | `ollama` | Default. Self-hosted. Docker profile `llm`. |
| OpenAI-compatible | `openai` | Requires `OPENAI_API_KEY` env var. |
| None (rule-based) | `none` | Fallback — no LLM required. |

To switch: `UPDATE "SystemSetting" SET value='openai' WHERE key='llm_provider';`

LLM client abstraction: `server/services/ai/llm-client.ts`
Prompt templates: `server/services/ai/prompt-templates.ts` (4 templates: SYSTEM_MEDICAL, THERAPY_SUGGEST, SESSION_SUMMARY, ICD_SUGGEST)

### DiggAI Agent System

- Entry route: `server/routes/agents.ts`
- Dispatch: `server/services/agent/agent.service.ts`
- Task queue: `server/services/agent/task.queue.ts` (**currently in-memory — tasks lost on restart**)
- 5 agents: orchestrator, empfang, triage, dokumentation, abrechnung
- Agent Core (Service 1) communication: `server/services/agentcore.client.ts`
- RabbitMQ: optional — app degrades gracefully without it

---

## 2d. CRITICAL FILES

| Purpose | File |
|---|---|
| Frontend entry | `src/main.tsx` |
| Router + all providers | `src/App.tsx` |
| All API hooks (1500+ lines) | `src/hooks/useApi.ts` |
| All medical questions (1246 lines) | `src/data/questions.ts` |
| Question type definitions | `src/types/question.ts` |
| PII encryption service | `server/services/encryption.ts` |
| JWT auth + RBAC middleware | `server/middleware/auth.ts` |
| Triage engine (10 rules) | `server/engine/TriageEngine.ts` |
| Question flow routing | `server/engine/QuestionFlowEngine.ts` |
| Database schema | `prisma/schema.prisma` |
| Express entry point | `server/index.ts` |
| Socket.IO server | `server/socket.ts` |
| LLM provider abstraction | `server/services/ai/llm-client.ts` |
| Agent task queue | `server/services/agent/task.queue.ts` |

---

## 2e. SECURITY RULES (NON-NEGOTIABLE)

These rules are MEDICAL APPLICATION requirements. Violations may cause DSGVO fines or patient harm.

1. **NEVER log** patient names, emails, birthdates, diagnoses, or any health data — use patient IDs or session IDs only in logs.
2. **ALWAYS use** `server/services/encryption.ts` (AES-256-GCM) for any PII field stored in the database.
3. **ALWAYS use** HttpOnly cookies for JWT auth tokens — **never** store tokens in localStorage or sessionStorage.
4. **ALWAYS sanitize** user inputs through `server/services/sanitize.ts` before any database write.
5. **NEVER bypass** `server/middleware/auth.ts` for any route that accesses patient data.
6. **Hash patient email** with SHA-256 (via encryption.ts) before storing — never store plaintext email in any table.

---

## 2f. DATABASE RULES

1. **Always run** `npx prisma migrate dev --name <descriptive-name>` after any schema change.
2. **Never use raw SQL** — Prisma ORM only. No `$queryRaw` except in health checks.
3. **Never modify** existing migration files — create new migrations only.
4. **Run** `npx prisma generate` after any change to `prisma/schema.prisma`.

---

## 2g. i18n RULES

- **ALL** user-facing strings must use i18next: `t('key')` — never hardcoded strings in JSX.
- **German (`de`) is the source of truth** for all translation keys.
- When adding a new key: add it to **ALL 10 language files**:
  `public/locales/{de,en,tr,ar,uk,es,fa,it,fr,pl}/translation.json`
- Use `node scripts/generate-i18n.ts` to detect missing keys before committing.
- **RTL languages**: `ar` (Arabic) and `fa` (Farsi) — test layout after any UI change. Apply `dir="rtl"` to the HTML root when these are active.
- 10 languages: DE, EN, TR, AR, UK, ES, FA, IT, FR, PL

---

## 2h. MEDICAL DATA RULES

- **All triage logic** MUST go through `server/engine/TriageEngine.ts` — never add inline triage checks in route files.
- **All question routing** MUST use `server/engine/QuestionFlowEngine.ts`.
- **Question IDs are canonical** — they are routing keys throughout the system. Never renumber or delete existing question IDs.
- **TriageEngine changes require clinical review** — any modification must be approved by Dr. Klapproth or Dr. Al-Shdaifat before deployment.
- **10 triage rules** — 4 CRITICAL (ACS, Suizidalität, SAH, Syncope) + 6 WARNING. See `docs/TRIAGE_RULES.md`.
- **270+ medical questions** across 13 specialty modules. See `docs/QUESTION_CATALOG.md` before modifying `src/data/questions.ts`.

---

## 2i. AGENT SYSTEM RULES

- Entry point: `POST /api/agents/task` → `server/routes/agents.ts`
- Task dispatch: `server/services/agent/agent.service.ts`
- Task queue: `server/services/agent/task.queue.ts`
  - **WARNING**: Currently in-memory. Tasks are LOST on server restart.
  - Future: migrate to Redis-backed queue.
- LLM provider: controlled via `SystemSetting` DB table, key `llm_provider`.
- RabbitMQ is OPTIONAL — the app works without it (HTTP-only agent mode).
- Agent Core (Service 1) URL: configured via `AGENT_CORE_URL` env var.

---

## 2j. FRAGILE AREAS — READ BEFORE MODIFYING

| File | Risk |
|---|---|
| `src/hooks/useApi.ts` | 1500+ lines. All API hooks are here. Modifying one hook can break unrelated features. Read the full file before editing. |
| `src/data/questions.ts` | 1246 lines. Question IDs are canonical routing keys. Adding is safe; renumbering or deleting BREAKS the question flow engine. |
| `server/engine/QuestionFlowEngine.ts` | Complex three-tier routing logic (followUpQuestions → conditional → static next). Logic is implicit — read carefully, document changes. |
| `server/engine/TriageEngine.ts` | Medical safety rules. Changes can cause missed CRITICAL alerts. Requires clinical sign-off before deployment. |
| `prisma/schema.prisma` | Any change requires `npx prisma migrate dev` + app restart. Migrations are irreversible in production. |

---

## 2k. FORBIDDEN ACTIONS

- **DO NOT** log patient health data, names, or emails anywhere.
- **DO NOT** hardcode credentials, API keys, or secrets — always use `.env`.
- **DO NOT** `git push --force` to the `main` branch.
- **DO NOT** skip Prisma migrations after schema changes.
- **DO NOT** add new i18n strings without updating all 10 language files.
- **DO NOT** modify `TriageEngine.ts` without clinical review and sign-off.
- **DO NOT** add triage logic outside `TriageEngine.ts`.
- **DO NOT** access any sibling project (`dr-aroob-ki`, `diggai-monorepo`, `diggai-desktop`) from this codebase.
- **DO NOT** commit `dist/`, `.env`, `anamnese.db`, `*.log`, or `build_*.txt`.

---

## 2l. ENVIRONMENT VARIABLES REFERENCE

### Required (app will not start without these)

```bash
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
JWT_SECRET="minimum-32-character-random-string"
ENCRYPTION_KEY="exactly-32-characters-for-aes256!!"
```

### Frontend (Vite)

```bash
VITE_API_URL="https://your-backend.example.com/api"
FRONTEND_URL="https://your-frontend.example.com"
```

### Auth

```bash
ARZT_PASSWORD="initial-doctor-account-password"
```

### Optional — Redis

```bash
REDIS_URL="redis://localhost:6379"
```

### Optional — LLM

```bash
LLM_ENDPOINT="http://localhost:11434"   # Ollama local instance
OPENAI_API_KEY="sk-..."                 # OpenAI-compatible endpoint
```

### Optional — Email (nodemailer)

```bash
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="noreply@example.com"
SMTP_PASS="smtp-password"
```

### Optional — Push Notifications (web-push / VAPID)

```bash
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
```

### Feature Flags

```bash
NFC_ENABLED="true"         # NFC reader check-in
PAYMENT_ENABLED="true"     # Payment processing
TELEMED_ENABLED="true"     # Video consultation
TI_ENABLED="false"         # Gematik TI (requires dedicated Docker profile)
```

### Deployment

```bash
NETLIFY_SITE_ID="..."
NETLIFY_AUTH_TOKEN="..."
NODE_ENV="production"
PORT="3001"
```

---

## Quick Reference: Adding a New Feature

### New API endpoint

1. Create `server/routes/<domain>.ts` with route handlers
2. Add JWT auth middleware for all non-public routes
3. Add HIPAA audit log for any patient data access
4. Add Zod validation + input sanitization
5. Register in `server/index.ts` with `app.use('/api/<domain>', ...)`
6. Add React Query hook in `src/hooks/useApi.ts`
7. Run `npm run build` — must pass
8. Run `npx playwright test` — must pass

### New medical question

1. Check `docs/QUESTION_CATALOG.md` for next available question ID
2. Add `QuestionAtom` to `src/data/questions.ts`
3. Add conditional routing in `logic.conditional`
4. Add German text to `public/locales/de/translation.json`
5. Add to ALL 9 other language files
6. Run `node scripts/generate-i18n.ts` — zero missing keys
7. Run `npm run build` + `npx playwright test e2e/questionnaire-flow.spec.ts`

### Schema change

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <name>`
3. Run `npx prisma generate`
4. Update any affected TypeScript types in `server/types/`
5. Run `npm run build`

---

## NO-REDUNDANCY PROTOCOL (MANDATORY FOR ALL AGENTS)

This workspace uses a shared Once-Guard system. **Every agent, every session, every model MUST follow this protocol.**

### Goldene Regel: Alles darf nur einmal gemacht werden.

### Pre-Check BEFORE creating any file, feature, or service:

```powershell
# 1. Check if already done
powershell -ExecutionPolicy Bypass -File ../scripts/once-guard.ps1 precheck -Task "<task-key>"
# Exit 0 = free to proceed | Exit 2 = IN PROGRESS by another agent | Exit 3 = ALREADY DONE

# 2. Claim it (reserve before starting)
powershell -ExecutionPolicy Bypass -File ../scripts/once-guard.ps1 claim -Task "<task-key>" -Agent "claude" -SessionId "<date-topic>"

# 3. Read shared knowledge BEFORE working
# ../shared/knowledge/knowledge-share.md  (lessons learned, decisions, artifacts)
# ../shared/knowledge/task-registry.json  (all tasks: in_progress / completed)

# 4. Do the work.

# 5. Mark complete
powershell -ExecutionPolicy Bypass -File ../scripts/once-guard.ps1 complete -Task "<task-key>" -Agent "claude" -Artifacts @("path/to/artifact1","path/to/artifact2")
```

### Rules:
- Exit code 2 (IN_PROGRESS): Stop. Contact the claiming agent. Do NOT duplicate.
- Exit code 3 (COMPLETED): Stop. Read the artifacts. Extend if needed — never rebuild.
- Exit code 4 (ARTIFACT_EXISTS): File already exists. Extend, do not overwrite.
- If an artifact already exists on disk: treat it as DONE — read it first.

### Registry & Knowledge files:
- `../shared/knowledge/task-registry.json` — machine-readable registry
- `../shared/knowledge/knowledge-share.md` — human-readable lessons + decisions
- `../SESSIONS_ONCE_POLICY.md` — full policy document

### Brainstorm Flow (for new feature ideas):
- See `../AGENT_BRAINSTORM_FLOW.md` and `../scripts/agent-brainstorm.ps1`
- All 4 agents (claude, codex, copilot, cursor) contribute before implementation starts.

---

*This file is auto-updated by Claude Code agents. Do not mix planning content with developer instructions.*
