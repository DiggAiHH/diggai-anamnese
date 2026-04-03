/**
 * @module totp.service
 * @description TOTP/2FA Service für DiggAI Authentifizierung
 *
 * Implementiert RFC 6238 TOTP (Time-based One-Time Password) mit:
 * - QR-Code Generierung für Authenticator Apps
 * - Backup-Codes für Wiederherstellung
 * - SHA-256 Hashing für Backup-Code Speicherung
 * - Sicherheits-Audit-Logging
 */

import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { prisma } from '../../db';
import { logSecurityEvent, SecurityEvent } from '../security-audit.service';

// Constants
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const TOTP_ISSUER = 'DiggAI';
const TOTP_WINDOW = 1; // Allow 1 step before/after for time drift

export interface TOTPSetupResult {
  secret: string;
  qrCodeUrl: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface TOTPVerificationResult {
  valid: boolean;
  error?: 'INVALID_TOKEN' | 'BACKUP_CODE_USED' | 'NO_2FA_SETUP';
}

export interface DeviceInfo {
  fingerprint?: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Generate cryptographically secure backup code
 */
function generateBackupCode(): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const randomBytes = crypto.randomBytes(BACKUP_CODE_LENGTH);
  for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
    code += charset[randomBytes[i] % charset.length];
  }
  return code;
}

/**
 * Hash backup code for storage (bcrypt alternative - simpler for this use case)
 */
function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Setup TOTP for a user
 */
export async function setupTOTP(
  userId: string,
  userType: 'ARZT' | 'PATIENT'
): Promise<TOTPSetupResult> {
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `${TOTP_ISSUER} (${userId})`,
    issuer: TOTP_ISSUER,
    length: 32,
  });

  // Generate backup codes
  const backupCodes: string[] = [];
  const hashedBackupCodes: string[] = [];
  
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = generateBackupCode();
    backupCodes.push(code);
    hashedBackupCodes.push(hashBackupCode(code));
  }

  // Store in database (temporarily - not enabled yet)
  await prisma.twoFactorAuth.upsert({
    where: {
      userId_userType: {
        userId,
        userType,
      },
    },
    create: {
      userId,
      userType,
      secret: secret.base32,
      backupCodes: hashedBackupCodes,
      isEnabled: false,
    },
    update: {
      secret: secret.base32,
      backupCodes: hashedBackupCodes,
      isEnabled: false,
      // Reset verification
      verifiedAt: null,
      enabledAt: null,
    },
  });

  // Generate QR Code
  const otpauthUrl = speakeasy.otpauthURL({
    secret: secret.ascii,
    label: userId,
    issuer: TOTP_ISSUER,
    encoding: 'ascii',
  });

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return {
    secret: secret.base32,
    qrCodeUrl: otpauthUrl,
    qrCodeDataUrl,
    backupCodes,
  };
}

/**
 * Verify TOTP token during setup (enables 2FA if valid)
 */
export async function verifyTOTPSetup(
  userId: string,
  userType: 'ARZT' | 'PATIENT',
  token: string,
  deviceInfo?: DeviceInfo
): Promise<TOTPVerificationResult> {
  const tfa = await prisma.twoFactorAuth.findUnique({
    where: {
      userId_userType: {
        userId,
        userType,
      },
    },
  });

  if (!tfa || !tfa.secret) {
    return { valid: false, error: 'NO_2FA_SETUP' };
  }

  const verified = speakeasy.totp.verify({
    secret: tfa.secret,
    encoding: 'base32',
    token,
    window: TOTP_WINDOW,
  });

  if (!verified) {
    await logSecurityEvent({
      event: SecurityEvent.MFA_CHALLENGE_FAILED,
      tenantId: userType === 'ARZT' ? 'system' : 'pwa',
      actorId: userId,
      ip: deviceInfo?.ip,
      userAgent: deviceInfo?.userAgent,
      metadata: { reason: 'invalid_setup_token' },
    });
    return { valid: false, error: 'INVALID_TOKEN' };
  }

  // Enable 2FA
  await prisma.twoFactorAuth.update({
    where: { id: tfa.id },
    data: {
      isEnabled: true,
      verifiedAt: new Date(),
      enabledAt: new Date(),
    },
  });

  // Log success
  await logSecurityEvent({
    event: SecurityEvent.MFA_ENABLED,
    tenantId: userType === 'ARZT' ? 'system' : 'pwa',
    actorId: userId,
    ip: deviceInfo?.ip,
    userAgent: deviceInfo?.userAgent,
    metadata: { method: 'TOTP' },
  });

  return { valid: true };
}

/**
 * Verify TOTP token (for login)
 */
