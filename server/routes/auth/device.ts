/**
 * @module device.routes
 * @description Device Fingerprint API Routes
 *
 * Endpoints für Geräte-Verwaltung und Fingerprint-basierte Sicherheit:
 * - POST /api/auth/device/register    - Neues Gerät registrieren
 * - GET  /api/auth/device/verify      - Gerät verifizieren
 * - GET  /api/auth/device/list        - Bekannte Geräte auflisten
 * - DELETE /api/auth/device/:id       - Gerät entfernen
 *
 * Security: Alle Endpunkte erfordern Authentifizierung und loggen Security Events.
 * DSGVO: Fingerprints werden nur als SHA-256 Hashes gespeichert, niemals Klartext.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../db';
import {
  generateFingerprint,
  generateFingerprintFromComponents,
  compareFingerprints,
  isTrustedDevice,
  evaluateDeviceTrust,
  generateDeviceName,
  getDeviceType,
  detectRiskFactors,
} from '../../services/auth/device-fingerprint.service';
import {
  SecurityEvent,
  logSecurityEvent,
  logDeviceEvent,
} from '../../services/security-audit.service';
import type { DeviceFingerprintComponents } from '../../types/device-fingerprint';

const router = Router();

// ─── Zod Schemas ──────────────────────────────────────────────

const deviceRegisterSchema = z.object({
  deviceName: z.string().min(1).max(100).optional(),
  deviceType: z.enum(['ios', 'android', 'web']).optional(),
  fingerprintComponents: z.object({
    userAgent: z.string(),
    acceptLanguage: z.string(),
    acceptHeaders: z.string(),
    screenResolution: z.string().optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
    platform: z.string().optional(),
    colorDepth: z.number().optional(),
    touchSupport: z.boolean().optional(),
    cookiesEnabled: z.boolean().optional(),
  }).optional(),
  trustDevice: z.boolean().default(false),
});

const deviceVerifySchema = z.object({
  fingerprintComponents: z.object({
    userAgent: z.string(),
    acceptLanguage: z.string(),
    acceptHeaders: z.string(),
    screenResolution: z.string().optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
    platform: z.string().optional(),
    colorDepth: z.number().optional(),
    touchSupport: z.boolean().optional(),
    cookiesEnabled: z.boolean().optional(),
  }),
});

// ─── Helper Functions ─────────────────────────────────────────

/**
 * Extract tenant ID from request
 */
function getTenantId(req: Request): string {
  return (req as any).user?.tenantId || 'pwa';
}

/**
 * Extract user ID from request
 */
function getUserId(req: Request): string {
  return (req as any).user?.userId || (req as any).user?.accountId || '';
}

/**
 * Extract account ID from request (for PWA context)
 */
function getAccountId(req: Request): string | undefined {
  return (req as any).user?.accountId;
}

/**
 * Get client IP from request
 */
function getClientIp(req: Request): string | undefined {
  return req.ip || req.socket?.remoteAddress || undefined;
}

// ─── Routes ───────────────────────────────────────────────────

/**
 * POST /api/auth/device/register
 * Register a new device with fingerprint
 */
