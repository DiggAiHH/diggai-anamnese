import { beforeEach, describe, expect, it, vi } from 'vitest';

const bcryptMocks = vi.hoisted(() => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

vi.mock('bcryptjs', () => bcryptMocks);

vi.mock('../../i18n', () => ({
  t: vi.fn((_lang: string, key: string) => key),
  LocalizedError: class LocalizedError extends Error {
    constructor(public errorKey: string) {
      super(errorKey);
      this.name = 'LocalizedError';
    }
  },
}));

vi.mock('../../config', () => ({
  config: {
    jwtSecret: '12345678901234567890123456789012',
    jwtExpiresIn: '15m',
    jwtCookieMaxAgeMs: 15 * 60 * 1000,
  },
}));

vi.mock('../../middleware/auth', () => ({
  blacklistToken: vi.fn(),
  isTokenBlacklisted: vi.fn(),
}));

vi.mock('../../utils/password-policy', () => ({
  validatePasswordStrength: vi.fn(() => ({ valid: true, errors: [] })),
}));

vi.mock('../security-audit.service', () => ({
  SecurityEvent: {},
  logSecurityEvent: vi.fn(),
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'jwt-token'),
    decode: vi.fn(() => ({ exp: Math.floor(Date.now() / 1000) + 900 })),
    verify: vi.fn(),
  },
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn(),
    })),
  },
}));

import { loginPatient } from './auth.service';

describe('pwa auth.service loginPatient', () => {
  const patientAccountFindFirst = vi.fn();
  const patientAccountUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    bcryptMocks.compare.mockResolvedValue(true);
    patientAccountFindFirst.mockResolvedValue({
      id: 'account-1',
      patientId: 'patient-1',
      email: 'bestehend@example.com',
      phone: null,
      passwordHash: 'hashed-password',
      isActive: true,
      isVerified: true,
      verifiedAt: null,
      lastLoginAt: null,
      loginCount: 0,
      locale: 'de',
      notifyEmail: true,
      notifyPush: false,
      notifySms: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    patientAccountUpdate.mockResolvedValue(undefined);

    (globalThis as any).__prisma = {
      patientAccount: {
        findFirst: patientAccountFindFirst,
        update: patientAccountUpdate,
      },
    };
  });

  it('looks up active accounts by patient number as well as email and phone', async () => {
    const result = await loginPatient({
      identifier: 'P-001',
      password: 'SecurePass1234',
    });

    expect(patientAccountFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { email: 'P-001' },
          { phone: 'P-001' },
          { patient: { patientNumber: 'P-001' } },
        ],
        isActive: true,
      },
    });
    expect(patientAccountUpdate).toHaveBeenCalledWith({
      where: { id: 'account-1' },
      data: {
        lastLoginAt: expect.any(Date),
        loginCount: { increment: 1 },
      },
    });
    expect(result.token).toBe('jwt-token');
    expect(result.account.id).toBe('account-1');
  });

  it('returns the same generic error when the password is invalid', async () => {
    bcryptMocks.compare.mockResolvedValue(false);

    await expect(
      loginPatient({
        identifier: 'P-001',
        password: 'WrongPassword1234',
      }),
    ).rejects.toMatchObject({ errorKey: 'errors.auth.invalid_credentials' });
  });
});
