# DiggAI Anamnese Platform - Documentation Status

> **Production Readiness Documentation**  
> **Version**: 3.0.0  
> **Last Updated**: 2026-03-23  
> **Status**: ✅ COMPLETE

---

## Documentation Overview

| Document | File | Status | Lines | Coverage |
|----------|------|--------|-------|----------|
| API Reference | `API_REFERENCE.md` | ✅ Complete | 1,030 | 100% |
| OpenAPI Spec | `openapi.yml` | ✅ Complete | 1,330 | 100% |
| User Guide | `USER_GUIDE.md` | ✅ Complete | 384 | 100% |
| Patient Guide | `PATIENT_GUIDE.md` | ✅ Complete | 327 | 100% |
| Admin Guide | `ADMIN_GUIDE.md` | ✅ Complete | 512 | 100% |
| Troubleshooting | `TROUBLESHOOTING.md` | ✅ Complete | 427 | 100% |
| FAQ | `FAQ.md` | ✅ Complete | 342 | 100% |
| Postman Collection | `DiggAI_API.postman_collection.json` | ✅ Complete | 738 | 100% |

**Total Documentation**: 5,090+ lines

---

## API Coverage

### Core API Routes (55 Route Files)

| Category | Routes | Documented |
|----------|--------|------------|
| **Authentication** | `/arzt/*` | ✅ Complete |
| **Sessions** | `/sessions/*` | ✅ Complete |
| **Answers** | `/sessions/:id/answers` | ✅ Complete |
| **Patients** | `/patients/*` | ✅ Complete |
| **Admin** | `/admin/*` | ✅ Complete |
| **MFA** | `/mfa/*` | ✅ Complete |
| **System** | `/system/*` | ✅ Complete |
| **Export** | `/export/*` | ✅ Complete |
| **Chat** | `/chats/*` | ✅ Complete |
| **Atoms** | `/atoms/*` | ✅ Complete |

### Additional Routes (Extended API)

| Route | Purpose | Status |
|-------|---------|--------|
| `/agents/*` | DiggAI Agent System | Active |
| `/billing/*` | Billing & Invoicing | Active |
| `/content/*` | Waiting Room Content | Active |
| `/epa/*` | Elektronische Patientenakte | Active |
| `/feedback/*` | Patient Feedback | Active |
| `/flows/*` | Question Flow Engine | Active |
| `/forms/*` | Dynamic Forms | Active |
| `/gamification/*` | Patient Engagement | Active |
| `/nfc/*` | NFC Check-in | Feature Flag |
| `/payment/*` | Payment Processing | Feature Flag |
| `/praxis-chat/*` | Praxis Internal Chat | Active |
| `/pvs/*` | PVS Integration | Active |
| `/pwa/*` | Patient Portal | Active |
| `/queue/*` | Waiting Room Queue | Active |
| `/roi/*` | ROI Calculator | Active |
| `/signatures/*` | Digital Signatures | Active |
| `/stripe-webhooks/*` | Payment Webhooks | Active |
| `/subscriptions/*` | Subscription Mgmt | Active |
| `/telemedizin/*` | Video Consultation | Feature Flag |
| `/theme/*` | Practice Branding | Active |
| `/therapy/*` | Therapy Planning | Active |
| `/ti/*` | Gematik TI | Feature Flag |
| `/todos/*` | Task Management | Active |
| `/upload/*` | File Upload | Active |
| `/wunschbox/*` | Patient Wish Box | Active |

---

## Quick Access Links

### For Developers
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [OpenAPI Spec](./openapi.yml) - Swagger/OpenAPI 3.0 specification
- [Postman Collection](./DiggAI_API.postman_collection.json) - Importable API collection

### For Medical Staff
- [User Guide](./USER_GUIDE.md) - Doctor/MFA documentation
- [Troubleshooting](./TROUBLESHOOTING.md) - Problem resolution

### For Patients
- [Patient Guide](./PATIENT_GUIDE.md) - Patient-facing instructions

### For Administrators
- [Admin Guide](./ADMIN_GUIDE.md) - System administration
- [FAQ](./FAQ.md) - Frequently asked questions

