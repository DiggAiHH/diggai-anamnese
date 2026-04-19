# Session Plan — 19. April 2026

> **Status:** PLAN ONLY — Awaiting Approval Before Implementation  
> **Research:** 6 parallel subagents completed (trust/simplicity, DSGVO legality, deployments, MFA dashboard, patient view, Obsidian tracking)

---

## Research Summary: Trust & Simplicity in Medical Apps (Study-Based)

### Key Findings

| Intervention | Completion Rate Impact | Source |
|---|---|---|
| **Time estimate visible** ("Dauert 5 Minuten") | **+15–20%** | Katz 2015 |
| **Progress indicator** (Schritt 3 von 6) | **+10–15%** | Nielsen Norman Group |
| **Simple Mode** (1 question/screen) | **92–95% completion** vs 85–88% normal | Miller's Law + DiggAI UX Critique |
| **Visible encryption badge** (lock icon) | **+8–12%** | Institute of Color Research |
| **DSGVO badge visible** | **+22%** conversion | German-specific study data |
| **Larger fonts** (18px base) | **+8–10%** for 65+ | WCAG 2.2 |
| **40% whitespace rule** | Reduces cognitive overload | NHS Digital Service Manual |
| **48px touch targets** | +20% mobile completion | WCAG 2.5.5 |

### Trust Hierarchy for German Patients
1. **Data Location** — Must be EU (preferably Germany)
2. **Encryption** — AES-256-GCM explicitly shown
3. **Doctor-only access** — "Nur Ihr behandelnder Arzt sieht diese Daten"
4. **DSGVO compliance badge** — Visible, not hidden in ToS
5. **Formal tone** — "Sie" not "du"

### Color Psychology for Medical Trust
- Primary (80%): Serene Blue `#4A90E2` — trust, calm
- Accents (15%): Sage Green `#81B29A` — success, healing
- Alerts (5%): Soft Coral `#E07A5F` — caution without panic
- Background: Warm Beige `#F5F1E7` — comfort, not sterile

### Benchmark: Digital Health Questionnaire Completion Rates
| Form Type | Rate |
|---|---|
| Progressive (1 Q/screen) | 85–92% |
| Condensed (3–4 screens) | 70–80% |
| Multi-page (8+ screens) | 45–60% |
| With time estimate | +15–20% |

---

## Task 1: DSGVO Legality of Shared Database Multi-Tenancy

### Verdict: ✅ LEGALLY COMPLIANT — With 1 Critical Fix

**Current Architecture:**
- Shared PostgreSQL 16 with row-level isolation via `tenantId`
- 13 patient-related models have composite foreign keys: `@relation(fields: [patientId, tenantId])`
- Prisma middleware (tenant-context.ts) auto-injects `WHERE tenantId=?` via AsyncLocalStorage
- Tenant resolution: subdomain → BSNR header → custom domain → fallback
- All PII encrypted with AES-256-GCM per-tenant
- Full audit trail with tenantId in every log entry

**Safeguards in Place:**
- ✅ `server/middleware/tenant.ts` — Multi-layer tenant resolution
- ✅ `server/services/tenant-context.ts` — Prisma middleware auto-filtering
- ✅ `server/middleware/auth.ts` — JWT validates tenantId claim
- ✅ `server/middleware/audit.ts` — All requests logged with tenantId
- ✅ Composite keys prevent cross-tenant FK references

### 🚨 CRITICAL FIX REQUIRED

**Signature Model (`prisma/schema.prisma` ~L424) is MISSING `tenantId`!**
- Patient consent/eIDAS signatures have NO tenant isolation
- Risk: Cross-tenant signature leakage → Art. 5 DSGVO violation
- **Fix:** Add `tenantId String` + composite unique constraints + Tenant relation

### Additional Risks (Medium)

| Issue | Severity | Action |
|---|---|---|
| 4 raw SQL queries (`$queryRaw`) bypass Prisma middleware | HIGH | Audit each; add manual WHERE tenantId |
| No tenant-scoped backup/restore documentation | HIGH | Document procedure |
| Global rate limiting (not per-tenant) | MEDIUM | Add tenant-aware rate limits |

