import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
const { sign, verify } = jwt;
import type { Secret, SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { getRedisClient } from '../redis';

export interface AuthPayload {
    sessionId?: string;
    userId?: string;
    role: 'patient' | 'arzt' | 'mfa' | 'admin';
    jti?: string; // JWT ID für Token-Blacklist
}

declare global {
    namespace Express {
        interface Request {
            auth?: AuthPayload;
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
 * Token auf die Blacklist setzen (z.B. bei Logout)
 * Nutzt Redis wenn verfügbar, sonst In-Memory Fallback
 */
export async function blacklistToken(jti: string, expiresInMs: number): Promise<void> {
    const redis = getRedisClient();
    if (redis?.isReady) {
        try {
            await redis.set(`bl:${jti}`, '1', { EX: Math.ceil(expiresInMs / 1000) });
            return;
        } catch (err) {
            console.warn('[Auth] Redis blacklist write failed, using fallback:', err);
        }
    }
    // Fallback: In-Memory
    tokenBlacklistFallback.set(jti, Date.now() + expiresInMs);
}

/**
 * Prüfe ob Token auf der Blacklist steht
 */
export async function isTokenBlacklisted(jti: string): Promise<boolean> {
    const redis = getRedisClient();
    if (redis?.isReady) {
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
 * JWT-Token erstellen — mit Algorithm Pinning (HS256) und JTI
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
    res.cookie('access_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24h
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
 * JWT-Validierung Middleware — mit Algorithm Pinning + Blacklist-Check (Redis)
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    // 1. Try Authorization header (API clients, mobile)
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // 2. Fallback to httpOnly cookie (browser clients)
    if (!token && (req as any).cookies?.access_token) {
        token = (req as any).cookies.access_token;
    }

    if (!token) {
        res.status(401).json({ error: 'Authentifizierung erforderlich' });
        return;
    }

    try {
        const decoded = verify(token, config.jwtSecret as Secret, {
            algorithms: ['HS256'], // Prevent algorithm confusion attacks
        }) as AuthPayload;

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

        req.auth = decoded;
        next();
    } catch (_err) {
        res.status(401).json({ error: 'Ungültiger oder abgelaufener Token' });
    }
}

/**
 * Rollen-Prüfung Middleware
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
 * Session-Eigentum prüfen (Patient darf nur eigene Session bearbeiten)
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
 * Permission-basierte Zugriffskontrolle
 * Prüft ob die Rolle des Users (oder individuelle Zusatz-Rechte) den angegebenen Permission-Code hat.
 * Nutzt Prisma: RolePermission + ArztUser.customPermissions
 */
export function requirePermission(permissionCode: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!req.auth) {
            res.status(401).json({ error: 'Nicht authentifiziert' });
            return;
        }

        // Admins always have all permissions
        if (req.auth.role === 'admin') {
            next();
            return;
        }

        try {
            // Lazy import to avoid circular deps
            const { prisma: _p } = await import('../db');
            const prisma = _p as any;

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
