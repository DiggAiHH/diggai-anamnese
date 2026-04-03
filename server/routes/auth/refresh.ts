/**
 * @module auth/refresh
 * @description Refresh Token API Routes
 *
 * Endpunkte:
 * - POST /api/auth/refresh     - Access Token mit Refresh Token erneuern
 * - POST /api/auth/logout      - Session beenden (Token revoke)
 * - POST /api/auth/logout-all  - Alle Sessions beenden
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import {
    rotateRefreshToken,
    revokeRefreshToken,
    revokeAllUserTokens,
    hashToken,
} from '../../services/auth/refresh-token.service';
import {
    createToken,
    setTokenCookie,
    clearTokenCookie,
    requireAuth,
    blacklistToken,
} from '../../middleware/auth';
import { logSecurityEvent, SecurityEvent } from '../../services/security-audit.service';
import { config } from '../../config';

const router = Router();

// ─── Rate Limiting ──────────────────────────────────────────

// Strikt limit für Token Refresh (verhindert Brute-Force)
const refreshRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 Minuten
    max: 20, // Max 20 Refresh-Versuche pro 15 Minuten
    message: { error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ─── Validation Schemas ─────────────────────────────────────

const refreshSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh Token ist erforderlich'),
    deviceFingerprint: z.string().optional(),
});

// ─── Routes ─────────────────────────────────────────────────

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Access Token mit Refresh Token erneuern
 *     description: |
 *       Rotiert den Refresh Token und gibt ein neues Token-Paar aus.
 *       Implementiert Token Rotation Pattern - der alte Refresh Token
 *       ist nach diesem Aufruf ungültig.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Der aktuelle Refresh Token
 *               deviceFingerprint:
 *                 type: string
 *                 description: Optional - Device Fingerprint für Security-Tracking
 *     responses:
 *       200:
 *         description: Neues Token-Paar erfolgreich erstellt
 *         headers:
 *           Set-Cookie:
 *             description: Neuer access_token Cookie (HttpOnly)
 *             schema: { type: string }
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 accessToken:
 *                   type: string
 *                   description: Neuer JWT Access Token (15 Minuten gültig)
 *                 refreshToken:
 *                   type: string
 *                   description: Neuer Refresh Token (7 Tage gültig)
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Token ungültig, abgelaufen oder widerrufen
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Token ist abgelaufen
 *                 securityEvent:
 *                   type: string
 *                   enum: [reuse_detected, expired, revoked, invalid]
 *       429:
 *         description: Rate Limit überschritten
 *       500:
 *         description: Serverfehler
 */
