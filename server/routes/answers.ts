import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth, requireSessionOwner } from '../middleware/auth';
import { encrypt, isPIIAtom } from '../services/encryption';
import { TriageEngine } from '../engine/TriageEngine';
import { emitTriageAlert, emitAnswerSubmitted, emitSessionProgress } from '../socket';
import { z } from 'zod';

const router = Router();

const submitAnswerSchema = z.object({
    atomId: z.string().min(1),
    value: z.any(),
    timeSpentMs: z.number().optional().default(0),
});

/**
 * POST /api/sessions/:id/answers
 */
router.post('/:id', requireAuth, requireSessionOwner, async (req: Request, res: Response) => {
    try {
        const validated = submitAnswerSchema.parse(req.body);
        const { atomId, value, timeSpentMs } = validated;
        const sessionId = req.params.id as string;

        const session = await prisma.patientSession.findUnique({
            where: { id: sessionId },
        });

        if (!session) {
            res.status(404).json({ error: 'Session nicht gefunden' });
            return;
        }

        if (session.status !== 'ACTIVE') {
            res.status(400).json({ error: 'Session ist bereits abgeschlossen' });
            return;
        }

        let encryptedValue: string | null = null;
        if (isPIIAtom(atomId) && typeof value === 'string') {
            encryptedValue = encrypt(value);
        }

        const jsonValue = JSON.stringify({
            type: typeof value === 'string' ? 'text' : Array.isArray(value) ? 'multiselect' : 'other',
            data: value,
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
            answerMap[a.atomId] = { value: jsonVal?.data ?? jsonVal };
        }

        // Dynamische Aktualisierung der Session-Daten, sobald neue Demografien reinkommen
        const updates: any = {};
        if (atomId === '0000') updates.isNewPatient = (value === 'nein');
        if (atomId === '0002') updates.gender = value;
        if (atomId === '0003') updates.birthDate = new Date(value);
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
                let realPatient = await prisma.patient.findUnique({ where: { hashedEmail: realHash } });
                if (!realPatient) {
                    realPatient = await prisma.patient.create({ data: { hashedEmail: realHash } });
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

        const totalQuestions = session.isNewPatient ? 40 : 15;
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
        console.error('[Answers] Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

export default router;
