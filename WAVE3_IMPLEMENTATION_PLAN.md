# Wave 3 Implementation Plan — Fix Everything + NFC Praxis-Okosystem + Advanced Experience

> Generated: 2026-03-25 | Agent: Claude Opus 4.6
> Based on: 8 parallel research agents, full codebase audit

---

## Executive Summary

**Wave 3 backend is ~90% code-complete** — all 11 route files (91 endpoints), 10 service modules, and 18 Prisma models exist. The critical gaps are:

1. **~220 TypeScript errors** blocking clean builds (pre-existing)
2. **Frontend-to-backend wiring** (simulated APIs need real endpoint connections)
3. **External service integration** (TTS, TURN servers, real Stripe keys)
4. **Missing npm packages** (framer-motion, @sentry/node, @faker-js/faker, web-vitals)

**Strategy:** Fix TS errors first (unlocks CI/CD), then wire frontend to backend, then external integrations.

---

## Phase 0: Fix All TypeScript Errors (PREREQUISITE)

### 0A — Install Missing npm Packages (5 min)

| Package | Why |
|---------|-----|
| `framer-motion` | 5 frontend files import it (ProgressBar, Celebrations, SignaturePad, PatternLock, LandingPage, Questionnaire) |
| `web-vitals` | `src/lib/performance-monitor.ts` imports `web-vitals` |
| `@sentry/node` | `server/lib/sentry.ts` imports it |
| `@faker-js/faker` | `server/test/factories.ts` uses it |
| `vitest-mock-extended` | `server/test/prisma-mock.ts` uses it |

**Command:** `npm install framer-motion web-vitals @sentry/node @faker-js/faker vitest-mock-extended`

---

### 0B — Frontend TS Errors (10 unique errors)

| # | File | Error | Fix |
|---|------|-------|-----|
| 1 | `src/components/inputs/PatternLock.tsx` | Missing `mode` prop | Add `mode?: 'create' \| 'verify'` to `PatternLockProps` |
| 2 | `src/components/SignaturePad.tsx` | Missing `documentText` + `onComplete` props | Add both to `SignaturePadProps` |
| 3 | `src/components/Questionnaire.tsx:629` | `colorClass` prop doesn't exist on ProgressBar | Change to `variant` prop or add `colorClass` to ProgressBarProps |
| 4 | `src/components/QuestionRenderer.tsx:140` | `rows` prop doesn't exist on TextAreaInput | Add `rows?: number` to `TextAreaInputProps` |
| 5 | `src/components/Questionnaire.tsx:33` | Wrong import: `{ CompletionCelebration }` | Change to correct export name from Celebrations.tsx |
| 6 | `src/pages/Questionnaire.tsx:20` | `import from '../types'` — module not found | Change to `'../types/question'` |
| 7 | `src/components/inputs/PatientIdentify.tsx:157` | Implicit `any` on `msg` param | Add `: string` type annotation |
| 8 | `src/pages/Questionnaire.tsx:171,254` | Implicit `any` on `option`/`o` params | Add type annotations |
| 9 | `src/hooks/usePatientApi.test.tsx:76,100` | `praxisId` not in `CreateSessionPayload` | Remove from test or add to interface |
| 10 | `src/hooks/index.ts:11-19` | Wrong export syntax for 5 hooks | Fix named vs default exports |

**Agent assignment:** 1 agent, scope = `src/` only, ~15 files

---

### 0C — Server TS Errors — Health Check Types (15 errors in server/index.ts)

| Lines | Error | Fix |
|-------|-------|-----|
| 268-333 | Assigning `"ok"/"error"/"disabled"` to type `"unknown"` | Define `type HealthStatus = 'ok' \| 'error' \| 'degraded' \| 'disabled' \| 'unknown'` and use it |

**Agent assignment:** 1 agent, scope = `server/index.ts` only

---

### 0D — Server TS Errors — Middleware & Validation (12 errors)

| File | Error | Fix |
|------|-------|-----|
| `server/middleware/query-performance.ts:18` | `$use` doesn't exist on PrismaClient | Use Prisma extension API or remove middleware |
| `server/middleware/query-performance.ts:53-66` | Missing Express types | Import proper types from `express` |
| `server/middleware/validation.ts:353,365,377` | Zod API mismatch | Update to Zod 4 API (`.max()` on pipe, `z.literal()` signature) |

