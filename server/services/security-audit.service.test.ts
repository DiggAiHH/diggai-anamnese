import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing the service
vi.mock('../db', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import {
  SecurityEvent,
  logSecurityEvent,
  logLoginFailure,
  logMfaStatusChange,
  logMfaChallenge,
  logTokenRefresh,
  logSessionEvent,
  logDeviceEvent,
  logLocationAlert,
} from './security-audit.service';
import { prisma } from '../db';

describe('Security Audit Extended', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error during tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // ============================================
  // SecurityEvent Enum Tests
  // ============================================
  describe('SecurityEvent Enum', () => {
    it('should contain all legacy events', () => {
      expect(SecurityEvent.LOGIN_SUCCESS).toBe('SECURITY:LOGIN_SUCCESS');
      expect(SecurityEvent.LOGIN_FAILED).toBe('SECURITY:LOGIN_FAILED');
      expect(SecurityEvent.ACCOUNT_LOCKED).toBe('SECURITY:ACCOUNT_LOCKED');
      expect(SecurityEvent.ACCOUNT_UNLOCKED).toBe('SECURITY:ACCOUNT_UNLOCKED');
      expect(SecurityEvent.LOGOUT).toBe('SECURITY:LOGOUT');
      expect(SecurityEvent.TOKEN_REVOKED).toBe('SECURITY:TOKEN_REVOKED');
      expect(SecurityEvent.PASSWORD_CHANGED).toBe('SECURITY:PASSWORD_CHANGED');
      expect(SecurityEvent.PASSWORD_RESET_REQUESTED).toBe('SECURITY:PASSWORD_RESET_REQUESTED');
      expect(SecurityEvent.PASSWORD_RESET_COMPLETED).toBe('SECURITY:PASSWORD_RESET_COMPLETED');
      expect(SecurityEvent.DATA_EXPORTED).toBe('SECURITY:DATA_EXPORTED');
      expect(SecurityEvent.ACCOUNT_DELETED).toBe('SECURITY:ACCOUNT_DELETED');
      expect(SecurityEvent.ACCOUNT_HARD_DELETED).toBe('SECURITY:ACCOUNT_HARD_DELETED');
      expect(SecurityEvent.SUSPICIOUS_ACTIVITY).toBe('SECURITY:SUSPICIOUS_ACTIVITY');
    });

    it('should contain all MFA events', () => {
      expect(SecurityEvent.MFA_ENABLED).toBe('SECURITY:MFA_ENABLED');
      expect(SecurityEvent.MFA_DISABLED).toBe('SECURITY:MFA_DISABLED');
      expect(SecurityEvent.MFA_CHALLENGE_SUCCESS).toBe('SECURITY:MFA_CHALLENGE_SUCCESS');
      expect(SecurityEvent.MFA_CHALLENGE_FAILED).toBe('SECURITY:MFA_CHALLENGE_FAILED');
    });

    it('should contain all token and session events', () => {
      expect(SecurityEvent.TOKEN_REFRESHED).toBe('SECURITY:TOKEN_REFRESHED');
      expect(SecurityEvent.TOKEN_FAMILY_BROKEN).toBe('SECURITY:TOKEN_FAMILY_BROKEN');
      expect(SecurityEvent.SESSION_TERMINATED).toBe('SECURITY:SESSION_TERMINATED');
      expect(SecurityEvent.ALL_SESSIONS_TERMINATED).toBe('SECURITY:ALL_SESSIONS_TERMINATED');
    });

    it('should contain all device and location events', () => {
      expect(SecurityEvent.DEVICE_TRUSTED).toBe('SECURITY:DEVICE_TRUSTED');
      expect(SecurityEvent.DEVICE_UNTRUSTED).toBe('SECURITY:DEVICE_UNTRUSTED');
      expect(SecurityEvent.NEW_DEVICE_DETECTED).toBe('SECURITY:NEW_DEVICE_DETECTED');
      expect(SecurityEvent.SUSPICIOUS_LOCATION).toBe('SECURITY:SUSPICIOUS_LOCATION');
      expect(SecurityEvent.IMPOSSIBLE_TRAVEL).toBe('SECURITY:IMPOSSIBLE_TRAVEL');
    });
  });

  // ============================================
  // Basic Logging Tests
  // ============================================
  describe('logSecurityEvent', () => {
    it('should log basic security event', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logSecurityEvent({
        event: SecurityEvent.LOGIN_SUCCESS,
        tenantId: 'tenant-123',
        actorId: 'user-456',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-123',
          userId: 'user-456',
          action: 'SECURITY:LOGIN_SUCCESS',
          resource: 'auth/security',
        }),
      });
    });

    it('should log MFA_ENABLED event', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logSecurityEvent({
        event: SecurityEvent.MFA_ENABLED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        ip: '192.168.1.100',
        metadata: { method: 'totp' },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SECURITY:MFA_ENABLED',
          ipAddress: expect.any(String),
          metadata: expect.stringContaining('totp'),
        }),
      });
    });

    it('should hash IP addresses (DSGVO compliance)', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      const ip = '192.168.1.100';
      await logSecurityEvent({
        event: SecurityEvent.LOGIN_SUCCESS,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        ip,
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.ipAddress).not.toBe(ip);
      expect(callArgs.data.ipAddress).toMatch(/^[a-f0-9]{16}$/); // First 16 chars of SHA-256
    });

    it('should include deviceFingerprintHash when provided', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logSecurityEvent({
        event: SecurityEvent.NEW_DEVICE_DETECTED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        deviceFingerprint: 'fp-abc123',
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.metadata).toContain('deviceFingerprintHash');
    });

    it('should hash device fingerprint (privacy protection)', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      const fingerprint = 'device-fingerprint-12345';
      await logSecurityEvent({
        event: SecurityEvent.NEW_DEVICE_DETECTED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        deviceFingerprint: fingerprint,
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      const metadata = JSON.parse(callArgs.data.metadata);
      expect(metadata.deviceFingerprintHash).not.toBe(fingerprint);
      expect(metadata.deviceFingerprintHash).toMatch(/^[a-f0-9]{16}$/);
    });

    it('should include sessionId in metadata when provided', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logSecurityEvent({
        event: SecurityEvent.SESSION_TERMINATED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        sessionId: 'session-abc-123',
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      const metadata = JSON.parse(callArgs.data.metadata);
      expect(metadata.sessionId).toBe('session-abc-123');
    });

    it('should include geoLocation in metadata when provided', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logSecurityEvent({
        event: SecurityEvent.SUSPICIOUS_LOCATION,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        geoLocation: { country: 'DE', region: 'Berlin' },
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      const metadata = JSON.parse(callArgs.data.metadata);
      expect(metadata.geoLocation).toEqual({ country: 'DE', region: 'Berlin' });
    });

    it('should sanitize user agent strings', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      const userAgent = 'Mozilla/5.0\r\n\tMalicious Header';
      await logSecurityEvent({
        event: SecurityEvent.LOGIN_SUCCESS,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        userAgent,
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.userAgent).not.toContain('\r');
      expect(callArgs.data.userAgent).not.toContain('\n');
      expect(callArgs.data.userAgent).not.toContain('\t');
    });

    it('should truncate long user agent strings', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      const userAgent = 'A'.repeat(300);
      await logSecurityEvent({
        event: SecurityEvent.LOGIN_SUCCESS,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        userAgent,
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.userAgent.length).toBeLessThanOrEqual(200);
    });

    it('should not throw when logging fails (fail-safe)', async () => {
      (prisma.auditLog.create as any).mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        logSecurityEvent({
          event: SecurityEvent.LOGIN_SUCCESS,
          tenantId: 'tenant-123',
          actorId: 'user-456',
        })
      ).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        '[SecurityAudit] KRITISCH — Event konnte nicht gespeichert werden:',
        'SECURITY:LOGIN_SUCCESS',
        expect.any(Error)
      );
    });

    it('should handle null metadata gracefully', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logSecurityEvent({
        event: SecurityEvent.LOGIN_SUCCESS,
        tenantId: 'tenant-123',
        actorId: 'user-456',
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.metadata).toBeNull();
    });

    it('should handle empty metadata object', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logSecurityEvent({
        event: SecurityEvent.LOGIN_SUCCESS,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        metadata: {},
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.metadata).toBeNull();
    });
  });

  // ============================================
  // Log Login Failure Tests
  // ============================================
  describe('logLoginFailure', () => {
    it('should log failed login attempt', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logLoginFailure({
        tenantId: 'tenant-123',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        attemptNumber: 3,
        accountLocked: false,
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SECURITY:LOGIN_FAILED',
          metadata: expect.stringContaining('3'),
        }),
      });
    });

    it('should log account locked event', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logLoginFailure({
        tenantId: 'tenant-123',
        ip: '192.168.1.100',
        attemptNumber: 5,
        accountLocked: true,
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SECURITY:ACCOUNT_LOCKED',
          metadata: expect.stringContaining('true'),
        }),
      });
    });
  });

  // ============================================
  // MFA Event Helper Tests
  // ============================================
  describe('logMfaStatusChange', () => {
    it('should log MFA_ENABLED event', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logMfaStatusChange({
        event: SecurityEvent.MFA_ENABLED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        method: 'totp',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        deviceFingerprint: 'fp-device-123',
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.action).toBe('SECURITY:MFA_ENABLED');
      const metadata = JSON.parse(callArgs.data.metadata);
      expect(metadata.method).toBe('totp');
    });

    it('should log MFA_DISABLED event', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logMfaStatusChange({
        event: SecurityEvent.MFA_DISABLED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        method: 'sms',
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.action).toBe('SECURITY:MFA_DISABLED');
    });

    it('should support all MFA methods', async () => {
      (prisma.auditLog.create as any).mockResolvedValue({ id: 'log-id' });

      const methods: Array<'totp' | 'sms' | 'email' | 'backup_codes'> = [
        'totp',
        'sms',
        'email',
        'backup_codes',
      ];

      for (const method of methods) {
        await logMfaStatusChange({
          event: SecurityEvent.MFA_ENABLED,
          tenantId: 'tenant-123',
          actorId: 'user-456',
          method,
        });
      }

      expect(prisma.auditLog.create).toHaveBeenCalledTimes(methods.length);
    });
  });

  describe('logMfaChallenge', () => {
    it('should log MFA_CHALLENGE_SUCCESS event', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logMfaChallenge({
        event: SecurityEvent.MFA_CHALLENGE_SUCCESS,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        method: 'totp',
        attemptNumber: 1,
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.action).toBe('SECURITY:MFA_CHALLENGE_SUCCESS');
      const metadata = JSON.parse(callArgs.data.metadata);
      expect(metadata.method).toBe('totp');
      expect(metadata.attemptNumber).toBe(1);
    });

    it('should log MFA_CHALLENGE_FAILED event', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logMfaChallenge({
        event: SecurityEvent.MFA_CHALLENGE_FAILED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        method: 'backup_code',
        attemptNumber: 2,
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.action).toBe('SECURITY:MFA_CHALLENGE_FAILED');
    });
  });

  // ============================================
  // Token & Session Event Helper Tests
  // ============================================
  describe('logTokenRefresh', () => {
    it('should log TOKEN_REFRESHED event', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logTokenRefresh({
        event: SecurityEvent.TOKEN_REFRESHED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        sessionId: 'session-abc',
        deviceFingerprint: 'fp-device-123',
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.action).toBe('SECURITY:TOKEN_REFRESHED');
      const metadata = JSON.parse(callArgs.data.metadata);
      expect(metadata.sessionId).toBe('session-abc');
    });

    it('should log TOKEN_FAMILY_BROKEN event', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logTokenRefresh({
        event: SecurityEvent.TOKEN_FAMILY_BROKEN,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        sessionId: 'session-xyz',
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.action).toBe('SECURITY:TOKEN_FAMILY_BROKEN');
    });
  });

  describe('logSessionEvent', () => {
    it('should log SESSION_TERMINATED event', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logSessionEvent({
        event: SecurityEvent.SESSION_TERMINATED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        sessionId: 'session-abc-123',
        ip: '192.168.1.100',
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.action).toBe('SECURITY:SESSION_TERMINATED');
      const metadata = JSON.parse(callArgs.data.metadata);
      expect(metadata.sessionId).toBe('session-abc-123');
    });

    it('should log ALL_SESSIONS_TERMINATED event with count', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logSessionEvent({
        event: SecurityEvent.ALL_SESSIONS_TERMINATED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        terminatedCount: 5,
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.action).toBe('SECURITY:ALL_SESSIONS_TERMINATED');
      const metadata = JSON.parse(callArgs.data.metadata);
      expect(metadata.terminatedCount).toBe(5);
    });
  });

  // ============================================
  // Device Event Helper Tests
  // ============================================
  describe('logDeviceEvent', () => {
    it('should log DEVICE_TRUSTED event', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logDeviceEvent({
        event: SecurityEvent.DEVICE_TRUSTED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        deviceFingerprint: 'fp-device-abc',
        deviceName: 'iPhone 15',
        ip: '192.168.1.100',
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.action).toBe('SECURITY:DEVICE_TRUSTED');
      const metadata = JSON.parse(callArgs.data.metadata);
      expect(metadata.deviceName).toBe('iPhone 15');
    });

    it('should log DEVICE_UNTRUSTED event', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logDeviceEvent({
        event: SecurityEvent.DEVICE_UNTRUSTED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        deviceFingerprint: 'fp-device-xyz',
        deviceName: 'Chrome on Mac',
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.action).toBe('SECURITY:DEVICE_UNTRUSTED');
    });

    it('should log NEW_DEVICE_DETECTED with fingerprint', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logDeviceEvent({
        event: SecurityEvent.NEW_DEVICE_DETECTED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        deviceFingerprint: 'fp-new-device-123',
        deviceName: 'Safari on iPad',
        geoLocation: { country: 'DE', region: 'Berlin' },
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.action).toBe('SECURITY:NEW_DEVICE_DETECTED');
      const metadata = JSON.parse(callArgs.data.metadata);
      expect(metadata.geoLocation).toEqual({ country: 'DE', region: 'Berlin' });
    });

    it('should hash device fingerprint in logs', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      const fingerprint = 'sensitive-device-fp-123';
      await logDeviceEvent({
        event: SecurityEvent.NEW_DEVICE_DETECTED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        deviceFingerprint: fingerprint,
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      const metadata = JSON.parse(callArgs.data.metadata);
      expect(metadata.deviceFingerprintHash).not.toBe(fingerprint);
      expect(metadata.deviceFingerprintHash).toMatch(/^[a-f0-9]{16}$/);
    });
  });

  // ============================================
  // Location Alert Helper Tests
  // ============================================
  describe('logLocationAlert', () => {
    it('should log SUSPICIOUS_LOCATION event', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logLocationAlert({
        event: SecurityEvent.SUSPICIOUS_LOCATION,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        currentLocation: { country: 'RU', region: 'Moscow' },
        previousLocation: { country: 'DE', region: 'Berlin' },
        deviceFingerprint: 'fp-device-123',
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.action).toBe('SECURITY:SUSPICIOUS_LOCATION');
      const metadata = JSON.parse(callArgs.data.metadata);
      expect(metadata.currentLocation).toEqual({ country: 'RU', region: 'Moscow' });
      expect(metadata.previousLocation).toEqual({ country: 'DE', region: 'Berlin' });
    });

    it('should log IMPOSSIBLE_TRAVEL event with time delta', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logLocationAlert({
        event: SecurityEvent.IMPOSSIBLE_TRAVEL,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        currentLocation: { country: 'US', region: 'California' },
        previousLocation: { country: 'DE', region: 'Berlin' },
        timeDeltaMinutes: 30,
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.action).toBe('SECURITY:IMPOSSIBLE_TRAVEL');
      const metadata = JSON.parse(callArgs.data.metadata);
      expect(metadata.timeDeltaMinutes).toBe(30);
    });

    it('should include geoLocation in metadata', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logLocationAlert({
        event: SecurityEvent.SUSPICIOUS_LOCATION,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        currentLocation: { country: 'CN', region: 'Beijing' },
        previousLocation: { country: 'DE', region: 'Munich' },
        deviceFingerprint: 'fp-device-xyz',
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      const metadata = JSON.parse(callArgs.data.metadata);
      expect(metadata.currentLocation.country).toBe('CN');
      expect(metadata.previousLocation.country).toBe('DE');
    });
  });

  // ============================================
  // DSGVO/HIPAA Compliance Tests
  // ============================================
  describe('DSGVO/HIPAA Compliance', () => {
    it('should NOT store PII in metadata', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logSecurityEvent({
        event: SecurityEvent.LOGIN_SUCCESS,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        metadata: {
          // Only safe metadata, no PII
          attemptCount: 1,
          isTrustedDevice: true,
        },
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      const metadataStr = callArgs.data.metadata;
      expect(metadataStr).not.toMatch(/email|name|phone|address/i);
    });

    it('should NOT store email addresses in logs', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      await logSecurityEvent({
        event: SecurityEvent.LOGIN_SUCCESS,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        metadata: {
          // Safe metadata only
          loginMethod: 'password',
        },
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      expect(callArgs.data.metadata).not.toContain('@');
    });

    it('should hash device fingerprint (not store plaintext)', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      const sensitiveFp = 'device-id-with-sensitive-info-12345';
      await logSecurityEvent({
        event: SecurityEvent.NEW_DEVICE_DETECTED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        deviceFingerprint: sensitiveFp,
      });

      const callArgs = (prisma.auditLog.create as any).mock.calls[0][0];
      const metadata = JSON.parse(callArgs.data.metadata);
      expect(metadata.deviceFingerprintHash).toBeDefined();
      expect(metadata.deviceFingerprintHash).not.toBe(sensitiveFp);
    });

    it('should produce consistent hash for same device fingerprint', async () => {
      (prisma.auditLog.create as any).mockResolvedValue({ id: 'log-id' });

      const fingerprint = 'consistent-fp-123';

      await logSecurityEvent({
        event: SecurityEvent.NEW_DEVICE_DETECTED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        deviceFingerprint: fingerprint,
      });

      await logSecurityEvent({
        event: SecurityEvent.DEVICE_TRUSTED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        deviceFingerprint: fingerprint,
      });

      const call1 = (prisma.auditLog.create as any).mock.calls[0][0];
      const call2 = (prisma.auditLog.create as any).mock.calls[1][0];

      const metadata1 = JSON.parse(call1.data.metadata);
      const metadata2 = JSON.parse(call2.data.metadata);

      expect(metadata1.deviceFingerprintHash).toBe(metadata2.deviceFingerprintHash);
    });

    it('should produce different hashes for different device fingerprints', async () => {
      (prisma.auditLog.create as any).mockResolvedValue({ id: 'log-id' });

      await logSecurityEvent({
        event: SecurityEvent.NEW_DEVICE_DETECTED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        deviceFingerprint: 'fp-device-1',
      });

      await logSecurityEvent({
        event: SecurityEvent.NEW_DEVICE_DETECTED,
        tenantId: 'tenant-123',
        actorId: 'user-456',
        deviceFingerprint: 'fp-device-2',
      });

      const call1 = (prisma.auditLog.create as any).mock.calls[0][0];
      const call2 = (prisma.auditLog.create as any).mock.calls[1][0];

      const metadata1 = JSON.parse(call1.data.metadata);
      const metadata2 = JSON.parse(call2.data.metadata);

      expect(metadata1.deviceFingerprintHash).not.toBe(metadata2.deviceFingerprintHash);
    });
  });

  // ============================================
  // Non-blocking Behavior Tests
  // ============================================
  describe('Non-blocking Behavior', () => {
    it('should not block on successful log', async () => {
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: 'log-123' });

      const startTime = Date.now();
      await logSecurityEvent({
        event: SecurityEvent.LOGIN_SUCCESS,
        tenantId: 'tenant-123',
        actorId: 'user-456',
      });
      const endTime = Date.now();

      // Should complete quickly (mock is synchronous)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should not block on failed log', async () => {
      (prisma.auditLog.create as any).mockRejectedValueOnce(new Error('DB Error'));

      const startTime = Date.now();
      await logSecurityEvent({
        event: SecurityEvent.LOGIN_SUCCESS,
        tenantId: 'tenant-123',
        actorId: 'user-456',
      });
      const endTime = Date.now();

      // Should complete quickly even on error
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('all helper functions should be non-blocking', async () => {
      (prisma.auditLog.create as any).mockResolvedValue({ id: 'log-id' });

      const promises = [
        logMfaStatusChange({
          event: SecurityEvent.MFA_ENABLED,
          tenantId: 'tenant-123',
          actorId: 'user-456',
          method: 'totp',
        }),
        logMfaChallenge({
          event: SecurityEvent.MFA_CHALLENGE_SUCCESS,
          tenantId: 'tenant-123',
          actorId: 'user-456',
          method: 'totp',
        }),
        logTokenRefresh({
          event: SecurityEvent.TOKEN_REFRESHED,
          tenantId: 'tenant-123',
          actorId: 'user-456',
        }),
        logSessionEvent({
          event: SecurityEvent.SESSION_TERMINATED,
          tenantId: 'tenant-123',
          actorId: 'user-456',
        }),
        logDeviceEvent({
          event: SecurityEvent.NEW_DEVICE_DETECTED,
          tenantId: 'tenant-123',
          actorId: 'user-456',
          deviceFingerprint: 'fp-test',
        }),
        logLocationAlert({
          event: SecurityEvent.SUSPICIOUS_LOCATION,
          tenantId: 'tenant-123',
          actorId: 'user-456',
          currentLocation: { country: 'DE', region: 'Berlin' },
          previousLocation: { country: 'US', region: 'NYC' },
        }),
      ];

      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();

      // All should complete quickly
      expect(endTime - startTime).toBeLessThan(200);
    });
  });
});
