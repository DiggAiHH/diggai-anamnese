import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock config - MUST be before any imports
vi.mock('../config', () => ({
  config: {
    jwtSecret: 'test-secret-key-that-is-32-chars-long!',
    jwtExpiresIn: '24h',
  },
}));

// Mock redis
vi.mock('../redis', () => ({
  getRedisClient: vi.fn().mockReturnValue(null),
  isRedisReady: vi.fn().mockReturnValue(false),
}));

// Mock prisma
vi.mock('../db', () => ({
  prisma: {
    rolePermission: {
      findFirst: vi.fn(),
    },
    arztUser: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn((payload, secret, options) => {
    return `mocked-jwt-token-${JSON.stringify(payload)}`;
  }),
  verify: vi.fn((token, secret, options) => {
    if (token === 'valid-token') {
      return { userId: 'user-123', role: 'arzt', jti: 'jti-123' };
    }
    if (token === 'valid-patient-token') {
      return { userId: 'patient-123', role: 'patient', sessionId: 'session-456', jti: 'jti-456' };
    }
    if (token === 'valid-admin-token') {
      return { userId: 'admin-123', role: 'admin', jti: 'jti-789' };
    }
    if (token === 'valid-mfa-token') {
      return { userId: 'mfa-123', role: 'mfa', jti: 'jti-mfa' };
    }
    if (token === 'expired-token') {
      const error = new Error('jwt expired');
      (error as any).name = 'TokenExpiredError';
      throw error;
    }
    if (token === 'invalid-token') {
      const error = new Error('invalid token');
      (error as any).name = 'JsonWebTokenError';
      throw error;
    }
    if (token === 'blacklisted-token') {
      return { userId: 'user-123', role: 'arzt', jti: 'blacklisted-jti' };
    }
    throw new Error('invalid token');
  }),
}));

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn().mockReturnValue('mocked-uuid-123'),
});

// Now import the module under test - AFTER all mocks are defined
import { prisma } from '../db';
import {
  requireAuth,
  requireRole,
  requireAdmin,
  requireSessionOwner,
  requirePermission,
  requireStrictPermission,
  createToken,
  setTokenCookie,
  clearTokenCookie,
  blacklistToken,
  isTokenBlacklisted,
  type AuthPayload,
} from './auth';

// Helper function to create mock response
function createMockResponse() {
  const res: any = {
    statusCode: 200,
    jsonData: null,
    cookieData: null,
    clearedCookies: null,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.jsonData = data;
      return this;
    },
    cookie(name: string, value: string, options: unknown) {
      this.cookieData = { name, value, options };
      return this;
    },
    clearCookie(name: string, options: unknown) {
      this.clearedCookies = { name, options };
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
  };
  return res;
}

