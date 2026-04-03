/**
 * @module totp.service.test
 * @description Unit Tests für TOTP/2FA Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as speakeasy from 'speakeasy';
import {
  setupTOTP,
  verifyTOTPSetup,
  verifyTOTP,
  regenerateBackupCodes,
  disableTOTP,
  has2FAEnabled,
  getRemainingBackupCodesCount,
} from './totp.service';

// Mock dependencies
vi.mock('../../db', () => ({
  prisma: {
    twoFactorAuth: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../security-audit.service', () => ({
  logSecurityEvent: vi.fn(),
  SecurityEvent: {
    MFA_ENABLED: 'SECURITY:MFA_ENABLED',
    MFA_DISABLED: 'SECURITY:MFA_DISABLED',
    MFA_CHALLENGE_SUCCESS: 'SECURITY:MFA_CHALLENGE_SUCCESS',
    MFA_CHALLENGE_FAILED: 'SECURITY:MFA_CHALLENGE_FAILED',
  },
}));

import { prisma } from '../../db';
import { logSecurityEvent } from '../security-audit.service';

const mockedPrisma = prisma as unknown as {
  twoFactorAuth: {
    upsert: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const mockedLogSecurityEvent = logSecurityEvent as ReturnType<typeof vi.fn>;

describe('TOTP Service', () => {
  const userId = 'test-user-123';
  const userType = 'ARZT' as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setupTOTP', () => {
    it('should generate secret and backup codes', async () => {
      mockedPrisma.twoFactorAuth.upsert.mockResolvedValue({
        id: 'tfa-123',
        userId,
        userType,
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: ['hashed1', 'hashed2'],
        isEnabled: false,
      });

      const result = await setupTOTP(userId, userType);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('qrCodeDataUrl');
      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
      expect(result.backupCodes[0]).toHaveLength(8);
      expect(mockedPrisma.twoFactorAuth.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_userType: { userId, userType } },
          create: expect.objectContaining({
            userId,
            userType,
            isEnabled: false,
          }),
          update: expect.objectContaining({
            isEnabled: false,
          }),
        })
      );
    });

    it('should generate unique backup codes', async () => {
      mockedPrisma.twoFactorAuth.upsert.mockResolvedValue({
        id: 'tfa-123',
        userId,
        userType,
        secret: 'SECRET',
        backupCodes: [],
        isEnabled: false,
      });

      const result = await setupTOTP(userId, userType);

      // Check that all backup codes are unique
      const uniqueCodes = new Set(result.backupCodes);
      expect(uniqueCodes.size).toBe(result.backupCodes.length);
    });
  });

  describe('verifyTOTPSetup', () => {
    const deviceInfo = {
      fingerprint: 'fp-123',
      userAgent: 'test-agent',
      ip: '127.0.0.1',
    };

    it('should enable 2FA with valid token', async () => {
      const secret = speakeasy.generateSecret({ length: 32 });
      
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue({
        id: 'tfa-123',
        userId,
        userType,
        secret: secret.base32,
        backupCodes: [],
        isEnabled: false,
      });

      mockedPrisma.twoFactorAuth.update.mockResolvedValue({
        id: 'tfa-123',
        isEnabled: true,
      });

      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32',
      });

      const result = await verifyTOTPSetup(userId, userType, token, deviceInfo);

      expect(result.valid).toBe(true);
      expect(mockedPrisma.twoFactorAuth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tfa-123' },
          data: expect.objectContaining({
            isEnabled: true,
            verifiedAt: expect.any(Date),
          }),
        })
      );
      expect(mockedLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'SECURITY:MFA_ENABLED',
          tenantId: 'system',
          actorId: userId,
        })
      );
    });

    it('should return error for invalid token', async () => {
      const secret = speakeasy.generateSecret({ length: 32 });
      
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue({
        id: 'tfa-123',
        userId,
        userType,
        secret: secret.base32,
        backupCodes: [],
        isEnabled: false,
      });

      const result = await verifyTOTPSetup(userId, userType, '000000', deviceInfo);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_TOKEN');
      expect(mockedLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'SECURITY:MFA_CHALLENGE_FAILED',
        })
      );
    });

    it('should return error if no 2FA setup exists', async () => {
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue(null);

      const result = await verifyTOTPSetup(userId, userType, '123456', deviceInfo);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('NO_2FA_SETUP');
    });
  });

  describe('verifyTOTP', () => {
    const deviceInfo = {
      fingerprint: 'fp-123',
      userAgent: 'test-agent',
      ip: '127.0.0.1',
    };

    it('should verify valid TOTP token', async () => {
      const secret = speakeasy.generateSecret({ length: 32 });
      
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue({
        id: 'tfa-123',
        userId,
        userType,
        secret: secret.base32,
        backupCodes: [],
        isEnabled: true,
      });

      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32',
      });

      const result = await verifyTOTP(userId, userType, token, deviceInfo);

      expect(result.valid).toBe(true);
      expect(mockedLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'SECURITY:MFA_CHALLENGE_SUCCESS',
        })
      );
    });

    it('should verify with backup code', async () => {
      const backupCode = 'ABCD1234';
      const hashedBackupCode = require('crypto')
        .createHash('sha256')
        .update(backupCode)
        .digest('hex');
      
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue({
        id: 'tfa-123',
        userId,
        userType,
        secret: 'SECRET',
        backupCodes: [hashedBackupCode],
        isEnabled: true,
      });

      mockedPrisma.twoFactorAuth.update.mockResolvedValue({});

      const result = await verifyTOTP(userId, userType, backupCode, deviceInfo);

      expect(result.valid).toBe(true);
      expect(mockedPrisma.twoFactorAuth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tfa-123' },
          data: expect.objectContaining({
            backupCodes: { set: [] },
            usedBackupCodes: { push: hashedBackupCode },
          }),
        })
      );
    });

    it('should reject invalid token', async () => {
      const secret = speakeasy.generateSecret({ length: 32 });
      
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue({
        id: 'tfa-123',
        userId,
        userType,
        secret: secret.base32,
        backupCodes: [],
        isEnabled: true,
      });

      const result = await verifyTOTP(userId, userType, '000000', deviceInfo);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_TOKEN');
      expect(mockedLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'SECURITY:MFA_CHALLENGE_FAILED',
        })
      );
    });

    it('should return error if 2FA not enabled', async () => {
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue({
        id: 'tfa-123',
        userId,
        userType,
        secret: 'SECRET',
        backupCodes: [],
        isEnabled: false,
      });

      const result = await verifyTOTP(userId, userType, '123456', deviceInfo);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('NO_2FA_SETUP');
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should generate new backup codes when 2FA is enabled', async () => {
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue({
        id: 'tfa-123',
        userId,
        userType,
        secret: 'SECRET',
        backupCodes: ['old1', 'old2'],
        isEnabled: true,
      });

      mockedPrisma.twoFactorAuth.update.mockResolvedValue({});

      const codes = await regenerateBackupCodes(userId, userType);

      expect(codes).toHaveLength(10);
      expect(codes?.[0]).toHaveLength(8);
      expect(mockedPrisma.twoFactorAuth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tfa-123' },
          data: expect.objectContaining({
            backupCodes: expect.any(Array),
          }),
        })
      );
    });

    it('should return null when 2FA is not enabled', async () => {
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue({
        id: 'tfa-123',
        userId,
        userType,
        secret: 'SECRET',
        backupCodes: [],
        isEnabled: false,
      });

      const codes = await regenerateBackupCodes(userId, userType);

      expect(codes).toBeNull();
    });

    it('should return null when no 2FA record exists', async () => {
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue(null);

      const codes = await regenerateBackupCodes(userId, userType);

      expect(codes).toBeNull();
    });
  });

  describe('disableTOTP', () => {
    const deviceInfo = {
      fingerprint: 'fp-123',
      userAgent: 'test-agent',
      ip: '127.0.0.1',
    };

    it('should disable 2FA when enabled', async () => {
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue({
        id: 'tfa-123',
        userId,
        userType,
        secret: 'SECRET',
        backupCodes: [],
        isEnabled: true,
      });

      mockedPrisma.twoFactorAuth.delete.mockResolvedValue({});

      const result = await disableTOTP(userId, userType, deviceInfo);

      expect(result).toBe(true);
      expect(mockedPrisma.twoFactorAuth.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tfa-123' },
        })
      );
      expect(mockedLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'SECURITY:MFA_DISABLED',
        })
      );
    });

    it('should return false when 2FA is not enabled', async () => {
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue({
        id: 'tfa-123',
        userId,
        userType,
        secret: 'SECRET',
        backupCodes: [],
        isEnabled: false,
      });

      const result = await disableTOTP(userId, userType, deviceInfo);

      expect(result).toBe(false);
      expect(mockedPrisma.twoFactorAuth.delete).not.toHaveBeenCalled();
    });

    it('should return false when no 2FA record exists', async () => {
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue(null);

      const result = await disableTOTP(userId, userType, deviceInfo);

      expect(result).toBe(false);
    });
  });

  describe('has2FAEnabled', () => {
    it('should return true when 2FA is enabled', async () => {
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue({
        id: 'tfa-123',
        userId,
        userType,
        secret: 'SECRET',
        backupCodes: [],
        isEnabled: true,
      });

      const result = await has2FAEnabled(userId, userType);

      expect(result).toBe(true);
    });

    it('should return false when 2FA is not enabled', async () => {
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue({
        id: 'tfa-123',
        userId,
        userType,
        secret: 'SECRET',
        backupCodes: [],
        isEnabled: false,
      });

      const result = await has2FAEnabled(userId, userType);

      expect(result).toBe(false);
    });

    it('should return false when no 2FA record exists', async () => {
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue(null);

      const result = await has2FAEnabled(userId, userType);

      expect(result).toBe(false);
    });
  });

  describe('getRemainingBackupCodesCount', () => {
    it('should return count of remaining backup codes', async () => {
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue({
        id: 'tfa-123',
        userId,
        userType,
        secret: 'SECRET',
        backupCodes: ['code1', 'code2', 'code3'],
        isEnabled: true,
      });

      const result = await getRemainingBackupCodesCount(userId, userType);

      expect(result).toBe(3);
    });

    it('should return 0 when no 2FA record exists', async () => {
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue(null);

      const result = await getRemainingBackupCodesCount(userId, userType);

      expect(result).toBe(0);
    });

    it('should return 0 when backupCodes is empty', async () => {
      mockedPrisma.twoFactorAuth.findUnique.mockResolvedValue({
        id: 'tfa-123',
        userId,
        userType,
        secret: 'SECRET',
        backupCodes: [],
        isEnabled: true,
      });

      const result = await getRemainingBackupCodesCount(userId, userType);

      expect(result).toBe(0);
    });
  });
});
