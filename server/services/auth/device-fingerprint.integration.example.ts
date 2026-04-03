/**
 * Device Fingerprint Integration Examples
 *
 * Beispiele für die Integration des Device Fingerprinting in bestehende Auth-Flows.
 * Diese Datei dient als Referenz für die Implementierung.
 */

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db';
import {
  generateFingerprint,
  generateFingerprintFromComponents,
  isTrustedDevice,
  evaluateDeviceTrust,
  detectRiskFactors,
  generateDeviceName,
  getDeviceType,
} from './device-fingerprint.service';
import {
  SecurityEvent,
  logSecurityEvent,
  logDeviceEvent,
  logLoginFailure,
} from '../security-audit.service';
import type { DeviceFingerprintComponents } from '../../types/device-fingerprint';

// ─── BEISPIEL 1: Login mit Device Verification ─────────────────

/**
 * Middleware: Device Verification bei Login
 * Prüft ob das Gerät bekannt ist und vertrauenswürdig
 */
export async function verifyDeviceOnLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const accountId = (req as any).user?.accountId;
  const tenantId = (req as any).user?.tenantId || 'pwa';
  const ip = req.ip || req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';

  if (!accountId) {
    next();
    return;
  }

  // Generate fingerprint from request
  const fingerprint = generateFingerprint(req);

  // Detect risk factors
  const riskFactors = detectRiskFactors(fingerprint.components);
  const hasCriticalRisk = riskFactors.some(r => r.severity === 'critical');

  if (hasCriticalRisk) {
    // Log and block
    await logSecurityEvent({
      event: SecurityEvent.SUSPICIOUS_ACTIVITY,
      tenantId,
      actorId: accountId,
      ip,
      userAgent,
      deviceFingerprint: fingerprint.hash,
      metadata: {
        riskFactors: riskFactors.map(r => ({ type: r.type, severity: r.severity })),
        action: 'blocked',
      },
    });

    res.status(403).json({
      error: 'Zugriff verweigert',
      code: 'SUSPICIOUS_DEVICE',
    });
    return;
  }

  // Get user's devices
  const devices = await prisma.patientDevice.findMany({
    where: { accountId },
    orderBy: { lastSeenAt: 'desc' },
  });

  // Check for exact match
  const matchingDevice = devices.find(d => d.fingerprintHash === fingerprint.hash);

  if (matchingDevice) {
    // Update last seen
    await prisma.patientDevice.update({
      where: { id: matchingDevice.id },
      data: {
        lastSeenAt: new Date(),
        lastUsedAt: new Date(),
      },
    });

    // Check trust status
    const isTrusted = isTrustedDevice(
      fingerprint.hash,
      matchingDevice.fingerprintHash || '',
      matchingDevice.trustExpiresAt,
      matchingDevice.lastVerifiedAt
    );

    if (!isTrusted && matchingDevice.isTrusted) {
      // Trust expired - update device
      await prisma.patientDevice.update({
        where: { id: matchingDevice.id },
        data: { isTrusted: false },
      });

      await logDeviceEvent({
        event: SecurityEvent.DEVICE_UNTRUSTED,
        tenantId,
        actorId: accountId,
        deviceFingerprint: fingerprint.hash,
        deviceName: matchingDevice.deviceName,
        ip,
        userAgent,
      });
    }

    // Add device info to request
    (req as any).deviceInfo = {
      deviceId: matchingDevice.id,
      isTrusted,
      isNew: false,
    };
  } else {
    // New device detected
    await logDeviceEvent({
      event: SecurityEvent.NEW_DEVICE_DETECTED,
      tenantId,
      actorId: accountId,
      deviceFingerprint: fingerprint.hash,
      ip,
      userAgent,
    });

    (req as any).deviceInfo = {
      isTrusted: false,
      isNew: true,
      fingerprint: fingerprint.hash,
    };
  }

  next();
}

// ─── BEISPIEL 2: Gerät bei erfolgreichem Login registrieren ────

/**
 * Registriert ein neues Gerät nach erfolgreichem Login
 */
