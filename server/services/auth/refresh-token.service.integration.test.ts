/**
 * @module refresh-token.service.integration.test
 * @description Integration Tests für Refresh Token Rotation Service
 * 
 * Diese Tests verwenden eine echte Datenbank-Verbindung und testen
 * den vollständigen Flow der Token-Rotation.
 * 
 * HINWEIS: Diese Tests erfordern eine laufende PostgreSQL-Datenbank.
 * Sie werden übersprungen wenn keine DB verfügbar ist.
 */

import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { 
  createTokenPair, 
  rotateRefreshToken, 
  revokeTokenFamily,
  cleanupExpiredTokens,
  revokeAllUserTokens,
  getTokenStats,
} from './refresh-token.service';
import { prisma } from '../../db';

// Check if database is available
let dbAvailable = false;

describe('Refresh Token Service Integration', () => {
  beforeAll(async () => {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
      dbAvailable = true;
    } catch {
      dbAvailable = false;
      console.warn('[Integration Test] Database not available, skipping integration tests');
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) return;
    
    // Clean up test data - nur Test-User-Daten löschen
    await prisma.refreshToken.deleteMany({
      where: { 
        OR: [
          { userId: { startsWith: 'test-' } },
          { userId: { contains: 'integration-test' } },
        ],
      },
    });
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    
    // Final cleanup
    await prisma.refreshToken.deleteMany({
      where: { 
        OR: [
          { userId: { startsWith: 'test-' } },
          { userId: { contains: 'integration-test' } },
        ],
      },
    });
  });

  describe('createTokenPair', () => {
    it('should create tokens with family tracking', async () => {
      if (!dbAvailable) return;
      
      const userId = `test-integration-${Date.now()}`;
      const result = await createTokenPair(
        userId,
        'PATIENT',
        undefined,
        undefined,
        undefined,
        '127.0.0.1',
        'Test-Agent'
      );

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);

      // Verify in database by querying with token hash
      const { hashToken } = await import('./refresh-token.service');
      const tokenHash = hashToken(result.refreshToken);
      
      const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      expect(stored).toBeDefined();
      expect(stored?.userId).toBe(userId);
      expect(stored?.tokenFamily).toBeDefined();
      expect(stored?.isRevoked).toBe(false);
      expect(stored?.userType).toBe('PATIENT');
    });

    it('should create tokens for ARZT user type', async () => {
      if (!dbAvailable) return;
      
      const userId = `test-arzt-${Date.now()}`;
      const result = await createTokenPair(
        userId,
        'ARZT',
        'tenant-1',
        'arzt',
        undefined,
        '127.0.0.1',
        'Test-Agent'
      );

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      const { hashToken } = await import('./refresh-token.service');
      const tokenHash = hashToken(result.refreshToken);
      
      const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      expect(stored).toBeDefined();
      expect(stored?.userId).toBe(userId);
      expect(stored?.userType).toBe('ARZT');
    });
  });

  describe('rotateRefreshToken', () => {
    it('should rotate token successfully', async () => {
      if (!dbAvailable) return;
      
      const userId = `test-rotate-${Date.now()}`;
      
      // Create initial token
      const initial = await createTokenPair(
        userId,
        'PATIENT',
        undefined,
        undefined,
        undefined,
        '127.0.0.1',
        'Test-Agent'
      );

      // Rotate
      const rotated = await rotateRefreshToken(
        initial.refreshToken,
        'fingerprint-123',
        '127.0.0.1',
        'Test-Agent'
      );

      expect(rotated.success).toBe(true);
      if (rotated.success && rotated.tokenPair) {
        expect(rotated.tokenPair.accessToken).toBeDefined();
        expect(rotated.tokenPair.refreshToken).not.toBe(initial.refreshToken);
      }

      // Verify old token marked as rotated
      const { hashToken } = await import('./refresh-token.service');
      const oldTokenHash = hashToken(initial.refreshToken);
      const oldToken = await prisma.refreshToken.findUnique({
        where: { tokenHash: oldTokenHash },
      });
      expect(oldToken?.rotatedAt).toBeDefined();
      expect(oldToken?.isRevoked).toBe(true);
    });

    it('should detect token reuse (theft)', async () => {
      if (!dbAvailable) return;
      
      const userId = `test-reuse-${Date.now()}`;
      
      // Create token
      const initial = await createTokenPair(
        userId,
        'PATIENT',
        undefined,
        undefined,
        undefined,
        '127.0.0.1',
        'Test-Agent'
      );

      // Rotate once (legitimate)
      await rotateRefreshToken(
        initial.refreshToken,
        'fingerprint-123',
        '127.0.0.1',
        'Test-Agent'
      );

      // Try to reuse old token (theft!)
      const result = await rotateRefreshToken(
        initial.refreshToken,
        'fingerprint-123',
        '127.0.0.1',
        'Test-Agent'
      );

      expect(result.success).toBe(false);
      expect(result.securityEvent).toBe('reuse_detected');
    });

    it('should reject expired tokens', async () => {
      const result = await rotateRefreshToken(
        'invalid-expired-token',
        'fingerprint-123',
        '127.0.0.1',
        'Test-Agent'
      );

      expect(result.success).toBe(false);
    });
  });

  describe('revokeTokenFamily', () => {
    it('should revoke all tokens in family', async () => {
      if (!dbAvailable) return;
      
      const userId = `test-family-${Date.now()}`;
      
      // Create multiple tokens in same family through rotation
      const initial = await createTokenPair(
        userId,
        'PATIENT',
        undefined,
        undefined,
        undefined,
        '127.0.0.1',
        'Test-Agent'
      );

      // Get token family
      const { hashToken } = await import('./refresh-token.service');
      const initialHash = hashToken(initial.refreshToken);
      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { tokenHash: initialHash },
      });
      
      expect(tokenRecord).toBeDefined();
      const tokenFamily = tokenRecord!.tokenFamily;

      // Rotate to create second token in family
      const rotated = await rotateRefreshToken(
        initial.refreshToken,
        'fingerprint-123',
        '127.0.0.1',
        'Test-Agent'
      );
      
      expect(rotated.success).toBe(true);

      // Revoke entire family
      await revokeTokenFamily(tokenFamily, 'TEST_REVOKE');

      // Verify all tokens in family are revoked
      const familyTokens = await prisma.refreshToken.findMany({
        where: { tokenFamily },
      });

      expect(familyTokens.length).toBeGreaterThanOrEqual(1);
      familyTokens.forEach(token => {
        expect(token.isRevoked).toBe(true);
        expect(token.revokedReason).toBe('TEST_REVOKE');
      });
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all user tokens', async () => {
      if (!dbAvailable) return;
      
      const userId = `test-revoke-all-${Date.now()}`;
      
      // Create multiple tokens
      await createTokenPair(userId, 'PATIENT', undefined, undefined, undefined, '127.0.0.1', 'Test1');
      await createTokenPair(userId, 'PATIENT', undefined, undefined, undefined, '127.0.0.1', 'Test2');
      await createTokenPair(userId, 'PATIENT', undefined, undefined, undefined, '127.0.0.1', 'Test3');

      const count = await revokeAllUserTokens(userId, 'PATIENT');
      expect(count).toBe(3);

      // Verify all are revoked
      const activeTokens = await prisma.refreshToken.count({
        where: { 
          userId, 
          userType: 'PATIENT',
          isRevoked: false,
        },
      });
      expect(activeTokens).toBe(0);
    });

    it('should exclude specified token when provided', async () => {
      if (!dbAvailable) return;
      
      const userId = `test-exclude-${Date.now()}`;
      
      // Create tokens
      const token1 = await createTokenPair(userId, 'PATIENT', undefined, undefined, undefined, '127.0.0.1', 'Test1');
      const token2 = await createTokenPair(userId, 'PATIENT', undefined, undefined, undefined, '127.0.0.1', 'Test2');

      // Get token ID for exclusion
      const { hashToken } = await import('./refresh-token.service');
      const token2Hash = hashToken(token2.refreshToken);
      const token2Record = await prisma.refreshToken.findUnique({
        where: { tokenHash: token2Hash },
      });

      // Revoke all except token2
      const count = await revokeAllUserTokens(userId, 'PATIENT', token2Record?.id);
      expect(count).toBe(1);

      // Verify token2 is still active
      const stillActive = await prisma.refreshToken.findUnique({
        where: { id: token2Record?.id },
      });
      expect(stillActive?.isRevoked).toBe(false);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should remove expired and revoked tokens', async () => {
      if (!dbAvailable) return;
      
      // Create expired token directly in DB
      const expiredFamily = `expired-family-${Date.now()}`;
      const { hashToken } = await import('./refresh-token.service');
      
      await prisma.refreshToken.create({
        data: {
          tokenFamily: expiredFamily,
          tokenHash: hashToken(`expired-token-${Date.now()}`),
          userId: `test-cleanup-${Date.now()}`,
          userType: 'PATIENT',
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          issuedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          rotatedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
          isRevoked: true,
          revokedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        },
      });

      const cleaned = await cleanupExpiredTokens(30);
      expect(cleaned).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getTokenStats', () => {
    it('should return token statistics', async () => {
      if (!dbAvailable) return;
      
      const userId = `test-stats-${Date.now()}`;
      
      // Create some tokens
      await createTokenPair(userId, 'PATIENT', undefined, undefined, undefined, '127.0.0.1', 'Test');
      
      const stats = await getTokenStats();

      expect(stats).toHaveProperty('totalActive');
      expect(stats).toHaveProperty('totalRevoked');
      expect(stats).toHaveProperty('expiredNotCleaned');
      expect(stats).toHaveProperty('reuseDetected');
      
      expect(typeof stats.totalActive).toBe('number');
      expect(typeof stats.totalRevoked).toBe('number');
    });
  });
});
