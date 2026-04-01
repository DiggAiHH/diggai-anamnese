/**
 * @module security-audit.service
 * @description Dediziertes Security-Event-Logging gemäß DSGVO Art. 5 Abs. 2 und BSI-Grundschutz.
 *
 * Loggt sicherheitsrelevante Events (Login, Fehlschlag, Passwort-Änderung, Datenlöschung, Export)
 * mit gehashten IPs und ohne PII-Klartextdaten.
 *
 * Alle Events werden in die bestehende `AuditLog`-Tabelle geschrieben mit
 * dem Präfix `SECURITY:` für einfache SIEM-Integration und Filterbarkeit.
 */

import * as crypto from 'crypto';

// Lazy import to avoid circular deps
let _prisma: typeof import('../db').prisma | null = null;
async function getPrisma() {
  if (!_prisma) {
    const { prisma } = await import('../db');
    _prisma = prisma;
  }
  return _prisma;
}

// ─── Security Event Enum ────────────────────────────────────

export enum SecurityEvent {
  LOGIN_SUCCESS          = 'SECURITY:LOGIN_SUCCESS',
  LOGIN_FAILED           = 'SECURITY:LOGIN_FAILED',
  ACCOUNT_LOCKED         = 'SECURITY:ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED       = 'SECURITY:ACCOUNT_UNLOCKED',
  LOGOUT                 = 'SECURITY:LOGOUT',
  TOKEN_REVOKED          = 'SECURITY:TOKEN_REVOKED',
  PASSWORD_CHANGED       = 'SECURITY:PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'SECURITY:PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'SECURITY:PASSWORD_RESET_COMPLETED',
  DATA_EXPORTED          = 'SECURITY:DATA_EXPORTED',
  ACCOUNT_DELETED        = 'SECURITY:ACCOUNT_DELETED',
  ACCOUNT_HARD_DELETED   = 'SECURITY:ACCOUNT_HARD_DELETED',
  SUSPICIOUS_ACTIVITY    = 'SECURITY:SUSPICIOUS_ACTIVITY',
}

// ─── Options Interface ──────────────────────────────────────

export interface SecurityAuditOptions {
  event: SecurityEvent;
  tenantId: string;
  /** Internal actor ID (userId or accountId) — stored as-is, NOT PII */
  actorId?: string;
  /** Client IP — will be SHA-256 hashed before storage, never stored in plaintext */
  ip?: string;
  /** User-Agent string — truncated and sanitized, no PII */
  userAgent?: string;
  /**
   * Additional context metadata.
   * MUST NOT contain PII (no email, name, phone, DOB).
   * Allowed: attempt counts, boolean flags, role names, timestamps, error codes.
   */
  metadata?: Record<string, unknown>;
}

// ─── IP Hashing ─────────────────────────────────────────────

/**
 * SHA-256 der IP-Adresse (erste 16 Hex-Zeichen = 8 Byte = Pseudonym).
 * Schützt Datenschutz, ermöglicht trotzdem Korrelation für Sicherheitsanalyse.
 */
function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

function sanitizeUserAgent(ua: string): string {
  return ua.replace(/[\r\n\t]/g, ' ').substring(0, 200);
}

// ─── Main Log Function ───────────────────────────────────────

/**
 * Schreibt ein Security-Audit-Event in die AuditLog-Tabelle.
 * Nicht-blockierend: Fehler werden geloggt aber nie zum Request-Fehler.
 */
export async function logSecurityEvent(opts: SecurityAuditOptions): Promise<void> {
  try {
    const prisma = await getPrisma();
    await prisma.auditLog.create({
      data: {
        tenantId:  opts.tenantId,
        userId:    opts.actorId ?? null,
        action:    opts.event,
        resource:  'auth/security',
        ipAddress: opts.ip ? hashIp(opts.ip) : null,
        userAgent: opts.userAgent ? sanitizeUserAgent(opts.userAgent) : null,
        metadata:  opts.metadata ? JSON.stringify(opts.metadata) : null,
      },
    });
  } catch (err) {
    // Non-fatal: Security-Log-Fehler darf keinen Request abbrechen.
    // ABER: In Produktion sollte dies ein Alert triggern (z.B. via Sentry/PagerDuty).
    console.error('[SecurityAudit] KRITISCH — Event konnte nicht gespeichert werden:', opts.event, err);
  }
}

/**
 * Convenience-Wrapper für fehlgeschlagene Login-Versuche.
 * Loggt immer, auch wenn keine userId bekannt ist (User-Enumeration-schutz).
 */
export async function logLoginFailure(opts: {
  tenantId: string;
  ip?: string;
  userAgent?: string;
  /** Anzahl fehlgeschlagener Versuche NACH diesem Fehler */
  attemptNumber?: number;
  /** true wenn der Account jetzt gesperrt wurde */
  accountLocked?: boolean;
}): Promise<void> {
  await logSecurityEvent({
    event: opts.accountLocked ? SecurityEvent.ACCOUNT_LOCKED : SecurityEvent.LOGIN_FAILED,
    tenantId: opts.tenantId,
    ip: opts.ip,
    userAgent: opts.userAgent,
    metadata: {
      attemptNumber: opts.attemptNumber,
      accountLocked: opts.accountLocked ?? false,
    },
  });
}