export async function registerDeviceAfterLogin(
  accountId: string,
  tenantId: string,
  req: Request,
  trustDevice: boolean = false
): Promise<{ deviceId: string; isTrusted: boolean } | null> {
  const ip = req.ip || req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';

  // Generate fingerprint
  const fingerprint = generateFingerprint(req);

  // Check if device already exists
  const existingDevice = await prisma.patientDevice.findFirst({
    where: {
      accountId,
      fingerprintHash: fingerprint.hash,
    },
  });

  if (existingDevice) {
    // Update existing device
    await prisma.patientDevice.update({
      where: { id: existingDevice.id },
      data: {
        lastSeenAt: new Date(),
        lastUsedAt: new Date(),
        lastVerifiedAt: new Date(),
      },
    });

    return {
      deviceId: existingDevice.id,
      isTrusted: existingDevice.isTrusted,
    };
  }

  // Detect risk factors
  const riskFactors = detectRiskFactors(fingerprint.components);
  const hasHighRisk = riskFactors.some(r => r.severity === 'high' || r.severity === 'critical');

  // Create new device
  const deviceName = generateDeviceName(fingerprint.components);
  const deviceType = getDeviceType(fingerprint.components);

  const device = await prisma.patientDevice.create({
    data: {
      accountId,
      deviceName,
      deviceType: deviceType === 'unknown' ? 'web' : deviceType,
      fingerprintHash: fingerprint.hash,
      isTrusted: trustDevice && !hasHighRisk,
      trustedAt: trustDevice && !hasHighRisk ? new Date() : null,
      trustExpiresAt: trustDevice && !hasHighRisk
        ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        : null,
      lastSeenAt: new Date(),
      lastUsedAt: new Date(),
      userAgent: userAgent.substring(0, 500),
    },
  });

  // Log event
  await logDeviceEvent({
    event: trustDevice && !hasHighRisk
      ? SecurityEvent.DEVICE_TRUSTED
      : SecurityEvent.NEW_DEVICE_DETECTED,
    tenantId,
    actorId: accountId,
    deviceFingerprint: fingerprint.hash,
    deviceName: device.deviceName,
    ip,
    userAgent,
  });

  return {
    deviceId: device.id,
    isTrusted: device.isTrusted,
  };
}

// ─── BEISPIEL 3: MFA Challenge mit Device Context ──────────────

/**
 * Loggt MFA Challenge Ergebnisse mit Device Context
 */
export async function logMfaChallengeWithDevice(
  accountId: string,
  tenantId: string,
  success: boolean,
  method: 'totp' | 'sms' | 'email' | 'backup_code',
  req: Request
): Promise<void> {
  const ip = req.ip || req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';

  // Get fingerprint
  const fingerprint = generateFingerprint(req);

  // Import from security-audit.service
  const { logMfaChallenge } = await import('../security-audit.service');

  await logMfaChallenge({
    event: success
      ? SecurityEvent.MFA_CHALLENGE_SUCCESS
      : SecurityEvent.MFA_CHALLENGE_FAILED,
    tenantId,
    actorId: accountId,
    method,
    ip,
    userAgent,
    deviceFingerprint: fingerprint.hash,
  });

  // If successful, update device verification
  if (success) {
    await prisma.patientDevice.updateMany({
      where: {
        accountId,
        fingerprintHash: fingerprint.hash,
      },
      data: {
        lastVerifiedAt: new Date(),
      },
    });
  }
}

// ─── BEISPIEL 4: Session Terminierung ──────────────────────────

/**
 * Terminiert alle Sessions eines Benutzers außer der aktuellen
 */
export async function terminateAllSessionsExceptCurrent(
  accountId: string,
  tenantId: string,
  currentDeviceId: string,
  req: Request
): Promise<number> {
  const ip = req.ip || req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';

  // Get all devices
  const devices = await prisma.patientDevice.findMany({
    where: { accountId },
  });

  // Delete all devices except current
  const devicesToDelete = devices.filter(d => d.id !== currentDeviceId);

  if (devicesToDelete.length > 0) {
    await prisma.patientDevice.deleteMany({
      where: {
        id: { in: devicesToDelete.map(d => d.id) },
      },
    });

    // Log event
    const { logSessionEvent } = await import('../security-audit.service');
    await logSessionEvent({
      event: SecurityEvent.ALL_SESSIONS_TERMINATED,
      tenantId,
      actorId: accountId,
      terminatedCount: devicesToDelete.length,
      ip,
      userAgent,
    });
  }

  return devicesToDelete.length;
}

// ─── BEISPIEL 5: Token Refresh mit Device Verification ─────────

/**
 * Middleware: Überprüft Gerät bei Token Refresh
 */
