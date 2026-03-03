import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
const { sign, verify } = jwt;
import type { Secret, SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export interface AuthPayload {
    sessionId?: string;
    userId?: string;
    role: 'patient' | 'arzt' | 'mfa' | 'admin';
}

declare global {
    namespace Express {
        interface Request {
            auth?: AuthPayload;
        }
    }
}

/**
 * JWT-Token erstellen
 */
export function createToken(payload: AuthPayload): string {
    return sign(
        payload as object,
        config.jwtSecret as Secret,
        { expiresIn: config.jwtExpiresIn } as SignOptions
    );
}

/**
 * JWT-Validierung Middleware
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
        const decoded = verify(token, config.jwtSecret as Secret) as AuthPayload;
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
