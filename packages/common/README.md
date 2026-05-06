# @diggai/common

Geteilte Library für DiggAi Capture und Suite. Enthält Funktionalität, die **kein Medizinprodukt** im Sinne MDR Art. 2 ist:

- **Auth** — Passkey, TOTP, Refresh-Token, Device-Fingerprint, JWT
- **Encryption** — AES-256-GCM für Patientendaten
- **Audit** — DSGVO Art. 30 Audit-Log
- **Middleware** — CORS, CSRF, Rate-Limit, Helmet
- **Prisma** — PrismaClient-Wrapper mit Connection-Pooling
- **Types** — gemeinsame TypeScript-Types

## Status: Scaffold (Phase 1)

Aktuell leer. Code-Migration aus `server/services/auth/`, `server/services/encryption.ts`, `server/services/audit.service.ts` etc. erfolgt in **Phase 2** der Restrukturierung.

## Verwendung (nach Phase 2)

```ts
import { encryptPHI, decryptPHI } from '@diggai/common/encryption';
import { requireAuth, csrfMiddleware } from '@diggai/common/auth';
import { prisma } from '@diggai/common/prisma';
import { writeAuditLog } from '@diggai/common/audit';
```

## Compliance

Diese Library ist **kein Medizinprodukt**. Sie wird gleichzeitig von der Capture-Komponente (Klasse I) und der Suite-Komponente (Klasse IIa) genutzt. Änderungen an dieser Library erfordern keine MDR-Konformitätsbewertung, müssen aber DSGVO-konform sein.