router.post('/register', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = deviceRegisterSchema.parse(req.body);
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const accountId = getAccountId(req);
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    // Generate fingerprint
    let fingerprint;
    if (data.fingerprintComponents) {
      fingerprint = generateFingerprintFromComponents(
        data.fingerprintComponents as DeviceFingerprintComponents
      );
    } else {
      fingerprint = generateFingerprint(req);
    }

    // Check for existing device with same fingerprint
    const existingDevice = await prisma.patientDevice.findFirst({
      where: {
        ...(accountId ? { accountId } : {}),
        fingerprintHash: fingerprint.hash,
      },
    });

    if (existingDevice) {
      // Update last seen for existing device
      await prisma.patientDevice.update({
        where: { id: existingDevice.id },
        data: {
          lastSeenAt: new Date(),
          lastUsedAt: new Date(),
          userAgent: userAgent || existingDevice.userAgent,
        },
      });

      // Log device recognition
      await logSecurityEvent({
        event: SecurityEvent.NEW_DEVICE_DETECTED,
        tenantId,
        actorId: userId,
        ip,
        userAgent,
        deviceFingerprint: fingerprint.hash,
        metadata: {
          deviceId: existingDevice.id,
          isNew: false,
          deviceName: existingDevice.deviceName,
        },
      });

      return res.json({
        success: true,
        device: existingDevice,
        isNew: false,
        fingerprintHash: fingerprint.hash.substring(0, 16) + '...', // Truncated for response
      });
    }

    // Detect risk factors
    const riskFactors = detectRiskFactors(fingerprint.components);
    const hasHighRisk = riskFactors.some(r => r.severity === 'high' || r.severity === 'critical');

    // Generate device name if not provided
    const deviceName = data.deviceName || generateDeviceName(fingerprint.components);
    const deviceType = data.deviceType || getDeviceType(fingerprint.components);

    // Create new device record
    const device = await prisma.patientDevice.create({
      data: {
        accountId: accountId!,
        deviceName,
        deviceType: deviceType === 'unknown' ? 'web' : deviceType,
        fingerprintHash: fingerprint.hash,
        isTrusted: data.trustDevice && !hasHighRisk,
        trustedAt: data.trustDevice && !hasHighRisk ? new Date() : null,
        trustExpiresAt: data.trustDevice && !hasHighRisk
          ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
          : null,
        lastSeenAt: new Date(),
        lastUsedAt: new Date(),
        userAgent: userAgent.substring(0, 500),
      },
    });

    // Log new device registration
    await logDeviceEvent({
      event: data.trustDevice && !hasHighRisk
        ? SecurityEvent.DEVICE_TRUSTED
        : SecurityEvent.NEW_DEVICE_DETECTED,
      tenantId,
      actorId: userId,
      deviceFingerprint: fingerprint.hash,
      deviceName: device.deviceName,
      ip,
      userAgent,
    });

    // Log risk factors if detected
    if (riskFactors.length > 0) {
      await logSecurityEvent({
        event: SecurityEvent.SUSPICIOUS_ACTIVITY,
        tenantId,
        actorId: userId,
        ip,
        userAgent,
        deviceFingerprint: fingerprint.hash,
        metadata: {
          deviceId: device.id,
          riskFactors: riskFactors.map(r => ({ type: r.type, severity: r.severity })),
        },
      });
    }

    res.status(201).json({
      success: true,
      device: {
        id: device.id,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        isTrusted: device.isTrusted,
        trustedAt: device.trustedAt,
        trustExpiresAt: device.trustExpiresAt,
        createdAt: device.createdAt,
      },
      isNew: true,
      requiresVerification: hasHighRisk || !data.trustDevice,
      riskFactors: riskFactors.length > 0 ? riskFactors : undefined,
      fingerprintHash: fingerprint.hash.substring(0, 16) + '...',
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: err.issues,
      });
    }
    console.error('[DeviceFingerprint] Registration error:', err);
    res.status(500).json({ error: 'Device registration failed' });
  }
});

/**
 * GET /api/auth/device/verify
 * Verify current device against stored fingerprint
 */
