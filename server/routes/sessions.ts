import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../db';
import { createToken, requireAuth, requireRole, requireSessionOwner, setTokenCookie } from '../middleware/auth';
import { hashEmail, encrypt } from '../services/encryption';
import { t, parseLang, LocalizedError } from '../i18n';

import * as jwt from 'jsonwebtoken';
const { sign } = jwt;

const router = Router();

import { config as appConfig } from '../config';

/**
 * POST /api/sessions/qr-token
 * MFA/Doctor generates a QR code token for a patient to start a session.
 */
router.post('/qr-token', requireAuth, requireRole('arzt', 'mfa', 'admin'), (req: Request, res: Response) => {
    try {
        const { service } = req.body;
        // Generate a fast token valid for 24 hours
        const token = sign({
            type: 'qr-start',
            service: service || 'Termin / Anamnese',
            createdBy: req.auth?.role,
        }, appConfig.jwtSecret as jwt.Secret, { expiresIn: '24h' });

        res.json({ token });
    } catch (err) {
        console.error('[QR Token] Error:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.session.token_gen_failed') });
    }
});

import { z } from 'zod';

const createSessionSchema = z.object({
    email: z.string().optional(),
    isNewPatient: z.boolean().optional().default(true),
    gender: z.string().optional(),
    birthDate: z.string().optional(),
    selectedService: z.string().min(1, 'Service ist erforderlich'),
    insuranceType: z.string().optional(),
    encryptedName: z.string().optional(),
});

/**
 * @swagger
 * /sessions:
 *   post:
 *     tags: [Sessions]
 *     summary: Erstellt eine neue Patienten-Session
 *     description: Erzeugt eine Session und einen anonymen Patienten (falls kein bestehender per E-Mail gefunden).
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [selectedService]
 *             properties:
 *               selectedService:
 *                 type: string
 *                 example: "Termin / Anamnese"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Optional — für Returning-Patient-Lookup (wird SHA-256 gehasht)
 *               isNewPatient:
 *                 type: boolean
 *                 default: true
 *               gender:
 *                 type: string
 *                 enum: [M, W, D]
 *               birthDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Session erstellt
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId: { type: string }
 *       400:
 *         description: Validierungsfehler
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const validatedData = createSessionSchema.parse(req.body);
        const { email, isNewPatient, gender, birthDate, selectedService, insuranceType, encryptedName } = validatedData;

        // 1. Finde oder erstelle einen "Anonymen" Patient, falls noch keine E-Mail vorliegt
        const tenantId = req.tenantId || 'default';
        const emailHash = email ? hashEmail(email) : `anonymous - ${Date.now()} -${Math.random()} `;
        let patient = await prisma.patient.findFirst({ where: { hashedEmail: emailHash, tenantId } });

        if (!patient) {
            patient = await prisma.patient.create({
                data: { hashedEmail: emailHash, tenantId },
            });
        }

        // 2. Erstelle die Session (Demografische Daten dürfen anfangs null/leer sein!)
        const session = await prisma.patientSession.create({
            data: {
                tenantId,
                patientId: patient.id,
                isNewPatient: isNewPatient ?? true,
                gender: gender || null,
                birthDate: birthDate ? new Date(birthDate) : null,
                selectedService,
                insuranceType: insuranceType || null,
                encryptedName: encryptedName ? encrypt(encryptedName) : null,
            },
        });

        const token = createToken({
            sessionId: session.id,
            role: 'patient',
        });

        setTokenCookie(res, token);
        res.status(201).json({
            sessionId: session.id,
            nextAtomIds: ['0000'],
        });
    } catch (err: unknown) {
        console.error('[Sessions] Fehler beim Erstellen:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.generic') });
    }
});

/**
 * GET /api/sessions/:id/state
 * 
 * OPTIMIZED: Combined query with include to prevent N+1 queries
 * Previously: 3 separate queries (session, answers, triageEvents)
 * Now: 1 query with included relations
 */
router.get('/:id/state', requireAuth, requireSessionOwner, async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.id as string;
        
        // Single optimized query with includes instead of 3 separate queries
        const session = await prisma.patientSession.findUnique({
            where: { id: sessionId },
            include: {
                answers: {
                    orderBy: { answeredAt: 'asc' },
                },
                triageEvents: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!session) {
            res.status(404).json({ error: t(parseLang(req.headers['accept-language']), 'errors.session.not_found') });
            return;
        }

        // Build answers map from included data
        const answersMap: Record<string, { value: unknown; answeredAt: Date; timeSpentMs: number }> = {};
        for (const answer of session.answers) {
            answersMap[answer.atomId] = {
                value: JSON.parse(answer.value),
                answeredAt: answer.answeredAt,
                timeSpentMs: answer.timeSpentMs,
            };
        }

        res.json({
            session: {
                id: session.id,
                isNewPatient: session.isNewPatient,
                gender: session.gender,
                birthDate: session.birthDate,
                status: session.status,
                selectedService: session.selectedService,
                insuranceType: session.insuranceType,
                createdAt: session.createdAt,
                completedAt: session.completedAt,
            },
            answers: answersMap,
            triageEvents: session.triageEvents.map((te) => ({
                ...te,
                triggerValues: JSON.parse(te.triggerValues),
            })),
            totalAnswers: session.answers.length,
        });
    } catch (err: unknown) {
        console.error('[Sessions] Fehler beim Abrufen:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.generic') });
    }
});

