import { Router } from 'express';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db';
import { requireAuth, requireSessionOwner } from '../middleware/auth';
import { decrypt, encrypt, isPIIAtom } from '../services/encryption';
import { RoutingEngine } from '../engine/RoutingEngine';
import { emitRoutingHint, emitAnswerSubmitted, emitSessionProgress } from '../socket';
import { z } from 'zod';

const router = Router();

function param(req: Request, key: string): string {
    const value = req.params[key];
    return Array.isArray(value) ? value[0] : value ?? 'anonymous';
}

// SECURITY: Rate limiting for answer submission (HIGH-002 Fix)
// Prevents spam/abuse of answer endpoint
const answerSubmissionLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 30, // Max 30 answers per minute per session
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => param(req, 'id'),
    handler: (_req: Request, res: Response) => {
        res.status(429).json({ 
            error: 'Zu viele Antworten in kurzer Zeit. Bitte warten Sie einen Moment.' 
        });
    },
});

const encryptedPayloadSchema = z.object({
    iv: z.string().min(1),
    ciphertext: z.string().min(1),
    alg: z.literal('AES-256-GCM'),
    encryptedAt: z.string().min(1),
});

const submitAnswerSchema = z.object({
    atomId: z.string().min(1),
    value: z.unknown(),
    timeSpentMs: z.number().optional().default(0),
    encrypted: encryptedPayloadSchema.optional(),
});

const CLIENT_ENCRYPTED_ATOM_IDS = new Set([
    '3000',
    '3001',
    '3002',
    '3004',
    '9011',
]);

const E2EE_REDACTED_VALUE = '[E2EE]';

function isStaffRole(role?: string): boolean {
    return role === 'arzt' || role === 'admin';
}

function requiresEncryptedTransport(atomId: string): boolean {
    return CLIENT_ENCRYPTED_ATOM_IDS.has(atomId);
}

function isPersistedEmailHash(value: string | null | undefined): boolean {
    return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}

/**
 * POST /api/sessions/:id/answers
 * SECURITY: Rate limited to 30 submissions per minute per session
 */