router.get('/verify', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const accountId = getAccountId(req);
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID required' });
    }

    // Generate current fingerprint
    const currentFingerprint = generateFingerprint(req);

    // Get all devices for this account
    const devices = await prisma.patientDevice.findMany({
      where: { accountId },
      orderBy: { lastSeenAt: 'desc' },
    });

    // Evaluate device trust
    const knownDevices = devices.map(d => ({
      fingerprintHash: d.fingerprintHash || '',
      lastSeenAt: d.lastSeenAt,
    }));

    const trustResult = evaluateDeviceTrust(
      currentFingerprint,
      knownDevices,
      [], // Login history could be fetched from audit logs
      false // MFA status would be fetched from user settings
    );

    // Find matching device
    const matchingDevice = devices.find(d =>
      d.fingerprintHash === currentFingerprint.hash
    );

    if (matchingDevice) {
      // Update last verified timestamp
      await prisma.patientDevice.update({
        where: { id: matchingDevice.id },
        data: {
          lastSeenAt: new Date(),
          lastUsedAt: new Date(),
          lastVerifiedAt: new Date(),
        },
      });

      // Check if trust is still valid
      const isStillTrusted = isTrustedDevice(
        currentFingerprint.hash,
        matchingDevice.fingerprintHash || '',
        matchingDevice.trustExpiresAt,
        matchingDevice.lastVerifiedAt
      );

      // If trust expired, update the device
      if (matchingDevice.isTrusted && !isStillTrusted) {
        await prisma.patientDevice.update({
          where: { id: matchingDevice.id },
          data: { isTrusted: false },
        });

        await logDeviceEvent({
          event: SecurityEvent.DEVICE_UNTRUSTED,
          tenantId,
          actorId: userId,
          deviceFingerprint: currentFingerprint.hash,
          deviceName: matchingDevice.deviceName,
          ip,
          userAgent,
        });
      }

      return res.json({
        verified: true,
        isTrusted: isStillTrusted,
        deviceId: matchingDevice.id,
        deviceName: matchingDevice.deviceName,
        lastSeenAt: matchingDevice.lastSeenAt,
        trustExpiresAt: matchingDevice.trustExpiresAt,
        requiresVerification: trustResult.requiresVerification,
        similarityScore: trustResult.similarityScore,
      });
    }

    // No matching device found
    res.json({
      verified: false,
      isTrusted: false,
      isNewDevice: true,
      requiresVerification: true,
      fingerprintHash: currentFingerprint.hash.substring(0, 16) + '...',
    });
  } catch (err: unknown) {
    console.error('[DeviceFingerprint] Verify error:', err);
    res.status(500).json({ error: 'Device verification failed' });
  }
});

/**
 * POST /api/auth/device/verify
 * Verify device with provided fingerprint components
 */
router.post('/verify', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = deviceVerifySchema.parse(req.body);
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const accountId = getAccountId(req);
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID required' });
    }

    // Generate fingerprint from provided components
    const currentFingerprint = generateFingerprintFromComponents(
      data.fingerprintComponents as DeviceFingerprintComponents
    );

    // Get all devices for this account
    const devices = await prisma.patientDevice.findMany({
      where: { accountId },
      orderBy: { lastSeenAt: 'desc' },
    });

    // Find best matching device
    let bestMatch: { device: typeof devices[0]; similarity: number } | null = null;

    for (const device of devices) {
      if (!device.fingerprintHash) continue;

      const similarity = compareFingerprints(
        currentFingerprint.hash,
        device.fingerprintHash
      );

      if (similarity >= 0.8 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { device, similarity };
      }
    }

    if (bestMatch) {
      // Update last verified timestamp
      await prisma.patientDevice.update({
        where: { id: bestMatch.device.id },
        data: {
          lastSeenAt: new Date(),
          lastUsedAt: new Date(),
          lastVerifiedAt: new Date(),
        },
      });

      // Check if trust is still valid
      const isStillTrusted = isTrustedDevice(
        currentFingerprint.hash,
        bestMatch.device.fingerprintHash || '',
        bestMatch.device.trustExpiresAt,
        bestMatch.device.lastVerifiedAt
      );

      return res.json({
        verified: true,
        isTrusted: isStillTrusted,
        deviceId: bestMatch.device.id,
        deviceName: bestMatch.device.deviceName,
        similarityScore: bestMatch.similarity,
        lastSeenAt: bestMatch.device.lastSeenAt,
        trustExpiresAt: bestMatch.device.trustExpiresAt,
      });
    }

    // No matching device found
    res.json({
      verified: false,
      isTrusted: false,
      isNewDevice: true,
      requiresVerification: true,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: err.issues,
      });
    }
    console.error('[DeviceFingerprint] Verify POST error:', err);
    res.status(500).json({ error: 'Device verification failed' });
  }
});

/**
 * GET /api/auth/device/list
 * List all devices for the authenticated user
 */