**Agent assignment:** 1 agent, scope = `server/middleware/` only

---

### 0E — Server TS Errors — Test Files (30+ errors)

| Scope | Error Pattern | Fix Strategy |
|-------|--------------|-------------|
| `server/middleware/auth.test.ts` | `cookieData`/`clearedCookies`/`jsonData` on Response | Create proper mock response type extending Express Response |
| `server/routes/agents.test.ts` | `null` to non-nullable, object to `never` | Cast test data with `as any` or fix types |
| `server/routes/answers.test.ts` | Alert object to `never` | Fix mock data types |
| `server/routes/patients.test.ts` | `boolean` to `void` | Fix mock return values |
| `server/routes/payment.test.ts` | Extra `date` on PaymentReceipt | Remove `date` field or add to interface |
| `server/test/factories.ts` | Missing fields, wrong enum values | Update factory functions to match current schema |
| `server/security-tests/*.test.ts` | Missing fields, wrong enum values | Update test fixtures |
| `server/services/pvs/__tests__/*` | Missing `beforeAll`/`afterAll` globals | Add vitest globals to tsconfig |

**Agent assignment:** 1 agent, scope = `server/**/*.test.ts` + `server/test/` only

---

### 0F — Server TS Errors — PVS Service Architecture (62 errors)

| Scope | Error Pattern | Fix Strategy |
|-------|--------------|-------------|
| 5 GDT adapters (albis, cgm-m1, medistar, turbomed, xisynet) | Missing `receiverId`, `senderId`, `disconnect()`, `exportPatient()` | Implement abstract method stubs in each adapter |
| `server/services/pvs/fhir/fhir-bundle-builder.ts` | Missing type exports, invalid properties | Export FHIR types from fhir-mapper, fix property names |
| `server/services/pvs/fhir/fhir-validator.ts` | Missing `FhirBundle` export | Add exports to fhir-mapper.ts |
| `server/services/pvs/fhir/fhir-client-optimized.ts` | Invalid RequestInit properties | Fix Node.js fetch agent config |
| `server/services/pvs/fhir/fhir-subscription-manager.ts` | Constructor args, missing `delete()` | Fix constructor and add method |
| `server/services/pvs/errors/pvs-error.ts` | Invalid error detail properties | Extend PvsErrorDetails interface |
| `server/services/pvs/adapters/gdt-base.adapter.ts` | `GdtPatientData` missing fields, wrong `SatzartenEnum` | Update interface + enum |
| `server/services/pvs/performance/patient-indexer.ts` | Missing exports from cache service | Add exports to pvs-cache.service |
| `server/services/pvs/watching/*.ts` | Missing logger util, missing exports | Fix import paths, add exports |
| `server/services/pvs/middleware/tenant-isolation.ts` | `permissions` missing on AuthPayload | Add field to AuthPayload type |

**Agent assignment:** 1 agent, scope = `server/services/pvs/` only (largest error cluster)

---

### 0G — Server TS Errors — Misc (10 errors)

| File | Error | Fix |
|------|-------|-----|
| `server/lib/sentry.ts:16` | Implicit `any` on `event` | Add `: Sentry.Event` type |
| `server/jobs/backupMonitor.ts:190` | `createTransporter` → `createTransport` | Fix typo |
| `server/jobs/backupMonitor.ts:223` | `systemLog` model doesn't exist | Change to `auditLog` or create SystemLog model |
| `server/engine/QuestionFlowEngine.routing.test.ts:125` | ConditionalRoute missing `equals` | Add `equals` field to test fixture |
| `src/theme/defaultThemes.ts:344` | Duplicate property in object literal | Remove duplicate key |
| `src/test-setup.ts:79` | `afterEach` not found | Add vitest globals to tsconfig or import from vitest |
| Various `*.test.tsx` | `screen`/`fireEvent`/`waitFor` not in `@testing-library/react` | Check @testing-library/react version, may need update |

**Agent assignment:** 1 agent, scope = remaining misc files

---

## Phase 0 — Parallel Agent Assignment (7 agents)