router.post('/:id', requireAuth, requireSessionOwner, answerSubmissionLimiter, async (req: Request, res: Response) => {
    try {
        const validated = submitAnswerSchema.parse(req.body);
        const { atomId, value, timeSpentMs } = validated;
        const sessionId = param(req, 'id');
        const requestTenantId = req.tenantId || req.auth?.tenantId || null;

        const session = await prisma.patientSession.findUnique({
            where: { id: sessionId },
        });

        if (!session) {
            res.status(404).json({ error: 'Session nicht gefunden' });
            return;
        }

        if (isStaffRole(req.auth?.role) && !requestTenantId) {
            res.status(403).json({ error: 'Tenant-Kontext für Staff-Zugriff erforderlich' });
            return;
        }

        if (requestTenantId && session.tenantId !== requestTenantId) {
            res.status(404).json({ error: 'Session nicht gefunden' });
            return;
        }

        if (session.status !== 'ACTIVE') {
            res.status(400).json({ error: 'Session ist bereits abgeschlossen' });
            return;
        }

        const containsPii = isPIIAtom(atomId);
        const usesClientEncryption = !!validated.encrypted;

        if (usesClientEncryption && value !== E2EE_REDACTED_VALUE) {
            res.status(400).json({
                error: 'Client-verschlüsselte Antworten dürfen keinen Klartext enthalten',
            });
            return;
        }

        if (requiresEncryptedTransport(atomId) && !usesClientEncryption) {
            res.status(400).json({
                error: 'Dieses Feld muss clientseitig verschlüsselt übertragen werden',
            });
            return;
        }

        let encryptedValue: string | null = null;
        if (containsPii && typeof value === 'string' && !usesClientEncryption) {
            encryptedValue = encrypt(value);
        }

        const jsonValue = JSON.stringify(
            usesClientEncryption
                ? {
                    type: 'encrypted',
                    data: '[client-encrypted]',
                    redacted: true,
                    clientEncrypted: true,
                    encrypted: validated.encrypted,
                }
                : {
                    type: typeof value === 'string' ? 'text' : Array.isArray(value) ? 'multiselect' : 'other',
                    data: containsPii ? '[encrypted]' : value,
                    redacted: containsPii,
                },
        );

        const answer = await prisma.answer.upsert({
            where: {
                sessionId_atomId: { sessionId, atomId },
            },
            update: {
                value: jsonValue,
                encryptedValue,
                timeSpentMs: timeSpentMs || 0,
                answeredAt: new Date(),
            },
            create: {
                sessionId,
                atomId,
                value: jsonValue,
                encryptedValue,
                timeSpentMs: timeSpentMs || 0,
            },
        });

        const allAnswers = await prisma.answer.findMany({
            where: { sessionId },
        });

        const answerMap: Record<string, { value: unknown }> = {};
        for (const a of allAnswers) {
            const jsonVal = JSON.parse(a.value);
            const answerValue = jsonVal?.clientEncrypted && jsonVal?.encrypted
                ? '[client-encrypted]'
                : jsonVal?.redacted && a.encryptedValue
                ? decrypt(a.encryptedValue)
                : jsonVal?.data ?? jsonVal;
            answerMap[a.atomId] = { value: answerValue };
        }

        const canUsePlainValueForDerivedFields = !usesClientEncryption;

        // Dynamische Aktualisierung der Session-Daten, sobald neue Demografien reinkommen
        const updates: any = {};
        if (atomId === '0000') updates.isNewPatient = (value === 'nein');
        if (atomId === '0002') updates.gender = value;
        if (atomId === '0003') {
            const parsedBirthDate = new Date(String(value));
            if (Number.isNaN(parsedBirthDate.getTime())) {
                res.status(400).json({ error: 'Ungültiges Geburtsdatum' });
                return;
            }
            updates.birthDate = parsedBirthDate;
        }
        if (atomId === '2000') updates.insuranceType = value;
        if ((atomId === '0001' || atomId === '0011') && canUsePlainValueForDerivedFields) {
            const name = answerMap['0011']?.value;
            const nachname = answerMap['0001']?.value;
            if (name && nachname) updates.encryptedName = encrypt(`${name} ${nachname}`);
        }

        let updatedSession = session;
        if (Object.keys(updates).length > 0) {
            updatedSession = await prisma.patientSession.update({
                where: { id: sessionId },
                data: updates,
            });
        }

        // Echte E-Mail erhalten? -> Echten Hash+Patient verknüpfen!
        if ((atomId === '9010' || atomId === '3003') && canUsePlainValueForDerivedFields) {
            const realEmail = Array.isArray(value) ? value[0] : value;
            if (typeof realEmail === 'string' && realEmail.includes('@')) {
                const { hashEmail } = await import('../services/encryption');
                const realHash = hashEmail(realEmail);
                const tenantId = session.tenantId;

                const currentPatient = session.patientId
                    ? await prisma.patient.findUnique({
                        where: { id: session.patientId },
                        select: {
                            id: true,
                            hashedEmail: true,
                        },
                    })
                    : null;

                if (
                    currentPatient?.hashedEmail
                    && isPersistedEmailHash(currentPatient.hashedEmail)
                    && currentPatient.hashedEmail !== realHash
                ) {
                    res.status(409).json({
                        error: 'Session ist bereits einem anderen Patienten zugeordnet',
                    });
                    return;
                }

                let realPatient = await prisma.patient.findFirst({ where: { hashedEmail: realHash, tenantId } });
                if (!realPatient) {
                    realPatient = await prisma.patient.create({
                        data: {
                            hashedEmail: realHash,
                            tenantId,
                            birthDate: updatedSession.birthDate ?? null,
                            gender: updatedSession.gender ?? null,
                            encryptedName: updatedSession.encryptedName ?? null,
                        },
                    });
                }

                if (updatedSession.patientId !== realPatient.id) {
                    updatedSession = await prisma.patientSession.update({
                        where: { id: sessionId },
                        data: { patientId: realPatient.id },
                    });
                }
            }
        }

        let age = undefined;
        if (updatedSession.birthDate) {
            const birth = new Date(updatedSession.birthDate);
            const today = new Date();
            age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        }

        // Routing-Engine ausführen — siehe docs/ROUTING_RULES.md
        const routingResults = RoutingEngine.evaluateForAtom(atomId, answerMap, {
            gender: updatedSession.gender || undefined,
            age: age,
            isNewPatient: updatedSession.isNewPatient ?? true,
        });

        for (const hint of routingResults) {
            // DB-Persistenz: schema-Feld 'level' akzeptiert beliebigen String;
            // staffMessage wird im 'message'-Feld archiviert (interne Audit-Daten).
            await prisma.triageEvent.create({
                data: {
                    sessionId,
                    level: hint.level === 'PRIORITY' ? 'CRITICAL' : 'WARNING',
                    atomId: hint.atomId,
                    triggerValues: JSON.stringify(hint.triggerValues),
                    message: hint.staffMessage,
                },
            });

            // PRIORITY → sofortige Personal-Benachrichtigung. INFO bleibt im Dashboard sichtbar.
            if (hint.workflowAction === 'inform_staff_now' || hint.level === 'PRIORITY') {
                emitRoutingHint(sessionId, {
                    ruleId: hint.ruleId,
                    level: hint.level,
                    atomId: hint.atomId,
                    staffMessage: hint.staffMessage,
                    triggerValues: hint.triggerValues,
                    workflowAction: hint.workflowAction,
                });
            }
        }

        const totalQuestions = updatedSession.isNewPatient ? 40 : 15;
        const progress = Math.min(100, Math.round((allAnswers.length / totalQuestions) * 100));

        // Push real-time events to doctor dashboard and patient
        emitAnswerSubmitted(sessionId, {
            atomId,
            progress,
            totalAnswers: allAnswers.length,
            hasRedFlag: routingResults.length > 0,
        });
        emitSessionProgress(sessionId, progress);

        // DSGVO Art. 30: Antwort-Einreichung protokollieren (nicht-blockierend, PHI-frei)
        setImmediate(() => {
            prisma.auditLog.create({
                data: {
                    tenantId: session.tenantId,
                    userId: req.auth?.userId || null,
                    action: 'ANSWER_SUBMITTED',
                    resource: `/api/sessions/${sessionId}/answers`,
                    ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
                    userAgent: (req.headers['user-agent'] || 'unknown').slice(0, 256),
                    metadata: JSON.stringify({
                        sessionId,
                        atomId,
                        isPII: containsPii,
                        isE2EE: usesClientEncryption,
                        answerId: answer.id,
                        routingHints: routingResults.length,
                    }),
                },
            }).catch((e: unknown) => console.error('[AuditLog] ANSWER_SUBMITTED write failed:', e));
        });

        // REGULATORISCH KRITISCH: Patient-Response darf NIEMALS staffMessage enthalten.
        // toPatientSafeView() ist die technische Garantie — siehe docs/REGULATORY_POSITION.md §5.2
        const patientSafeHints = routingResults.map(r => RoutingEngine.toPatientSafeView(r));

        res.json({
            success: true,
            answerId: answer.id,
            // Neuer kanonischer Schlüssel: routingHints. 'redFlags' bleibt für Übergangszeit
            // als Backwards-Compat-Alias, damit alte Frontend-Builds nicht brechen.
            routingHints: patientSafeHints.length > 0 ? patientSafeHints : null,
            redFlags: patientSafeHints.length > 0 ? patientSafeHints : null,
            progress,
        });
    } catch (err: unknown) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: 'Ungültige Antwortdaten', details: err.flatten() });
            return;
        }

        const errorName = err instanceof Error ? err.name : 'UnknownError';
        const sessionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        console.error('[Answers] Fehler bei Antwortspeicherung', {
            sessionId,
            atomId: typeof req.body?.atomId === 'string' ? req.body.atomId : 'unknown',
            errorName,
        });
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

export default router;
