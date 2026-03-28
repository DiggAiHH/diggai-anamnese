import { Router } from 'express';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db';
import { requireAuth, requireSessionOwner } from '../middleware/auth';
import { decrypt, encrypt, isPIIAtom } from '../services/encryption';
import { TriageEngine } from '../engine/TriageEngine';
import { emitTriageAlert, emitAnswerSubmitted, emitSessionProgress } from '../socket';
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

const submitAnswerSchema = z.object({
    atomId: z.string().min(1),
    value: z.any(),
    timeSpentMs: z.number().optional().default(0),
});

function isStaffRole(role?: string): boolean {
    return role === 'arzt' || role === 'admin';
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
        let encryptedValue: string | null = null;
        if (containsPii && typeof value === 'string') {
            encryptedValue = encrypt(value);
        }

        const jsonValue = JSON.stringify({
            type: typeof value === 'string' ? 'text' : Array.isArray(value) ? 'multiselect' : 'other',
            data: containsPii ? '[encrypted]' : value,
            redacted: containsPii,
        });

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
            const answerValue = jsonVal?.redacted && a.encryptedValue
                ? decrypt(a.encryptedValue)
                : jsonVal?.data ?? jsonVal;
            answerMap[a.atomId] = { value: answerValue };
        }

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
        if (atomId === '0001' || atomId === '0011') {
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
        if (atomId === '9010' || atomId === '3003') {
            const realEmail = Array.isArray(value) ? value[0] : value;
            if (typeof realEmail === 'string' && realEmail.includes('@')) {
                const { hashEmail } = await import('../services/encryption');
                const realHash = hashEmail(realEmail);
                const tenantId = session.tenantId;
                let realPatient = await prisma.patient.findFirst({ where: { hashedEmail: realHash, tenantId } });
                if (!realPatient) {
                    realPatient = await prisma.patient.create({ data: { hashedEmail: realHash, tenantId } });
                }
                updatedSession = await prisma.patientSession.update({
                    where: { id: sessionId },
                    data: { patientId: realPatient.id },
                });
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

        const triageResults = TriageEngine.evaluateForAtom(atomId, answerMap, {
            gender: updatedSession.gender || undefined,
            age: age,
            isNewPatient: updatedSession.isNewPatient ?? true,
        });

        for (const triage of triageResults) {
            await prisma.triageEvent.create({
                data: {
                    sessionId,
                    level: triage.level,
                    atomId: triage.atomId,
                    triggerValues: JSON.stringify(triage.triggerValues),
                    message: triage.message,
                },
            });

            if (triage.level === 'CRITICAL') {
                emitTriageAlert(sessionId, triage);
            }
        }

        const totalQuestions = updatedSession.isNewPatient ? 40 : 15;
        const progress = Math.min(100, Math.round((allAnswers.length / totalQuestions) * 100));

        // Push real-time events to doctor dashboard and patient
        emitAnswerSubmitted(sessionId, {
            atomId,
            progress,
            totalAnswers: allAnswers.length,
            hasRedFlag: triageResults.length > 0,
        });
        emitSessionProgress(sessionId, progress);

        res.json({
            success: true,
            answerId: answer.id,
            redFlags: triageResults.length > 0 ? triageResults : null,
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