```
Agent 0A: npm install (Bash only)              — 2 min
Agent 0B: Frontend TS fixes                     — scope: src/components/, src/pages/, src/hooks/
Agent 0C: Health check types                    — scope: server/index.ts
Agent 0D: Middleware + validation fixes          — scope: server/middleware/
Agent 0E: Test file fixes                       — scope: server/**/*.test.ts, server/test/
Agent 0F: PVS service architecture fixes        — scope: server/services/pvs/
Agent 0G: Misc server fixes                     — scope: server/lib/, server/jobs/, server/engine/, src/theme/, src/test-setup.ts
```

**Zero interference guarantee:** Each agent owns a disjoint file set. No two agents touch the same file.

---

## Phase 1: Wire Frontend to Backend (Wave 3 Features)

### Current State

All 11 Wave 3 route files are **fully implemented** (91 endpoints). All 10 service modules are **fully functional**. Frontend pages exist but many use simulated/demo data.

### 1A — NFC Frontend Wiring

| Frontend File | Current State | Wire To |
|---------------|--------------|---------|
| `src/pages/nfc/NfcLanding.tsx` | Uses `api.nfcScan()` | Already wired -- verify |
| `src/pages/nfc/NfcStepView.tsx` | Receives props | Wire to `GET /api/flows/:id/progress/:sessionId` |
| `src/components/nfc/NfcCheckinOverlay.tsx` | Static display | Wire to Socket.IO `nfc:tap:event` |

**Agent scope:** `src/pages/nfc/`, `src/components/nfc/`

### 1B — Kiosk + Payment Frontend Wiring

| Frontend File | Current State | Wire To |
|---------------|--------------|---------|
| `src/pages/kiosk/KioskDashboard.tsx` | Simulated check-in (90% success demo) | Wire to `POST /api/nfc/scan` + `GET /api/flows/:id/progress/:sessionId` |
| `src/components/payment/NfcPaymentTerminal.tsx` | Simulated payment | Wire to `POST /api/payment/intent` + `POST /api/payment/nfc-charge` |

**Agent scope:** `src/pages/kiosk/`, `src/components/payment/`

### 1C — Telemedizin Frontend Wiring

| Frontend File | Current State | Wire To |
|---------------|--------------|---------|
| `src/pages/telemedizin/TelemedizinScheduler.tsx` | Demo data | Wire to `GET /api/telemedizin/sessions` |
| `src/pages/telemedizin/VideoRoom.tsx` | Simulated 2s connection | Wire real WebRTC via Socket.IO `rtc:offer/answer/ice-candidate` |
| `src/pages/telemedizin/PreCheckinForm.tsx` | Already wired | Verify CSRF + endpoint |

**Agent scope:** `src/pages/telemedizin/`

### 1D — ePA Frontend Wiring

| Frontend File | Current State | Wire To |
|---------------|--------------|---------|
| `src/pages/epa/PrivateEpaDashboard.tsx` | Mock data | Wire to `GET /api/epa/:patientId`, `POST /api/epa/:patientId/documents` |
| `src/pages/epa/SharedEpaView.tsx` | Mock data | Wire to `GET /api/epa/access/:token` |

**Agent scope:** `src/pages/epa/`

### 1E — Flows Frontend Wiring

| Frontend File | Current State | Wire To |
|---------------|--------------|---------|
| `src/pages/flows/PatientFlowLiveBoard.tsx` | Static layout | Wire to `GET /api/flows` + Socket.IO `flow:step-changed` |
| `src/pages/flows/TreatmentFlowBuilder.tsx` | State-only (no save/load) | Wire to `POST /api/flows` + `PUT /api/flows/:id` |

**Agent scope:** `src/pages/flows/`

### 1F — Forms Frontend Wiring

| Frontend File | Current State | Wire To |
|---------------|--------------|---------|
| `src/pages/forms/FormBuilderPage.tsx` | No save/load | Wire to `POST /api/forms` + `PATCH /api/forms/:id` + `POST /api/forms/:id/publish` |
| `src/pages/forms/FormRunnerPage.tsx` | No submission | Wire to `GET /api/forms/:id` + `POST /api/forms/:id/submit` |

**Agent scope:** `src/pages/forms/`

### 1G — Gamification + Avatar Frontend Wiring

