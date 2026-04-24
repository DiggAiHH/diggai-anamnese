# Repository Guidelines

DSGVO-compliant digital patient intake platform for German medical practices. React 19 + TypeScript 5.9 + Vite 8 + Express 5 + Prisma 6 + PostgreSQL 16. This is Service 4 of 4 in the DiggAI system. Work exclusively in this repository root.

---

## Project Structure & Module Organization

```
src/           React 19 SPA — Zustand client state, TanStack Query server state
server/        Express 5 backend — 35+ route modules, all mounted in server/index.ts
prisma/        Schema + migrations + seed scripts
e2e/           Playwright specs (Chromium + Mobile Chrome, locale de-DE)
tests_py/      Python/pytest E2E suite (requires D:\Python312\python.exe)
shared/        knowledge/task-registry.json + knowledge-share.md (Once-Guard registry)
public/locales/  {de,en,tr,ar,uk,es,fa,it,fr,pl}/translation.json — 10 language files
```

**Non-obvious architecture:**
- `src/hooks/useApi.ts` (1500+ lines) — every API hook lives here; read before touching.
- `src/data/questions.ts` (1246 lines) — question IDs are canonical routing keys; never renumber or delete.
- `server/index.ts` (470 lines) — middleware order is security-critical; do not reorder.
- In-memory agent task queue (`server/services/agent/task.queue.ts`) — tasks are lost on restart; RabbitMQ is optional.
- TypeScript uses three project references: `tsconfig.app.json` (frontend), `tsconfig.node.json` (Vite), `tsconfig.server.json` (server). ESLint covers `src/` only; server type-checking is via `tsc -p tsconfig.server.json`.

---

## Build, Test, and Development Commands

```bash
# Dev
npm run dev:all          # Frontend :5173 + backend :3001 concurrently
npm run dev              # Frontend only (Vite)
npm run dev:server       # Backend only (tsx watch)

# Build & type-check
npm run build            # tsc -b + vite build
npm run type-check       # noEmit check for all three tsconfig targets
npm run check-all        # type-check + lint + i18n check + prisma migrate status

# Unit / integration tests (Vitest)
npm run test:run                    # single-pass, all tests
npm run test:unit                   # src/ only (jsdom env)
npm run test:server                 # server/ only (node env, vitest.server.config.ts)
npm run test:server:services        # server/services subset
npm run test:changed                # only files changed since last commit
npm run test:coverage               # v8 coverage report

# E2E (Playwright)
npm run test:e2e                             # full suite
npx playwright test e2e/anamnese.spec.ts     # single spec
npx playwright test --ui                     # interactive runner

# Python E2E (requires Vite dev server running)
tests_py\run_tests.bat               # all Python E2E tests
tests_py\run_tests.bat -k test_01    # filter by name

# Database
npx prisma migrate dev --name <name>   # create + apply migration
npx prisma generate                    # regenerate client after schema change
npm run db:seed:demo                   # demo seed (32 patients, 10 users)

# i18n
node scripts/generate-i18n.ts          # detect missing translation keys (run before commit)

# Infra
npm run docker:up       # app + PostgreSQL + Redis
npm run monitoring:up   # Prometheus + Grafana
```

---

## Coding Style & Naming Conventions

- **TypeScript strict mode** throughout — no `any`.
- **Functional React components only**; Zustand + hooks for state, never class components.
- **Tailwind utility classes only** — no CSS modules or inline styles.
- **TanStack React Query** for all server state; add new hooks to `src/hooks/useApi.ts`.
- **Prisma ORM only** — no raw SQL, no `$queryRaw` except in health-check routes.
- **All user-facing strings** via `t('key')` (i18next) — no hardcoded German or other text in JSX.
- **File naming:** Components = PascalCase, utilities/services/routes = camelCase, Zustand stores = `*Store.ts`, E2E specs = `*.spec.ts`.
- **New API endpoints** must follow: `requireAuth` + `requireRole` + Zod validation + audit log entry.

