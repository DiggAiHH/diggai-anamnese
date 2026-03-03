import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

/**
 * HIPAA Audit Log Middleware
 * Loggt jede API-Anfrage mit Benutzer, Aktion, IP und Zeitstempel
 */
export function auditLogger(req: Request, _res: Response, next: NextFunction): void {
    // Async log – blockiert die Anfrage nicht
    const logEntry = {
        userId: (req as Express.Request).auth?.userId || (req as Express.Request).auth?.sessionId || null,
        action: `${req.method} ${req.path}`,
        resource: req.originalUrl,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        metadata: JSON.stringify({
            method: req.method,
            query: req.query,
            timestamp: new Date().toISOString(),
        }),
    };

    // Fire-and-forget – Fehler beim Logging soll API nicht blockieren
    prisma.auditLog.create({ data: logEntry }).catch((err: Error) => {
        console.error('[AuditLog] Fehler beim Schreiben:', err.message);
    });

    next();
}