// Helper function to create mock request
function createMockRequest(options: {
  authorization?: string;
  cookies?: Record<string, string>;
  auth?: AuthPayload;
  params?: Record<string, string>;
} = {}): Request {
  return {
    headers: {
      authorization: options.authorization,
    },
    cookies: options.cookies || {},
    auth: options.auth,
    params: options.params || {},
  } as unknown as Request;
}

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // JWT Token Creation Tests
  // ============================================
  describe('createToken', () => {
    it('should create a token with user payload', () => {
      const payload: AuthPayload = { userId: 'user-123', role: 'arzt' };
      const token = createToken(payload);
      expect(token).toContain('mocked-jwt-token');
      expect(token).toContain('user-123');
      expect(token).toContain('arzt');
    });

    it('should include jti in token payload', () => {
      const payload: AuthPayload = { userId: 'user-123', role: 'arzt' };
      const token = createToken(payload);
      expect(token).toContain('jti');
      expect(token).toContain('mocked-uuid-123');
    });

    it('should create token with sessionId for patients', () => {
      const payload: AuthPayload = { userId: 'patient-123', role: 'patient', sessionId: 'session-456' };
      const token = createToken(payload);
      expect(token).toContain('session-456');
    });

    it('should create token with tenantId', () => {
      const payload: AuthPayload = { userId: 'user-123', role: 'arzt', tenantId: 'tenant-1' };
      const token = createToken(payload);
      expect(token).toContain('tenant-1');
    });
  });

  // ============================================
  // Cookie Tests
  // ============================================
  describe('setTokenCookie', () => {
    it('should set httpOnly cookie with correct options in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const res = createMockResponse();
      setTokenCookie(res, 'test-token');
      
      expect(res.cookieData).toBeDefined();
      expect(res.cookieData?.name).toBe('access_token');
      expect(res.cookieData?.value).toBe('test-token');
      expect(res.cookieData?.options.httpOnly).toBe(true);
      expect(res.cookieData?.options.secure).toBe(false);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should set secure cookie in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const res = createMockResponse();
      setTokenCookie(res, 'test-token');
      
      expect(res.cookieData?.options.secure).toBe(true);
      expect(res.cookieData?.options.sameSite).toBe('strict');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('clearTokenCookie', () => {
    it('should clear access_token cookie', () => {
      const res = createMockResponse();
      clearTokenCookie(res);
      
      expect(res.clearedCookies).toBeDefined();
      expect(res.clearedCookies?.name).toBe('access_token');
    });
  });

  // ============================================
  // Token Blacklist Tests
  // ============================================
  describe('Token Blacklist', () => {
    it('should add token to blacklist', async () => {
      await blacklistToken('jti-123', 3600);
      const isBlacklisted = await isTokenBlacklisted('jti-123');
      expect(isBlacklisted).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      const isBlacklisted = await isTokenBlacklisted('non-blacklisted-jti');
      expect(isBlacklisted).toBe(false);
    });

    it('should handle multiple blacklisted tokens', async () => {
      await blacklistToken('jti-1', 3600);
      await blacklistToken('jti-2', 3600);
      
      expect(await isTokenBlacklisted('jti-1')).toBe(true);
      expect(await isTokenBlacklisted('jti-2')).toBe(true);
      expect(await isTokenBlacklisted('jti-3')).toBe(false);
    });
  });

  // ============================================
  // requireAuth Tests
  // ============================================
  describe('requireAuth', () => {
    it('should authenticate valid Bearer token', async () => {
      const req = createMockRequest({ authorization: 'Bearer valid-token' });
      const res = createMockResponse();
      const next = vi.fn();

      await requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth).toBeDefined();
      expect(req.auth?.userId).toBe('user-123');
      expect(req.auth?.role).toBe('arzt');
    });

    it('should authenticate valid cookie token', async () => {
      const req = createMockRequest({ cookies: { access_token: 'valid-token' } });
      const res = createMockResponse();
      const next = vi.fn();

      await requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth?.userId).toBe('user-123');
    });

    it('should prefer Bearer token over cookie', async () => {
      const req = createMockRequest({
        authorization: 'Bearer valid-token',
        cookies: { access_token: 'cookie-token' },
      });
      const res = createMockResponse();
      const next = vi.fn();

      await requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth?.userId).toBe('user-123');
    });

    it('should reject missing token with 401', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      await requireAuth(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.jsonData).toHaveProperty('error');
    });

    it('should reject invalid Authorization header format', async () => {
      const req = createMockRequest({ authorization: 'InvalidFormat' });
      const res = createMockResponse();
      const next = vi.fn();

      await requireAuth(req, res, next);

      expect(res.statusCode).toBe(401);
    });

    it('should reject expired token with 401', async () => {
      const req = createMockRequest({ authorization: 'Bearer expired-token' });
      const res = createMockResponse();
      const next = vi.fn();

      await requireAuth(req, res, next);

      expect(res.statusCode).toBe(401);
    });

    it('should reject invalid token with 401', async () => {
      const req = createMockRequest({ authorization: 'Bearer invalid-token' });
      const res = createMockResponse();
      const next = vi.fn();

      await requireAuth(req, res, next);

      expect(res.statusCode).toBe(401);
    });

    it('should reject blacklisted token with 401', async () => {
      await blacklistToken('blacklisted-jti', 3600);
      const req = createMockRequest({ authorization: 'Bearer blacklisted-token' });
      const res = createMockResponse();
      const next = vi.fn();

      await requireAuth(req, res, next);

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================
  // requireRole Tests
  // ============================================
  describe('requireRole', () => {
    it('should allow ARZT role for arzt-protected route', () => {
      const middleware = requireRole('arzt');
      const req = createMockRequest({ auth: { userId: 'user-123', role: 'arzt' } });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should allow ADMIN for arzt-protected route', () => {
      const middleware = requireRole('arzt');
      const req = createMockRequest({ auth: { userId: 'user-123', role: 'admin' } });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow MFA role for mfa-protected route', () => {
      const middleware = requireRole('mfa');
      const req = createMockRequest({ auth: { userId: 'user-123', role: 'mfa' } });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow PATIENT role for patient-protected route', () => {
      const middleware = requireRole('patient');
      const req = createMockRequest({ auth: { userId: 'user-123', role: 'patient', sessionId: 'session-456' } });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject patient accessing arzt route', () => {
      const middleware = requireRole('arzt');
      const req = createMockRequest({ auth: { userId: 'user-123', role: 'patient' } });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.statusCode).toBe(403);
    });

    it('should reject mfa accessing admin route', () => {
      const middleware = requireRole('admin');
      const req = createMockRequest({ auth: { userId: 'user-123', role: 'mfa' } });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.statusCode).toBe(403);
    });

    it('should reject when no auth context exists', () => {
      const middleware = requireRole('arzt');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.statusCode).toBe(403);
    });

    it('should support multiple allowed roles', () => {
      const middleware = requireRole('arzt', 'mfa', 'admin');
      const req = createMockRequest({ auth: { userId: 'user-123', role: 'mfa' } });
      const res = createMockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ============================================
  // requireAdmin Tests
  // ============================================
  describe('requireAdmin', () => {
    it('should allow admin access', () => {
      const req = createMockRequest({ auth: { userId: 'user-123', role: 'admin' } });
      const res = createMockResponse();
      const next = vi.fn();

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject non-admin access', () => {
      const req = createMockRequest({ auth: { userId: 'user-123', role: 'arzt' } });
      const res = createMockResponse();
      const next = vi.fn();

      requireAdmin(req, res, next);

      expect(res.statusCode).toBe(403);
    });
  });

  // ============================================
  // requireSessionOwner Tests
  // ============================================
  describe('requireSessionOwner', () => {
    it('should allow patient to access own session', () => {
      const req = createMockRequest({
        auth: { userId: 'patient-123', role: 'patient', sessionId: 'session-456' },
        params: { id: 'session-456' },
      });
      const res = createMockResponse();
      const next = vi.fn();

      requireSessionOwner(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject patient accessing different session', () => {
      const req = createMockRequest({
        auth: { userId: 'patient-123', role: 'patient', sessionId: 'session-456' },
        params: { id: 'different-session' },
      });
      const res = createMockResponse();
      const next = vi.fn();

      requireSessionOwner(req, res, next);

      expect(res.statusCode).toBe(403);
    });

    it('should allow arzt to access any session', () => {
      const req = createMockRequest({
        auth: { userId: 'arzt-123', role: 'arzt' },
        params: { id: 'any-session' },
      });
      const res = createMockResponse();
      const next = vi.fn();

      requireSessionOwner(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow admin to access any session', () => {
      const req = createMockRequest({
        auth: { userId: 'admin-123', role: 'admin' },
        params: { id: 'any-session' },
      });
      const res = createMockResponse();
      const next = vi.fn();

      requireSessionOwner(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject unauthenticated access', () => {
      const req = createMockRequest({ params: { id: 'session-456' } });
      const res = createMockResponse();
      const next = vi.fn();

      requireSessionOwner(req, res, next);

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================
  // requirePermission Tests
  // ============================================
  describe('requirePermission', () => {
    it('should allow admin to bypass permission check', async () => {
      const middleware = requirePermission('some_permission');
      const req = createMockRequest({ auth: { userId: 'admin-123', role: 'admin' } });
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject when no auth context exists', async () => {
      const middleware = requirePermission('some_permission');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.statusCode).toBe(403);
    });

    it('should check role permissions in database', async () => {
      vi.mocked(prisma.rolePermission.findFirst).mockResolvedValue({ id: 'rp-1' } as never);

      const middleware = requirePermission('test_permission');
      const req = createMockRequest({ auth: { userId: 'arzt-123', role: 'arzt' } });
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(prisma.rolePermission.findFirst).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should check custom user permissions when role permission missing', async () => {
      vi.mocked(prisma.rolePermission.findFirst).mockResolvedValue(null);

      const middleware = requirePermission('test_permission');
      const req = createMockRequest({ auth: { userId: 'arzt-123', role: 'arzt' } });
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      // Should check user-specific permissions as fallback
      expect(prisma.rolePermission.findFirst).toHaveBeenCalled();
    });

    it('should reject when permission not found', async () => {
      vi.mocked(prisma.rolePermission.findFirst).mockResolvedValue(null);

      const middleware = requirePermission('test_permission');
      const req = createMockRequest({ auth: { userId: 'arzt-123', role: 'arzt' } });
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.statusCode).toBe(403);
    });

    it('should handle database errors with fail-closed (503)', async () => {
      vi.mocked(prisma.rolePermission.findFirst).mockRejectedValue(new Error('DB Error'));

      const middleware = requirePermission('test_permission');
      const req = createMockRequest({ auth: { userId: 'arzt-123', role: 'arzt' } });
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.statusCode).toBe(503);
    });
  });

  // ============================================
  // requireStrictPermission Tests
  // ============================================
  describe('requireStrictPermission', () => {
    it('should NOT allow admin to bypass strict permission check', async () => {
      const middleware = requireStrictPermission('strict_permission');
      const req = createMockRequest({ auth: { userId: 'admin-123', role: 'admin' } });
      const res = createMockResponse();
      const next = vi.fn();

      vi.mocked(prisma.rolePermission.findFirst).mockResolvedValue(null);
      await middleware(req, res, next);

      // Admin should not bypass strict permission check
      expect(prisma.rolePermission.findFirst).toHaveBeenCalled();
    });
  });
});