| Frontend File | Current State | Wire To |
|---------------|--------------|---------|
| `src/components/gamification/LeaderboardTable.tsx` | Static data | Wire to `GET /api/gamification/leaderboard` |
| `src/components/gamification/AchievementBadge.tsx` | Static | Wire to `GET /api/gamification/staff/:staffId` |
| `src/components/gamification/PointsDisplay.tsx` | Static | Wire to `GET /api/gamification/staff/:staffId/points` |
| `src/components/avatar/AvatarPlayer.tsx` | Simulated TTS | Wire to `POST /api/avatar/speak` + `GET /api/avatar/:staffId` |
| `src/components/avatar/VoiceCloneSettings.tsx` | UI only | Wire to `PUT /api/avatar/:staffId` + `POST /api/avatar/clone/start` |

**Agent scope:** `src/components/gamification/`, `src/components/avatar/`

### Phase 1 — Parallel Agent Assignment (7 agents)

```
Agent 1A: NFC frontend wiring                   — src/pages/nfc/, src/components/nfc/
Agent 1B: Kiosk + Payment wiring                — src/pages/kiosk/, src/components/payment/
Agent 1C: Telemedizin wiring + WebRTC           — src/pages/telemedizin/
Agent 1D: ePA wiring                            — src/pages/epa/
Agent 1E: Flows wiring                          — src/pages/flows/
Agent 1F: Forms wiring                          — src/pages/forms/
Agent 1G: Gamification + Avatar wiring          — src/components/gamification/, src/components/avatar/
```

---

## Phase 2: External Service Integration

### 2A — TTS Provider Integration (Avatar)

**Current:** `avatarService.ts:speak()` returns simulated audio URL
**Target:** Real TTS via ElevenLabs or Azure Speech

**Steps:**
1. Choose provider (recommend ElevenLabs for voice cloning support)
2. Install SDK: `npm install elevenlabs` or `@azure/cognitiveservices-speech-sdk`
3. Implement `speak()` in `server/services/avatar/avatarService.ts`
4. Add env vars: `ELEVENLABS_API_KEY`, `TTS_PROVIDER`
5. Test with German + multilingual voices

**Agent scope:** `server/services/avatar/`

### 2B — TURN Server Config (Telemedizin)

**Current:** Only STUN servers (Google public STUN)
**Target:** Add TURN server for NAT traversal behind firewalls

**Steps:**
1. Add env vars: `TURN_SERVER_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`
2. Update `telemedizinService.ts` to include TURN in ICE servers
3. Test P2P connectivity through restrictive NAT

**Agent scope:** `server/services/telemedizin/`

### 2C — Real Stripe Keys (Payment)

**Current:** Simulated intent IDs
**Target:** Real Stripe test-mode integration

