import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../db';
import * as bcrypt from 'bcryptjs';
import { createToken, requireAuth, requireRole, blacklistToken, setTokenCookie, clearTokenCookie, normalizeAuthRole } from '../middleware/auth';
import { aiEngine } from '../services/ai/ai-engine.service';
import { decrypt, isPIIAtom } from '../services/encryption';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config';
import { SecurityEvent, logSecurityEvent, logLoginFailure } from '../services/security-audit.service';

const router = Router();

// Brute-Force Schutz für Logins (max 5 Versuche pro 15 Minuten)
const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const loginSchema = z.object({
    username: z.string().min(1, 'Benutzername ist erforderlich'),
    password: z.string().min(1, 'Passwort ist erforderlich'),
});

function resolveEffectiveTenant(req: Request):
    | { ok: true; tenantId: string }
    | { ok: false; status: 400 | 403; body: { error: string; code: 'TENANT_CONTEXT_REQUIRED' | 'TENANT_SCOPE_VIOLATION' } } {
    const authTenantId = req.auth?.tenantId;
    const requestTenantId = req.tenantId;

    if (authTenantId && requestTenantId && authTenantId !== requestTenantId) {
        return {
            ok: false,
            status: 403,
            body: {
                error: 'Tenant-Konflikt',
                code: 'TENANT_SCOPE_VIOLATION',
            },
        };
    }

    const tenantId = requestTenantId || authTenantId;
    if (!tenantId) {
        return {
            ok: false,
            status: 400,
            body: {
                error: 'Tenant-Kontext fehlt',
                code: 'TENANT_CONTEXT_REQUIRED',
            },
        };
    }

    return { ok: true, tenantId };
}

/**
 * @swagger
 * /arzt/login:
 *   post:
 *     tags: [Arzt]
 *     summary: Arzt/MFA/Admin Login
 *     description: Authentifiziert einen Arztpraxis-Mitarbeiter. Rate-Limited auf 5 Versuche/15min.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: "dr.klaproth" }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login erfolgreich — JWT wird als HttpOnly Cookie gesetzt
 *         headers:
 *           Set-Cookie:
 *             description: access_token=<JWT>; HttpOnly; Secure; SameSite=Strict
 *             schema: { type: string }
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     username: { type: string }
 *                     displayName: { type: string }
 *       401:
 *         description: Ungültige Anmeldedaten
 *       429:
 *         description: Rate-Limit überschritten (5 Versuche/15min)
 */
