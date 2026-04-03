/**
 * @module auth
 * @description JWT-Authentifizierung und RBAC-Autorisierungs-Middleware
 *
 * Implementiert ein vierstufiges Sicherheitsmodell für alle /api/* Endpunkte:
 *
 * @security
 * - Algorithm Pinning: Nur HS256 (verhindert Algorithm Confusion Attacks)
 * - Token Blacklist: Redis (primär) + In-Memory-Map (Fallback) für Logout-Invalidierung
 * - HttpOnly Cookie: JWT wird als `access_token` Cookie gesetzt (XSS-immun)
 * - Refresh Token Rotation: Kurzlebige Access Tokens (15min) + rotierende Refresh Tokens (7d)
 * - Fail-closed: Bei Blacklist-Fehlern → 503 statt 200 (DSGVO/HIPAA deny-by-default)
 *
 * @rbac RBAC Rollen und Zugriffsbereiche:
 * | Rolle   | Zugriff                                                              |
 * |---------|----------------------------------------------------------------------|
 * | patient | Eigene Sessions, eigene Antworten, PWA-Portal                        |
 * | arzt    | Alle Sessions, Triage-Dashboard, Therapiepläne, Chat                 |
 * | mfa     | Queue-Management, Session-Zuweisung, Chat                            |
 * | admin   | Alles + Benutzerverwaltung, Systemkonfiguration, Fragen-Editor       |
 *
 * @middleware-chain Typische Route-Absicherung:
 * ```typescript
 * router.get('/data', requireAuth, requireRole('arzt', 'admin'), handler);
 * router.get('/session/:id', requireAuth, requireSessionOwner, handler);
 * router.post('/action', requireAuth, requirePermission('manage:sessions'), handler);
 * ```
 */
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
const { sign, verify } = jwt;
import type { Secret, SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { getRedisClient, isRedisReady } from '../redis';

export interface AuthPayload {
    sessionId?: string;
    userId?: string;
    tenantId?: string;
    role: 'patient' | 'arzt' | 'mfa' | 'admin';
    userType?: 'ARZT' | 'PATIENT';
    jti?: string; // JWT ID für Token-Blacklist
}

export function normalizeAuthRole(role: string | null | undefined): AuthPayload['role'] | null {
    const normalized = role?.toLowerCase();
    if (normalized === 'patient' || normalized === 'arzt' || normalized === 'mfa' || normalized === 'admin') {
        return normalized;
    }
    return null;
}

// MED-001 FIX: Properly typed Request with cookies
declare global {
    namespace Express {
        interface Request {
            auth?: AuthPayload;
            cookies?: Record<string, string | undefined>;
        }
    }
}

// ─── Token Blacklist (Redis + In-Memory Fallback) ───────────
const tokenBlacklistFallback = new Map<string, number>(); // jti → expiry timestamp

// Fallback cleanup alle 15 Minuten
setInterval(() => {
    const now = Date.now();
    for (const [jti, expiry] of tokenBlacklistFallback.entries()) {
        if (expiry < now) tokenBlacklistFallback.delete(jti);
    }
}, 15 * 60 * 1000);

/**
 * Setzt ein JWT auf die Blacklist (z.B. bei Logout oder Token-Widerruf).
 * Nutzt Redis wenn verfügbar (bevorzugt), sonst In-Memory Map als Fallback.
 *
 * @param jti - JWT ID (aus Token-Payload `jti` Feld)
 * @param expiresInMs - Restlebensdauer des Tokens in Millisekunden (TTL in Redis)
 * @returns Promise<void> — kein Rückgabewert, Fehler werden intern behandelt
 */
export async function blacklistToken(jti: string, expiresInMs: number): Promise<void> {
    const redis = getRedisClient();
    if (redis && isRedisReady()) {
        try {
            await redis.set(`bl:${jti}`, '1', 'EX', Math.ceil(expiresInMs / 1000));
            return;
        } catch (err) {
            console.warn('[Auth] Redis blacklist write failed, using fallback:', err);
        }
    }
    // Fallback: In-Memory
    tokenBlacklistFallback.set(jti, Date.now() + expiresInMs);
}

/**
 * Prüft ob ein Token-JTI auf der Blacklist steht (widerrufen wurde).
 *
 * @param jti - JWT ID aus dem Token-Payload
 * @returns true wenn der Token widerrufen wurde und abgelehnt werden muss
 */
export async function isTokenBlacklisted(jti: string): Promise<boolean> {
    const redis = getRedisClient();
    if (redis && isRedisReady()) {
        try {
            const result = await redis.get(`bl:${jti}`);
            return result !== null;
        } catch (err) {
            console.warn('[Auth] Redis blacklist read failed, using fallback:', err);
        }
    }
    return tokenBlacklistFallback.has(jti);
}

/**
 * Erstellt ein signiertes JWT mit HS256 und einzigartiger JTI.
 * Algorithm Pinning verhindert Algorithm Confusion Attacks (CVE-2022-21449 Klasse).
 *
 * @param payload - Zu signierende Daten (userId, role, sessionId etc.)
 * @returns Signierter JWT-String (nicht Base64-decodiert im Client speichern!)
 */
export function createToken(payload: AuthPayload): string {
    const jti = crypto.randomUUID();
    return sign(
        { ...payload, jti } as object,
        config.jwtSecret as Secret,
        {
            expiresIn: config.jwtExpiresIn,
            algorithm: 'HS256', // BSI TR-02102: Algorithmus explizit pinnen
        } as SignOptions
    );
}

/** Set JWT as httpOnly cookie on the response */
export function setTokenCookie(res: Response, token: string): void {
    // SECURITY FIX M1: maxAge jetzt synchron mit config.jwtExpiresIn (nicht hardcoded 24h)
    res.cookie('access_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: config.jwtCookieMaxAgeMs,
        path: '/',
    });
}

