/**
 * @module auth/sessions
 * @description Session Management API Routes
 *
 * Endpunkte für Session-Verwaltung:
 * - GET /api/auth/sessions - Alle aktiven Sessions listen
 * - DELETE /api/auth/sessions/:id - Spezifische Session beenden
 * - DELETE /api/auth/sessions/all - Alle anderen Sessions beenden
 * - GET /api/auth/sessions/activity - Login-Aktivitätslog abrufen
 */

import { Router } from 'express';
import { prisma } from '../../db';
import { requireAuth } from '../../middleware/auth';
import { logSecurityEvent, SecurityEvent } from '../../services/security-audit.service';
import { revokeRefreshToken } from '../../services/auth/refresh-token.service';
import type { Request, Response } from 'express';

const router = Router();

interface SessionInfo {
  id: string;
  deviceName: string;
  deviceType: string;
  browser?: string;
  os?: string;
  location?: string;
  ipHash: string;
  lastActiveAt: Date;
  createdAt: Date;
  isCurrentSession: boolean;
  isTrusted: boolean;
}

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     tags: [Auth]
 *     summary: Alle aktiven Sessions listen
 *     description: |
 *       Gibt eine Liste aller aktiven Sessions des aktuellen Benutzers zurück.
 *       Enthält Geräteinformationen, Browser, OS und IP-Hash.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Liste der aktiven Sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       deviceName:
 *                         type: string
 *                       deviceType:
 *                         type: string
 *                       browser:
 *                         type: string
 *                       os:
 *                         type: string
 *                       ipHash:
 *                         type: string
 *                       lastActiveAt:
 *                         type: string
 *                         format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       isCurrentSession:
 *                         type: boolean
 *                       isTrusted:
 *                         type: boolean
 *       401:
 *         description: Nicht authentifiziert
 *       500:
 *         description: Serverfehler
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userType = req.auth?.role === 'patient' ? 'PATIENT' : 'ARZT';

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    // Get current token ID from request (set by middleware if available)
    const currentTokenId = (req as unknown as { refreshTokenId?: string }).refreshTokenId;

    const tokens = await prisma.refreshToken.findMany({
      where: {
        userId,
        userType,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        device: true,
      },
      orderBy: { issuedAt: 'desc' },
    });

    const sessions: SessionInfo[] = tokens.map(token => ({
      id: token.id,
      deviceName: token.device?.deviceName ?? 'Unbekanntes Gerät',
      deviceType: token.device?.deviceType ?? 'web',
      browser: parseBrowser(token.userAgent),
      os: parseOS(token.userAgent),
      location: undefined, // Would require IP geolocation
      ipHash: token.ipHash ? maskIpHash(token.ipHash) : '***',
      lastActiveAt: token.rotatedAt ?? token.issuedAt,
      createdAt: token.issuedAt,
      isCurrentSession: token.id === currentTokenId,
      isTrusted: token.device?.isTrusted ?? false,
    }));

    res.json({ sessions });
  } catch (error) {
    console.error('[Sessions] List error:', error);
    res.status(500).json({ error: 'Sessions konnten nicht geladen werden' });
  }
});

/**
 * @swagger
 * /auth/sessions/all:
 *   delete:
 *     tags: [Auth]
 *     summary: Alle anderen Sessions beenden
 *     description: |
 *       Beendet alle Sessions außer der aktuellen.
 *       Nützlich für "Überall abmelden" Funktionalität.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Sessions erfolgreich beendet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 terminatedCount:
 *                   type: integer
 *       401:
 *         description: Nicht authentifiziert
 *       500:
 *         description: Serverfehler
 */