export async function verifyTOTP(
  userId: string,
  userType: 'ARZT' | 'PATIENT',
  token: string,
  deviceInfo?: DeviceInfo
): Promise<TOTPVerificationResult> {
  const tfa = await prisma.twoFactorAuth.findUnique({
    where: {
      userId_userType: {
        userId,
        userType,
      },
    },
  });

  if (!tfa || !tfa.isEnabled || !tfa.secret) {
    return { valid: false, error: 'NO_2FA_SETUP' };
  }

  // Check if it's a backup code
  const hashedToken = hashBackupCode(token);
  if (tfa.backupCodes.includes(hashedToken)) {
    // Remove used backup code and add to used list
    await prisma.twoFactorAuth.update({
      where: { id: tfa.id },
      data: {
        backupCodes: {
          set: tfa.backupCodes.filter(code => code !== hashedToken),
        },
        usedBackupCodes: {
          push: hashedToken,
        },
      },
    });

    await logSecurityEvent({
      event: SecurityEvent.MFA_CHALLENGE_SUCCESS,
      tenantId: userType === 'ARZT' ? 'system' : 'pwa',
      actorId: userId,
      ip: deviceInfo?.ip,
      userAgent: deviceInfo?.userAgent,
      metadata: { method: 'BACKUP_CODE' },
    });

    return { valid: true };
  }

  // Verify TOTP
  const verified = speakeasy.totp.verify({
    secret: tfa.secret,
    encoding: 'base32',
    token,
    window: TOTP_WINDOW,
  });

  if (verified) {
    await logSecurityEvent({
      event: SecurityEvent.MFA_CHALLENGE_SUCCESS,
      tenantId: userType === 'ARZT' ? 'system' : 'pwa',
      actorId: userId,
      ip: deviceInfo?.ip,
      userAgent: deviceInfo?.userAgent,
      metadata: { method: 'TOTP' },
    });
    return { valid: true };
  }

  await logSecurityEvent({
    event: SecurityEvent.MFA_CHALLENGE_FAILED,
    tenantId: userType === 'ARZT' ? 'system' : 'pwa',
    actorId: userId,
    ip: deviceInfo?.ip,
    userAgent: deviceInfo?.userAgent,
    metadata: { method: 'TOTP' },
  });

  return { valid: false, error: 'INVALID_TOKEN' };
}

/**
 * Generate new backup codes
 */
export async function regenerateBackupCodes(
  userId: string,
  userType: 'ARZT' | 'PATIENT'
): Promise<string[] | null> {
  const tfa = await prisma.twoFactorAuth.findUnique({
    where: {
      userId_userType: {
        userId,
        userType,
      },
    },
  });

  if (!tfa || !tfa.isEnabled) {
    return null;
  }

  // Generate new codes
  const backupCodes: string[] = [];
  const hashedBackupCodes: string[] = [];
  
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = generateBackupCode();
    backupCodes.push(code);
    hashedBackupCodes.push(hashBackupCode(code));
  }

  // Update database
  await prisma.twoFactorAuth.update({
    where: { id: tfa.id },
    data: {
      backupCodes: hashedBackupCodes,
    },
  });

  return backupCodes;
}

/**
 * Disable 2FA
 */
export async function disableTOTP(
  userId: string,
  userType: 'ARZT' | 'PATIENT',
  deviceInfo?: DeviceInfo
): Promise<boolean> {
  const tfa = await prisma.twoFactorAuth.findUnique({
    where: {
      userId_userType: {
        userId,
        userType,
      },
    },
  });

  if (!tfa || !tfa.isEnabled) {
    return false;
  }

  // Delete 2FA record (or could keep with isEnabled: false)
  await prisma.twoFactorAuth.delete({
    where: { id: tfa.id },
  });

  await logSecurityEvent({
    event: SecurityEvent.MFA_DISABLED,
    tenantId: userType === 'ARZT' ? 'system' : 'pwa',
    actorId: userId,
    ip: deviceInfo?.ip,
    userAgent: deviceInfo?.userAgent,
  });

  return true;
}

/**
 * Check if user has 2FA enabled
 */
export async function has2FAEnabled(
  userId: string,
  userType: 'ARZT' | 'PATIENT'
): Promise<boolean> {
  const tfa = await prisma.twoFactorAuth.findUnique({
    where: {
      userId_userType: {
        userId,
        userType,
      },
    },
  });

  return tfa?.isEnabled || false;
}

/**
 * Get remaining backup codes count
 */
export async function getRemainingBackupCodesCount(
  userId: string,
  userType: 'ARZT' | 'PATIENT'
): Promise<number> {
  const tfa = await prisma.twoFactorAuth.findUnique({
    where: {
      userId_userType: {
        userId,
        userType,
      },
    },
  });

  return tfa?.backupCodes.length || 0;
}
