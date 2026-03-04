 # DiggAI Anamnese App — Claude Context

## What is this project?

DiggAI is a fully digital, DSGVO-compliant patient intake application (Anamnese) for German medical practices. It replaces paper-based medical history forms with an intelligent, multilingual, web-based system.

**Claim:** "Weniger Papier. Mehr Medizin." / "Digitale Patientenaufnahme. Made in Germany."

## Quick Facts

- **Live:** https://diggai-drklaproth.netlify.app
- **Repo:** DiggAiHH/diggai-anamnese (master branch)
- **10 languages** including RTL (Arabic, Farsi)
- **270+ medical questions** across 10 service flows
- **38+ React components**, 7 pages/dashboards
- **30+ API endpoints** with full auth, encryption, audit logging
- **10 AI triage rules** (4 CRITICAL, 6 WARNING)

## Architecture

```
Frontend (Netlify)          Backend (Docker on VPS)
─────────────────          ──────────────────────
React 19 + TS 5.9          Express 5 + Prisma 6
Vite 8 + Tailwind 4        PostgreSQL 16 + Redis
Zustand + React Query       Socket.IO 4
i18next (10 langs)          JWT HS256 + AES-256-GCM
```

## Project Structure

- `src/` — React frontend (components/, pages/, store/, api/, utils/)
- `server/` — Express backend (routes/, middleware/, services/)
- `prisma/` — Database schema + migrations + seeds
- `public/locales/` — 10 language JSON files
- `e2e/` — Playwright end-to-end tests
- `docker/` — Nginx config for production

## Key Files to Know

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | 13 Prisma models (PostgreSQL) |
| `server/index.ts` | Express app bootstrap, middleware chain |
| `server/config.ts` | Environment variable management (5 required) |
| `server/middleware/auth.ts` | JWT verification, token blacklist, role checks |
| `server/services/triage.ts` | Red flag detection engine |
| `server/services/encryption.ts` | AES-256-GCM for PII fields |
| `src/App.tsx` | React Router, QueryClient, lazy loading |
| `src/store/sessionStore.ts` | Zustand store (encrypted persistence) |
| `src/api/hooks.ts` | TanStack React Query hooks |
| `src/components/ChatBubble.tsx` | FAQ bot + team chat widget |
| `src/components/inputs/VoiceInput.tsx` | Web Speech API input |

## Coding Rules

1. **TypeScript strict** — no `any`, proper typing everywhere
2. **i18n mandatory** — use `useTranslation()` hook, never hardcode German text
3. **All 10 locales** — every new key goes in de, en, ar, tr, uk, es, fa, it, fr, pl
4. **Tailwind only** — no CSS modules, no styled-components
5. **React Query** for all API calls — `useQuery` / `useMutation`
6. **Zod validation** on all server route inputs
7. **Auth on every route** — `requireAuth` + `requireRole()` middleware
8. **Audit logging** — automatic via `auditLogger` middleware
9. **AES-256-GCM** for any PII (names, addresses, health data)
10. **No external AI/LLM** — chatbot uses local rule-based NLU only

## Security (DSGVO/BSI)

- JWT with HS256 algorithm pinning + JTI blacklist
- AES-256-GCM encryption for PII at rest
- SHA-256 salted email hashing for pseudonymization
- Helmet headers: HSTS, CSP (no unsafe-eval), X-Frame-Options DENY
- COEP/COOP/CORP headers
- Rate limiting: 10/15min on auth, 200/15min global
- All voice processing in browser only — no audio sent to servers

## Current State (Phase 11)

### Completed (Phases 1-10)
- ✅ 81-problem analysis + 14 security fixes
- ✅ 4 feature components (DatenschutzGame, StaffChat, StaffTodoList, PatientWartezimmer)
- ✅ Schema corrections (APGAR, BG 14+1, Bestandspatienten, Red-Flag, Bewertung)
- ✅ DSGVO Section 2 (10 tasks: headers, hardening, audit, JWT, consent, legal pages)
- ✅ Documentation + Translation audit (81 keys fixed across 10 languages)
- ✅ Netlify deployment with SPA routing fix
- ✅ Integration tests (39/39 passed)
- ✅ Docker + Seed Data (50+ patients) + Admin API (10 endpoints)
- ✅ HomeScreen, StaffAutoLogout, VoiceOutput, NLU Engine, AnamneseGame
- ✅ Redis token blacklist, GitHub Actions CI/CD, i18n all 11 locales