router.get('/list', requireAuth, async (req: Request, res: Response) => {
  try {
    const accountId = getAccountId(req);

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID required' });
    }

    const devices = await prisma.patientDevice.findMany({
      where: { accountId },
      orderBy: { lastSeenAt: 'desc' },
      select: {
        id: true,
        deviceName: true,
        deviceType: true,
        isActive: true,
        isTrusted: true,
        trustedAt: true,
        trustExpiresAt: true,
        lastSeenAt: true,
        lastUsedAt: true,
        lastVerifiedAt: true,
        createdAt: true,
        // Fingerprint hash is NOT included for security
      },
    });

    // Add trust status for each device
    const devicesWithStatus = devices.map(device => ({
      ...device,
      trustStatus: device.isTrusted
        ? device.trustExpiresAt && device.trustExpiresAt < new Date()
          ? 'expired'
          : 'trusted'
        : 'untrusted',
    }));

    res.json({
      devices: devicesWithStatus,
      total: devices.length,
      trustedCount: devices.filter(d => d.isTrusted).length,
    });
  } catch (err: unknown) {
    console.error('[DeviceFingerprint] List error:', err);
    res.status(500).json({ error: 'Failed to list devices' });
  }
});

/**
 * PUT /api/auth/device/:id/trust
 * Mark a device as trusted
 */
router.put('/:id/trust', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const accountId = getAccountId(req);
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID required' });
    }

    // Verify device ownership
    const device = await prisma.patientDevice.findFirst({
      where: { id, accountId },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Update trust status
    const updatedDevice = await prisma.patientDevice.update({
      where: { id },
      data: {
        isTrusted: true,
        trustedAt: new Date(),
        trustExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        lastVerifiedAt: new Date(),
      },
    });

    // Log trust event
    await logDeviceEvent({
      event: SecurityEvent.DEVICE_TRUSTED,
      tenantId,
      actorId: userId,
      deviceFingerprint: device.fingerprintHash || '',
      deviceName: device.deviceName,
      ip,
      userAgent,
    });

    res.json({
      success: true,
      device: {
        id: updatedDevice.id,
        deviceName: updatedDevice.deviceName,
        isTrusted: updatedDevice.isTrusted,
        trustedAt: updatedDevice.trustedAt,
        trustExpiresAt: updatedDevice.trustExpiresAt,
      },
    });
  } catch (err: unknown) {
    console.error('[DeviceFingerprint] Trust error:', err);
    res.status(500).json({ error: 'Failed to trust device' });
  }
});

/**
 * PUT /api/auth/device/:id/untrust
 * Remove trust from a device
 */
router.put('/:id/untrust', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const accountId = getAccountId(req);
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID required' });
    }

    // Verify device ownership
    const device = await prisma.patientDevice.findFirst({
      where: { id, accountId },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Update trust status
    const updatedDevice = await prisma.patientDevice.update({
      where: { id },
      data: {
        isTrusted: false,
        trustedAt: null,
        trustExpiresAt: null,
      },
    });

    // Log untrust event
    await logDeviceEvent({
      event: SecurityEvent.DEVICE_UNTRUSTED,
      tenantId,
      actorId: userId,
      deviceFingerprint: device.fingerprintHash || '',
      deviceName: device.deviceName,
      ip,
      userAgent,
    });

    res.json({
      success: true,
      device: {
        id: updatedDevice.id,
        deviceName: updatedDevice.deviceName,
        isTrusted: updatedDevice.isTrusted,
      },
    });
  } catch (err: unknown) {
    console.error('[DeviceFingerprint] Untrust error:', err);
    res.status(500).json({ error: 'Failed to untrust device' });
  }
});

/**
 * DELETE /api/auth/device/:id
 * Remove a device
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const accountId = getAccountId(req);
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID required' });
    }

    // Verify device ownership
    const device = await prisma.patientDevice.findFirst({
      where: { id, accountId },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Delete device
    await prisma.patientDevice.delete({
      where: { id },
    });

    // Log removal event
    await logSecurityEvent({
      event: SecurityEvent.SESSION_TERMINATED,
      tenantId,
      actorId: userId,
      ip,
      userAgent,
      deviceFingerprint: device.fingerprintHash || '',
      metadata: {
        deviceId: id,
        deviceName: device.deviceName,
        action: 'device_removed',
      },
    });

    res.json({
      success: true,
      message: 'Device removed successfully',
    });
  } catch (err: unknown) {
    console.error('[DeviceFingerprint] Delete error:', err);
    res.status(500).json({ error: 'Failed to remove device' });
  }
});

export default router;
