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

function parseOptionalBirthDate(value: string | undefined): Date | null {
    if (!value || value.trim().length === 0) {
        return null;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        throw new LocalizedError('Ungültiges Geburtsdatum');
    }

    return parsedDate;
}

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
        const tenantId = req.tenantId || req.auth?.tenantId || null;

        if (!tenantId) {
            res.status(400).json({ error: 'Tenant-Kontext fehlt' });
            return;
        }

        const normalizedEmail = email?.trim() || undefined;
        const parsedBirthDate = parseOptionalBirthDate(birthDate);
        const encryptedSessionName = encryptedName ? encrypt(encryptedName) : null;

        // 1. Finde oder erstelle einen "Anonymen" Patient, falls noch keine E-Mail vorliegt
        const emailHash = normalizedEmail ? hashEmail(normalizedEmail) : `anonymous - ${Date.now()} -${Math.random()} `;
        let patient = await prisma.patient.findFirst({ where: { hashedEmail: emailHash, tenantId } });

        if (!patient) {
            patient = await prisma.patient.create({
                data: {
                    hashedEmail: emailHash,
                    tenantId,
                    birthDate: parsedBirthDate,
                    gender: gender || null,
                    encryptedName: encryptedSessionName,
                },
            });
        }

        // 2. Erstelle die Session (Demografische Daten dürfen anfangs null/leer sein!)
        const session = await prisma.patientSession.create({
            data: {
                tenantId,
                patientId: patient.id,
                isNewPatient: isNewPatient ?? true,
                gender: gender || patient.gender || null,
                birthDate: parsedBirthDate ?? patient.birthDate ?? null,
                selectedService,
                insuranceType: insuranceType || null,
                encryptedName: encryptedSessionName ?? patient.encryptedName ?? null,
            },
        });

        const token = createToken({
            sessionId: session.id,
            tenantId,
            role: 'patient',
        });

        setTokenCookie(res, token);
        res.status(201).json({
            sessionId: session.id,
            nextAtomIds: ['0000'],
        });
    } catch (err: unknown) {
        if (err instanceof LocalizedError) {
            res.status(400).json({ error: err.message });
            return;
        }

        if (err instanceof z.ZodError) {
            res.status(400).json({ error: 'Ungültige Sitzungsdaten', details: err.flatten() });
            return;
        }

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

        // FHIR push to external command centers (M42 / Presight / JDHC) — non-blocking
        setImmediate(async () => {
            try {
                const { buildNephrologyResources, extractNephrologyData, NEPHROLOGY_ATOM_IDS } = await import('../services/fhir/NephrologyProfile');
                const { triggerFhirPushAsync } = await import('../services/fhir/ExternalFhirPush');

                // Reload session with answers for FHIR bundle construction
                const { prisma: p } = await import('../db');
                const fullSession = await p.patientSession.findUnique({
                    where: { id: session.id },
                    include: { answers: true, patient: true },
                });

                if (!fullSession) return;

                const patientRef = fullSession.patient
                    ? `Patient/${fullSession.patient.id}`
                    : `Patient/anonymous-${session.id.slice(0, 8)}`;

                const isNephrology = fullSession.selectedService?.toLowerCase().includes('nephro') ||
                    fullSession.selectedService?.toLowerCase().includes('niere') ||
                    fullSession.selectedService?.toLowerCase().includes('dialysis') ||
                    fullSession.answers.some(a => NEPHROLOGY_ATOM_IDS.has(a.atomId));

                const nephrologyResources = isNephrology
                    ? buildNephrologyResources(extractNephrologyData(patientRef, fullSession.answers))
                    : [];

                const fhirBundle = {
                    resourceType: 'Bundle' as const,
                    type: 'transaction',
                    timestamp: new Date().toISOString(),
                    entry: [
                        {
                            resource: {
                                resourceType: 'Encounter',
                                id: session.id,
                                status: 'finished',
                                class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
                                subject: { reference: patientRef },
                                reasonCode: [{ text: fullSession.selectedService }],
                                period: { start: new Date(fullSession.createdAt).toISOString() },
                            },
                        },
                        ...nephrologyResources.map(r => ({ resource: r as unknown as Record<string, unknown> })),
                    ],
                };

                await triggerFhirPushAsync(session.tenantId, session.id, fhirBundle);
            } catch (fhirErr) {
                console.warn('[Sessions] FHIR push fehlgeschlagen (non-critical):', fhirErr);
            }
        });

        // ── Klaproth Pipeline: TutaMail → Tomedo (non-blocking) ──
        setImmediate(async () => {
            try {
                const { formatSessionForTomedo, buildTomedoSubject } = await import('../services/emailFormatter');
                const { sendAnamneseEmail } = await import('../services/tutamail');

                // Reload session with answers for email body
                const fullSession = await prisma.session.findUnique({
                    where: { id: session.id },
                    include: { answers: true, patient: true },
                });
                if (!fullSession) return;

                // Resolve BSNR from tenant subdomain
                let bsnr = 'UNKNOWN';
                if (fullSession.tenantId) {
                    const tenant = await prisma.tenant.findUnique({ where: { id: fullSession.tenantId } });
                    if (tenant?.subdomain) bsnr = tenant.subdomain;
                }

                const bodyText = formatSessionForTomedo(fullSession as any);
                const subject = buildTomedoSubject(fullSession as any);

                await sendAnamneseEmail({
                    bsnr,
                    subject,
                    bodyText,
                    sessionId: fullSession.id,
                });
            } catch (mailErr) {
                console.warn('[Sessions] TutaMail dispatch fehlgeschlagen (non-critical):', mailErr);
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
            tenantId: req.auth.tenantId,
            role: req.auth.role,
        });

        setTokenCookie(res, newToken);
        res.json({ success: true });
    } catch (err: unknown) {
        console.error('[Sessions] Token-Refresh-Fehler:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.session.token_refresh_failed') });
    }
});

