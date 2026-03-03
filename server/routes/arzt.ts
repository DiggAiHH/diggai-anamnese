import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../db';
import * as bcrypt from 'bcryptjs';
import { createToken, requireAuth, requireRole, blacklistToken } from '../middleware/auth';
import { AIService } from '../services/aiService';
import { decrypt, isPIIAtom } from '../services/encryption';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

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

/**
 * POST /api/arzt/login
 */
router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
    try {
        const validated = loginSchema.parse(req.body);
        const { username, password } = validated;

        const arzt = await prisma.arztUser.findUnique({
            where: { username },
        });

        if (!arzt) {
            res.status(401).json({ error: 'Ungültige Anmeldedaten' });
            return;
        }

        const isValid = await bcrypt.compare(password, arzt.passwordHash);
        if (!isValid) {
            res.status(401).json({ error: 'Ungültige Anmeldedaten' });
            return;
        }

        const token = createToken({
            userId: arzt.id,
            role: arzt.role as 'arzt' | 'mfa' | 'admin',
        });

        res.json({
            token,
            user: {
                id: arzt.id,
                username: arzt.username,
                displayName: arzt.displayName,
            },
        });
    } catch (err: unknown) {
        console.error('[Arzt] Login-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * POST /api/arzt/logout — Token widerrufen (Blacklist)
 */
router.post('/logout', requireAuth, (req: Request, res: Response) => {
    if (req.auth?.jti) {
        // Token auf Blacklist setzen (24h Ablauf = maximale Token-Lebensdauer)
        blacklistToken(req.auth.jti, 24 * 60 * 60 * 1000);
    }
    res.json({ message: 'Erfolgreich abgemeldet' });
});

/**
 * GET /api/arzt/sessions
 */
router.get('/sessions', requireAuth, requireRole('arzt', 'admin'), async (_req: Request, res: Response) => {
    try {
        const sessions = await prisma.patientSession.findMany({
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
        const session = await prisma.patientSession.findUnique({
            where: { id: sessionId },
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
        const { status } = req.body;

        const session = await prisma.patientSession.findUnique({
            where: { id: sessionId },
        });

        if (!session) {
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
        const summary = await AIService.generateClinicalSummary(sessionId);
        res.json(summary);
    } catch (err: unknown) {
        console.error('[Arzt] AI-Summary-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

export default router;
