import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
const { sign, verify } = jwt;
import type { Secret, SignOptions } from 'jsonwebtoken';
import { config } from '../config';

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

// ─── Token Blacklist (In-Memory + Cleanup) ──────────────────
// Für Production: Redis oder DB-basierte Blacklist empfohlen
const tokenBlacklist = new Map<string, number>(); // jti → expiry timestamp

// Blacklist cleanup alle 15 Minuten
setInterval(() => {
    const now = Date.now();
    for (const [jti, expiry] of tokenBlacklist.entries()) {
        if (expiry < now) tokenBlacklist.delete(jti);
    }
}, 15 * 60 * 1000);

/**
 * Token auf die Blacklist setzen (z.B. bei Logout)
 */
export function blacklistToken(jti: string, expiresInMs: number): void {
    tokenBlacklist.set(jti, Date.now() + expiresInMs);
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

/**
 * JWT-Validierung Middleware — mit Algorithm Pinning + Blacklist-Check
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    // Header-based auth (preferred)
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // Query-string token removed for security (tokens in URLs get logged).
    // File downloads should use Authorization header or same-origin fetch.

    if (!token) {
        res.status(401).json({ error: 'Authentifizierung erforderlich' });
        return;
    }

    try {
        const decoded = verify(token, config.jwtSecret as Secret, {
            algorithms: ['HS256'], // Prevent algorithm confusion attacks
        }) as AuthPayload;

        // Check token blacklist (logout/revocation)
        if (decoded.jti && tokenBlacklist.has(decoded.jti)) {
            res.status(401).json({ error: 'Token wurde widerrufen' });
            return;
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