---

## Testing Guidelines

Framework: **Vitest** (unit/integration) + **Playwright** (E2E).

Server coverage thresholds (`vitest.server.config.ts`): 80% statements/functions/lines, 70% branches.

Run only the affected slice during development (`npm run test:changed` or `npm run test:server:services`). Full E2E suite auto-starts the Vite dev server via `playwright.config.ts`.

---

## Security Rules (Non-Negotiable)

Medical application — violations cause DSGVO fines or patient harm.

1. **Never log** patient names, emails, birthdates, diagnoses — use IDs only.
2. **Always encrypt** PII fields using `server/services/encryption.ts` (AES-256-GCM); hash patient email with SHA-256 before storing.
3. **Always use HttpOnly cookies** for JWT — never localStorage/sessionStorage.
4. **Always sanitize** inputs through `server/services/sanitize.ts` before any DB write.
5. **Never bypass** `server/middleware/auth.ts` on patient-data routes.
6. **All triage logic** must go through `server/engine/TriageEngine.ts` — no inline checks in routes. Changes require clinical sign-off (Dr. Klapproth / Dr. Al-Shdaifat).
7. **No patient data** in URLs or query strings.

---

## i18n Rules

New UI strings must be added to **all 10 locale files** simultaneously:
`public/locales/{de,en,tr,ar,uk,es,fa,it,fr,pl}/translation.json`

German (`de`) is source of truth. Pre-commit hook runs `node scripts/generate-i18n.ts` and blocks the commit on any missing key. RTL languages (ar, fa) require layout testing after UI changes.

---

## Pre-commit Hooks

Husky runs on every commit:
1. `lint-staged` — ESLint `--fix` on staged `src/**/*.{ts,tsx}`; JSON parse validation on staged locale files.
2. `node scripts/generate-i18n.ts` — blocks commit if any translation key is missing across the 10 locales.

Fix ESLint errors and add missing i18n keys **before** committing, not after.

---

## Commit & Pull Request Guidelines

Conventional Commits with scope, derived from history:

```
feat(scope): add X
fix(scope): correct Y
refactor(scope): restructure Z
docs(scope): update W
chore(scope): bump / config / ci change
test(scope): add / fix tests
ci: pipeline change
```

Common scopes from history: `ui`, `auth`, `schema`, `i18n`, `build`, `deploy`, `summary`, `py`.

No force-push to `main`. No skipping Prisma migrations after schema changes.

---

## No-Redundancy Protocol (Once-Guard)

Before creating any file, feature, route, or component:

```powershell
node scripts/once-guard.mjs precheck --task "<task-key>"
# Exit 0 = free | Exit 2 = in_progress (STOP) | Exit 3 = completed (read artifacts)

node scripts/once-guard.mjs claim --task "<task-key>" --agent "<name>" --session "<YYYY-MM-DD-topic>"
# ... do the work ...
node scripts/once-guard.mjs complete --task "<task-key>" --agent "<name>" --artifacts "path/to/file.ts" --notes "summary"
```

Registry: `shared/knowledge/task-registry.json` — read before starting any task.
Knowledge base: `shared/knowledge/knowledge-share.md` — past decisions and lessons learned.

## graphify

This project uses a graphify knowledge graph in graphify-out/.

Rules:
- At session start, if graphify-out/GRAPH_REPORT.md exists, read it before broad file search.
- Query-first navigation for architecture questions: graphify query "<question>", graphify path "<A>" "<B>", graphify explain "<concept>".
- Do not trigger full re-extraction blindly. For code-only changes run graphify update . (AST-only, no API cost).
- For non-code changes (docs/images/pdfs), run /graphify --update in the assistant to refresh semantic nodes.
- After substantial changes, verify graphify-out/graph.json exists and is current.
- Privacy note: AST extraction is local; semantic extraction for non-code content can use the assistant model API.