/**
 * POST /api/sessions/:id/submit
 */
router.post('/:id/submit', requireAuth, requireSessionOwner, async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.id as string;
        const session = await prisma.patientSession.update({
            where: { id: sessionId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
            },
        });

        const { emitSessionComplete } = await import('../socket');
        emitSessionComplete(session.id, session.selectedService);

        // Log service usage (non-blocking)
        setImmediate(async () => {
            try {
                const { logServiceUsage } = await import('../services/serviceUsageService');
                const durationMs = session.completedAt && session.createdAt
                    ? new Date(session.completedAt).getTime() - new Date(session.createdAt).getTime()
                    : undefined;
                await logServiceUsage({
                    tenantId: session.tenantId,
                    sessionId: session.id,
                    patientId: session.patientId || undefined,
                    serviceType: 'ANAMNESE',
                    actionName: `Fragebogen abgeschlossen (${session.selectedService})`,
                    durationMs,
                });
            } catch (usageErr) {
                console.warn('[Sessions] Usage logging failed (non-critical):', usageErr);
            }
        });

        // Auto-trigger agent pipeline (non-blocking — never delay the response)
        setImmediate(async () => {
            try {
                const { createTask } = await import('../agents/orchestrator.agent');
                const basePayload = { sessionId: session.id, service: session.selectedService };
                createTask({ type: 'triage',         description: `Triage für Session ${session.id}`,         payload: basePayload, priority: 'high' });
                createTask({ type: 'dokumentation',  description: `Zusammenfassung für Session ${session.id}`, payload: basePayload });
                createTask({ type: 'empfang',        description: `Empfangsvorbereitung für Session ${session.id}`, payload: basePayload, priority: 'low' });
            } catch (agentErr) {
                console.warn('[Sessions] Auto-Triage fehlgeschlagen (non-critical):', agentErr);
            }
        });

        res.json({
            success: true,
            sessionId: session.id,
            completedAt: session.completedAt,
        });
    } catch (err: unknown) {
        console.error('[Sessions] Fehler beim Submit:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.generic') });
    }
});

/**
 * POST /api/sessions/:id/accident
 */

const accidentSchema = z.object({
    bgName: z.string().min(1, 'BG-Name ist erforderlich'),
    accidentDate: z.string().min(1, 'Unfalldatum ist erforderlich'),
    accidentLocation: z.string().optional().default(''),
    description: z.string().min(1, 'Beschreibung ist erforderlich'),
    firstResponder: z.string().optional().nullable(),
    reportedToEmployer: z.boolean().optional().default(false),
});

router.post('/:id/accident', requireAuth, requireSessionOwner, async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.id as string;
        const data = accidentSchema.parse(req.body);

        const accident = await prisma.accidentDetails.upsert({
            where: { sessionId },
            update: {
                bgName: data.bgName,
                accidentDate: new Date(data.accidentDate),
                accidentLocation: data.accidentLocation,
                description: data.description,
                firstResponder: data.firstResponder || null,
                reportedToEmployer: data.reportedToEmployer,
            },
            create: {
                sessionId,
                bgName: data.bgName,
                accidentDate: new Date(data.accidentDate),
                accidentLocation: data.accidentLocation,
                description: data.description,
                firstResponder: data.firstResponder || null,
                reportedToEmployer: data.reportedToEmployer,
            }
        });

        res.status(201).json({ success: true, accidentId: accident.id });
    } catch (err: unknown) {
        console.error('[Sessions/Accident] Fehler beim Speichern:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.generic') });
    }
});

/**
 * GET /api/sessions/:id/accident
 */
router.get('/:id/accident', requireAuth, requireSessionOwner, async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.id as string;
        const accident = await prisma.accidentDetails.findUnique({
            where: { sessionId }
        });

        if (!accident) {
            res.status(200).json({ success: true, accident: null });
            return;
        }

        res.json({ success: true, accident });
    } catch (err: unknown) {
        console.error('[Sessions/Accident] Fehler beim Abrufen:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.generic') });
    }
});
/**
 * POST /api/sessions/:id/medications
 * Speichert Dauermedikation für den Patienten der Session
 */

const medicationSchema = z.object({
    name: z.string().min(1),
    dosage: z.string().optional().default(''),
    frequency: z.string().optional().default(''),
    notes: z.string().optional().nullable(),
});

const medicationsBodySchema = z.object({
    medications: z.array(medicationSchema),
});