### In Progress (Phase 11 — 7 Streams)
1. **Returning Patient Fast-Track** — RPT-ID question, PatientIdentify component, birthDate + insuranceNumber lookup
2. **Security Pattern Auth** — PatternLock (4x4 dot grid, SHA-256 → bcrypt), MFA CertificationModal
3. **MFA Identity Certification** — Ausweis-Prüfung, Versicherung, Patientennummer, Sicherheitsmuster
4. **Netlify Cleanup** — Removed 13 obsolete root scripts, fixed COEP header, added deploy scripts
5. **Component Library** — Design tokens (src/design/tokens.ts), 6 UI components (Button, Card, Input, Modal, Badge, Spinner)
6. **Seed Data Expansion** — 18 patients with chat messages, 50+ chat threads total
7. **E2E Test Suite** — 14 spec files + shared helpers, mobile + desktop Playwright projects

## Key Files (Phase 11 Additions)

| File | Purpose |
|------|---------|
| `src/components/inputs/PatternLock.tsx` | Canvas 4x4 dot grid security pattern (touch+mouse+keyboard) |
| `src/components/inputs/PatientIdentify.tsx` | Returning patient identification form (birthDate+insurance+pattern) |
| `src/components/CertificationModal.tsx` | MFA-initiated 4-step patient certification flow |
| `src/utils/patternAuth.ts` | SHA-256 hashing, pattern validation, complexity scoring |
| `server/routes/patients.ts` | 5 patient API endpoints (identify, verify-pattern, set-pattern, certify, get) |
| `src/design/tokens.ts` | Centralized spacing, radii, shadows, transitions, z-index, typography tokens |
| `src/components/ui/index.ts` | Barrel export: Button, Card, Input, Modal, Badge, Spinner |
| `e2e/helpers/test-utils.ts` | Shared test utilities (login, navigation, assertion helpers) |

## Patient Auth Architecture (§630f BGB)

```
1. Returning patient selects "Ja, war schon hier"
2. RPT-ID form: birthDate + insuranceNumber + optional patientNumber
3. Server: SHA-256(insuranceNumber) + birthDate → lookup in Patient table
4. If patient has securityPattern: PatternLock verify step
5. If patient found: skip 12+ identity questions → go to service flow
6. If not found: fallback to manual flow (0001→0011→0002→0003→...)
7. MFA certifies new patient: sets patientNumber (P-XXXXX), stored bcrypt pattern
```

## Environment Variables

```
DATABASE_URL=postgresql://user:pass@host:5432/anamnese_db
JWT_SECRET=<32-byte-random-string>
ENCRYPTION_KEY=<32-byte-string>
FRONTEND_URL=https://diggai-drklaproth.netlify.app
ARZT_PASSWORD=<staff-default-password>
REDIS_URL=redis://redis:6379
```

## NPM Scripts

```bash
npm run dev          # Vite frontend dev server (port 5173)
npm run dev:server   # Express backend dev server (port 3001)
npm run dev:all      # Both concurrently
npm run build        # TypeScript check + Vite production build
npm run db:migrate   # Prisma migrate dev
npm run db:seed      # Basic seed (questions + users)
npm run db:seed:full # Comprehensive seed (50+ patients)
npm run db:studio    # Prisma Studio GUI
```

## Deployment

- **Frontend:** Netlify (auto-build from `npm run build`, publishes `dist/`)
- **Backend:** Docker Compose on VPS (Express + PostgreSQL + Redis + Nginx)
- **CI/CD:** GitHub Actions on push to master

### Netlify Deploy (Guided, Secure)

- **Netlify Site ID:** `d4c9bba2-71cc-48a1-81a4-14cb9ac5cb90`
- **Status Badge:** `https://api.netlify.com/api/v1/badges/d4c9bba2-71cc-48a1-81a4-14cb9ac5cb90/deploy-status`
- Use `npm run deploy` (guided script in `scripts/deploy-guided.mjs`)
- The script supports:
  - automatic build if `dist/` is missing
  - production deploy (`npm run deploy` / `npm run deploy:prod`)
  - preview deploy (`npm run deploy:preview`)
  - token-based non-interactive deploy when `NETLIFY_AUTH_TOKEN` is set
  - interactive fallback (`npx netlify login`) when no token is present

> Security rule: Never store login passwords in repository files. Use environment variables (`NETLIFY_AUTH_TOKEN`) or interactive Netlify CLI login.

## Important Constraints

- This is **NOT a DiGA** (Digital Health Application) — no CE marking required
- This is **NOT a medical device** — uses term "clinical decision support"
- Voice data stays **100% in browser** (Web Speech API, no server upload)
- No external AI APIs — all NLU is **rule-based** (Levenshtein + n-gram + synonyms)
- All code comments and git commits can be in German or English
- User-facing text must always use i18n keys, never hardcoded strings
