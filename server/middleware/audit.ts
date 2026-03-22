import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

/**
 * HIPAA/DSGVO Audit Log Middleware (Section 2.5)
 * Loggt jede API-Anfrage mit Benutzer, Aktion, IP, Response-Status und Zeitstempel.
 * - Sanitized: Query-Params werden von sensitiven Schlüsseln befreit
 * - Response-Status wird nach Abschluss erfasst
 * - Retry-Logik: Bei Schreibfehler bis zu 2 Wiederholungsversuche
 */

// Sensitive Parameter die NICHT geloggt werden dürfen
const SENSITIVE_KEYS = new Set(['token', 'password', 'secret', 'authorization', 'api_key', 'apikey', 'access_token', 'refresh_token']);

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.has(key.toLowerCase())) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'string' && value.length > 500) {
            sanitized[key] = value.substring(0, 500) + '…[truncated]';
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

// Sanitize User-Agent to prevent log injection
function sanitizeString(str: string, maxLength = 256): string {
    return str
        .replace(/[\r\n\t]/g, ' ')       // Remove newlines (log injection)
        .replace(/[^\x20-\x7E\xA0-\xFF]/g, '') // Keep only printable chars
        .substring(0, maxLength);
}

async function writeAuditLogWithRetry(data: Parameters<typeof prisma.auditLog.create>[0]['data'], retries = 2): Promise<void> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            await prisma.auditLog.create({ data });
            return;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            if (attempt === retries) {
                console.error(`[AuditLog] KRITISCH: Log-Schreibfehler nach ${retries + 1} Versuchen:`, message);
            } else {
                console.warn(`[AuditLog] Versuch ${attempt + 1} fehlgeschlagen, Retry...`);
                await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
            }
        }
    }
}

export function auditLogger(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Hook into response finish to capture status code
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const authContext = req as Express.Request;
        const actorSessionId = authContext.auth?.userId ? null : authContext.auth?.sessionId || null;
        const logEntry = {
            tenantId: req.tenantId || authContext.auth?.tenantId || 'system',
            userId: authContext.auth?.userId || null,
            action: `${req.method} ${req.path}`,
            resource: `${req.baseUrl || ''}${req.path}`.substring(0, 500),
            ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: sanitizeString(req.headers['user-agent'] || 'unknown'),
            metadata: JSON.stringify({
                method: req.method,
                query: sanitizeObject(req.query as Record<string, unknown>),
                actorSessionId,
                statusCode: res.statusCode,
                durationMs: duration,
                timestamp: new Date().toISOString(),
            }),
        };

        // Write with retry (non-blocking)
        writeAuditLogWithRetry(logEntry);
    });

    next();
}
