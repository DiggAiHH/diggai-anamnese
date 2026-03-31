import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = vi.hoisted(() => ({
  keyRecord: null as null | Record<string, unknown>,
  linkRecord: null as null | Record<string, unknown>,
}));

const prismaMock = vi.hoisted(() => ({
  practiceEncryptionKey: {
    findFirst: vi.fn(async (args?: { where?: { kid?: string } }) => {
      if (!dbState.keyRecord) return null;
      if (args?.where?.kid && dbState.keyRecord.kid !== args.where.kid) {
        return null;
      }
      return dbState.keyRecord;
    }),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      dbState.keyRecord = {
        id: 'key-1',
        createdAt: new Date('2026-03-31T10:00:00.000Z'),
        updatedAt: new Date('2026-03-31T10:00:00.000Z'),
        ...data,
      };
      return dbState.keyRecord;
    }),
  },
  secureExportLink: {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      dbState.linkRecord = {
        id: 'link-1',
        createdAt: new Date('2026-03-31T10:00:00.000Z'),
        ...data,
      };
      return dbState.linkRecord;
    }),
    findUnique: vi.fn(async () => dbState.linkRecord),
    updateMany: vi.fn(async () => ({ count: 1 })),
  },
}));

vi.mock('../../db', () => ({
  prisma: prismaMock,
}));

vi.mock('../../config', () => ({
  config: {
    encryptionKey: '0123456789abcdef0123456789abcdef',
  },
}));

vi.mock('../encryption', () => ({
  encryptVersioned: vi.fn((plaintext: string) => ({ ciphertext: `enc::${plaintext}`, version: 1 })),
  decryptVersioned: vi.fn((ciphertext: string) => ciphertext.replace(/^enc::/, '')),
  hashEmail: vi.fn((email: string) => `hash:${email}`),
}));

import {
  PackageError,
  consumeSecureExportLink,
  createEncryptedPackage,
  createSecureExportLink,
  decryptEncryptedPackage,
} from './package.service';

describe('package service', () => {
  beforeEach(() => {
    dbState.keyRecord = null;
    dbState.linkRecord = null;
    vi.clearAllMocks();
  });

  it('creates and decrypts a secure package roundtrip', async () => {
    const exportData = {
      sessionId: 'session-1',
      tenantId: 'tenant-a',
      patientName: 'Max Mustermann',
      patientEmail: 'max@example.com',
      patient: {
        name: 'Max Mustermann',
        gender: 'M',
        birthDate: new Date('1990-01-01T00:00:00.000Z'),
        insuranceType: 'GKV',
      },
      service: 'Termin / Anamnese',
      status: 'COMPLETED',
      createdAt: new Date('2026-03-31T09:00:00.000Z'),
      completedAt: new Date('2026-03-31T09:20:00.000Z'),
      answers: [{
        atomId: '1000',
        questionText: 'Beschwerden',
        section: 'beschwerden',
        rawValue: 'Kopfschmerzen',
        displayValue: 'Kopfschmerzen',
        answeredAt: new Date('2026-03-31T09:05:00.000Z'),
      }],
      triageEvents: [{
        level: 'WARNING',
        atomId: '1000',
        message: 'Kontrolle empfohlen',
        createdAt: new Date('2026-03-31T09:06:00.000Z'),
      }],
    };

    const created = await createEncryptedPackage(exportData);
    const decrypted = await decryptEncryptedPackage(created.package, 'tenant-a');

    expect(created.package.version).toBe('anamnese-package-v1');
    expect(created.package.alg).toBe('RSA-OAEP-256');
    expect(created.package.enc).toBe('A256GCM');
    expect(decrypted.payload.sessionId).toBe('session-1');
    expect(decrypted.payload.patient.name).toBe('Max Mustermann');
    expect(decrypted.payload.answers[0]?.displayValue).toBe('Kopfschmerzen');
  });

  it('rejects tampered checksum', async () => {
    const exportData = {
      sessionId: 'session-1',
      tenantId: 'tenant-a',
      patientName: 'Max Mustermann',
      patientEmail: null,
      patient: {
        name: 'Max Mustermann',
        gender: 'M',
        birthDate: null,
        insuranceType: null,
      },
      service: 'Termin / Anamnese',
      status: 'COMPLETED',
      createdAt: new Date('2026-03-31T09:00:00.000Z'),
      completedAt: null,
      answers: [],
      triageEvents: [],
    };

    const created = await createEncryptedPackage(exportData);
    const tampered = {
      ...created.package,
      checksum: '0'.repeat(64),
    };

    await expect(decryptEncryptedPackage(tampered, 'tenant-a')).rejects.toMatchObject({
      code: 'PACKAGE_CHECKSUM_INVALID',
    });
  });

  it('creates one-time links with hashed email storage', async () => {
    const result = await createSecureExportLink({
      tenantId: 'tenant-a',
      sessionId: 'session-1',
      recipientEmail: 'patient@example.com',
    });

    expect(result.token).toBeTruthy();
    expect(result.packageId).toBeTruthy();
    expect(prismaMock.secureExportLink.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        recipientEmailHash: 'hash:patient@example.com',
      }),
    }));
  });

  it('rejects already used links', async () => {
    dbState.linkRecord = {
      id: 'link-1',
      tenantId: 'tenant-a',
      sessionId: 'session-1',
      packageId: 'package-1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
    };

    await expect(consumeSecureExportLink('plain-token')).rejects.toMatchObject({
      code: 'PACKAGE_LINK_ALREADY_USED',
    });
  });
});
