/**
 * @module sessions.test
 * @description Integration Tests für Session Management API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import sessionsRouter from './sessions';

// Mock the middleware
vi.mock('../../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.auth = { userId: 'test-user-123', role: 'patient' };
    next();
  },
}));

// Mock security audit service
vi.mock('../../services/security-audit.service', () => ({
  logSecurityEvent: vi.fn(),
  SecurityEvent: {
    SESSION_TERMINATED: 'SESSION_TERMINATED',
    ALL_SESSIONS_TERMINATED: 'ALL_SESSIONS_TERMINATED',
  },
}));

// Mock refresh token service
vi.mock('../../services/auth/refresh-token.service', () => ({
  revokeRefreshToken: vi.fn(),
}));

// Mock prisma
vi.mock('../../db', () => ({
  prisma: {
    refreshToken: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from '../../db';
import { revokeRefreshToken } from '../../services/auth/refresh-token.service';

const app = express();
app.use(express.json());
app.use('/api/auth/sessions', sessionsRouter);

describe('Session API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/auth/sessions', () => {
    it('should return list of active sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          tokenFamily: 'family-1',
          userId: 'test-user-123',
          userType: 'PATIENT',
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isRevoked: false,
          ipHash: 'abc123',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
          device: {
            id: 'device-1',
            deviceName: 'Chrome on Windows',
            deviceType: 'web',
            isTrusted: true,
          },
        },
      ];

      vi.mocked(prisma.refreshToken.findMany).mockResolvedValue(mockSessions as any);

      const response = await request(app)
        .get('/api/auth/sessions')
        .expect(200);

      expect(response.body.sessions).toHaveLength(1);
      expect(response.body.sessions[0].deviceName).toBe('Chrome on Windows');
      expect(response.body.sessions[0].browser).toBe('Chrome');
    });

    it('should return empty array when no sessions', async () => {
      vi.mocked(prisma.refreshToken.findMany).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/auth/sessions')
        .expect(200);

      expect(response.body.sessions).toEqual([]);
    });
  });

  describe('DELETE /api/auth/sessions/:id', () => {
    it('should terminate specific session', async () => {
      vi.mocked(prisma.refreshToken.findFirst).mockResolvedValue({
        id: 'session-1',
        userId: 'test-user-123',
        userType: 'PATIENT',
        tokenHash: 'token-hash-123',
      } as any);

      vi.mocked(revokeRefreshToken).mockResolvedValue(true);
      vi.mocked(prisma.refreshToken.update).mockResolvedValue({} as any);

      const response = await request(app)
        .delete('/api/auth/sessions/session-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(revokeRefreshToken).toHaveBeenCalledWith('token-hash-123', 'USER_TERMINATED');
    });

    it('should return 404 for non-existent session', async () => {
      vi.mocked(prisma.refreshToken.findFirst).mockResolvedValue(null);

      await request(app)
        .delete('/api/auth/sessions/non-existent')
        .expect(404);
    });
  });

  describe('DELETE /api/auth/sessions/all', () => {
    it('should terminate all other sessions', async () => {
      // Note: Die Route /all muss VOR /:id definiert sein, sonst wird "all" als ID interpretiert
      // Da die Route-Reihenfolge im Router /all vor /:id ist, sollte es funktionieren
      // Wir testen hier direkt gegen den Router mit einem speziellen Setup
      
      const testApp = express();
      testApp.use(express.json());
      
      // Mock auth für diesen spezifischen Test
      testApp.use((req, res, next) => {
        (req as any).auth = { userId: 'test-user-123', role: 'patient' };
        next();
      });
      
      testApp.use('/api/auth/sessions', sessionsRouter);
      
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 3 } as any);

      const response = await request(testApp)
        .delete('/api/auth/sessions/all')
        .expect(200);

      expect(response.body.terminatedCount).toBe(3);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/sessions/activity', () => {
    it('should return activity log', async () => {
      const mockTokens = [
        {
          id: 'session-1',
          userId: 'test-user-123',
          userType: 'PATIENT',
          issuedAt: new Date(),
          isRevoked: false,
          ipHash: 'abc123',
          userAgent: 'Chrome/91.0',
          device: { deviceName: 'Chrome' },
        },
        {
          id: 'session-2',
          userId: 'test-user-123',
          userType: 'PATIENT',
          issuedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          isRevoked: true,
          revokedReason: 'USER_TERMINATED',
          ipHash: 'def456',
          userAgent: 'Firefox/89.0',
          device: { deviceName: 'Firefox' },
        },
      ];

      vi.mocked(prisma.refreshToken.findMany).mockResolvedValue(mockTokens as any);

      const response = await request(app)
        .get('/api/auth/sessions/activity')
        .expect(200);

      expect(response.body.activity).toHaveLength(2);
      expect(response.body.activity[0].action).toBe('LOGIN');
      expect(response.body.activity[1].action).toBe('LOGOUT');
    });
  });
});