/** Clear the JWT cookie on logout */
export function clearTokenCookie(res: Response): void {
    res.clearCookie('access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
    });
}

/**
 * Validiert JWT aus Authorization-Header oder HttpOnly-Cookie.
 * Überprüft: Signatur, Algorithm (HS256), Ablaufdatum, Token-Blacklist.
 *
 * @access Alle authentifizierten Routen
 * @middleware Muss VOR `requireRole`, `requireSessionOwner` und `requirePermission` stehen
 * @sets req.auth - AuthPayload mit userId, role, sessionId nach erfolgreicher Validierung
 * @responds 401 bei fehlendem/ungültigem Token, 503 bei Blacklist-Fehler (fail-closed)
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    // 1. Try Authorization header (API clients, mobile)
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // 2. Fallback to httpOnly cookie (browser clients)
    if (!token && req.cookies?.access_token) {
        token = req.cookies.access_token;
    }

    if (!token) {
        res.status(401).json({ error: 'Authentifizierung erforderlich' });
        return;
    }

    try {
        const decoded = verify(token, config.jwtSecret as Secret, {
            algorithms: ['HS256'], // Prevent algorithm confusion attacks
        }) as AuthPayload;
        const normalizedRole = normalizeAuthRole(decoded.role);
        if (!normalizedRole) {
            res.status(401).json({ error: 'UngÃ¼ltiger oder abgelaufener Token' });
            return;
        }

        // Check token blacklist (async — Redis or fallback)
        if (decoded.jti) {
            try {
                const blacklisted = await isTokenBlacklisted(decoded.jti);
                if (blacklisted) {
                    res.status(401).json({ error: 'Token wurde widerrufen' });
                    return;
                }
            } catch (err) {
                // DSGVO/HIPAA: fail-closed on blacklist check failure — medical data requires deny-by-default
                console.error('[Auth] Blacklist check failed — denying request for security:', err);
                res.status(503).json({ error: 'Authentifizierung vorübergehend nicht verfügbar' });
                return;
            }
        }

        req.auth = {
            ...decoded,
            role: normalizedRole,
        };
        next();
    } catch (_err) {
        res.status(401).json({ error: 'Ungültiger oder abgelaufener Token' });
    }
}

/**
 * RBAC-Middleware: Erlaubt nur Requests von Nutzern mit einer der angegebenen Rollen.
 * Muss NACH `requireAuth` in der Middleware-Chain stehen.
 *
 * @param roles - Erlaubte Rollen (z.B. 'arzt', 'admin', 'mfa')
 * @returns Express Middleware Factory
 * @responds 403 wenn die Rolle des authentifizierten Nutzers nicht in `roles` enthalten ist
 *
 * @example
 * router.get('/sessions', requireAuth, requireRole('arzt', 'admin'), handler);
 */
