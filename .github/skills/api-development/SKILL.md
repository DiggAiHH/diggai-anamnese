---
name: api-development
description: "Express 5 REST API development patterns for DiggAI backend. Use when creating routes, middleware, services, API hooks, Socket.IO events, or backend business logic. Covers auth, validation, error handling, Prisma queries, and DSGVO-compliant response patterns."
metadata:
  author: diggai
  version: "1.0"
  domain: backend
---

# API Development Skill

## Stack

- **Express 5.2** mit TypeScript strict
- **Prisma 6** ORM (kein Raw SQL)
- **JWT HS256** + HttpOnly Cookies + RBAC
- **Zod** für Request-Validierung
- **Socket.IO 4** für Realtime
- **AES-256-GCM** für PII-Felder

## Projekt-Struktur

```
server/
├── routes/           # 34 API-Routengruppen
├── middleware/        # Auth, Audit, Validation
│   ├── auth.ts       # JWT + RBAC
│   ├── audit.ts      # HIPAA-konformes Logging
│   └── validation.ts # Zod-Schema-Validation
├── services/         # Business Logic (40+ Module)
├── engine/           # Kritische Engines
│   ├── TriageEngine.ts
│   └── QuestionFlowEngine.ts
├── agents/           # DiggAI 5-Agenten-System
├── jobs/             # Hintergrund-Jobs (node-cron)
└── index.ts          # Express Entry Point
```

## Route-Pattern (Standard)

```typescript
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { auditLogger } from '../middleware/audit';
import { z } from 'zod';

const router = Router();

// Schema
const CreateItemSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

// Route mit Auth + Audit
router.post('/',
  authenticate,
  authorize(['ADMIN', 'ARZT']),
  async (req, res) => {
    const parsed = CreateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    
    const result = await prisma.item.create({
      data: parsed.data,
    });
    
    auditLogger.log({
      userId: req.user.id,
      action: 'CREATE_ITEM',
      resourceId: result.id,
    });
    
    res.status(201).json(result);
  }
);

export default router;
```

## Harte Regeln

1. **Auth-Middleware** auf ALLEN Routen mit Patientendaten
2. **Zod-Validierung** für alle Request Bodies
3. **Input-Sanitization** über `server/services/sanitize.ts` vor DB-Writes
4. **Prisma ORM** statt Raw SQL
5. **Audit-Logging** für alle datenverändernden Operationen
6. **Keine PHI in Responses** die nicht für den anfragenden User bestimmt sind
7. **Error-Responses** ohne Stack Traces in Production

## Frontend-Hooks (React Query)

Neue API-Routen brauchen korrespondierende Frontend-Hooks:
- `src/hooks/useApi.ts` (1500+ Zeilen — VORSICHT)
- `src/hooks/usePatientApi.ts`
- `src/hooks/useStaffApi.ts`
- `src/hooks/useAgentApi.ts`

## Socket.IO Events

```typescript
// server/socket.ts
io.on('connection', (socket) => {
  socket.on('queue:update', (data) => {
    io.to(`practice:${data.practiceId}`).emit('queue:changed', data);
  });
});
```

## Error-Handling Pattern

```typescript
// Einheitliches Error-Response-Format
res.status(statusCode).json({
  error: 'Kurze Fehlerbeschreibung',
  code: 'ERROR_CODE',
  details: process.env.NODE_ENV === 'development' ? err.message : undefined
});
```
