# DiggAI API Reference v3.0.0

> **Version**: 3.0.0  
> **Last Updated**: 2026-03-23  
> **Base URL (Production)**: `https://api.diggai.de/api`  
> **Base URL (Staging)**: `https://api-staging.diggai.de/api`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Error Handling](#error-handling)
3. [Rate Limiting](#rate-limiting)
4. [API Endpoints](#api-endpoints)
   - [Sessions](#sessions)
   - [Answers](#answers)
   - [Authentication (Arzt/MFA/Admin)](#authentication-arztmfaadmin)
   - [Admin](#admin)
   - [MFA](#mfa)
   - [System](#system)
   - [Triage](#triage)
   - [Export](#export)
   - [Chat](#chat)
   - [Atoms](#atoms)
5. [Socket.IO Events](#socketio-events)
6. [Data Models](#data-models)

---

## Authentication

DiggAI uses JWT (JSON Web Tokens) with HS256 signing for authentication.

### Methods

1. **HttpOnly Cookie** (Recommended for browser clients)
   - Cookie name: `token`
   - Attributes: `HttpOnly; Secure; SameSite=Strict; Max-Age=86400`

2. **Bearer Token** (For API clients)
   - Header: `Authorization: Bearer <jwt-token>`

### Login Flow

```bash
# 1. Authenticate
POST /api/arzt/login
Content-Type: application/json

{
  "username": "dr.klaproth",
  "password": "your-secure-password"
}

# 2. Use cookie automatically OR extract token from response
# 3. Include cookie/token in subsequent requests
```

### Token Payload

```json
{
  "userId": "cuid-string",
  "role": "ARZT|MFA|ADMIN",
  "iat": 1710000000,
  "exp": 1710086400,
  "jti": "unique-token-id"
}
```

---

## Error Handling

All errors follow this structure:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}  // Optional additional context
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Missing or invalid authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

### Error Codes Reference

| Code | Description | Resolution |
|------|-------------|------------|
| `AUTH_INVALID_CREDENTIALS` | Username/password incorrect | Check credentials, verify Caps Lock |
| `AUTH_TOKEN_EXPIRED` | JWT token has expired | Re-login or use refresh token |
| `AUTH_INSUFFICIENT_PERMISSIONS` | User role not authorized for action | Contact admin for permission upgrade |
| `SESSION_NOT_FOUND` | Session ID doesn't exist | Verify session ID or create new session |
| `SESSION_EXPIRED` | Patient session timed out (24h) | Start new session |
| `SESSION_ALREADY_COMPLETED` | Session status is not ACTIVE | Cannot modify completed sessions |
| `VALIDATION_FAILED` | Input data failed Zod validation | Check request body against schema |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait for rate limit window to reset |
| `TENANT_CONTEXT_REQUIRED` | Missing tenant scope | Include tenant header or context |
| `TENANT_SCOPE_VIOLATION` | Cross-tenant access attempt | Verify user has access to this tenant |
| `EXPORT_SESSION_NOT_FOUND` | Session not found for export | Verify session ID |
| `EXPORT_SCOPE_VIOLATION` | No access to export this session | Verify user permissions |

---

## Rate Limiting

Rate limits are applied per endpoint category:

| Category | Limit | Window |
|----------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Answer Submission | 30 requests | 1 minute |
| General API | 100 requests | 1 minute |
| Export | 10 requests | 5 minutes |
| Admin Operations | 50 requests | 1 minute |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1710003660
```

---

## API Endpoints

### Sessions

Patient session management - the core of the anamnese flow.

#### POST /api/sessions

Create a new patient session.

**Auth**: None (creates anonymous session)  
**Rate Limit**: General API

**Request Body:**
```json
{
  "selectedService": "Termin / Anamnese",
  "email": "optional@example.com",
  "isNewPatient": true,
  "gender": "W",
  "birthDate": "1985-06-15",
  "insuranceType": "Gesetzlich",
  "encryptedName": "encrypted-string"
}
```

**Response (201):**
```json
{
  "sessionId": "clu1234567890abcdef",
  "nextAtomIds": ["0000"]
}
```

**cURL Example:**
```bash
curl -X POST https://api.diggai.de/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "selectedService": "Termin / Anamnese",
    "isNewPatient": true
  }'
```

---

#### POST /api/sessions/qr-token

Generate a QR code token for patient self-start.

**Auth**: Required (ARZT/MFA/ADMIN)  
**Rate Limit**: General API

**Request Body:**
```json
{
  "service": "Termin / Anamnese"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

#### GET /api/sessions/:id/state

Get full session state including answers and triage events.

**Auth**: Required (Session owner, ARZT, MFA, ADMIN)  
**Rate Limit**: General API

**Response (200):**
```json
{
  "session": {
    "id": "clu1234567890abcdef",
    "isNewPatient": true,
    "gender": "W",
    "birthDate": "1985-06-15T00:00:00.000Z",
    "status": "ACTIVE",
    "selectedService": "Termin / Anamnese",
    "insuranceType": "Gesetzlich",
    "createdAt": "2026-03-23T10:00:00.000Z",
    "completedAt": null
  },
  "answers": {
    "0000": { "value": "ja", "answeredAt": "2026-03-23T10:01:00.000Z", "timeSpentMs": 5000 }
  },
  "triageEvents": [],
  "totalAnswers": 1
}
```

---

#### POST /api/sessions/:id/submit

Submit/complete a patient session.

**Auth**: Required (Session owner)  
**Rate Limit**: General API

**Response (200):**
```json
{
  "success": true,
  "sessionId": "clu1234567890abcdef",
  "completedAt": "2026-03-23T10:30:00.000Z"
}
```

---

#### POST /api/sessions/refresh-token

Refresh an expiring JWT token.

**Auth**: Required (Valid but expiring token)  
**Rate Limit**: General API

**Response (200):**
```json
{
  "success": true
}
```

---

### Answers

Submit patient answers and trigger triage evaluation.

#### POST /api/sessions/:id/answers

Submit an answer for a specific question (atom).

**Auth**: Required (Session owner)  
**Rate Limit**: Answer Submission (30/min)

**Request Body:**
```json
{
  "atomId": "0001",
  "value": "Musterfrau",
  "timeSpentMs": 3500
}
```

**Response (200):**
```json
{
  "success": true,
  "answerId": "clu0987654321fedcba",
  "redFlags": [
    {
      "level": "CRITICAL",
      "ruleId": "ACS",
      "message": "Mögliches Akutes Koronarsyndrom"
    }
  ],
  "progress": 25
}
```

**cURL Example:**
```bash
curl -X POST https://api.diggai.de/api/sessions/clu1234567890abcdef/answers \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<jwt-token>" \
  -d '{
    "atomId": "0001",
    "value": "Musterfrau",
    "timeSpentMs": 3500
  }'
```

---

### Authentication (Arzt/MFA/Admin)

#### POST /api/arzt/login

Authenticate medical staff.

**Auth**: None  
**Rate Limit**: Authentication (5/15min)

**Request Body:**
```json
{
  "username": "dr.klaproth",
  "password": "secure-password"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "cluabcdefghijklmnop",
    "username": "dr.klaproth",
    "displayName": "Dr. Klapproth"
  }
}
```
**Note**: Sets HttpOnly cookie automatically.

---

#### POST /api/arzt/logout

Logout and invalidate token.

**Auth**: Required  
**Rate Limit**: General API

**Response (200):**
```json
{
  "message": "Erfolgreich abgemeldet"
}
```

---

#### GET /api/arzt/sessions

List all patient sessions (doctor view).

**Auth**: Required (ARZT/ADMIN)  
**Rate Limit**: General API

**Response (200):**
```json
{
  "sessions": [
    {
      "id": "clu1234567890abcdef",
      "patientName": "Erika Musterfrau",
      "isNewPatient": true,
      "gender": "W",
      "selectedService": "Termin / Anamnese",
      "status": "ACTIVE",
      "createdAt": "2026-03-23T10:00:00.000Z",
      "completedAt": null,
      "totalAnswers": 15,
      "totalTriageEvents": 1,
      "unresolvedCritical": 1
    }
  ]
}
```

---

#### GET /api/arzt/sessions/:id

Get detailed session view with decrypted PII.

**Auth**: Required (ARZT/MFA/ADMIN)  
**Rate Limit**: General API

**Response (200):**
```json
{
  "session": {
    "id": "clu1234567890abcdef",
    "patientName": "Erika Musterfrau",
    "answers": [
      {
        "id": "ans1",
        "atomId": "0001",
        "value": { "data": "Musterfrau" },
        "questionText": "Nachname",
        "section": "basis",
        "answerType": "text",
        "answeredAt": "2026-03-23T10:01:00.000Z"
      }
    ],
    "triageEvents": [
      {
        "id": "tri1",
        "level": "WARNING",
        "message": "Polypharmazie (>5 Medikamente)",
        "triggerValues": ["..."],
        "createdAt": "2026-03-23T10:05:00.000Z"
      }
    ]
  }
}
```

---

### Admin

Administrative functions for system management.

#### GET /api/admin/stats

Get dashboard statistics.

**Auth**: Required (ADMIN)  
**Rate Limit**: Admin Operations

**Response (200):**
```json
{
  "totalPatients": 1250,
  "totalSessions": 3420,
  "activeSessions": 15,
  "completedSessions": 3400,
  "sessionsToday": 45,
  "completionRate": 85,
  "avgCompletionMinutes": 12,
  "unresolvedTriageEvents": 3,
  "totalUsers": 8
}
```

---

#### GET /api/admin/sessions/timeline

Get session timeline for charts.

**Query Parameters:**
- `days` (number, default: 30): Number of days to include (1-365)

**Response (200):**
```json
[
  { "date": "2026-03-01", "total": 45, "completed": 40, "active": 5 },
  { "date": "2026-03-02", "total": 52, "completed": 48, "active": 4 }
]
```

---

#### GET /api/admin/analytics/services

Get service distribution analytics.

**Response (200):**
```json
[
  { "service": "Termin / Anamnese", "count": 1500 },
  { "service": "Rezeptanfrage", "count": 800 },
  { "service": "AU-Anfrage", "count": 300 }
]
```

---

#### GET /api/admin/analytics/triage

Get triage event analytics.

**Query Parameters:**
- `days` (number, default: 30): Number of days to include

**Response (200):**
```json
[
  { "date": "2026-03-01", "critical": 2, "warning": 5, "acknowledged": 6 },
  { "date": "2026-03-02", "critical": 1, "warning": 3, "acknowledged": 4 }
]
```

---

#### GET /api/admin/audit-log

Get paginated audit log entries.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 25, max: 100)
- `action` (string): Filter by action type
- `userId` (string): Filter by user
- `dateFrom` (string): ISO date
- `dateTo` (string): ISO date
- `search` (string): Search term

**Response (200):**
```json
{
  "entries": [
    {
      "id": "log1",
      "userId": "user1",
      "action": "VIEW_SESSION_DETAIL",
      "resource": "sessions/clu123...",
      "ipHash": "sha256-hash",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2026-03-23T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 1000,
    "totalPages": 40
  }
}
```

---

#### GET /api/admin/users

List all users.

**Auth**: Required (ADMIN + admin_users permission)

**Response (200):**
```json
[
  {
    "id": "user1",
    "username": "dr.klaproth",
    "displayName": "Dr. Klapproth",
    "role": "ARZT",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "_count": { "assignedSessions": 150 }
  }
]
```

---

#### POST /api/admin/users

Create new user.

**Request Body:**
```json
{
  "username": "new.mfa",
  "password": "secure-password",
  "displayName": "MFA Mustermann",
  "role": "MFA"
}
```

**Response (201):**
```json
{
  "id": "newuser1",
  "username": "new.mfa",
  "displayName": "MFA Mustermann",
  "role": "MFA",
  "createdAt": "2026-03-23T10:00:00.000Z"
}
```

---

#### PUT /api/admin/users/:id

Update user.

**Request Body:**
```json
{
  "displayName": "Updated Name",
  "role": "ARZT",
  "isActive": true,
  "password": "new-password",
  "pin": "1234"
}
```

---

#### DELETE /api/admin/users/:id

Soft-delete (deactivate) user.

**Response (200):**
```json
{
  "success": true,
  "message": "Benutzer deaktiviert"
}
```

---

### MFA

Medical assistant/reception endpoints.

#### GET /api/mfa/sessions

List all sessions for MFA overview.

**Auth**: Required (MFA/ADMIN)  
**Rate Limit**: General API

**Response (200):**
```json
{
  "sessions": [
    {
      "id": "clu123...",
      "selectedService": "Termin / Anamnese",
      "status": "ACTIVE",
      "createdAt": "2026-03-23T10:00:00.000Z",
      "totalAnswers": 10,
      "unresolvedCritical": 0,
      "assignedArzt": { "id": "arzt1", "displayName": "Dr. Klapproth" }
    }
  ]
}
```

---

#### GET /api/mfa/doctors

List all available doctors.

**Response (200):**
```json
{
  "doctors": [
    { "id": "arzt1", "displayName": "Dr. Klapproth", "username": "dr.klaproth" }
  ]
}
```

---

#### POST /api/mfa/sessions/:id/assign

Assign a session to a doctor.

**Request Body:**
```json
{
  "arztId": "arzt1"
}
```

**Response (200):**
```json
{
  "success": true,
  "session": { ... }
}
```

---

### System

System health and configuration endpoints.

#### GET /api/system/health

Health check endpoint.

**Auth**: None  
**Rate Limit**: None (exempt)

**Response (200):**
```json
{
  "status": "ok",
  "version": "3.0.0",
  "timestamp": "2026-03-23T10:00:00.000Z",
  "environment": "production",
  "db": "connected",
  "redis": "connected",
  "uptime": 86400
}
```

---

#### GET /api/system/info

System information.

**Auth**: Required (ADMIN)

**Response (200):**
```json
{
  "uptime": 86400,
  "nodeVersion": "v22.0.0",
  "platform": "linux",
  "arch": "x64",
  "hostname": "anamnese-prod-01",
  "totalMemory": 16777216000,
  "freeMemory": 8388608000,
  "cpuCount": 8,
  "processMemory": { "rss": 150000000, "heapTotal": 100000000 },
  "loadAverage": [0.5, 0.6, 0.7]
}
```

---

#### GET /api/system/backups

List backups.

**Auth**: Required (ADMIN)

**Response (200):**
```json
[
  {
    "id": "backup1",
    "type": "full",
    "status": "completed",
    "createdAt": "2026-03-23T00:00:00.000Z",
    "size": 1073741824
  }
]
```

---

#### POST /api/system/backups

Create new backup.

**Request Body:**
```json
{
  "type": "full",
  "tables": ["Patient", "PatientSession", "Answer"]
}
```

---

### Triage

#### PUT /api/arzt/triage/:id/ack

Acknowledge a triage event.

**Auth**: Required (ARZT/ADMIN)

**Response (200):**
```json
{
  "success": true,
  "event": {
    "id": "tri1",
    "acknowledgedBy": "arzt1",
    "acknowledgedAt": "2026-03-23T10:05:00.000Z"
  }
}
```

---

### Export

#### GET /api/export/sessions/:id/export/csv

Export session as CSV.

**Auth**: Required (ARZT/MFA/ADMIN)  
**Rate Limit**: Export (10/5min)

**Response**: `text/csv` attachment

---

#### GET /api/export/sessions/:id/export/pdf

Export session as HTML/PDF.

**Auth**: Required (ARZT/MFA/ADMIN)

**Response**: `text/html` inline

---

#### GET /api/export/sessions/:id/export/json

Export session as JSON.

**Auth**: Required (ARZT/ADMIN)

**Response (200):**
```json
{
  "patient": {
    "name": "Erika Musterfrau",
    "gender": "W",
    "birthDate": "1985-06-15",
    "insuranceType": "Gesetzlich"
  },
  "service": "Termin / Anamnese",
  "status": "COMPLETED",
  "answers": [...],
  "triageEvents": [...],
  "exportedAt": "2026-03-23T10:00:00.000Z"
}
```

---

### Chat

#### GET /api/chats/:sessionId

Get chat message history.

**Auth**: Required (Session owner or ARZT/MFA/ADMIN)

**Response (200):**
```json
{
  "messages": [
    {
      "id": "msg1",
      "sessionId": "clu123...",
      "senderType": "ARZT",
      "senderId": "arzt1",
      "text": "Ihre Anfrage wurde bearbeitet.",
      "fromName": "Praxis-System",
      "timestamp": "2026-03-23T10:00:00.000Z"
    }
  ]
}
```

---

### Atoms

Medical question catalog management.

#### GET /api/atoms

Get question atoms.

**Query Parameters:**
- `ids` (string): Comma-separated atom IDs
- `module` (string): Filter by module
- `section` (string): Filter by section

**Response (200):**
```json
{
  "atoms": [
    {
      "id": "0000",
      "questionText": "Sind Sie bereits als Patient in unserer Praxis bekannt?",
      "answerType": "radio",
      "options": [
        { "value": "ja", "label": "Ja, ich bin bereits Patient" },
        { "value": "nein", "label": "Nein, ich bin zum ersten Mal hier" }
      ],
      "section": "basis",
      "orderIndex": 0,
      "isRequired": true,
      "isActive": true
    }
  ]
}
```

---

#### GET /api/atoms/:id

Get single atom.

---

#### PUT /api/atoms/reorder

Reorder atoms (drag & drop).

**Auth**: Required (ADMIN)

**Request Body:**
```json
{
  "orders": [
    { "id": "0000", "orderIndex": 0 },
    { "id": "0001", "orderIndex": 1 }
  ]
}
```

---

#### PUT /api/atoms/:id/toggle

Activate/deactivate atom.

**Request Body:**
```json
{
  "isActive": false
}
```

---

## Socket.IO Events

Real-time events for live updates.

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `triage:acknowledged` | `{ sessionId, ruleId, userId }` | Doctor acknowledges triage alert |
| `chat:message` | `{ sessionId, text, from }` | Send chat message |
| `queue:join` | `{ sessionId, service }` | Join waiting room queue |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `triage:alert` | `{ sessionId, level, ruleId, ruleName, details }` | New triage alert fired |
| `session:updated` | `{ sessionId, status }` | Session status changed |
| `session:triage` | `{ sessionId, triageLevel }` | Session triage level updated |
| `session:progress` | `{ sessionId, progress }` | Patient progress update |
| `answer:submitted` | `{ sessionId, atomId, progress, totalAnswers }` | New answer submitted |
| `session:complete` | `{ sessionId, service }` | Session completed |
| `chat:message` | `{ sessionId, text, from, timestamp }` | New chat message |
| `queue:updated` | `{ entries: QueueEntry[] }` | Queue changed |

---

## Data Models

### SessionStatus

```typescript
enum SessionStatus {
  ACTIVE = 'ACTIVE',       // Patient filling form
  COMPLETED = 'COMPLETED', // Form completed, not submitted
  SUBMITTED = 'SUBMITTED', // Submitted to practice
  EXPIRED = 'EXPIRED'      // Timed out (24h auto-expiry)
}
```

### Role

```typescript
enum Role {
  PATIENT = 'PATIENT',
  ARZT = 'ARZT',
  MFA = 'MFA',
  ADMIN = 'ADMIN'
}
```

### TriageLevel

```typescript
type TriageLevel = 'CRITICAL' | 'WARNING' | null;
```

### AnswerValue

```typescript
interface AnswerValue {
  type: 'text' | 'multiselect' | 'other';
  data: string | string[] | any;
}
```

---

## Support

- **Technical Support**: support@diggai.de
- **Emergency Hotline**: +49 (0) XXX XXX XXX
- **Documentation**: https://docs.diggai.de
- **Status Page**: https://status.diggai.de
