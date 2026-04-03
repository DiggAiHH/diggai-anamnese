/**
 * Advanced Auth Analytics Service
 *
 * Features:
 * - Login anomaly detection
 * - Geographic risk scoring
 * - Behavioral biometrics (basic)
 * - Risk-based authentication triggers
 */

import { prisma } from '../../db';
import { logSecurityEvent, SecurityEvent } from '../security-audit.service';
import * as crypto from 'crypto';

interface LoginEvent {
  userId: string;
  userType: 'ARZT' | 'PATIENT';
  timestamp: Date;
  ipHash: string;
  deviceFingerprint: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
}

interface RiskFactors {
  newDevice: boolean;
  newLocation: boolean;
  impossibleTravel: boolean;
  rapidAttempts: boolean;
  offHours: boolean;
  riskScore: number; // 0-100
}

interface GeoLocation {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

// Risk scoring weights
const RISK_WEIGHTS = {
  NEW_DEVICE: 20,
  NEW_LOCATION: 25,
  IMPOSSIBLE_TRAVEL: 50,
  RAPID_ATTEMPTS: 30,
  OFF_HOURS: 10,
  FAILED_ATTEMPTS: 15,
};

// Thresholds
const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 50,
  HIGH: 75,
};

/**
 * Analyze login event for anomalies
 */
export async function analyzeLoginEvent(
  event: LoginEvent
): Promise<{
  allowed: boolean;
  riskFactors: RiskFactors;
  requires2FA: boolean;
  alertTriggered: boolean;
}> {
  const riskFactors: RiskFactors = {
    newDevice: false,
    newLocation: false,
    impossibleTravel: false,
    rapidAttempts: false,
    offHours: false,
    riskScore: 0,
  };

  // 1. Check for new device
  riskFactors.newDevice = await isNewDevice(event.userId, event.deviceFingerprint);
  if (riskFactors.newDevice) {
    riskFactors.riskScore += RISK_WEIGHTS.NEW_DEVICE;
  }

  // 2. Check for new location
  riskFactors.newLocation = await isNewLocation(event.userId, event.ipHash);
  if (riskFactors.newLocation) {
    riskFactors.riskScore += RISK_WEIGHTS.NEW_LOCATION;
  }

  // 3. Check for impossible travel
  riskFactors.impossibleTravel = await checkImpossibleTravel(
    event.userId,
    event.timestamp,
    event.ipHash
  );
  if (riskFactors.impossibleTravel) {
    riskFactors.riskScore += RISK_WEIGHTS.IMPOSSIBLE_TRAVEL;
  }

  // 4. Check for rapid attempts
  riskFactors.rapidAttempts = await checkRapidAttempts(event.userId, event.timestamp);
  if (riskFactors.rapidAttempts) {
    riskFactors.riskScore += RISK_WEIGHTS.RAPID_ATTEMPTS;
  }

  // 5. Check for off-hours login
  riskFactors.offHours = isOffHours(event.timestamp);
  if (riskFactors.offHours) {
    riskFactors.riskScore += RISK_WEIGHTS.OFF_HOURS;
  }

  // 6. Add risk for recent failures
  const recentFailures = await getRecentFailedAttempts(event.userId, 1);
  riskFactors.riskScore += recentFailures * RISK_WEIGHTS.FAILED_ATTEMPTS;

  // Calculate final risk score (cap at 100)
  riskFactors.riskScore = Math.min(100, riskFactors.riskScore);

  // Determine action based on risk
  const requires2FA = riskFactors.riskScore >= RISK_THRESHOLDS.MEDIUM;
  const alertTriggered = riskFactors.riskScore >= RISK_THRESHOLDS.HIGH;
  const allowed = !riskFactors.impossibleTravel; // Block impossible travel

  // Log high-risk events
  if (alertTriggered) {
    await logSecurityEvent({
      event: SecurityEvent.SUSPICIOUS_ACTIVITY,
      tenantId: event.userType === 'ARZT' ? 'system' : 'pwa',
      actorId: event.userId,
      ip: event.ipHash,
      userAgent: event.userAgent,
      metadata: {
        riskScore: riskFactors.riskScore,
        riskFactors,
      },
    });
  }

  return {
    allowed,
    riskFactors,
    requires2FA,
    alertTriggered,
  };
}

/**
 * Check if device is new for this user
 */
async function isNewDevice(userId: string, deviceFingerprint: string): Promise<boolean> {
  // Check in PatientDevice table for patient users
  const knownPatientDevice = await prisma.patientDevice.findFirst({
    where: {
      accountId: userId,
      fingerprintHash: deviceFingerprint,
      isActive: true,
    },
  });

  if (knownPatientDevice) {
    return false;
  }

  // Check in RefreshToken for doctor users (via device fingerprint lookup)
  const knownArztDevice = await prisma.refreshToken.findFirst({
    where: {
      userId: userId,
      userType: 'ARZT',
      device: {
        fingerprintHash: deviceFingerprint,
        isActive: true,
      },
    },
  });

  return !knownArztDevice;
}

/**
 * Check if IP/location is new for this user
 */
async function isNewLocation(userId: string, ipHash: string): Promise<boolean> {
  const knownLocation = await prisma.auditLog.findFirst({
    where: {
      userId,
      ipAddress: ipHash,
      action: {
        in: ['SECURITY:LOGIN_SUCCESS', 'SECURITY:MFA_CHALLENGE_SUCCESS'],
      },
    },
  });

  return !knownLocation;
}

/**
 * Check for impossible travel (login from different countries within short time)
 */