// ─── Phase 5: Digital Front Door — Mobile/QR Session Bootstrap ──────────────

const ALLOWED_SPECIALTIES = new Set([
    'nephrology', 'cardiology', 'hematology', 'radiology',
    'general', 'dermatology', 'neurology', 'orthopedics', 'pediatrics',
]);

/**
 * POST /api/sessions/start
 * Digital Front Door: create an anonymous session pre-configured for a
 * specific specialty / tenant, returning the session URL and a signed
 * deep-link that can be embedded in a QR code.
 *
 * Query params (all optional):
 *   lang       – BCP-47 language tag (default: 'de')
 *   specialty  – medical specialty slug for pre-selecting service (default: 'general')
 *   tenant     – tenant slug (resolved to tenantId)
 *
 * No authentication required — the session starts in anonymous mode and
 * the patient authenticates later inside the session flow.
 */
router.post('/start', async (req: Request, res: Response) => {
    try {
        const lang = (typeof req.query.lang === 'string' ? req.query.lang : 'de').slice(0, 8);
        const specialtyRaw = typeof req.query.specialty === 'string' ? req.query.specialty : 'general';
        const specialty = ALLOWED_SPECIALTIES.has(specialtyRaw) ? specialtyRaw : 'general';
        const tenantSubdomain = typeof req.query.tenant === 'string' ? req.query.tenant.replace(/[^a-z0-9-]/g, '') : null;

        // Resolve tenantId from subdomain (or use header / default)
        let tenantId: string = req.tenantId || 'default';
        if (tenantSubdomain) {
            const tenant = await prisma.tenant.findUnique({
                where: { subdomain: tenantSubdomain },
                select: { id: true, status: true },
            });
            if (!tenant || tenant.status !== 'ACTIVE') {
                res.status(404).json({ error: 'Tenant not found or inactive' });
                return;
            }
            tenantId = tenant.id;
        }

        const serviceLabel = specialty.charAt(0).toUpperCase() + specialty.slice(1);

        const patient = await prisma.patient.create({
            data: {
                hashedEmail: `dfd-anon-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                tenantId,
            },
        });

        const session = await prisma.patientSession.create({
            data: {
                tenantId,
                patientId: patient.id,
                isNewPatient: true,
                selectedService: serviceLabel,
            },
        });

        const token = createToken({ sessionId: session.id, tenantId, role: 'patient' });
        setTokenCookie(res, token);

        // Build the deep-link URL the QR code will encode
        const baseUrl = appConfig.frontendUrl || `${req.protocol}://${req.get('host')}`;
        const sessionUrl = `${baseUrl}/session/${session.id}?lang=${encodeURIComponent(lang)}&specialty=${encodeURIComponent(specialty)}`;

        // Signed short-lived link token (15 min) embeddable in QR codes
        const linkToken = sign(
            { type: 'dfd-link', sessionId: session.id, tenantId, specialty },
            process.env.JWT_SECRET!,
            { expiresIn: '15m' },
        );

        res.status(201).json({
            sessionId: session.id,
            sessionUrl,
            linkToken,
            qrData: sessionUrl,
            lang,
            specialty,
            tenantId,
        });
    } catch (err) {
        console.error('[Sessions] Digital Front Door start error:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.generic') });
    }
});

export default router;
