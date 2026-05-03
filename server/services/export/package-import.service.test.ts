import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  packageImportLog: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  patientSession: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  patient: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  answer: {
    createMany: vi.fn(),
  },
  triageEvent: {
    createMany: vi.fn(),
  },
}));

vi.mock('../../db', () => ({
  prisma: prismaMock,
}));

vi.mock('../encryption', () => ({
  encrypt: vi.fn((value: string) => `enc(${value})`),
  hashEmail: vi.fn((value: string) => `hash(${value})`),
  isPIIAtom: vi.fn((atomId: string) => atomId === '3003'),
}));

vi.mock('../episode.service', () => ({
  ensureSessionStoredInEpisode: vi.fn(async () => 'episode-1'),
}));

import { importEncryptedPackagePayload } from './package-import.service';

describe('package import service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns already_imported when package log already exists', async () => {
    vi.mocked(prismaMock.packageImportLog.findUnique).mockResolvedValue({
      sessionId: 'session-1',
    } as never);

    const result = await importEncryptedPackagePayload({
      tenantId: 'tenant-a',
      checksum: 'a'.repeat(64),
      payload: {
        packageId: 'package-1',
        tenantId: 'tenant-a',
        sessionId: 'session-1',
        exportedAt: new Date().toISOString(),
        patient: { name: 'Max', gender: 'M', birthDate: null, insuranceType: null, email: null },
        service: 'Termin',
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        completedAt: null,
        answers: [],
        triageEvents: [],
      },
    });

    expect(result.status).toBe('already_imported');
    expect(result.sessionId).toBe('session-1');
    expect(prismaMock.patientSession.create).not.toHaveBeenCalled();
  });

  it('imports a fresh payload and encrypts pii answers', async () => {
    vi.mocked(prismaMock.packageImportLog.findUnique).mockResolvedValue(null as never);
    vi.mocked(prismaMock.patientSession.findUnique).mockResolvedValue(null as never);
    vi.mocked(prismaMock.patient.findFirst).mockResolvedValue(null as never);
    vi.mocked(prismaMock.patient.create).mockResolvedValue({ id: 'patient-1' } as never);
    vi.mocked(prismaMock.patientSession.create).mockResolvedValue({ id: 'session-1' } as never);
    vi.mocked(prismaMock.answer.createMany).mockResolvedValue({ count: 2 } as never);
    vi.mocked(prismaMock.triageEvent.createMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prismaMock.packageImportLog.create).mockResolvedValue({ id: 'log-1' } as never);

    const result = await importEncryptedPackagePayload({
      tenantId: 'tenant-a',
      checksum: 'b'.repeat(64),
      importedByUserId: 'mfa-1',
      sourceFilename: 'patient.secure.json',
      payload: {
        packageId: 'package-1',
        tenantId: 'tenant-a',
        sessionId: 'session-1',
        exportedAt: new Date().toISOString(),
        patient: {
          name: 'Max Mustermann',
          gender: 'M',
          birthDate: new Date('1990-01-01T00:00:00.000Z').toISOString(),
          insuranceType: 'GKV',
          email: 'patient@example.com',
        },
        service: 'Termin / Anamnese',
        status: 'COMPLETED',
        createdAt: new Date('2026-03-31T09:00:00.000Z').toISOString(),
        completedAt: new Date('2026-03-31T09:15:00.000Z').toISOString(),
        answers: [
          {
            atomId: '3003',
            questionText: 'E-Mail',
            section: 'kontakt',
            value: 'patient@example.com',
            displayValue: 'patient@example.com',
            answeredAt: new Date('2026-03-31T09:05:00.000Z').toISOString(),
          },
          {
            atomId: '1000',
            questionText: 'Beschwerden',
            section: 'beschwerden',
            value: 'Kopfschmerzen',
            displayValue: 'Kopfschmerzen',
            answeredAt: new Date('2026-03-31T09:06:00.000Z').toISOString(),
          },
        ],
        triageEvents: [
          {
            level: 'WARNING',
            atomId: '1000',
            message: 'Kontrolle empfohlen',
            createdAt: new Date('2026-03-31T09:07:00.000Z').toISOString(),
          },
        ],
      },
    });

    expect(result.status).toBe('imported');
    expect(prismaMock.patient.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        hashedEmail: 'hash(patient@example.com)',
      }),
    }));
    expect(prismaMock.answer.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({
          atomId: '3003',
          encryptedValue: 'enc(patient@example.com)',
        }),
      ]),
    }));
    expect(prismaMock.packageImportLog.create).toHaveBeenCalled();
  });
});

