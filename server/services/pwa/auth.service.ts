// ─── Modul 5: Patient Portal PWA — Auth Service ─────────────
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { t, LocalizedError } from '../../i18n';
import { config } from '../../config';
import { blacklistToken, isTokenBlacklisted } from '../../middleware/auth';
import { validatePasswordStrength } from '../../utils/password-policy';
import { SecurityEvent, logSecurityEvent } from '../security-audit.service';

import type {
  PatientRegistrationData,
  PatientLoginRequest,
  PatientLoginResponse,
  PatientAccountData,
  PwaJwtPayload,
} from './types';

// ─── Constants ──────────────────────────────────────────────

// SECURITY FIX C1: Kein Fallback auf hardcoded Secret — config.ts erzwingt min. 32 Zeichen
const JWT_SECRET = config.jwtSecret;
// SECURITY FIX C2: Token-Expiry jetzt über config (Standard: 15m statt 7d)
const TOKEN_EXPIRY = config.jwtExpiresIn;
const BCRYPT_ROUNDS = 12;

// ─── Prisma helper ──────────────────────────────────────────

function getPrisma() {
  const prisma = (globalThis as any).__prisma;
  if (!prisma) {
    throw new Error('Prisma client not initialised');
  }
  return prisma;
}

// ─── Helpers ────────────────────────────────────────────────

function toAccountData(record: any): PatientAccountData {
  return {
    id: record.id,
    patientId: record.patientId,
    email: record.email ?? null,
    phone: record.phone ?? null,
    isActive: record.isActive,
    isVerified: record.isVerified,
    verifiedAt: record.verifiedAt ?? null,
    lastLoginAt: record.lastLoginAt ?? null,
    loginCount: record.loginCount,
    locale: record.locale,
    notifyEmail: record.notifyEmail,
    notifyPush: record.notifyPush,
    notifySms: record.notifySms,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function signToken(accountId: string, patientId: string): { token: string; expiresAt: string; jti: string } {
  // SECURITY FIX C3: JTI hinzugefügt — erforderlich für Token-Blacklist bei Logout
  const jti = crypto.randomUUID();
  const payload: PwaJwtPayload = {
    accountId,
    patientId,
    role: 'patient_portal',
    jti,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
    algorithm: 'HS256', // BSI TR-02102: Algorithmus explizit pinnen
  } as jwt.SignOptions);

  // Decode to read actual expiry
  const decoded = jwt.decode(token) as PwaJwtPayload;
  const expiresAt = decoded.exp
    ? new Date(decoded.exp * 1000).toISOString()
    : new Date(Date.now() + config.jwtCookieMaxAgeMs).toISOString();

  return { token, expiresAt, jti };
}

/**
 * Invalidiert einen PWA-Token (z.B. bei Logout).
 * Nutzt dieselbe Redis/In-Memory-Blacklist wie der Hauptauth-Flow.
 */
export async function revokeToken(jti: string, expiresInMs: number): Promise<void> {
  await blacklistToken(jti, expiresInMs);
}

/**
 * Prüft ob ein PWA-Token widerrufen wurde.
 */
export async function isPwaTokenRevoked(jti: string): Promise<boolean> {
  return isTokenBlacklisted(jti);
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/**
 * Register a new PatientAccount.
 * The patient must already exist (identified by patientNumber + birthDate).
 */
export async function registerPatient(data: PatientRegistrationData): Promise<PatientAccountData> {
  const prisma = getPrisma();

  // 1. Look up the existing Patient record
  const patient = await prisma.patient.findFirst({
    where: {
      patientNumber: data.patientNumber,
      birthDate: new Date(data.birthDate),
    },
  });

  if (!patient) {
    throw new LocalizedError('errors.auth.patient_not_found');
  }

  // 2. Check for existing account
  const existing = await prisma.patientAccount.findUnique({
    where: { patientId: patient.id },
  });

  if (existing) {
    throw new LocalizedError('errors.auth.account_exists');
  }

  // 3. Passwort-Policy prüfen (BSI TR-02102 — SECURITY FIX H2)
  const policyResult = validatePasswordStrength(data.password);
  if (!policyResult.valid) {
    throw new LocalizedError('errors.auth.password_too_weak', policyResult.errors.join('; '));
  }

  // 4. Hash password (and optional PIN)
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  const pinHash = data.pin ? await bcrypt.hash(data.pin, BCRYPT_ROUNDS) : undefined;

  // 5. Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  // 6. Create PatientAccount
  const account = await prisma.patientAccount.create({
    data: {
      patientId: patient.id,
      email: data.email ?? null,
      phone: data.phone ?? null,
      passwordHash,
      pinHash,
      verificationToken,
      verificationExpiry,
    },
  });

  // 7. Send verification email (non-blocking — log warning on failure)
  if (data.email) {
    sendVerificationEmail(data.email, verificationToken).catch(err => {
      console.warn('[auth] sendVerificationEmail failed (non-fatal):', err?.message);
    });
  }

  return toAccountData(account);
}

/**
 * Standard login with email/phone/patient number + password.
 */
export async function loginPatient(req: PatientLoginRequest): Promise<PatientLoginResponse> {
  const prisma = getPrisma();

  const account = await prisma.patientAccount.findFirst({
    where: {
      OR: [
        { email: req.identifier },
        { phone: req.identifier },
        { patient: { patientNumber: req.identifier } },
      ],
      isActive: true,
    },
  });

  if (!account) {
    throw new LocalizedError('errors.auth.invalid_credentials');
  }

  const valid = await bcrypt.compare(req.password, account.passwordHash);
  if (!valid) {
    throw new LocalizedError('errors.auth.invalid_credentials');
  }

  // Update login metadata
  await prisma.patientAccount.update({
    where: { id: account.id },
    data: {
      lastLoginAt: new Date(),
      loginCount: { increment: 1 },
    },
  });

  const { token, expiresAt } = signToken(account.id, account.patientId);

  return {
    token,
    expiresAt,
    account: toAccountData(account),
  };
}

/**
 * Quick-login with PIN (for returning users on trusted devices).
 */
export async function loginWithPin(patientId: string, pin: string): Promise<PatientLoginResponse> {
  const prisma = getPrisma();

  const account = await prisma.patientAccount.findUnique({
    where: { patientId },
  });

  if (!account || !account.pinHash || !account.isActive) {
    throw new LocalizedError('errors.auth.pin_unavailable');
  }

  const valid = await bcrypt.compare(pin, account.pinHash);
  if (!valid) {
    throw new LocalizedError('errors.auth.pin_invalid');
  }

  // Update login metadata
  await prisma.patientAccount.update({
    where: { id: account.id },
    data: {
      lastLoginAt: new Date(),
      loginCount: { increment: 1 },
    },
  });

  const { token, expiresAt } = signToken(account.id, account.patientId);

  return {
    token,
    expiresAt,
    account: toAccountData(account),
  };
}

/**
 * Verify and decode a PWA JWT token.
 */
export function verifyToken(token: string): PwaJwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as PwaJwtPayload;
  } catch {
    throw new LocalizedError('errors.auth.token_expired');
  }
}