router.post('/:id/medications', requireAuth, requireSessionOwner, async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.id as string;
        const { medications } = medicationsBodySchema.parse(req.body);

        // Optimized: Use select to only fetch needed field
        const session = await prisma.patientSession.findUnique({
            where: { id: sessionId },
            select: { patientId: true }
        });

        if (!session || !session.patientId) {
            res.status(404).json({ error: t(parseLang(req.headers['accept-language']), 'errors.session.not_found') });
            return;
        }

        // Bulk-Replace using transaction for atomicity
        await prisma.$transaction([
            prisma.patientMedication.deleteMany({
                where: { patientId: session.patientId }
            }),
            ...(medications.length > 0 ? [
                prisma.patientMedication.createMany({
                    data: medications.map((m) => ({
                        patientId: session.patientId!,
                        name: m.name,
                        dosage: m.dosage || '',
                        frequency: m.frequency || '',
                        notes: m.notes || null
                    }))
                })
            ] : [])
        ]);

        res.status(201).json({ success: true, count: medications.length });
    } catch (err: unknown) {
        console.error('[Sessions/Medications] Fehler beim Speichern:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.generic') });
    }
});

/**
 * GET /api/sessions/:id/medications
 * Ruft die Dauermedikation des Patienten ab
 */
router.get('/:id/medications', requireAuth, requireSessionOwner, async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.id as string;

        const session = await prisma.patientSession.findUnique({
            where: { id: sessionId },
            select: { patientId: true }
        });

        if (!session || !session.patientId) {
            res.status(404).json({ error: t(parseLang(req.headers['accept-language']), 'errors.session.not_found') });
            return;
        }

        const medications = await prisma.patientMedication.findMany({
            where: { patientId: session.patientId },
            orderBy: { createdAt: 'asc' }
        });

        res.json({ success: true, medications });
    } catch (err: unknown) {
        console.error('[Sessions/Medications] Fehler beim Abrufen:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.generic') });
    }
});

/**
 * POST /api/sessions/:id/surgeries
 * Speichert OP-Historie für den Patienten
 */

const surgerySchema = z.object({
    surgeryName: z.string().min(1),
    date: z.string().optional().nullable(),
    complications: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

const surgeriesBodySchema = z.object({
    surgeries: z.array(surgerySchema),
});

router.post('/:id/surgeries', requireAuth, requireSessionOwner, async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.id as string;
        const { surgeries } = surgeriesBodySchema.parse(req.body);

        const session = await prisma.patientSession.findUnique({
            where: { id: sessionId },
            select: { patientId: true }
        });

        if (!session || !session.patientId) {
            res.status(404).json({ error: t(parseLang(req.headers['accept-language']), 'errors.session.not_found') });
            return;
        }

        // Bulk-Replace using transaction
        await prisma.$transaction([
            prisma.patientSurgery.deleteMany({
                where: { patientId: session.patientId }
            }),
            ...(surgeries.length > 0 ? [
                prisma.patientSurgery.createMany({
                    data: surgeries.map((s) => ({
                        patientId: session.patientId!,
                        surgeryName: s.surgeryName,
                        date: s.date || null,
                        complications: s.complications || null,
                        notes: s.notes || null
                    }))
                })
            ] : [])
        ]);

        res.status(201).json({ success: true, count: surgeries.length });
    } catch (err: unknown) {
        console.error('[Sessions/Surgeries] Fehler beim Speichern:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.generic') });
    }
});

/**
 * GET /api/sessions/:id/surgeries
 */
router.get('/:id/surgeries', requireAuth, requireSessionOwner, async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.id as string;
        const session = await prisma.patientSession.findUnique({
            where: { id: sessionId },
            select: { patientId: true }
        });

        if (!session || !session.patientId) {
            res.status(404).json({ error: t(parseLang(req.headers['accept-language']), 'errors.session.not_found') });
            return;
        }

        const surgeries = await prisma.patientSurgery.findMany({
            where: { patientId: session.patientId },
            orderBy: { createdAt: 'asc' }
        });

        res.json({ success: true, surgeries });
    } catch (err: unknown) {
        console.error('[Sessions/Surgeries] Fehler beim Abrufen:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.generic') });
    }
});

/**
 * POST /api/sessions/refresh-token
 * Refreshes an expiring JWT by issuing a new one.
 * Only valid if the current token hasn't fully expired yet (leeway: 5 minutes).
 */
router.post('/refresh-token', requireAuth, async (req: Request, res: Response) => {
    try {
        if (!req.auth) {
            res.status(401).json({ error: t(parseLang(req.headers['accept-language']), 'errors.auth.invalid_token') });
            return;
        }

        // Re-create token with same payload but new expiry
        const newToken = createToken({
            sessionId: req.auth.sessionId,
            userId: req.auth.userId,
            role: req.auth.role,
        });

        setTokenCookie(res, newToken);
        res.json({ success: true });
    } catch (err: unknown) {
        console.error('[Sessions] Token-Refresh-Fehler:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.session.token_refresh_failed') });
    }
});

export default router;