### Implementation Plan

```
Step 1: Add tenantId to Signature model (migration)
Step 2: Audit all $queryRaw calls for tenant isolation
Step 3: Document tenant-scoped backup procedure
Step 4: Update DOCUMENTATION.md Line 209 with legal disclaimer
```

**Estimated Effort:** 2–3 hours (migration + audit + docs)

---

## Task 2: Deployment Inventory + Obsidian Session Tracking

### 2A: Deployment Inventory (CREATE new file)

**Discovered Deployments:**

| # | Name | URL | Method | Status |
|---|---|---|---|---|
| 1 | **Klaproth (Main)** | `diggai-drklaproth.netlify.app` | Netlify | ✅ Live |
| 2 | **Hatami (Cardiology)** | `/hatami` path on main domain | Netlify (DiggAI-HZV-Rural/) | ✅ Live |
| 3 | **diggai.de (Master)** | `diggai.de` | Hetzner VPS → Vercel | 🟡 DNS Pending |
| 4 | **API Backend** | `api.diggai.de` | Hetzner Docker | 🟡 Configured |
| 5 | **Railway Staging** | `*.up.railway.app` | Railway | 🔄 Testing |
| 6 | **Demo Tenant: Hausarzt** | `demo-hausarzt.diggai.de` | Seed data only | 🧪 Dev |
| 7 | **Demo Tenant: Kardio** | `demo-kardio.diggai.de` | Seed data only | 🧪 Dev |
| 8 | **Demo Tenant: MVZ** | `demo-mvz.diggai.de` | Seed data only | 🧪 Dev |
| 9 | **Pilot Klaproth** | `klaproth.diggai.de` | .env.pilot.example | 🟡 Planned |

### Implementation Plan

```
Step 1: Create docs/DEPLOYMENTS.md with full table (URLs, configs, status)
Step 2: Identify & mark unused configs for cleanup
Step 3: List which DiggAI-HZV-Rural/ files are needed vs obsolete
```

### 2B: Obsidian Session Tracking

**Already Exists:** `server/mcp/obsidian-mcp-server.ts` — 6 MCP tools, fully implemented!

**What's Missing:**
- ❌ Copilot session start/end tracking
- ❌ `write_copilot_session` MCP tool
- ❌ `OBSIDIAN_VAULT_PATH` in `.env.example`
- ❌ Patient session → Obsidian vault automation

### Implementation Plan

```
Step 1: Add write_copilot_session tool to obsidian-mcp-server.ts (~50 lines)
Step 2: Create scripts/copilot-session-logger.ts (~200 lines)
Step 3: Add OBSIDIAN_VAULT_PATH to .env.example
Step 4: Create docs/COPILOT_SESSION_TRACKING.md
Step 5: Add session start/end hooks to Copilot instructions
```

**Estimated Effort:** 2–3 hours

---

## Task 3: MFA Board Improvements (5 Subtasks)

### Current State (from audit)

| Feature | Status |
|---|---|
| MFA Dashboard UI (7 tabs) | ✅ Implemented |
| Session Management (list, assign, chat) | ✅ Implemented |
| Kanban Board (real-time queue) | ✅ Implemented |
| Triage Alert Panel | ✅ Implemented |
| Email Communication (SMTP + mailto) | ✅ 4 templates |
| Rezeptions-Inbox | ✅ Track & respond |
| PVS/Tomedo Integration (FHIR R4) | ✅ Phase 1 |
| **SMS/Text Messages** | ❌ Missing |
| **Starface/VoIP Integration** | ❌ Missing |
| **In-Person vs Online distinction** | ❌ Missing |
| **Ready-response buttons for ALL cases** | ❌ Partial (4 templates only) |

### 3A: Anliegen Flow (Client → Praxis Email → Patient File)

**Current:** Sessions are created → appear in Rezeptions-Inbox → MFA processes → practice copy emailed.

**Gap:** No automated flow from patient Anliegen submission to practice email inbox that auto-creates a patient file entry.