/**
 * Issue a fresh token for an existing account (token refresh).
 */
export async function refreshToken(accountId: string): Promise<PatientLoginResponse> {
  const prisma = getPrisma();

  const account = await prisma.patientAccount.findUnique({
    where: { id: accountId },
  });

  if (!account || !account.isActive) {
    throw new LocalizedError('errors.auth.account_disabled');
  }

  const { token, expiresAt } = signToken(account.id, account.patientId);

  return {
    token,
    expiresAt,
    account: toAccountData(account),
  };
}

// ═══════════════════════════════════════════════════════════════
// Email Verification
// ═══════════════════════════════════════════════════════════════

/**
 * Verify email address using the token sent during registration.
 * Sets isVerified=true and clears the token.
 */
export async function verifyEmail(token: string): Promise<void> {
  const prisma = getPrisma();

  const account = await prisma.patientAccount.findFirst({
    where: {
      verificationToken: token,
      verificationExpiry: { gt: new Date() },
    },
  });

  if (!account) {
    throw new LocalizedError('errors.auth.verify_link_invalid');
  }

  await prisma.patientAccount.update({
    where: { id: account.id },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
      verificationToken: null,
      verificationExpiry: null,
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// Password Reset
// ═══════════════════════════════════════════════════════════════

/**
 * Initiate password reset: generate token + send email.
 * Rate-limited: only one reset request per 5 minutes.
 */
export async function forgotPassword(email: string): Promise<void> {
  const prisma = getPrisma();

  const account = await prisma.patientAccount.findFirst({
    where: { email, isActive: true },
  });

  // Silently succeed even if account not found (prevents user enumeration)
  if (!account) return;

  // Rate-limit: block if a reset token was issued in the last 5 minutes
  if (account.resetToken && account.resetTokenExpiry) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const tokenIssuedAt = new Date(account.resetTokenExpiry.getTime() - 60 * 60 * 1000); // expiry is +1h from issue
    if (tokenIssuedAt > fiveMinutesAgo) {
      throw new LocalizedError('errors.auth.too_many_requests');
    }
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await prisma.patientAccount.update({
    where: { id: account.id },
    data: { resetToken, resetTokenExpiry },
  });

  // Send reset email (non-blocking)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/pwa/reset-password?token=${resetToken}`;
  const lang = account.locale || 'de';

  await sendEmail({
    to: email,
    subject: t(lang, 'emails.passwordReset.subject'),
    html: t(lang, 'emails.passwordReset.html', undefined, { resetLink }),
  });
}

/**
 * Reset password using the token from the email.
 * Hashes the new password and clears the reset token.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const prisma = getPrisma();

  const account = await prisma.patientAccount.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!account) {
    throw new LocalizedError('errors.auth.reset_link_invalid');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.patientAccount.update({
    where: { id: account.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// Account Deletion (DSGVO Soft-Delete)
// ═══════════════════════════════════════════════════════════════

/**
 * DSGVO-compliant soft-delete of a PatientAccount.
 * Clears personal identifiers (email, phone) but retains the record structure.
 * NOTE: Hard-delete (actual DB removal) should be scheduled after 30 days
 * via a cleanup job (e.g., server/jobs/cleanup.ts) using deletionScheduledAt.
 */
export async function deleteAccount(accountId: string): Promise<void> {
  const prisma = getPrisma();

  const account = await prisma.patientAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new LocalizedError('errors.auth.account_not_found');
  }

  const now = new Date();
  const deletionScheduledAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

  await prisma.patientAccount.update({
    where: { id: accountId },
    data: {
      deletedAt: now,
      deletionScheduledAt,
      // Clear personal data per DSGVO Art. 17 (right to erasure)
      email: null,
      phone: null,
      isActive: false,
      // Clear auth tokens for security
      resetToken: null,
      resetTokenExpiry: null,
      verificationToken: null,
      verificationExpiry: null,
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// Internal Email Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Send email verification link to the given address.
 * If no SMTP config is present, logs a warning and skips (dev-mode friendly).
 */
export async function sendVerificationEmail(email: string, token: string, lang = 'de'): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verifyLink = `${frontendUrl}/pwa/verify-email/${token}`;

  await sendEmail({
    to: email,
    subject: t(lang, 'emails.emailVerification.subject'),
    html: t(lang, 'emails.emailVerification.html', undefined, { verifyLink }),
  });
}

/**
 * Internal helper: send an email via nodemailer using env-configured SMTP.
 * Gracefully skips sending if SMTP is not configured (useful in development).
 */
async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn(
      `[auth] SMTP not configured — skipping email to ${opts.to}. ` +
      'Set SMTP_HOST, SMTP_USER, SMTP_PASS to enable email sending.'
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: smtpFrom,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

// ═══════════════════════════════════════════════════════════════
// Extended Auth Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Send a password-reset email with a DiggAI-branded subject and link.
 * Falls back to console.log in dev mode when SMTP_HOST is not set.
 */
export async function sendPasswordResetEmail(email: string, token: string, lang = 'de'): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/pwa/reset-password/${token}`;

  if (!process.env.SMTP_HOST) {
    console.log(`[auth] DEV – password reset link for ${email}: ${resetLink}`);
    return;
  }

  await sendEmail({
    to: email,
    subject: t(lang, 'emails.passwordResetBranded.subject'),
    html: t(lang, 'emails.passwordResetBranded.html', undefined, { resetLink }),
  });
}

/**
 * Generate a fresh verification token for an existing account and send the
 * verification email.  Used when the patient requests a re-send of the
 * verification link.
 */
export async function initiateEmailVerification(accountId: string): Promise<void> {
  const prisma = getPrisma();

  const account = await prisma.patientAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new LocalizedError('errors.auth.account_not_found');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h

  await prisma.patientAccount.update({
    where: { id: accountId },
    data: { verificationToken: token, verificationExpiry },
  });

  if (account.email) {
    await sendVerificationEmail(account.email, token, account.locale || 'de');
  }
}

/**
 * Verify an email address using the token from the verification email.
 * Returns true when the token is valid and the account is now verified,
 * false when the token is not found or has expired.
 */
export async function verifyEmailToken(token: string): Promise<boolean> {
  const prisma = getPrisma();

  const account = await prisma.patientAccount.findFirst({
    where: {
      verificationToken: token,
      verificationExpiry: { gt: new Date() },
    },
  });

  if (!account) return false;

  await prisma.patientAccount.update({
    where: { id: account.id },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
      verificationToken: null,
      verificationExpiry: null,
    },
  });

  return true;
}

/**
 * Initiate a password-reset flow for the given email address.
 * Silently returns when the email is not found to prevent user enumeration.
 * Generates a reset token (1 h expiry) and sends a DiggAI-branded email.
 */
export async function forgotPasswordExtended(email: string): Promise<void> {
  const prisma = getPrisma();

  const account = await prisma.patientAccount.findFirst({
    where: { email, isActive: true },
  });

  // Silently succeed when no account exists for this email
  if (!account) return;

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // +1h

  await prisma.patientAccount.update({
    where: { id: account.id },
    data: { resetToken, resetTokenExpiry },
  });

  await sendPasswordResetEmail(email, resetToken);
}

/**
 * Reset the account password using the token from the reset email.
 * Returns true when the token is valid and the password has been updated,
 * false when the token is not found or has expired.
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<boolean> {
  // SECURITY FIX H2: Passwort-Policy auch bei Reset erzwingen
  const policyResult = validatePasswordStrength(newPassword);
  if (!policyResult.valid) {
    throw new LocalizedError('errors.auth.password_too_weak', policyResult.errors.join('; '));
  }

  const prisma = getPrisma();

  const account = await prisma.patientAccount.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!account) return false;

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.patientAccount.update({
    where: { id: account.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
      // Reset failed attempts nach erfolgreichem Passwort-Reset
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await logSecurityEvent({
    event: SecurityEvent.PASSWORD_RESET_COMPLETED,
    tenantId: 'pwa',
    actorId: account.id,
  });

  return true;
}

/**
 * DSGVO Art. 17 soft-delete mit 30-tägiger Karenzzeit für Hard-Delete.
 *
 * SECURITY FIX M3: PII (email, phone) wird SOFORT genullt — nicht erst nach 30 Tagen.
 * DSGVO Art. 17 verlangt Löschung "ohne unangemessene Verzögerung".
 * Die 30-Tage-Frist gilt für die technische Hard-Delete-Ausführung (Backup-Zyklen),
 * aber identifizierende Daten müssen sofort unkenntlich gemacht werden.
 */
export async function softDeleteAccount(accountId: string): Promise<void> {
  const prisma = getPrisma();

  const account = await prisma.patientAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new LocalizedError('errors.auth.account_not_found');
  }

  const now = new Date();
  const deletionScheduledAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

  await prisma.patientAccount.update({
    where: { id: accountId },
    data: {
      deletedAt: now,
      deletionScheduledAt,
      isActive: false,
      // DSGVO Art. 17: PII sofort löschen (SECURITY FIX M3)
      email: null,
      phone: null,
      // Auth-Tokens invalidieren (Sicherheit)
      resetToken: null,
      resetTokenExpiry: null,
      verificationToken: null,
      verificationExpiry: null,
      // Lockout-Status zurücksetzen
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  // Alle Geräte deaktivieren
  await prisma.patientDevice.updateMany({
    where: { accountId },
    data: { isActive: false },
  });

  await logSecurityEvent({
    event: SecurityEvent.ACCOUNT_DELETED,
    tenantId: 'pwa',
    actorId: accountId,
    metadata: { method: 'soft_delete', piClearedImmediately: true },
  });
}

/**
 * DSGVO Art. 15 Auskunftsrecht — export all data associated with the account.
 * Sensitive credential fields are stripped before returning.
 */
export async function exportAccountData(accountId: string): Promise<object> {
  const prisma = getPrisma();

  const account = await prisma.patientAccount.findUnique({
    where: { id: accountId },
    include: {
      patient: true,
      diaryEntries: true,
      measureTrackings: true,
      messages: true,
      consents: true,
      devices: true,
    },
  });

  if (!account) {
    throw new LocalizedError('errors.auth.account_not_found');
  }

  // Strip credential / secret fields
  const {
    passwordHash: _pw,
    pinHash: _pin,
    webauthnPublicKey: _wk,
    resetToken: _rt,
    resetTokenExpiry: _rte,
    verificationToken: _vt,
    verificationExpiry: _ve,
    ...safeAccount
  } = account as any;

  return {
    exportedAt: new Date().toISOString(),
    account: safeAccount,
  };
}