**Steps:**
1. Configure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` in `.env`
2. Update `paymentService.ts` to call real Stripe API instead of mock
3. Set up Stripe webhook endpoint (`POST /api/payment/webhook` already exists)
4. Test with Stripe test cards

**Agent scope:** `server/services/payment/`

### 2D — NFC HMAC Secret (NFC)

**Current:** Default `'dev-nfc-secret-change-me'`
**Target:** Proper HMAC secret in production

**Steps:**
1. Generate 256-bit random secret
2. Set `NFC_HMAC_SECRET` in `.env`
3. Encode NFC tags with matching HMAC signatures
4. Test replay protection with Redis

**Agent scope:** Configuration only (no code changes)

### 2E — RabbitMQ Docker Setup (Message Queue)

**Current:** `amqplib` installed but not in docker-compose
**Target:** Running RabbitMQ for agent task queue

**Steps:**
1. Add RabbitMQ service to `docker-compose.local.yml`
2. Set `RABBITMQ_URL` in `.env`
3. Start message broker in `server/index.ts`
4. Test agent task distribution

**Agent scope:** `docker-compose.local.yml`, `server/index.ts`

### Phase 2 — Parallel Agent Assignment (5 agents)

```
Agent 2A: TTS integration                      — server/services/avatar/
Agent 2B: TURN server config                    — server/services/telemedizin/
Agent 2C: Stripe real integration               — server/services/payment/
Agent 2D: NFC HMAC + env config                 — .env, docs
Agent 2E: RabbitMQ Docker + startup             — docker-compose, server/index.ts
```

---

## Phase 3: Integration Testing & Polish

### 3A — E2E Test Suites (7 new spec files)

| Spec File | Coverage |
|-----------|----------|
| `e2e/nfc-flow.spec.ts` | NFC tap → flow advance → checkout |
| `e2e/checkout-feedback.spec.ts` | Data retention/export/delete + feedback |
| `e2e/kiosk-payment.spec.ts` | Kiosk check-in → payment → receipt |
| `e2e/avatar-voice.spec.ts` | Avatar TTS playback |
| `e2e/telemedicine.spec.ts` | Session create → join → end |
| `e2e/forms-ai.spec.ts` | Form create → AI generate → submit |
| `e2e/private-epa-export.spec.ts` | Document upload → share → export |

### 3B — Unit Test Coverage

Target: 80%+ coverage for all new services

### 3C — Socket.IO Integration Tests

Test all real-time events: `flow:step-changed`, `nfc:tap`, `rtc:offer/answer`, `chat:broadcast`

### Phase 3 — Parallel Agent Assignment (3 agents)

```
Agent 3A: E2E test creation                    — e2e/*.spec.ts
Agent 3B: Unit test coverage                   — server/**/*.test.ts (new tests)
Agent 3C: Socket.IO integration tests          — server/socket.test.ts
```

---

## Timeline Summary

| Phase | What | Agents | Estimated Time |
|-------|------|--------|---------------|
| **0** | Fix all TS errors | 7 parallel | 1 session |
| **1** | Wire frontend to backend | 7 parallel | 1-2 sessions |
| **2** | External integrations | 5 parallel | 1 session |
| **3** | Testing & polish | 3 parallel | 1 session |

**Total: 4-5 sessions with 22 agent-tasks across 4 phases**

---

## Risk Matrix

| Risk | Impact | Mitigation |
|------|--------|-----------|
| PVS errors (62) are deeply intertwined | HIGH | Isolate to one agent; accept partial fixes |
| WebRTC TURN server needed for production | MEDIUM | Use free TURN (Metered.ca) for testing |
| Stripe real keys needed | MEDIUM | Use test mode keys (no real charges) |
| TTS provider selection | LOW | ElevenLabs free tier has 10K chars/month |
| framer-motion bundle size | LOW | Tree-shakeable, only imported where needed |

---

## File Ownership Map (No Interference)

```
Phase 0:
  0A: package.json (npm install)
  0B: src/components/{PatternLock,SignaturePad,ProgressBar,Questionnaire,QuestionRenderer,Celebrations,inputs/TextAreaInput,inputs/PatientIdentify}, src/pages/Questionnaire.tsx, src/hooks/index.ts
  0C: server/index.ts
  0D: server/middleware/{query-performance,validation}.ts
  0E: server/**/*.test.ts, server/test/, server/security-tests/
  0F: server/services/pvs/**
  0G: server/lib/sentry.ts, server/jobs/backupMonitor.ts, server/engine/*.test.ts, src/theme/defaultThemes.ts, src/test-setup.ts

Phase 1:
  1A: src/pages/nfc/, src/components/nfc/
  1B: src/pages/kiosk/, src/components/payment/
  1C: src/pages/telemedizin/
  1D: src/pages/epa/
  1E: src/pages/flows/
  1F: src/pages/forms/
  1G: src/components/gamification/, src/components/avatar/

Phase 2:
  2A: server/services/avatar/
  2B: server/services/telemedizin/
  2C: server/services/payment/
  2D: .env, docs/
  2E: docker-compose.local.yml, server/index.ts (single line add)

Phase 3:
  3A: e2e/*.spec.ts (new files)
  3B: server/**/*.test.ts (new files, no overlap with 0E)
  3C: server/socket.test.ts (new file)
```

---

## Execution Rule

> **Hauptregel:** Maximale Subagenten, maximale Parallelitat, keine Interferenz.
>
> Each phase launches all its agents in a single message.
> Each agent owns a disjoint set of files.
> No two agents ever edit the same file.
> If a dependency exists (Phase 0 must complete before Phase 1), phases run sequentially.
> Within each phase, all agents run in parallel.