export async function verifyDeviceOnTokenRefresh(
  accountId: string,
  tenantId: string,
  req: Request
): Promise<{ valid: boolean; reason?: string }> {
  const fingerprint = generateFingerprint(req);

  // Find device by fingerprint
  const device = await prisma.patientDevice.findFirst({
    where: {
      accountId,
      fingerprintHash: fingerprint.hash,
    },
  });

  if (!device) {
    // Unknown device
    await logSecurityEvent({
      event: SecurityEvent.TOKEN_FAMILY_BROKEN,
      tenantId,
      actorId: accountId,
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'] || '',
      deviceFingerprint: fingerprint.hash,
      metadata: {
        reason: 'unknown_device',
      },
    });

    return { valid: false, reason: 'unknown_device' };
  }

  // Check if device is still trusted
  const isTrusted = isTrustedDevice(
    fingerprint.hash,
    device.fingerprintHash || '',
    device.trustExpiresAt,
    device.lastVerifiedAt
  );

  if (!isTrusted) {
    await logSecurityEvent({
      event: SecurityEvent.TOKEN_FAMILY_BROKEN,
      tenantId,
      actorId: accountId,
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'] || '',
      deviceFingerprint: fingerprint.hash,
      metadata: {
        reason: 'untrusted_device',
        deviceId: device.id,
      },
    });

    return { valid: false, reason: 'untrusted_device' };
  }

  // Update last seen
  await prisma.patientDevice.update({
    where: { id: device.id },
    data: {
      lastSeenAt: new Date(),
      lastUsedAt: new Date(),
    },
  });

  // Log successful refresh
  const { logTokenRefresh } = await import('../security-audit.service');
  await logTokenRefresh({
    event: SecurityEvent.TOKEN_REFRESHED,
    tenantId,
    actorId: accountId,
    sessionId: device.id,
    ip: req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent'] || '',
    deviceFingerprint: fingerprint.hash,
  });

  return { valid: true };
}

// ─── BEISPIEL 6: Gerät als vertrauenswürdig markieren ──────────

/**
 * Markiert ein Gerät als vertrauenswürdig (nach MFA Verification)
 */
export async function trustDeviceAfterMfa(
  accountId: string,
  deviceId: string,
  tenantId: string,
  req: Request
): Promise<boolean> {
  const ip = req.ip || req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';

  // Verify device ownership
  const device = await prisma.patientDevice.findFirst({
    where: {
      id: deviceId,
      accountId,
    },
  });

  if (!device) {
    return false;
  }

  // Update trust status
  await prisma.patientDevice.update({
    where: { id: deviceId },
    data: {
      isTrusted: true,
      trustedAt: new Date(),
      trustExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      lastVerifiedAt: new Date(),
    },
  });

  // Log event
  await logDeviceEvent({
    event: SecurityEvent.DEVICE_TRUSTED,
    tenantId,
    actorId: accountId,
    deviceFingerprint: device.fingerprintHash || '',
    deviceName: device.deviceName,
    ip,
    userAgent,
  });

  return true;
}

// ─── BEISPIEL 7: Verdächtige Standort-Änderung erkennen ────────

/**
 * Prüft auf verdächtige Standortänderungen (Impossible Travel)
 */
export async function checkSuspiciousLocation(
  accountId: string,
  tenantId: string,
  currentLocation: { country: string; region: string },
  req: Request
): Promise<{ suspicious: boolean; reason?: string }> {
  // Get last known location from audit logs
  const lastLocationLog = await prisma.auditLog.findFirst({
    where: {
      userId: accountId,
      action: {
        in: [SecurityEvent.LOGIN_SUCCESS, SecurityEvent.TOKEN_REFRESHED],
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!lastLocationLog?.metadata) {
    return { suspicious: false };
  }

  let lastLocation: { country?: string; region?: string } | undefined;
  try {
    const metadata = JSON.parse(lastLocationLog.metadata);
    lastLocation = metadata.geoLocation;
  } catch {
    return { suspicious: false };
  }

  if (!lastLocation) {
    return { suspicious: false };
  }

  // Check if location changed significantly
  if (lastLocation.country !== currentLocation.country) {
    // Calculate time delta
    const lastTime = lastLocationLog.createdAt.getTime();
    const currentTime = Date.now();
    const timeDeltaMinutes = Math.floor((currentTime - lastTime) / (1000 * 60));

    // Log suspicious location
    const { logLocationAlert } = await import('../security-audit.service');
    await logLocationAlert({
      event: SecurityEvent.SUSPICIOUS_LOCATION,
      tenantId,
      actorId: accountId,
      currentLocation,
      previousLocation: {
        country: lastLocation.country || 'unknown',
        region: lastLocation.region || 'unknown',
      },
      timeDeltaMinutes,
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'] || '',
    });

    return {
      suspicious: true,
      reason: `Location changed from ${lastLocation.country} to ${currentLocation.country}`,
    };
  }

  return { suspicious: false };
}

// ─── BEISPIEL 8: Express Middleware für Device Tracking ────────

/**
 * Express Middleware: Trackt Gerät für jeden Request
 */
export function deviceTrackingMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const accountId = (req as any).user?.accountId;

    if (!accountId) {
      next();
      return;
    }

    try {
      const fingerprint = generateFingerprint(req);

      // Update last seen for matching device
      await prisma.patientDevice.updateMany({
        where: {
          accountId,
          fingerprintHash: fingerprint.hash,
        },
        data: {
          lastSeenAt: new Date(),
        },
      });
    } catch {
      // Non-blocking: don't fail request on tracking error
    }

    next();
  };
}
