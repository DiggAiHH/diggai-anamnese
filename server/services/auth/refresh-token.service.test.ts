/**
 * @module refresh-token.service.test
 * @description Unit Tests für Refresh Token Rotation Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as crypto from 'crypto';

// Mocks
vi.mock('../../db', () => ({
    prisma: {
        refreshToken: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
            deleteMany: vi.fn(),
            count: vi.fn(),
        },
        $transaction: vi.fn((ops) => Promise.all(ops)),
    },
}));

vi.mock('../../redis', () => ({
    getRedisClient: vi.fn(() => null),
    isRedisReady: vi.fn(() => false),
}));

vi.mock('../../config', () => ({
    config: {
        jwtSecret: 'test-secret-32-chars-long!!!!!',
        jwtExpiresIn: '15m',
        jwtCookieMaxAgeMs: 15 * 60 * 1000,
    },
}));

vi.mock('../security-audit.service', () => ({
    logSecurityEvent: vi.fn(),
    SecurityEvent: {
        TOKEN_REFRESHED: 'SECURITY:TOKEN_REFRESHED',
        TOKEN_FAMILY_BROKEN: 'SECURITY:TOKEN_FAMILY_BROKEN',
    },
}));

import {
    createTokenPair,
    rotateRefreshToken,
    revokeTokenFamily,
    revokeAllUserTokens,
    revokeRefreshToken,
    cleanupExpiredTokens,
    getTokenStats,
    hashToken,
} from './refresh-token.service';
import { prisma } from '../../db';

describe('Refresh Token Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('hashToken', () => {
        it('should return consistent hashes for same token', () => {
            const token = 'test-token-123';
            const hash1 = hashToken(token);
            const hash2 = hashToken(token);
            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(64); // SHA-256 hex
        });

        it('should return different hashes for different tokens', () => {
            const hash1 = hashToken('token-1');
            const hash2 = hashToken('token-2');
            expect(hash1).not.toBe(hash2);
        });
    });

    describe('createTokenPair', () => {
        it('should create access and refresh tokens', async () => {
            const mockCreate = vi.mocked(prisma.refreshToken.create).mockResolvedValue({
                id: 'rt-1',
                tokenFamily: 'family-1',
                tokenHash: 'hash',
                userId: 'user-1',
                userType: 'ARZT',
            } as any);

            const result = await createTokenPair(
                'user-1',
                'ARZT',
                'tenant-1',
                'arzt'
            );

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result).toHaveProperty('expiresAt');
            expect(typeof result.accessToken).toBe('string');
            expect(typeof result.refreshToken).toBe('string');
            expect(result.expiresAt).toBeInstanceOf(Date);
            expect(mockCreate).toHaveBeenCalledOnce();
        });
    });

    describe('rotateRefreshToken', () => {
        it('should reject invalid tokens', async () => {
            vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(null);

            const result = await rotateRefreshToken('invalid-token');

            expect(result.success).toBe(false);
            expect(result.securityEvent).toBe('invalid');
        });

        it('should reject expired tokens', async () => {
            vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
                id: 'rt-1',
                tokenHash: hashToken('expired-token'),
                expiresAt: new Date(Date.now() - 1000), // Expired
                isRevoked: false,
                rotatedAt: null,
                reuseDetected: false,
            } as any);

            const result = await rotateRefreshToken('expired-token');

            expect(result.success).toBe(false);
            expect(result.securityEvent).toBe('expired');
        });

        it('should detect token reuse', async () => {
            vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
                id: 'rt-1',
                tokenHash: hashToken('reused-token'),
                tokenFamily: 'family-1',
                userId: 'user-1',
                userType: 'ARZT',
                expiresAt: new Date(Date.now() + 10000),
                isRevoked: false,
                rotatedAt: new Date(), // Already rotated
                reuseDetected: false,
            } as any);

            vi.mocked(prisma.refreshToken.findMany).mockResolvedValue([
                { id: 'rt-1', tokenHash: 'hash-1', expiresAt: new Date(Date.now() + 10000) },
            ] as any);
            vi.mocked(prisma.refreshToken.update).mockResolvedValue({} as any);
            vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 } as any);

            const result = await rotateRefreshToken('reused-token');

            expect(result.success).toBe(false);
            expect(result.securityEvent).toBe('reuse_detected');
        });
    });

    describe('revokeTokenFamily', () => {
        it('should revoke all tokens in family', async () => {
            vi.mocked(prisma.refreshToken.findMany).mockResolvedValue([
                { id: 'rt-1', tokenHash: 'hash-1', expiresAt: new Date(Date.now() + 10000) },
                { id: 'rt-2', tokenHash: 'hash-2', expiresAt: new Date(Date.now() + 10000) },
            ] as any);
            vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 2 } as any);

            await revokeTokenFamily('family-1', 'TEST_REVOKE');

            expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
                where: {
                    tokenFamily: 'family-1',
                    isRevoked: false,
                },
                data: expect.objectContaining({
                    isRevoked: true,
                    revokedReason: 'TEST_REVOKE',
                }),
            });
        });
    });

    describe('revokeAllUserTokens', () => {
        it('should revoke all user tokens', async () => {
            vi.mocked(prisma.refreshToken.findMany).mockResolvedValue([] as any);
            vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 3 } as any);

            const count = await revokeAllUserTokens('user-1', 'ARZT');

            expect(count).toBe(3);
            expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
                where: {
                    userId: 'user-1',
                    userType: 'ARZT',
                    isRevoked: false,
                },
                data: expect.any(Object),
            });
        });
    });

    describe('cleanupExpiredTokens', () => {
        it('should delete old expired tokens', async () => {
            vi.mocked(prisma.refreshToken.deleteMany).mockResolvedValue({ count: 5 } as any);

            const count = await cleanupExpiredTokens(30);

            expect(count).toBe(5);
            expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
                where: {
                    OR: [
                        {
                            expiresAt: { lt: expect.any(Date) },
                            rotatedAt: { lt: expect.any(Date) },
                        },
                        {
                            isRevoked: true,
                            revokedAt: { lt: expect.any(Date) },
                        },
                    ],
                },
            });
        });
    });

    describe('getTokenStats', () => {
        it('should return token statistics', async () => {
            vi.mocked(prisma.refreshToken.count)
                .mockResolvedValueOnce(100) // active
                .mockResolvedValueOnce(10)  // revoked
                .mockResolvedValueOnce(5)   // expired
                .mockResolvedValueOnce(2);  // reuse

            const stats = await getTokenStats();

            expect(stats).toEqual({
                totalActive: 100,
                totalRevoked: 10,
                expiredNotCleaned: 5,
                reuseDetected: 2,
            });
        });
    });
});