```
Implementation:
Step 1: Add auto-email trigger on session SUBMITTED status
Step 2: Create AnliegenEmailTemplate with structured data (name, DOB, Anliegen, triage)
Step 3: Connect to Tomedo import pipeline (existing tutamail.ts)
Step 4: Add "Anlage zur Patientenakte" button on MFA Inbox
```

### 3B: Ready Responses for All Cases

**Current:** 4 templates (received, in_review, completed, callback)

**Need:** Cover ALL Anliegen types:

| Anliegen | Response Template |
|---|---|
| Termin | "Ihr Termin ist am [Datum] um [Uhrzeit]" |
| Rezept | "Ihr Rezept liegt zur Abholung bereit / wird per Post versandt" |
| AU/Krankschreibung | "Ihre AU wird ausgestellt. Bitte holen Sie diese ab" |
| Überweisung | "Ihre Überweisung liegt bereit" |
| BG-Unfall | "Ihr BG-Fall wurde aufgenommen. Ref: [BG-Nr]" |
| Befund | "Ihre Befunde liegen vor. Bitte vereinbaren Sie einen Besprechungstermin" |
| Rückruf | "Wir werden Sie unter [Nummer] zurückrufen" |
| Allgemein | "Ihre Anfrage wurde bearbeitet" |

```
Implementation:
Step 1: Extend server/routes/mfa-reception.ts template system
Step 2: Create template picker UI in MfaReceptionInboxPanel.tsx
Step 3: Add placeholder substitution (Datum, Uhrzeit, BG-Nr, etc.)
Step 4: Add "Schnellantwort" button row to each inbox item
```

### 3C: Communication Channels (Email, SMS, Call)

**Email:** ✅ Done (SMTP + mailto fallback)
**SMS:** ❌ Need implementation
**Call/Starface:** ❌ Need implementation

```
Implementation:
Step 1: Create server/services/sms.service.ts (Twilio or vonage adapter)
Step 2: Create server/services/starface.service.ts (REST API integration)
Step 3: Add channel selector to MfaReceptionInboxPanel.tsx (Email | SMS | Anruf)
Step 4: Add Starface click-to-call: opens SIP URI sip:<number>@starface-server
Step 5: Add STARFACE_API_URL, SMS_PROVIDER_KEY to .env.example
```

### 3D: In-Person vs Online Patient Distinction

**Current:** No `visitType` field. All patients treated equally in queue.

```
Implementation:
Step 1: Add to QueueEntry model:
  - visitType: "IN_PERSON" | "ONLINE" | "PHONE" (default: "IN_PERSON")
Step 2: Prisma migration
Step 3: Update MFA Kanban board to show two lanes:
  - "Vor Ort" (blue) — physically in waiting room
  - "Online Empfang" (green) — remote/digital intake
Step 4: Add filter tabs on MFA session list
Step 5: Auto-detect: PWA sessions → ONLINE, Kiosk/NFC check-in → IN_PERSON
```

### 3E: PVS Integration Verification (REGEX/Datex/Tomedo)

**Current Status:**
- ✅ Tomedo: FHIR R4 client, health checks, batch, cache, metrics
- ✅ CGM Quadriga: Config mapped
- ✅ Medatixx x.concept: Config mapped
- ✅ Tobit David: Config mapped
- ✅ TurboMed GDT: File-based exchange
- ⚠️ REGEX/Datex: **NOT FOUND** in codebase

```
Implementation:
Step 1: Verify Tomedo API connectivity with health check endpoint
Step 2: Research REGEX PVS API documentation
Step 3: Research Datex PVS API documentation
Step 4: Create server/services/pvs/regex-adapter.ts (if API exists)
Step 5: Create server/services/pvs/datex-adapter.ts (if API exists)
Step 6: Add PVS health dashboard to Admin panel
```

**Note:** REGEX and Datex may not have public APIs. Need clarification from user.

### Estimated Effort: 8–12 hours (all 5 subtasks)

---

## Task 4: Patient View Simplification

### Current State (from audit)

**LandingPage.tsx (551 lines):**

