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
  // Authentication Events
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

  // MFA Events
  MFA_ENABLED            = 'SECURITY:MFA_ENABLED',
  MFA_DISABLED           = 'SECURITY:MFA_DISABLED',
  MFA_CHALLENGE_SUCCESS  = 'SECURITY:MFA_CHALLENGE_SUCCESS',
  MFA_CHALLENGE_FAILED   = 'SECURITY:MFA_CHALLENGE_FAILED',

  // Token & Session Events
  TOKEN_REFRESHED        = 'SECURITY:TOKEN_REFRESHED',
  TOKEN_FAMILY_BROKEN    = 'SECURITY:TOKEN_FAMILY_BROKEN',
  SESSION_TERMINATED     = 'SECURITY:SESSION_TERMINATED',
  ALL_SESSIONS_TERMINATED = 'SECURITY:ALL_SESSIONS_TERMINATED',

  // Device & Location Events
  DEVICE_TRUSTED         = 'SECURITY:DEVICE_TRUSTED',
  DEVICE_UNTRUSTED       = 'SECURITY:DEVICE_UNTRUSTED',
  NEW_DEVICE_DETECTED    = 'SECURITY:NEW_DEVICE_DETECTED',
  SUSPICIOUS_LOCATION    = 'SECURITY:SUSPICIOUS_LOCATION',
  IMPOSSIBLE_TRAVEL      = 'SECURITY:IMPOSSIBLE_TRAVEL',
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
  /** Device fingerprint for device tracking — hashed, no PII */
  deviceFingerprint?: string;
  /** Geolocation data (country, region) — no exact coordinates */
  geoLocation?: { country?: string; region?: string };
  /** Session ID for session tracking — internal ID, no PII */
  sessionId?: string;
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

    // Build metadata object including new optional fields
    const metadata: Record<string, unknown> = { ...opts.metadata };

    if (opts.sessionId) {
      metadata.sessionId = opts.sessionId;
    }

    if (opts.deviceFingerprint) {
      // Hash the device fingerprint for privacy (same as IP hashing approach)
      metadata.deviceFingerprintHash = hashIp(opts.deviceFingerprint);
    }

    if (opts.geoLocation) {
      metadata.geoLocation = opts.geoLocation;
    }

    await prisma.auditLog.create({
      data: {
        tenantId:  opts.tenantId,
        userId:    opts.actorId ?? null,
        action:    opts.event,
        resource:  'auth/security',
        ipAddress: opts.ip ? hashIp(opts.ip) : null,
        userAgent: opts.userAgent ? sanitizeUserAgent(opts.userAgent) : null,
        metadata:  Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
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

// ─── MFA Event Helpers ──────────────────────────────────────

/**
 * Loggt MFA-Status-Änderungen (Aktivierung/Deaktivierung).
 * Non-blocking für Request-Flow.
 */
export async function logMfaStatusChange(opts: {
  event: SecurityEvent.MFA_ENABLED | SecurityEvent.MFA_DISABLED;
  tenantId: string;
  actorId: string;
  method: 'totp' | 'sms' | 'email' | 'backup_codes';
  ip?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}): Promise<void> {
  await logSecurityEvent({
    event: opts.event,
    tenantId: opts.tenantId,
    actorId: opts.actorId,
    ip: opts.ip,
    userAgent: opts.userAgent,
    deviceFingerprint: opts.deviceFingerprint,
    metadata: { method: opts.method },
  });
}

/**
 * Loggt MFA-Challenge-Ergebnisse (Erfolg/Fehlschlag).
 * Non-blocking für Request-Flow.
 */
export async function logMfaChallenge(opts: {
  event: SecurityEvent.MFA_CHALLENGE_SUCCESS | SecurityEvent.MFA_CHALLENGE_FAILED;
  tenantId: string;
  actorId: string;
  method: 'totp' | 'sms' | 'email' | 'backup_code';
  attemptNumber?: number;
  ip?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}): Promise<void> {
  await logSecurityEvent({
    event: opts.event,
    tenantId: opts.tenantId,
    actorId: opts.actorId,
    ip: opts.ip,
    userAgent: opts.userAgent,
    deviceFingerprint: opts.deviceFingerprint,
    metadata: {
      method: opts.method,
      attemptNumber: opts.attemptNumber,
    },
  });
}

// ─── Token & Session Event Helpers ──────────────────────────

/**
 * Loggt Token-Refresh-Events.
 * Non-blocking für Request-Flow.
 */
export async function logTokenRefresh(opts: {
  event: SecurityEvent.TOKEN_REFRESHED | SecurityEvent.TOKEN_FAMILY_BROKEN;
  tenantId: string;
  actorId: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}): Promise<void> {
  await logSecurityEvent({
    event: opts.event,
    tenantId: opts.tenantId,
    actorId: opts.actorId,
    ip: opts.ip,
    userAgent: opts.userAgent,
    deviceFingerprint: opts.deviceFingerprint,
    sessionId: opts.sessionId,
  });
}

/**
 * Loggt Session-Terminierungs-Events.
 * Non-blocking für Request-Flow.
 */
export async function logSessionEvent(opts: {
  event: SecurityEvent.SESSION_TERMINATED | SecurityEvent.ALL_SESSIONS_TERMINATED;
  tenantId: string;
  actorId: string;
  sessionId?: string;
  terminatedCount?: number;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await logSecurityEvent({
    event: opts.event,
    tenantId: opts.tenantId,
    actorId: opts.actorId,
    ip: opts.ip,
    userAgent: opts.userAgent,
    sessionId: opts.sessionId,
    metadata: { terminatedCount: opts.terminatedCount },
  });
}

// ─── Device & Location Event Helpers ────────────────────────

/**
 * Loggt Device-Vertrauens-Events.
 * Non-blocking für Request-Flow.
 */
export async function logDeviceEvent(opts: {
  event: SecurityEvent.DEVICE_TRUSTED | SecurityEvent.DEVICE_UNTRUSTED | SecurityEvent.NEW_DEVICE_DETECTED;
  tenantId: string;
  actorId: string;
  deviceFingerprint: string;
  deviceName?: string;
  ip?: string;
  userAgent?: string;
  geoLocation?: { country?: string; region?: string };
}): Promise<void> {
  await logSecurityEvent({
    event: opts.event,
    tenantId: opts.tenantId,
    actorId: opts.actorId,
    ip: opts.ip,
    userAgent: opts.userAgent,
    deviceFingerprint: opts.deviceFingerprint,
    geoLocation: opts.geoLocation,
    metadata: { deviceName: opts.deviceName },
  });
}

/**
 * Loggt verdächtige Standort-Events.
 * Non-blocking für Request-Flow.
 */
export async function logLocationAlert(opts: {
  event: SecurityEvent.SUSPICIOUS_LOCATION | SecurityEvent.IMPOSSIBLE_TRAVEL;
  tenantId: string;
  actorId: string;
  currentLocation: { country: string; region: string };
  previousLocation: { country: string; region: string };
  timeDeltaMinutes?: number;
  ip?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}): Promise<void> {
  await logSecurityEvent({
    event: opts.event,
    tenantId: opts.tenantId,
    actorId: opts.actorId,
    ip: opts.ip,
    userAgent: opts.userAgent,
    deviceFingerprint: opts.deviceFingerprint,
    metadata: {
      currentLocation: opts.currentLocation,
      previousLocation: opts.previousLocation,
      timeDeltaMinutes: opts.timeDeltaMinutes,
    },
  });
}
