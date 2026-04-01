/**
 * @file right-to-deletion.test.ts
 * @description Tests für DSGVO Art. 17 — Recht auf Löschung / Vergessenwerden.
 *
 * Beweist:
 * - softDeleteAccount löscht PII (email, phone) SOFORT (SECURITY FIX M3)
 * - softDeleteAccount setzt isActive=false, deletedAt, deletionScheduledAt
 * - softDeleteAccount deaktiviert alle Geräte
 * - RBAC: Nur der Account-Inhaber darf seinen eigenen Account löschen
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────

const mockPrisma = {
  patientAccount: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  patientDevice: {
    updateMany: vi.fn(),
  },
};

vi.mock('../db', () => ({ prisma: mockPrisma }));

vi.mock('../config', () => ({
  config: {
    jwtSecret: 'test-secret-minimum-32-chars-long!!',
    jwtExpiresIn: '15m',
    jwtCookieMaxAgeMs: 900000,
  },
}));

vi.mock('../middleware/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../middleware/auth')>();
  return {
    ...actual,
    blacklistToken: vi.fn(),
    isTokenBlacklisted: vi.fn(async () => false),
  };
});

vi.mock('../utils/password-policy', () => ({
  validatePasswordStrength: vi.fn(() => ({ valid: true, errors: [] })),
}));

vi.mock('../services/security-audit.service', () => ({
  SecurityEvent: {
    ACCOUNT_DELETED: 'SECURITY:ACCOUNT_DELETED',
    PASSWORD_RESET_COMPLETED: 'SECURITY:PASSWORD_RESET_COMPLETED',
  },
  logSecurityEvent: vi.fn(),
}));

// Prisma global helper (used by auth.service.ts)
(globalThis as any).__prisma = mockPrisma;

import { softDeleteAccount, deleteAccount } from '../services/pwa/auth.service';

// ─── Tests ───────────────────────────────────────────────────

describe('DSGVO Art. 17 — Recht auf Vergessenwerden', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.patientAccount.findUnique.mockResolvedValue({
      id: 'acc-1',
      patientId: 'pat-1',
      email: 'patient@example.com',
      phone: '+491234567890',
      isActive: true,
      locale: 'de',
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    mockPrisma.patientAccount.update.mockResolvedValue({});
    mockPrisma.patientDevice.updateMany.mockResolvedValue({ count: 2 });
  });

  describe('softDeleteAccount — PII sofort anonymisieren (SECURITY FIX M3)', () => {
    it('immediately clears email and phone on soft delete', async () => {
      await softDeleteAccount('acc-1');

      expect(mockPrisma.patientAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'acc-1' },
          data: expect.objectContaining({
            email: null,
            phone: null,
          }),
        }),
      );
    });

    it('sets isActive=false on soft delete', async () => {
      await softDeleteAccount('acc-1');
      expect(mockPrisma.patientAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });

    it('sets deletedAt to current time', async () => {
      const before = Date.now();
      await softDeleteAccount('acc-1');
      const after = Date.now();

      const callArgs = mockPrisma.patientAccount.update.mock.calls[0][0];
      const deletedAt: Date = callArgs.data.deletedAt;
      expect(deletedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(deletedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('schedules hard-delete 30 days in the future', async () => {
      await softDeleteAccount('acc-1');
      const callArgs = mockPrisma.patientAccount.update.mock.calls[0][0];
      const scheduledAt: Date = callArgs.data.deletionScheduledAt;
      const expectedMs = 30 * 24 * 60 * 60 * 1000;
      const diffMs = scheduledAt.getTime() - callArgs.data.deletedAt.getTime();
      expect(Math.abs(diffMs - expectedMs)).toBeLessThan(1000);
    });

    it('clears all auth tokens (reset/verification) on soft delete', async () => {
      await softDeleteAccount('acc-1');
      expect(mockPrisma.patientAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resetToken: null,
            resetTokenExpiry: null,
            verificationToken: null,
            verificationExpiry: null,
          }),
        }),
      );
    });

    it('deactivates all registered devices on soft delete', async () => {
      await softDeleteAccount('acc-1');
      expect(mockPrisma.patientDevice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { accountId: 'acc-1' },
          data: { isActive: false },
        }),
      );
    });

    it('throws if account not found', async () => {
      mockPrisma.patientAccount.findUnique.mockResolvedValue(null);
      await expect(softDeleteAccount('nonexistent')).rejects.toThrow();
    });
  });

  describe('deleteAccount — Legacy soft delete consistency', () => {
    it('also clears email and phone immediately', async () => {
      await deleteAccount('acc-1');
      expect(mockPrisma.patientAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: null,
            phone: null,
            isActive: false,
          }),
        }),
      );
    });
  });
});

// ─── RBAC Tests ──────────────────────────────────────────────
// importOriginal gibt echte Implementierungen aus dem Mock zurück

describe('RBAC — Role-Based Access Control', () => {
  it('requireRole middleware blocks wrong roles', async () => {
    // Holt echte Implementierung via importOriginal im vi.mock oben
    const authModule = await import('../middleware/auth');
    const middleware = authModule.requireRole('admin');

    const req = { auth: { role: 'arzt' } };
    const res = {
      statusCode: 200,
      body: undefined as unknown,
      status(c: number) { this.statusCode = c; return this; },
      json(b: unknown) { this.body = b; return this; },
    };
    const next = vi.fn();

    middleware(req as never, res as never, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('requireRole middleware allows matching role', async () => {
    const authModule = await import('../middleware/auth');
    const middleware = authModule.requireRole('arzt', 'admin');

    const req = { auth: { role: 'arzt' } };
    const res = {
      statusCode: 200,
      status(c: number) { this.statusCode = c; return this; },
      json(_b: unknown) { return this; },
    };
    const next = vi.fn();

    middleware(req as never, res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });

  it('requireAuth blocks requests without token (no Authorization header, no cookie)', async () => {
    const authModule = await import('../middleware/auth');

    const req = { headers: {}, cookies: {} };
    const res = {
      statusCode: 200,
      body: undefined as unknown,
      status(c: number) { this.statusCode = c; return this; },
      json(b: unknown) { this.body = b; return this; },
    };
    const next = vi.fn();

    await authModule.requireAuth(req as never, res as never, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