router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
        const resolvedTenant = resolveEffectiveTenant(req);
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }

        const validated = loginSchema.parse(req.body);
        const { username, password } = validated;

        const arzt = await prisma.arztUser.findFirst({
            where: {
                tenantId: resolvedTenant.tenantId,
                username,
            },
        });

        // SECURITY: Immer gleiche Fehlermeldung — verhindert User-Enumeration (Timing Attack)
        if (!arzt || arzt.isActive === false) {
            await logLoginFailure({ tenantId: resolvedTenant.tenantId, ip, userAgent });
            res.status(401).json({ error: 'Ungültige Anmeldedaten' });
            return;
        }

        // SECURITY FIX H1: Account Lockout prüfen
        if (arzt.lockedUntil && arzt.lockedUntil > new Date()) {
            const retryAfterSecs = Math.ceil((arzt.lockedUntil.getTime() - Date.now()) / 1000);
            await logLoginFailure({
                tenantId: resolvedTenant.tenantId,
                ip,
                userAgent,
                accountLocked: true,
            });
            res.status(429).json({
                error: 'Konto temporär gesperrt nach zu vielen Fehlversuchen.',
                retryAfter: retryAfterSecs,
            });
            return;
        }

        const isValid = await bcrypt.compare(password, arzt.passwordHash);
        if (!isValid) {
            // SECURITY FIX H1: Fehlversuch zählen und ggf. sperren
            const newAttempts = (arzt.failedLoginAttempts ?? 0) + 1;
            const shouldLock = newAttempts >= config.accountLockoutMaxAttempts;
            await prisma.arztUser.update({
                where: { id: arzt.id },
                data: {
                    failedLoginAttempts: newAttempts,
                    lockedUntil: shouldLock
                        ? new Date(Date.now() + config.accountLockoutDurationMs)
                        : undefined,
                },
            });
            await logLoginFailure({
                tenantId: resolvedTenant.tenantId,
                ip,
                userAgent,
                attemptNumber: newAttempts,
                accountLocked: shouldLock,
            });
            res.status(401).json({ error: 'Ungültige Anmeldedaten' });
            return;
        }

        const normalizedRole = normalizeAuthRole(arzt.role);
        if (!normalizedRole) {
            console.error('[Arzt] Unsupported staff role in database:', arzt.role);
            res.status(500).json({ error: 'Interner Serverfehler' });
            return;
        }

        const token = createToken({
            userId: arzt.id,
            tenantId: resolvedTenant.tenantId,
            role: normalizedRole,
        });

        // SECURITY FIX H3: lastLoginAt + loginCount aktualisieren, Lockout zurücksetzen
        await prisma.arztUser.update({
            where: { id: arzt.id },
            data: {
                lastLoginAt: new Date(),
                loginCount: { increment: 1 },
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
        });

        // SECURITY FIX H4: Security-Event loggen
        await logSecurityEvent({
            event: SecurityEvent.LOGIN_SUCCESS,
            tenantId: resolvedTenant.tenantId,
            actorId: arzt.id,
            ip,
            userAgent,
            metadata: { role: normalizedRole },
        });

        // Set httpOnly cookie for browser clients
        setTokenCookie(res, token);

        res.json({
            user: {
                id: arzt.id,
                username: arzt.username,
                displayName: arzt.displayName,
                role: normalizedRole,
            },
        });
    } catch (err: unknown) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: 'Ungültige Eingabedaten' });
            return;
        }
        console.error('[Arzt] Login-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

router.get('/me', requireAuth, requireRole('arzt', 'mfa', 'admin'), async (req: Request, res: Response) => {
    try {
        if (!req.auth?.userId) {
            res.status(401).json({ error: 'Authentifizierung erforderlich' });
            return;
        }

        const resolvedTenant = resolveEffectiveTenant(req);
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }

        const arzt = await prisma.arztUser.findUnique({
            where: {
                id_tenantId: {
                    id: req.auth.userId,
                    tenantId: resolvedTenant.tenantId,
                },
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                role: true,
                isActive: true,
            },
        });

        if (!arzt || arzt.isActive === false) {
            clearTokenCookie(res);
            res.status(401).json({ error: 'Ungültiger Benutzer' });
            return;
        }

        res.json({
            user: {
                id: arzt.id,
                username: arzt.username,
                displayName: arzt.displayName,
                role: normalizeAuthRole(arzt.role) || req.auth.role,
            },
        });
    } catch (err: unknown) {
        console.error('[Arzt] Me-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * POST /api/arzt/logout — Token widerrufen (Blacklist)
 */
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
    if (req.auth?.jti) {
        // Token auf Blacklist setzen — TTL = verbleibende Token-Gültigkeit
        await blacklistToken(req.auth.jti, config.jwtCookieMaxAgeMs);
    }
    // SECURITY FIX H4: Logout loggen
    await logSecurityEvent({
        event: SecurityEvent.LOGOUT,
        tenantId: req.auth?.tenantId || req.tenantId || 'unknown',
        actorId: req.auth?.userId,
        ip: req.ip || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
        metadata: { tokenRevoked: !!req.auth?.jti },
    });
    clearTokenCookie(res);
    res.json({ message: 'Erfolgreich abgemeldet' });
});

/**
 * GET /api/arzt/sessions
 */
router.get('/sessions', requireAuth, requireRole('arzt', 'admin'), async (_req: Request, res: Response) => {
    try {
        const req = _req;
        const resolvedTenant = resolveEffectiveTenant(req);
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }

        const sessions = await prisma.patientSession.findMany({
            where: {
                tenantId: resolvedTenant.tenantId,
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                _count: {
                    select: { answers: true, triageEvents: true }
                },
                triageEvents: {
                    where: { level: 'CRITICAL', acknowledgedBy: null },
                    select: { id: true }
                }
            }
        });

        const result = [];
        for (const s of sessions) {
            let patientName = '';
            if (s.encryptedName) {
                try { patientName = decrypt(s.encryptedName); } catch { patientName = ''; }
            }

            result.push({
                id: s.id,
                patientName,
                isNewPatient: s.isNewPatient,
                gender: s.gender,
                selectedService: s.selectedService,
                status: s.status,
                createdAt: s.createdAt,
                completedAt: s.completedAt,
                totalAnswers: s._count.answers,
                totalTriageEvents: s._count.triageEvents,
                unresolvedCritical: s.triageEvents.length,
            });
        }

        res.json({ sessions: result });
    } catch (err: unknown) {
        console.error('[Arzt] Sessions-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * GET /api/arzt/sessions/:id
 * Detailansicht einer Session – mit Fragetexten, Sektionen und entschlüsselten PII-Daten
 */
router.get('/sessions/:id', requireAuth, requireRole('arzt', 'admin', 'mfa'), async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.id as string;
        const resolvedTenant = resolveEffectiveTenant(req);
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }

        const session = await prisma.patientSession.findFirst({
            where: {
                id: sessionId,
                tenantId: resolvedTenant.tenantId,
            },
        });

        if (!session) {
            res.status(404).json({ error: 'Session nicht gefunden' });
            return;
        }

        // Alle Fragen laden für Texte und Sektionen
        const atoms = await prisma.medicalAtom.findMany();
        const atomMap = new Map(atoms.map(a => [a.id, a]));

        const answers = await prisma.answer.findMany({
            where: { sessionId },
            orderBy: { answeredAt: 'asc' },
        });

        const triageEvents = await prisma.triageEvent.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'desc' },
        });

        // Patientenname entschlüsseln
        let patientName = '';
        if (session.encryptedName) {
            try {
                patientName = decrypt(session.encryptedName);
            } catch {
                patientName = '[verschlüsselt]';
            }
        }

        // Antworten mit Fragetexten und entschlüsselten PII-Werten anreichern
        const enrichedAnswers = answers.map((a) => {
            const atom = atomMap.get(a.atomId);
            let displayValue: any;

            // PII entschlüsseln
            if (isPIIAtom(a.atomId) && a.encryptedValue) {
                try {
                    displayValue = { data: decrypt(a.encryptedValue) };
                } catch {
                    displayValue = { data: '[verschlüsselt]' };
                }
            } else {
                try {
                    displayValue = JSON.parse(a.value);
                } catch {
                    displayValue = { data: a.value };
                }
            }

            return {
                ...a,
                value: displayValue,
                questionText: atom?.questionText || `Frage ${a.atomId}`,
                section: atom?.section || 'sonstige',
                answerType: atom?.answerType || 'text',
            };
        });

        // Audit-Log: Wer schaut sich die Daten an
        await prisma.auditLog.create({
            data: {
                tenantId: resolvedTenant.tenantId,
                userId: req.auth?.userId || null,
                action: 'VIEW_SESSION_DETAIL',
                resource: `sessions/${sessionId}`,
            },
        });

        res.json({
            session: {
                ...session,
                patientName,
                answers: enrichedAnswers,
                triageEvents: triageEvents.map((te) => ({
                    ...te,
                    triggerValues: JSON.parse(te.triggerValues),
                })),
            },
        });
    } catch (err: unknown) {
        console.error('[Arzt] Session-Detail-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

import { emitPatientMessage, emitSessionComplete } from '../socket';

/**
 * PUT /api/arzt/triage/:id/ack
 */
router.put('/triage/:id/ack', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
    try {
        const triageId = req.params.id as string;
        const resolvedTenant = resolveEffectiveTenant(req);
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }

        const existingEvent = await prisma.triageEvent.findFirst({
            where: {
                id: triageId,
                session: {
                    tenantId: resolvedTenant.tenantId,
                },
            },
            select: { id: true },
        });

        if (!existingEvent) {
            res.status(404).json({ error: 'Triage-Event nicht gefunden' });
            return;
        }

        const event = await prisma.triageEvent.update({
            where: { id: triageId },
            data: {
                acknowledgedBy: req.auth!.userId,
                acknowledgedAt: new Date(),
            },
        });

        res.json({ success: true, event });
    } catch (err: unknown) {
        console.error('[Arzt] Triage-Ack-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * PUT /api/arzt/sessions/:id/status
 * Ändert den Status einer Session (z.B. auf COMPLETED) und triggert automatische Benachrichtigungen.
 */
router.put('/sessions/:id/status', requireAuth, requireRole('arzt', 'admin', 'mfa'), async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.id as string;
        const resolvedTenant = resolveEffectiveTenant(req);
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }

        const statusSchema = z.enum(['ACTIVE', 'COMPLETED', 'SUBMITTED', 'EXPIRED', 'TRIAGE']);
        const parseResult = statusSchema.safeParse(req.body.status);
        if (!parseResult.success) {
            res.status(400).json({ error: 'Ungültiger Status', allowed: statusSchema.options });
            return;
        }
        const status = parseResult.data;

        const session = await prisma.patientSession.findUnique({
            where: { id: sessionId },
        });

        if (!session || session.tenantId !== resolvedTenant.tenantId) {
            res.status(404).json({ error: 'Session nicht gefunden' });
            return;
        }

        const updatedSession = await prisma.patientSession.update({
            where: { id: sessionId },
            data: {
                status,
                completedAt: status === 'COMPLETED' ? new Date() : session.completedAt
            },
        });

        // Telefon-Entlaster Feature: Automatische Nachricht senden
        if (status === 'COMPLETED' && ['REZEPT', 'AU-ANFRAGE', 'UEBERWEISUNG'].includes(session.selectedService)) {
            const messageText = `Ihre Anfrage (${session.selectedService}) wurde bearbeitet und liegt in der Praxis zur Abholung bereit. Bitte vergessen Sie Ihre Versichertenkarte nicht.`;

            // In Datenbank speichern
            await prisma.chatMessage.create({
                data: {
                    sessionId,
                    senderType: 'ARZT',
                    senderId: req.auth?.userId,
                    text: messageText,
                    fromName: 'Praxis-System'
                }
            });

            // Echtzeit-Event senden
            emitPatientMessage(sessionId, {
                text: messageText,
                from: 'Praxis-System',
                timestamp: new Date().toISOString()
            });
        }

        emitSessionComplete(sessionId, session.selectedService);

        res.json({ success: true, session: updatedSession });
    } catch (err: unknown) {
        console.error('[Arzt] Session-Status-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * GET /api/arzt/sessions/:id/summary
 */
router.get('/sessions/:id/summary', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.id as string;
        const resolvedTenant = resolveEffectiveTenant(req);
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }

        const existingSession = await prisma.patientSession.findFirst({
            where: {
                id: sessionId,
                tenantId: resolvedTenant.tenantId,
            },
            select: { id: true },
        });

        if (!existingSession) {
            res.status(404).json({ error: 'Session nicht gefunden' });
            return;
        }

        const result = await aiEngine.summarizeSession(sessionId);
        res.json({
            summary: result.summary.historyOfPresentIllness || result.summary.chiefComplaint,
            icdCodes: (result.summary.suggestedIcdCodes || []).map(code => ({ code, label: code })),
            generatedAt: new Date(),
            aiModel: result.aiModel,
            mode: result.mode,
        });
    } catch (err: unknown) {
        console.error('[Arzt] AI-Summary-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

export default router;
