# DiggAI Anamnese App — Copilot Instructions

## Projekt-Kontext

**DiggAI** ist eine vollständig digitale, DSGVO-konforme Patientenaufnahme-App (Anamnese) für deutsche Arztpraxen. Sie ersetzt den papierbasierten Anamnesebogen durch ein intelligentes, mehrsprachiges, webbasiertes System.

- **Live-URL:** https://diggai-drklaproth.netlify.app
- **GitHub:** DiggAiHH/diggai-anamnese (branch: master, default: gh-pages)
- **Status:** Produktion (Beta), Phase 11 in Implementierung

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
│   ├── schema.prisma # 13 Models (PostgreSQL)
│   ├── seed.ts       # Basis-Seed (~90 Fragen + Users)
│   └── seed-comprehensive.ts  # 50+ Patienten (Phase 10)
├── server/           # Express Backend (Port 3001)
│   ├── index.ts      # App bootstrap + middleware
│   ├── config.ts     # Env vars (5 required)
│   ├── socket.ts     # Socket.IO setup
│   ├── middleware/    # auth.ts, audit.ts
│   ├── routes/       # sessions, answers, atoms, arzt, mfa, admin, chats, payments, export, upload, queue
│   └── services/     # encryption.ts, triage.ts, aiService.ts, questionFlow.ts
├── src/              # React Frontend
│   ├── App.tsx       # Router + QueryClient
│   ├── main.tsx      # Entry + SW registration
│   ├── index.css     # Tailwind + Theme vars
│   ├── api/          # client.ts (Axios), hooks.ts (React Query)
│   ├── store/        # sessionStore, modeStore, themeStore (Zustand)
│   ├── components/   # 38+ components
│   ├── pages/        # ArztDashboard, MFADashboard, AdminDashboard, etc.
│   └── utils/        # speechSupport.ts, chatNLU.ts
├── public/           # Static assets, locales/ (10 languages), sw.js, manifest.json
├── e2e/              # Playwright tests
├── netlify/          # Netlify Functions (legacy mock layer)
├── docker/           # Nginx config
├── Dockerfile        # Multi-stage Node.js build
├── docker-compose.yml # App + PostgreSQL + Redis + Nginx
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
- `useTranslation()` for ALL user-facing strings — NEVER hardcode German text
- Lazy loading for dashboard pages (`React.lazy` + `Suspense`)
- TanStack React Query for all API calls (mutations + queries)

### Styling
- Tailwind CSS utility classes only — no CSS modules, no styled-components
- CSS variables for theme: `var(--bg-primary)`, `var(--text-primary)`, etc.
- Dark/Light theme via `theme-dark`/`theme-light` classes
- RTL support for Arabic (ar) and Farsi (fa)

### i18n
- 10 languages: de, en, ar, tr, uk, es, fa, it, fr, pl, ru
- JSON locale files in `public/locales/{lng}/translation.json`
- Key pattern: `section.key_name` (e.g., `chat.faq_insurance`, `admin.tab_overview`)
- ALL new UI text must have keys in ALL 10 locale files

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

### File Naming
- Components: PascalCase (`HomeScreen.tsx`, `VoiceOutput.tsx`)
- Utilities: camelCase (`chatNLU.ts`, `speechSupport.ts`)
- Server routes: camelCase (`admin.ts`, `sessions.ts`)
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
  "home": {
    "title": "DiggAI Praxis-System",
    "patient_tile": "Patient Aufnahme",
    "arzt_tile": "Arzt Dashboard",
    "mfa_tile": "MFA Dashboard",
    "supplier_tile": "Lieferant / Dienstleister"
  }
}
```

## Current Phase: Phase 11

Active implementation streams:
1. Returning Patient Fast-Track (RPT-ID, PatientIdentify, birthDate + insuranceNumber lookup)
2. Security Pattern Auth (PatternLock 4x4 grid, SHA-256 → bcrypt, CertificationModal)
3. MFA Identity Certification (Ausweis-Prüfung, P-XXXXX Patientennummer)
4. Netlify Cleanup (removed 13 obsolete scripts, fixed COEP, deploy scripts)
5. Component Library (Design tokens, 6 UI components)
6. Seed Data Expansion (18 patients with chat messages)
7. E2E Test Suite (14 spec files + shared helpers)

### Key Phase 11 Files

| File | Purpose |
|------|---------|
| `src/components/inputs/PatternLock.tsx` | 4x4 dot grid security pattern (canvas, touch+mouse+keyboard) |
| `src/components/inputs/PatientIdentify.tsx` | Returning patient identification form |
| `src/components/CertificationModal.tsx` | MFA 4-step patient certification |
| `src/utils/patternAuth.ts` | SHA-256 hashing, validation, complexity |
| `server/routes/patients.ts` | 5 patient endpoints (identify, verify-pattern, set-pattern, certify, get) |
| `src/design/tokens.ts` | Centralized design system constants |
| `src/components/ui/` | Button, Card, Input, Modal, Badge, Spinner |
| `e2e/helpers/test-utils.ts` | Shared Playwright test helpers |

## Don'ts

- Don't use external LLMs (no OpenAI, DeepSeek, Kimi API keys) — all NLU is rule-based
- Don't store voice data on server — all speech processing in browser only (DSGVO)
- Don't use SQLite — project migrated to PostgreSQL
- Don't skip i18n — every UI string needs translation keys in all 10 locales
- Don't use `any` type — use proper TypeScript types
- Don't add dependencies without checking bundle size impact
- Don't bypass auth middleware on sensitive routes

## Netlify Deploy (Secure)

- Netlify Site ID: `d4c9bba2-71cc-48a1-81a4-14cb9ac5cb90`
- Deploy status badge endpoint: `https://api.netlify.com/api/v1/badges/d4c9bba2-71cc-48a1-81a4-14cb9ac5cb90/deploy-status`
- Preferred deploy commands:
  - `npm run deploy` (guided production deploy)
  - `npm run deploy:preview` (guided preview deploy)
- Guided script: `scripts/deploy-guided.mjs`
  - builds automatically when `dist/` is missing
  - uses `NETLIFY_AUTH_TOKEN` for non-interactive deploy
  - falls back to interactive login (`npx netlify login`) when token is not set

Security requirement:
- Never store Netlify account passwords in repository files.
- Use environment variables (`NETLIFY_AUTH_TOKEN`) or local CLI login state.
