/**
 * Tomedo Import Bridge — File-Handoff Endpoint
 *
 * Empfängt JSON-Payload vom AppleScript (scripts/tomedo-praktiq.applescript v2.0).
 * Schreibt Handshake-Datei zurück, damit der Caller die Temp-Datei löschen kann.
 *
 * SECURITY:
 *  - Pfad muss in einem Allowlist-Verzeichnis liegen (default: /tmp/diggai-tomedo.*)
 *  - Schema wird mit Zod validiert
 *  - PII wird NIE geloggt — nur pId + Mode + Timestamp
 *  - Audit-Log via auditLoggerAgent.logAction (actor+pid+mode, kein PII)
 */

import { Router, type Request, type Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { executeTomedoBridge } from '../agents/tomedo-bridge.agent.js';
import { auditLoggerAgent } from '../agents/tomedo-bridge/team-delta/audit-logger.agent.js';
import { createLogger } from '../logger.js';

const logger = createLogger('TomedoImportRoutes');
const router = Router();

// ----------------------------------------------------------
// Zod-Schema spiegelt das AppleScript-JSON (schemaVersion 2.0)
// ----------------------------------------------------------
const ImportPayloadSchema = z.object({
    schemaVersion: z.literal('2.0'),
    source: z.literal('tomedo-praktiq-bridge'),
    timestamp: z.string().datetime(),
    mode: z.enum(['Gesamte Akte', 'Nur Auswahl', 'Abbrechen']),
    patient: z.object({
        id: z.string().min(1),
        lastName: z.string(),
        firstName: z.string(),
        birthDate: z.string(),
        gender: z.string().optional().default(''),
        age: z.string().optional().default(''),
        email: z.string().optional().default(''),
        phone: z.string().optional().default(''),
        mobile: z.string().optional().default(''),
        insuranceNumber: z.string().optional().default(''),
        address: z.object({
            street: z.string().optional().default(''),
            zip: z.string().optional().default(''),
            city: z.string().optional().default(''),
        }),
    }),
    practice: z.object({
        bsnr: z.string().optional().default(''),
        lanr: z.string().optional().default(''),
        specialty: z.string().optional().default(''),
        userInitials: z.string().optional().default(''),
    }),
    akte: z.string(),
    selection: z.string().optional().default(''),
    handshakePath: z.string().optional(),
});

type ImportPayload = z.infer<typeof ImportPayloadSchema>;

// ----------------------------------------------------------
// Pfad-Allowlist: Nur Temp-Dateien aus /tmp/diggai-tomedo.* zulassen
// ----------------------------------------------------------
const ALLOWED_TMP_PREFIX = '/tmp/diggai-tomedo.';

function isAllowedPath(p: string): boolean {
    const normalized = path.normalize(p);
    return normalized.startsWith(ALLOWED_TMP_PREFIX) && normalized.endsWith('.json');
}

// ----------------------------------------------------------
// POST /api/tomedo-bridge/import
//   Body: { filePath: string }  ODER  { payload: ImportPayload }
// ----------------------------------------------------------
router.post(
    '/import',
    requireAuth,
    requireRole('arzt', 'admin'),
    async (req: Request, res: Response) => {
        const startedAt = Date.now();

        try {
            let payload: ImportPayload;

            if (req.body?.filePath) {
                // Datei-Modus: AppleScript hat JSON in /tmp gelegt
                const filePath = String(req.body.filePath);

                if (!isAllowedPath(filePath)) {
                    logger.warn('[Import] Rejected non-allowlisted path', { filePath });
                    return res.status(400).json({
                        success: false,
                        error: 'filePath outside allowed directory',
                    });
                }

                const raw = await fs.readFile(filePath, 'utf8');
                payload = ImportPayloadSchema.parse(JSON.parse(raw));
            } else if (req.body?.payload) {
                // Direkt-Modus (Tests, n8n, etc.)
                payload = ImportPayloadSchema.parse(req.body.payload);
            } else {
                return res.status(400).json({
                    success: false,
                    error: 'Either filePath or payload required',
                });
            }

            // PII-armes Logging
            logger.info('[Import] Payload accepted', {
                pid: payload.patient.id,
                mode: payload.mode,
                aktenLen: payload.akte.length,
                selectionLen: payload.selection.length,
            });

            // tenantId/connectionId müssen aus Auth-Context kommen, NICHT aus Payload
            const tenantId = (req as any).user?.tenantId;
            const connectionId = (req as any).user?.activeTomedoConnectionId
                ?? req.headers['x-tomedo-connection-id'];

            if (!tenantId || !connectionId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing tenantId or connectionId in auth context',
                });
            }

            // Bridge ausführen (existierender Multi-Agent-Stack)
            const { taskId, result } = await executeTomedoBridge(
                {
                    patientSessionId: `tomedo-import-${payload.patient.id}-${Date.now()}`,
                    tenantId,
                    connectionId: String(connectionId),
                    anamneseData: {
                        // BridgeInput.anamneseData expects `answers` — wrap tomedo-specific
                        // fields so downstream agents can access them via answers.*
                        answers: {
                            akte: payload.akte,
                            selection: payload.selection,
                            mode: payload.mode,
                        },
                    },
                    patientData: {
                        externalPatientId: payload.patient.id,
                        // BridgeInput.patientData has a single `name` field
                        name: `${payload.patient.firstName} ${payload.patient.lastName}`.trim(),
                        dob: payload.patient.birthDate,
                    },
                },
                { waitForCompletion: true }
            );

            // Handshake schreiben → AppleScript darf Temp-Datei löschen
            if (payload.handshakePath && isAllowedPath(payload.handshakePath.replace('.done', '.json'))) {
                try {
                    await fs.writeFile(
                        payload.handshakePath,
                        JSON.stringify({ ok: true, taskId, at: new Date().toISOString() }),
                        { mode: 0o600 }
                    );
                } catch (e) {
                    logger.warn('[Import] Handshake write failed', { err: String(e) });
                }
            }

            // Audit — best-effort, non-blocking
            try {
                auditLoggerAgent.logAction({
                    action: 'tomedo-import',
                    actor: (req as any).user?.id ?? 'unknown',
                    pid: payload.patient.id,
                    mode: payload.mode,
                    taskId,
                });
            } catch {
                // best-effort: audit failure must never break the response
            }

            return res.status(result?.success ? 200 : 207).json({
                success: result?.success ?? true,
                taskId,
                durationMs: Date.now() - startedAt,
                handshakeWritten: Boolean(payload.handshakePath),
                summary: result
                    ? {
                          ethics: result.teams.alpha.ethics.complianceStatus,
                          requiresApproval: result.teams.alpha.humanLoop.requiresApproval,
                          karteityp: result.teams.bravo.documentation.karteityp,
                          checksum: result.teams.delta.markdown.metadata.checksum,
                      }
                    : null,
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error('[Import] Failed', { error: msg });

            if (err instanceof z.ZodError) {
                return res.status(422).json({
                    success: false,
                    error: 'Schema validation failed',
                    issues: err.issues,
                });
            }

            return res.status(500).json({ success: false, error: msg });
        }
    }
);

// ----------------------------------------------------------
// GET /api/tomedo-bridge/import/health
//   Smoketest-Endpoint (kein Auth-Required, nur Status)
// ----------------------------------------------------------
router.get('/import/health', (_req: Request, res: Response) => {
    res.json({
        ok: true,
        endpoint: 'tomedo-import',
        schemaVersion: '2.0',
        allowedPrefix: ALLOWED_TMP_PREFIX,
    });
});

export default router;