| Section | Lines | Content | Action |
|---|---|---|---|
| Header + Title + Description | 288–309 | Welcome text | ✅ KEEP |
| Services Grid (4 boxes) | 311–375 | Termin, Rezept, AU, etc. | ✅ KEEP |
| Footer (status badges + staff links) | 377–410 | System Online, DSGVO, /verwaltung/* links | ❌ REMOVE |
| QR Code | 412–417 | Kiosk check-in QR | ❌ REMOVE |
| DSGVO/Signature Modals | 419–428 | Consent flows | ✅ KEEP (hidden, triggered on action) |
| ChatBubble | 442–445 | Chat bot | ❌ REMOVE |

### What Gets Removed

1. **Staff navigation links** — `/verwaltung/docs`, `/verwaltung/handbuch`, `/verwaltung/arzt`, `/verwaltung/mfa`, `/verwaltung/admin`
2. **System status badges** — "System Online | DSGVO Konform"
3. **Encryption footer text** — Technical details patients don't need
4. **QR Code** — Kiosk-specific, not for patient web view
5. **ChatBubble** — Not relevant for patient intake

### Implementation Plan

```
Step 1: Remove footer section (lines 377–410)
Step 2: Remove QR code Suspense (lines 412–417)
Step 3: Remove ChatBubble Suspense (lines 442–445)
Step 4: Verify DSGVO/Signature modals still work
Step 5: Test on mobile + desktop
```

### Result

Patient sees ONLY:
1. Welcome text / title / description
2. The 4 service boxes (Termin, Rezept, AU, Überweisung, etc.)
3. Nothing else. Clean. Simple. Trustworthy.

**Estimated Effort:** 30 minutes

---

## Execution Order (Proposed)

| Priority | Task | Effort | Dependencies |
|---|---|---|---|
| 🔴 1 | **Task 1: Signature tenantId fix** | 1 hour | Critical DSGVO gap |
| 🟡 2 | **Task 4: Patient view simplification** | 30 min | Quick win, high impact |
| 🟡 3 | **Task 3B: Ready response templates** | 2 hours | Extends existing system |
| 🟡 4 | **Task 3D: In-Person vs Online** | 2 hours | Schema migration |
| 🟡 5 | **Task 3A: Anliegen email flow** | 2 hours | Builds on 3B |
| 🟡 6 | **Task 2A: Deployments.md** | 1 hour | Documentation only |
| 🔵 7 | **Task 3C: SMS + Starface** | 3 hours | External API setup needed |
| 🔵 8 | **Task 2B: Obsidian session tracking** | 2 hours | MCP tool extension |
| 🔵 9 | **Task 3E: PVS verification** | 2 hours | Needs external API access |
| 🔵 10 | **Task 1 extras: $queryRaw audit** | 1 hour | Security hardening |

---

## Parallelization Strategy

**Wave 1 (No Dependencies):**
- Agent A: Task 1 (Signature tenantId migration)
- Agent B: Task 4 (Patient view cleanup)
- Agent C: Task 2A (Deployments.md creation)

**Wave 2 (After Wave 1):**
- Agent A: Task 3B (Response templates)
- Agent B: Task 3D (In-Person vs Online migration)
- Agent C: Task 2B (Obsidian session tools)

**Wave 3 (After Wave 2):**
- Agent A: Task 3A (Anliegen email flow — depends on 3B)
- Agent B: Task 3C (SMS + Starface)
- Agent C: Task 3E (PVS verification)

**Wave 4 (Cleanup):**
- Agent A: Task 1 extras ($queryRaw audit)
- Agent B: Final documentation update

---

## Questions for Approval

1. **REGEX/Datex PVS:** Do these systems have public APIs, or is integration via file-based GDT exchange?
2. **Starface:** What is the Starface server URL and API version? Do we have credentials?
3. **SMS Provider:** Twilio, vonage, or a German provider (sipgate, etc.)?
4. **Obsidian Vault Path:** Where is your Obsidian vault located on disk?
5. **Cleanup:** Should DiggAI-HZV-Rural/ be merged into the main repo or kept separate?
6. **Priority override:** Want to change the execution order above?