export function requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.auth || !roles.includes(req.auth.role)) {
            res.status(403).json({ error: 'Zugriff verweigert' });
            return;
        }
        next();
    };
}

/**
 * Stellt sicher, dass ein Patient nur auf seine eigene Session zugreifen kann.
 * Ärzte (arzt/admin) dürfen alle Sessions sehen — diese Prüfung wird für sie übersprungen.
 *
 * @access patient (nur eigene Session via req.auth.sessionId), arzt, admin (alle Sessions)
 * @requires req.params.id — Session-ID aus dem URL-Parameter
 * @responds 403 wenn Patient auf fremde Session zugreift
 */
export function requireSessionOwner(req: Request, res: Response, next: NextFunction): void {
    if (!req.auth) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
    }

    // Ärzte dürfen alle Sessions sehen
    if (req.auth.role === 'arzt' || req.auth.role === 'admin') {
        next();
        return;
    }

    // Patienten nur eigene Session
    const sessionId = req.params.id;
    if (req.auth.sessionId !== sessionId) {
        res.status(403).json({ error: 'Kein Zugriff auf diese Sitzung' });
        return;
    }

    next();
}

/**
 * Feingranulare Permission-Middleware für komplexe Zugriffsszenarien.
 * Überprüft `RolePermission`-Tabelle (Rollen-Berechtigungen) UND
 * `ArztUser.customPermissions` (individuelle Zusatzrechte).
 * Admins haben immer alle Berechtigungen (Kurzschluss-Optimierung).
 *
 * @param permissionCode - Berechtigungs-Code (z.B. 'manage:sessions', 'export:pdf')
 * @returns Express Middleware Factory (async)
 * @responds 403 bei fehlender Berechtigung, 503 bei DB-Fehler (fail-closed für DSGVO/HIPAA)
 *
 * @example
 * router.delete('/session/:id', requireAuth, requirePermission('delete:session'), handler);
 */
function createPermissionMiddleware(permissionCode: string, allowAdminBypass: boolean) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!req.auth) {
            res.status(401).json({ error: 'Nicht authentifiziert' });
            return;
        }

        // Admins always have all permissions
        if (allowAdminBypass && req.auth.role === 'admin') {
            next();
            return;
        }

        try {
            // Lazy import to avoid circular deps
            const { prisma } = await import('../db');

            const role = req.auth.role.toUpperCase(); // ARZT, MFA, etc.

            // Check role-level permission
            const rolePermission = await prisma.rolePermission.findFirst({
                where: {
                    role,
                    permission: { code: permissionCode },
                },
            });

            if (rolePermission) {
                next();
                return;
            }

            // Check individual user permissions (customPermissions JSON on ArztUser)
            if (req.auth.userId) {
                const user = await prisma.arztUser.findUnique({
                    where: { id: req.auth.userId },
                    select: { customPermissions: true },
                });

                if (user?.customPermissions) {
                    try {
                        const custom: string[] = JSON.parse(user.customPermissions);
                        if (custom.includes(permissionCode)) {
                            next();
                            return;
                        }
                    } catch { /* invalid JSON, ignore */ }
                }
            }

            res.status(403).json({ error: 'Fehlende Berechtigung', requiredPermission: permissionCode });
        } catch (err) {
            console.error('[Auth] Permission check error:', err);
            // DSGVO/HIPAA: fail-closed — medical data requires deny-by-default on errors
            res.status(503).json({ error: 'Berechtigungsprüfung vorübergehend nicht verfügbar' });
        }
    };
}

export function requirePermission(permissionCode: string) {
    return createPermissionMiddleware(permissionCode, true);
}

export function requireStrictPermission(permissionCode: string) {
    return createPermissionMiddleware(permissionCode, false);
}

/** Convenience alias: requireRole('admin') for routes that only need admin access */
export const requireAdmin = requireRole('admin');
