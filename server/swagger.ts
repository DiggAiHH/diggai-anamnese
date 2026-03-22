/**
 * @module swagger
 * @description OpenAPI 3.0 Swagger-Spezifikation für die DiggAI Anamnese API
 *
 * Wird NUR in der Entwicklungsumgebung unter /api/docs bereitgestellt.
 * In Production (NODE_ENV=production) ist dieser Endpunkt NICHT verfügbar.
 *
 * @access http://localhost:3001/api/docs (local dev only)
 */
// @ts-expect-error swagger-jsdoc has no bundled TypeScript declarations in this workspace
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'DiggAI Anamnese API',
            version: '3.0.0',
            description: `
## DiggAI Anamnese Platform — REST API

DSGVO-konforme, klinische Patientenaufnahme-Plattform für Arztpraxen.

### Authentifizierung
- **HttpOnly Cookie**: Browser-Clients senden 'access_token' Cookie automatisch
- **Bearer Token**: API-Clients senden 'Authorization: Bearer <token>' Header
- Tokens werden mit HS256 signiert und haben eine Gültigkeit von 24h

### RBAC Rollen
| Rolle | Zugriff |
|-------|---------|
| patient | Eigene Sessions, Antworten, PWA-Portal |
| arzt | Alle Sessions, Triage-Dashboard, Therapiepläne |
| mfa | Queue-Management, Session-Zuweisung |
| admin | Alles + Benutzerverwaltung, Systemkonfiguration |

### Datenschutz
- PII-Daten (Name, Adresse, E-Mail) werden AES-256-GCM verschlüsselt gespeichert
- E-Mails werden SHA-256 gehashed zur Pseudonymisierung
- Alle Patientendaten-Zugriffe werden via AuditLog protokolliert
            `,
            contact: {
                name: 'DiggAI Support',
                email: 'support@diggai.de',
            },
            license: {
                name: 'Proprietary',
            },
        },
        servers: [
            {
                url: process.env.VITE_API_URL || 'http://localhost:3001/api',
                description: 'Current environment',
            },
            {
                url: 'http://localhost:3001/api',
                description: 'Local development',
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT Token aus POST /api/arzt/login',
                },
                CookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'access_token',
                    description: 'HttpOnly Cookie (Browser-Clients)',
                },
            },
            schemas: {
                PatientSession: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'cuid', description: 'Session-ID' },
                        status: {
                            type: 'string',
                            enum: ['ACTIVE', 'COMPLETED', 'SUBMITTED', 'EXPIRED'],
                        },
                        selectedService: { type: 'string', example: 'Termin / Anamnese' },
                        triageLevel: {
                            type: 'string',
                            enum: ['CRITICAL', 'WARNING'],
                            nullable: true,
                        },
                        language: { type: 'string', example: 'de' },
                        startedAt: { type: 'string', format: 'date-time' },
                    },
                },
                TriageEvent: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        ruleId: { type: 'string', example: 'CRITICAL_ACS' },
                        level: { type: 'string', enum: ['CRITICAL', 'WARNING'] },
                        details: { type: 'string', description: 'JSON mit triggeredAnswers + timestamp' },
                        acknowledged: { type: 'boolean' },
                    },
                },
                Answer: {
                    type: 'object',
                    properties: {
                        questionId: { type: 'string', example: '1002' },
                        value: { description: 'JSON-serialisierter Antwortwert (string/array/number)' },
                        answeredAt: { type: 'string', format: 'date-time' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', description: 'Fehlermeldung' },
                    },
                    required: ['error'],
                },
            },
        },
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
    },
    apis: [
        './server/routes/*.ts',
        './server/routes/**/*.ts',
    ],
};

export const swaggerSpec = swaggerJsdoc(options as any);