router.post('/refresh', refreshRateLimiter, async (req: Request, res: Response) => {
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
        const validation = refreshSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                error: 'Ungültige Eingabe',
                details: validation.error.issues,
            });
            return;
        }

        const { refreshToken, deviceFingerprint } = validation.data;

        const result = await rotateRefreshToken(refreshToken, deviceFingerprint, ip, userAgent);

        if (!result.success) {
            // Sicherheits-Events werden bereits im Service geloggt
            const statusCode = result.securityEvent === 'reuse_detected' ? 403 : 401;
            res.status(statusCode).json({
                error: result.error,
                securityEvent: result.securityEvent,
            });
            return;
        }

        // Setze neuen Access Token als HttpOnly Cookie
        setTokenCookie(res, result.tokenPair!.accessToken);

        res.json({
            success: true,
            accessToken: result.tokenPair!.accessToken,
            refreshToken: result.tokenPair!.refreshToken,
            expiresAt: result.tokenPair!.expiresAt.toISOString(),
        });

    } catch (err) {
        console.error('[Auth/Refresh] Unexpected error:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Aktuelle Session beenden
 *     description: |
 *       Widerruft den aktuellen Access Token (Blacklist) und optional
 *       den Refresh Token. Löscht das Auth-Cookie.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Optional - Refresh Token zum Widerrufen
 *     responses:
 *       200:
 *         description: Erfolgreich abgemeldet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Erfolgreich abgemeldet
 *       401:
 *         description: Nicht authentifiziert
 */
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
        // Access Token auf Blacklist setzen
        if (req.auth?.jti) {
            await blacklistToken(req.auth.jti, config.jwtCookieMaxAgeMs);
        }

        // Optional: Refresh Token auch widerrufen (wenn im Body)
        const { refreshToken } = req.body;
        if (refreshToken && typeof refreshToken === 'string') {
            const tokenHash = hashToken(refreshToken);
            await revokeRefreshToken(tokenHash, 'USER_LOGOUT');
        }

        // Security Event loggen
        await logSecurityEvent({
            event: SecurityEvent.LOGOUT,
            tenantId: req.auth?.tenantId || 'system',
            actorId: req.auth?.userId,
            ip,
            userAgent,
            metadata: {
                role: req.auth?.role,
                tokenRevoked: !!req.auth?.jti,
                refreshTokenRevoked: !!refreshToken,
            },
        });

        // Cookie löschen
        clearTokenCookie(res);

        res.json({ message: 'Erfolgreich abgemeldet' });

    } catch (err) {
        console.error('[Auth/Logout] Error:', err);
        // Trotz Fehler Cookie löschen (best effort)
        clearTokenCookie(res);
        res.json({ message: 'Erfolgreich abgemeldet' });
    }
});

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     tags: [Auth]
 *     summary: Alle Sessions beenden
 *     description: |
 *       Widerruft ALLE Refresh Tokens des aktuellen Benutzers.
 *       Erfordert erneuten Login auf allen Geräten.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Alle Sessions beendet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Alle Sessions beendet
 *                 revokedCount:
 *                   type: integer
 *                   description: Anzahl der widerrufenen Tokens
 *       401:
 *         description: Nicht authentifiziert
 */
router.post('/logout-all', requireAuth, async (req: Request, res: Response) => {
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
        if (!req.auth?.userId) {
            res.status(401).json({ error: 'Nicht authentifiziert' });
            return;
        }

        // Bestimme UserType aus der Rolle
        const userType = req.auth.role === 'patient' ? 'PATIENT' : 'ARZT';

        // Alle Tokens des Benutzers widerrufen
        const revokedCount = await revokeAllUserTokens(
            req.auth.userId,
            userType
        );

        // Aktuellen Access Token auch blacklisten
        if (req.auth?.jti) {
            await blacklistToken(req.auth.jti, config.jwtCookieMaxAgeMs);
        }

        // Security Event loggen
        await logSecurityEvent({
            event: SecurityEvent.ALL_SESSIONS_TERMINATED,
            tenantId: req.auth?.tenantId || 'system',
            actorId: req.auth.userId,
            ip,
            userAgent,
            metadata: {
                role: req.auth?.role,
                revokedCount,
            },
        });

        // Cookie löschen
        clearTokenCookie(res);

        res.json({
            message: 'Alle Sessions beendet',
            revokedCount,
        });

    } catch (err) {
        console.error('[Auth/LogoutAll] Error:', err);
        clearTokenCookie(res);
        res.json({ message: 'Alle Sessions beendet' });
    }
});

/**
 * @swagger
 * /auth/session-info:
 *   get:
 *     tags: [Auth]
 *     summary: Session-Informationen abrufen
 *     description: Gibt Informationen über die aktuelle Session zurück
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Session-Info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                 userId:
 *                   type: string
 *                 role:
 *                   type: string
 *                 tenantId:
 *                   type: string
 */
router.get('/session-info', requireAuth, async (req: Request, res: Response) => {
    res.json({
        authenticated: true,
        userId: req.auth?.userId,
        role: req.auth?.role,
        tenantId: req.auth?.tenantId,
        sessionId: req.auth?.sessionId,
    });
});

export default router;
