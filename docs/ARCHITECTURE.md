# ARCHITECTURE.md — DiggAI Anamnese Platform

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        PATIENT / DOCTOR                          │
│                   Browser / PWA / Kiosk / NFC                   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NETLIFY CDN (Frontend)                       │
│              React 19 SPA — diggai-drklaproth.netlify.app        │
│    Lazy-loaded routes │ Socket.IO client │ Dexie offline DB      │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / WSS (Socket.IO)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS 5 BACKEND (:3001)                     │
│                                                                  │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────────┐  │
│  │ 34 API Routes│  │  Socket.IO  │  │  Security Middleware    │  │
│  │ /api/*       │  │  Server     │  │  Helmet + CORS + Rate   │  │
│  └──────┬───────┘  └──────┬──────┘  └────────────────────────┘  │
│         │                 │                                       │
│  ┌──────▼───────────────────────────────────────────────┐       │
│  │                   Prisma ORM 6                        │       │
│  │  QuestionFlowEngine  │  TriageEngine  │  Services     │       │
│  └──────────────────────┬───────────────────────────────┘       │
└─────────────────────────┼───────────────────────────────────────┘
                          │
           ┌──────────────┼──────────────────┐
           ▼              ▼                  ▼
  ┌─────────────┐  ┌────────────┐  ┌──────────────────┐
  │ PostgreSQL  │  │  Redis 7   │  │   RabbitMQ       │
  │    16       │  │ (optional) │  │   (optional)     │
  │  Primary DB │  │  Cache +   │  │  Agent messaging │
  └─────────────┘  │ Rate limit │  └──────────────────┘
                   └────────────┘
                          │
           ┌──────────────┼──────────────────┐
           ▼              ▼                  ▼
  ┌─────────────┐  ┌────────────┐  ┌──────────────────┐
  │  Ollama LLM │  │ Gematik TI │  │ DiggAI Service 1 │
  │  (optional) │  │   Proxy    │  │ Python AgentCore │
  │ Docker: llm │  │(optional)  │  │  HTTP client     │
  └─────────────┘  └────────────┘  └──────────────────┘
```

---

## DiggAI 4-Service Architecture

| Service | Name | Technology | Status | Location |
|---|---|---|---|---|
| Service 1 | Python Agent Core | Python FastAPI | In progress | `diggai-agent-core/` |
| Service 2 | Tauri Desktop | Rust + Tauri | Pending | `diggai-desktop/` |
| Service 3 | Monorepo | TBD | Pending | `diggai-monorepo/` |
| **Service 4** | **Anamnese Platform** | **React + Express** | **Production** | **`anamnese-app/`** |

Service 4 communicates with Service 1 via HTTP (`server/services/agentcore.client.ts`).

---

## API Route Map (34 route groups)

### Patient Flow

| Route | File | Description |
|---|---|---|
| `/api/sessions` | `routes/sessions.ts` | Session CRUD — create, get, expire |
| `/api/answers` | `routes/answers.ts` | Submit answers + trigger triage |
| `/api/atoms` | `routes/atoms.ts` | Medical question catalog |
| `/api/export` | `routes/export.ts` | PDF / CSV / JSON export |
| `/api/upload` | `routes/upload.ts` | File uploads (multer) |
| `/api/feedback` | `routes/feedback.ts` | Patient feedback |
| `/api/signatures` | `routes/signatures.ts` | eIDAS digital signatures |
| `/api/queue` | `routes/queue.ts` | Waiting room queue |

### Clinical / Doctor

| Route | File | Description |
|---|---|---|
| `/api/arzt` | `routes/arzt.ts` | Doctor dashboard |
| `/api/mfa` | `routes/mfa.ts` | Reception/MFA staff tools |
| `/api/therapy` | `routes/therapy.ts` | Therapy plan management |
| `/api/patients` | `routes/patients.ts` | Patient record management |
| `/api/chats` | `routes/chats.ts` | Real-time chat messages |
| `/api/praxis-chat` | `routes/praxis-chat.ts` | Practice messaging |
| `/api/todos` | `routes/todos.ts` | Staff task management |

### AI / Agents

| Route | File | Description |
|---|---|---|
| `/api/agents` | `routes/agents.ts` | DiggAI agent orchestration |
| `/api/avatar` | `routes/avatar.ts` | Avatar generation |

### Patient PWA Portal

| Route | File | Description |
|---|---|---|
| `/api/pwa` | `routes/pwa.ts` | PWA patient portal backend |
| `/api/gamification` | `routes/gamification.ts` | Points, badges, leaderboard |

### Infrastructure / Integrations

| Route | File | Description |
|---|---|---|
| `/api/system` | `routes/system.ts` | Health check + status |
| `/api/ti` | `routes/ti.ts` | Gematik Telematik-Infrastruktur |
| `/api/epa` | `routes/epa.ts` | ePA electronic health record |
| `/api/pvs` | `routes/pvs.ts` | Practice management system export |
| `/api/nfc` | `routes/nfc.ts` | NFC reader management |
| `/api/telemedizin` | `routes/telemedizin.ts` | Video consultations |
| `/api/flows` | `routes/flows.ts` | Dynamic treatment flows |
| `/api/forms` | `routes/forms.ts` | Custom form builder |

### Commerce / Analytics

| Route | File | Description |
|---|---|---|
| `/api/payments` | `routes/payments.ts` | Payment processing |
| `/api/payment` | `routes/payment.ts` | Payment integration |
| `/api/roi` | `routes/roi.ts` | Return on investment analytics |
| `/api/wunschbox` | `routes/wunschbox.ts` | Patient wish list |
| `/api/content` | `routes/content.ts` | Content delivery |

---

## Authentication Flow

```
Patient/Staff                Express Backend            PostgreSQL
     │                            │                         │
     │── POST /api/arzt/login ────►│                         │
     │                            │── SELECT ArztUser ──────►│
     │                            │◄─ hashedPassword ────────│
     │                            │                         │
     │                            │── bcrypt.compare() ──┐  │
     │                            │◄─────────────────────┘  │
     │                            │                         │
     │                            │── Sign JWT (HS256) ───┐  │
     │◄── Set-Cookie: token=...   │  HttpOnly, Secure     │  │
     │    (HttpOnly, Secure) ─────│◄─────────────────────┘  │
     │                            │                         │
     │── Any /api/* request ──────►│                         │
     │   Cookie: token=... ──────►│── auth.ts middleware     │
     │                            │── Verify JWT ──────────┐ │
     │                            │── Check role (RBAC) ◄──┘ │
     │                            │── Attach req.user        │
     │                            │                         │
```

### RBAC Roles

| Role | Access |
|---|---|
| `PATIENT` | Own sessions, own answers, own PWA portal |
| `ARZT` | All sessions, triage dashboard, therapy plans, chat |
| `MFA` | Queue management, session assignment, chat |
| `ADMIN` | All above + user management, system config, question editor |

---

## Socket.IO Event Map

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `triage:alert` | Server → Client | `{ sessionId, level, ruleId, details }` | CRITICAL/WARNING triage trigger |
| `triage:acknowledged` | Client → Server | `{ sessionId, ruleId, userId }` | Doctor acknowledges alert |
| `session:updated` | Server → Client | `{ sessionId, status }` | Session status change |
| `chat:message` | Bidirectional | `{ sessionId, text, from, timestamp }` | Patient ↔ Doctor chat |
| `queue:updated` | Server → Client | `{ entries: QueueEntry[] }` | Waiting room queue change |
| `agent:task:status` | Server → Client | `{ taskId, status, result }` | Agent task completion |
| `session:triage` | Server → Client | `{ sessionId, triageLevel }` | Triage level update |

---

## Optional Services Activation

| Service | Default | Activation Method | Docker Profile |
|---|---|---|---|
| Redis | Disabled | Set `REDIS_URL` env var | `redis` |
| RabbitMQ | Disabled | App degrades gracefully | `rabbitmq` |
| Ollama (LLM) | Disabled | Set `LLM_ENDPOINT` env var | `llm` |
| Gematik TI | Disabled | `TI_ENABLED=true` + profile | `ti` |
| NFC Reader | Disabled | `NFC_ENABLED=true` | N/A |
| Payment | Disabled | `PAYMENT_ENABLED=true` | N/A |
| Telemedicine | Disabled | `TELEMED_ENABLED=true` | N/A |

Start all optional services locally:
```bash
docker-compose -f docker-compose.local.yml --profile redis --profile llm up -d
```