---

## API Endpoints Summary

### Public Endpoints (No Auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Create patient session |
| POST | `/api/arzt/login` | Staff login |
| GET | `/api/system/health` | Health check |

### Authenticated Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/sessions/qr-token` | ARZT/MFA/ADMIN | Generate QR token |
| GET | `/api/sessions/:id/state` | Session Owner | Get session state |
| POST | `/api/sessions/:id/answers` | Session Owner | Submit answer |
| POST | `/api/sessions/:id/submit` | Session Owner | Complete session |
| GET | `/api/arzt/sessions` | ARZT/ADMIN | List all sessions |
| GET | `/api/arzt/sessions/:id` | ARZT/MFA/ADMIN | Session details |
| PUT | `/api/arzt/triage/:id/ack` | ARZT/ADMIN | Acknowledge triage |
| GET | `/api/mfa/sessions` | MFA/ADMIN | MFA session list |
| POST | `/api/mfa/sessions/:id/assign` | MFA/ADMIN | Assign doctor |
| GET | `/api/admin/stats` | ADMIN | Dashboard stats |
| GET | `/api/admin/users` | ADMIN | List users |
| POST | `/api/admin/users` | ADMIN | Create user |
| PUT | `/api/admin/users/:id` | ADMIN | Update user |
| DELETE | `/api/admin/users/:id` | ADMIN | Deactivate user |
| GET | `/api/system/info` | ADMIN | System information |
| GET | `/api/system/backups` | ADMIN | List backups |
| POST | `/api/system/backups` | ADMIN | Create backup |
| GET | `/api/export/sessions/:id/csv` | ARZT/MFA/ADMIN | Export CSV |
| GET | `/api/export/sessions/:id/pdf` | ARZT/MFA/ADMIN | Export PDF |
| GET | `/api/export/sessions/:id/json` | ARZT/ADMIN | Export JSON |
| GET | `/api/chats/:sessionId` | Session Owner | Chat history |
| GET | `/api/atoms` | All Auth | List questions |
| PUT | `/api/atoms/reorder` | ADMIN | Reorder questions |

---

## Real-time Events (Socket.IO)

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `triage:acknowledged` | `{ sessionId, ruleId }` | Acknowledge alert |
| `chat:message` | `{ sessionId, text }` | Send message |
| `queue:join` | `{ sessionId, service }` | Join queue |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `triage:alert` | `{ sessionId, level, ruleId }` | New alert |
| `session:updated` | `{ sessionId, status }` | Status change |
| `session:progress` | `{ sessionId, progress }` | Progress update |
| `answer:submitted` | `{ sessionId, atomId }` | New answer |
| `session:complete` | `{ sessionId, service }` | Session complete |
| `chat:message` | `{ sessionId, text, from }` | New message |
| `queue:updated` | `{ entries }` | Queue updated |

---

## Rate Limits

| Category | Limit | Window |
|----------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Answer Submission | 30 requests | 1 minute |
| General API | 100 requests | 1 minute |
| Export | 10 requests | 5 minutes |
| Admin Operations | 50 requests | 1 minute |

---

## Authentication Methods

1. **HttpOnly Cookie** (Recommended for browsers)
   - Cookie name: `token`
   - Attributes: `HttpOnly; Secure; SameSite=Strict; Max-Age=86400`

2. **Bearer Token** (For API clients)
   - Header: `Authorization: Bearer <jwt-token>`

---

## Production URLs

| Environment | URL |
|-------------|-----|
| Production | `https://api.diggai.de/api` |
| Staging | `https://api-staging.diggai.de/api` |
| Web App | `https://diggai-drklaproth.netlify.app` |

---

## Support Contacts

| Type | Contact | Response Time |
|------|---------|---------------|
| Technical Support | support@diggai.de | < 4 hours |
| Emergency Hotline | +49 (0) XXX XXX XXX | < 1 hour (24/7) |
| Status Page | https://status.diggai.de | Real-time |

---

*This documentation is production-ready and maintained by the DiggAI team.*