async function checkImpossibleTravel(
  userId: string,
  currentTimestamp: Date,
  currentIpHash: string
): Promise<boolean> {
  // Get last successful login
  const lastLogin = await prisma.auditLog.findFirst({
    where: {
      userId,
      action: 'SECURITY:LOGIN_SUCCESS',
    },
    orderBy: { createdAt: 'desc' },
    skip: 1, // Skip current login
  });

  if (!lastLogin) return false;

  // Calculate time difference
  const timeDiff = currentTimestamp.getTime() - lastLogin.createdAt.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);

  // If less than 2 hours and different IP, flag as suspicious
  // (In production, you'd use actual geolocation)
  if (hoursDiff < 2 && lastLogin.ipAddress !== currentIpHash) {
    // For now, flag any different IP within 2 hours
    // Production: Use actual geolocation distance calculation
    return true;
  }

  return false;
}

/**
 * Check for rapid login attempts (brute force pattern)
 */
async function checkRapidAttempts(userId: string, timestamp: Date): Promise<boolean> {
  const fiveMinutesAgo = new Date(timestamp.getTime() - 5 * 60 * 1000);

  const recentAttempts = await prisma.auditLog.count({
    where: {
      userId,
      action: {
        in: ['SECURITY:LOGIN_FAILED', 'SECURITY:LOGIN_SUCCESS'],
      },
      createdAt: {
        gte: fiveMinutesAgo,
      },
    },
  });

  // More than 5 attempts in 5 minutes is suspicious
  return recentAttempts > 5;
}

/**
 * Check if login is during off-hours (10 PM - 6 AM)
 */
function isOffHours(timestamp: Date): boolean {
  const hour = timestamp.getHours();
  return hour < 6 || hour >= 22; // 10 PM - 6 AM
}

/**
 * Get recent failed attempts in last hour
 */
async function getRecentFailedAttempts(userId: string, hours: number): Promise<number> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return prisma.auditLog.count({
    where: {
      userId,
      action: 'SECURITY:LOGIN_FAILED',
      createdAt: { gte: since },
    },
  });
}

/**
 * Get user login statistics
 */
export async function getUserLoginStats(userId: string): Promise<{
  totalLogins: number;
  failedLogins: number;
  uniqueDevices: number;
  uniqueLocations: number;
  averageRiskScore: number;
  lastLogin: Date | null;
}> {
  const [totalLogins, failedLogins, patientDevices, arztDevicesResult] = await Promise.all([
    prisma.auditLog.count({
      where: { userId, action: 'SECURITY:LOGIN_SUCCESS' },
    }),
    prisma.auditLog.count({
      where: { userId, action: 'SECURITY:LOGIN_FAILED' },
    }),
    prisma.patientDevice.count({
      where: { accountId: userId, isActive: true },
    }),
    prisma.refreshToken.groupBy({
      by: ['deviceId'],
      where: {
        userId: userId,
        userType: 'ARZT',
        isRevoked: false,
      },
      _count: true,
    }),
  ]);

  const uniqueIpAddresses = await prisma.auditLog.groupBy({
    by: ['ipAddress'],
    where: {
      userId,
      action: 'SECURITY:LOGIN_SUCCESS',
    },
    _count: true,
  });

  const lastLogin = await prisma.auditLog.findFirst({
    where: { userId, action: 'SECURITY:LOGIN_SUCCESS' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  // Calculate unique devices (sum of patient devices and arzt devices)
  const arztDevices = arztDevicesResult.length;
  const uniqueDevices = patientDevices + arztDevices;

  return {
    totalLogins,
    failedLogins,
    uniqueDevices,
    uniqueLocations: uniqueIpAddresses.length,
    averageRiskScore: 0, // Would be calculated from stored risk scores
    lastLogin: lastLogin?.createdAt || null,
  };
}

/**
 * Get system-wide security metrics
 */
export async function getSecurityMetrics(since: Date): Promise<{
  totalLogins: number;
  failedLoginRate: number;
  averageRiskScore: number;
  highRiskEvents: number;
  uniqueUsers: number;
  blockedAttempts: number;
}> {
  const [totalLogins, failedLogins, highRiskEvents, uniqueUsers] = await Promise.all([
    prisma.auditLog.count({
      where: {
        action: 'SECURITY:LOGIN_SUCCESS',
        createdAt: { gte: since },
      },
    }),
    prisma.auditLog.count({
      where: {
        action: 'SECURITY:LOGIN_FAILED',
        createdAt: { gte: since },
      },
    }),
    prisma.auditLog.count({
      where: {
        action: 'SECURITY:SUSPICIOUS_ACTIVITY',
        createdAt: { gte: since },
      },
    }),
    prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        action: 'SECURITY:LOGIN_SUCCESS',
        createdAt: { gte: since },
      },
      _count: true,
    }),
  ]);

  const totalAttempts = totalLogins + failedLogins;
  const failedLoginRate = totalAttempts > 0 ? (failedLogins / totalAttempts) * 100 : 0;

  return {
    totalLogins,
    failedLoginRate: Math.round(failedLoginRate * 100) / 100,
    averageRiskScore: 0, // Would calculate from stored scores
    highRiskEvents,
    uniqueUsers: uniqueUsers.length,
    blockedAttempts: 0, // Would track separately
  };
}

/**
 * Hash IP address for storage/comparison
 */
export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

export type { LoginEvent, RiskFactors, GeoLocation };
export { RISK_THRESHOLDS, RISK_WEIGHTS };