router.delete('/all', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userType = req.auth?.role === 'patient' ? 'PATIENT' : 'ARZT';
    const currentTokenId = (req as unknown as { refreshTokenId?: string }).refreshTokenId;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    // Build where clause - revoke all tokens except current
    const whereClause: {
      userId: string;
      userType: 'PATIENT' | 'ARZT';
      isRevoked: boolean;
      id?: { not: string };
    } = {
      userId,
      userType,
      isRevoked: false,
    };

    if (currentTokenId) {
      whereClause.id = { not: currentTokenId };
    }

    // Revoke all tokens except current
    const result = await prisma.refreshToken.updateMany({
      where: whereClause,
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'ALL_SESSIONS_TERMINATED',
      },
    });

    await logSecurityEvent({
      event: SecurityEvent.ALL_SESSIONS_TERMINATED,
      tenantId: userType === 'ARZT' ? 'system' : 'pwa',
      actorId: userId,
      metadata: { terminatedCount: result.count },
    });

    res.json({
      success: true,
      message: `${result.count} Sessions beendet`,
      terminatedCount: result.count,
    });
  } catch (error) {
    console.error('[Sessions] Terminate all error:', error);
    res.status(500).json({ error: 'Sessions konnten nicht beendet werden' });
  }
});

/**
 * @swagger
 * /auth/sessions/activity:
 *   get:
 *     tags: [Auth]
 *     summary: Login-Aktivitätslog abrufen
 *     description: |
 *       Gibt einen Verlauf der Login-Aktivitäten zurück.
 *       Enthält erfolgreiche Logins, Logouts und Session-Beendigungen.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Anzahl der Einträge (max 100)
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Aktivitätslog
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activity:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       action:
 *                         type: string
 *                         enum: [LOGIN, LOGOUT]
 *                       deviceName:
 *                         type: string
 *                       browser:
 *                         type: string
 *                       ipHash:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *       401:
 *         description: Nicht authentifiziert
 *       500:
 *         description: Serverfehler
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userType = req.auth?.role === 'patient' ? 'PATIENT' : 'ARZT';
    const sessionId = req.params.id as string;

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    // Verify the session belongs to current user
    const token = await prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId,
        userType,
      },
    });

    if (!token) {
      return res.status(404).json({ error: 'Session nicht gefunden' });
    }

    // Revoke the token
    await revokeRefreshToken(token.tokenHash, 'USER_TERMINATED');

    await logSecurityEvent({
      event: SecurityEvent.SESSION_TERMINATED,
      tenantId: userType === 'ARZT' ? 'system' : 'pwa',
      actorId: userId,
      sessionId,
      metadata: { terminatedSession: sessionId },
    });

    res.json({ success: true, message: 'Session beendet' });
  } catch (error) {
    console.error('[Sessions] Terminate error:', error);
    res.status(500).json({ error: 'Session konnte nicht beendet werden' });
  }
});

router.get('/activity', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userType = req.auth?.role === 'patient' ? 'PATIENT' : 'ARZT';
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const tokens = await prisma.refreshToken.findMany({
      where: {
        userId,
        userType,
      },
      include: {
        device: true,
      },
      orderBy: { issuedAt: 'desc' },
      take: limit,
    });

    const activity = tokens.map(token => ({
      id: token.id,
      action: token.isRevoked ? 'LOGOUT' : 'LOGIN',
      deviceName: token.device?.deviceName ?? 'Unbekannt',
      browser: parseBrowser(token.userAgent),
      location: undefined,
      ipHash: token.ipHash ? maskIpHash(token.ipHash) : '***',
      timestamp: token.issuedAt,
      status: token.isRevoked
        ? `Beendet: ${token.revokedReason ?? 'Unbekannt'}`
        : 'Aktiv',
    }));

    res.json({ activity });
  } catch (error) {
    console.error('[Sessions] Activity error:', error);
    res.status(500).json({ error: 'Aktivitätslog konnte nicht geladen werden' });
  }
});

// Helper functions
function parseBrowser(userAgent?: string | null): string | undefined {
  if (!userAgent) return undefined;
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edg')) return 'Edge';
  return 'Unknown';
}

function parseOS(userAgent?: string | null): string | undefined {
  if (!userAgent) return undefined;
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  return 'Unknown';
}

function maskIpHash(hash: string): string {
  // Show first 4 chars only for display
  return hash.slice(0, 4) + '***';
}

export default router;
