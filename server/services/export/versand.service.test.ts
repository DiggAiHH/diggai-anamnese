import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  patientSession: {
    findUnique: vi.fn(),
  },
  anliegenTracking: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

const loggerMock = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../db', () => ({
  prisma: prismaMock,
}));

vi.mock('../../logger', () => ({
  createLogger: vi.fn(() => loggerMock),
}));

import {
  markVersandReadByMfa,
  processVersand,
  updateVersandStatus,
} from './versand.service';

function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    tenantId: 'tenant-a',
    pvsExportRef: 'pvs-ref-1',
    triageEvents: [],
    ...overrides,
  };
}

function buildTracking(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tracking-1',
    sessionId: 'session-1',
    status: 'VERSCHLUESSELT_VERSENDET',
    readByMfaId: null,
    readByArztId: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('versand service', () => {
  it('throws when the session does not exist', async () => {
    vi.mocked(prismaMock.patientSession.findUnique).mockResolvedValue(null as never);

    await expect(processVersand('missing-session', ['EMAIL'])).rejects.toThrow('Session not found');
  });

  it('dispatches channels and escalates priority for CRITICAL triage', async () => {
    vi.mocked(prismaMock.patientSession.findUnique).mockResolvedValue(
      buildSession({ triageEvents: [{ level: 'CRITICAL' }] }) as never,
    );
    vi.mocked(prismaMock.anliegenTracking.findFirst)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValue(buildTracking() as never);
    vi.mocked(prismaMock.anliegenTracking.create).mockResolvedValue(buildTracking() as never);
    vi.mocked(prismaMock.anliegenTracking.update).mockResolvedValue(
      buildTracking({ status: 'ZUGESTELLT' }) as never,
    );
    vi.mocked(prismaMock.auditLog.create).mockResolvedValue({} as never);

    const result = await processVersand('session-1', ['email', 'PVS']);

    expect(result.priority).toBe('EMERGENCY');
    expect(result.status).toBe('ZUGESTELLT');
    expect(result.channelResults).toHaveLength(2);
    expect(result.channelResults.every((entry) => entry.success)).toBe(true);

    expect(prismaMock.anliegenTracking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ZUGESTELLT' }),
      }),
    );
  });

  it('rejects invalid backward status transitions', async () => {
    vi.mocked(prismaMock.patientSession.findUnique).mockResolvedValue(buildSession() as never);
    vi.mocked(prismaMock.anliegenTracking.findFirst).mockResolvedValue(
      buildTracking({ status: 'GELESEN' }) as never,
    );

    await expect(updateVersandStatus('session-1', 'VERARBEITET')).rejects.toThrow(
      'Invalid status transition: GELESEN -> VERARBEITET',
    );

    expect(prismaMock.anliegenTracking.update).not.toHaveBeenCalled();
  });

  it('marks tracking as read by MFA', async () => {
    vi.mocked(prismaMock.patientSession.findUnique).mockResolvedValue(buildSession() as never);
    vi.mocked(prismaMock.anliegenTracking.findFirst).mockResolvedValue(
      buildTracking({ status: 'VERARBEITET' }) as never,
    );
    vi.mocked(prismaMock.anliegenTracking.update).mockResolvedValue(
      buildTracking({ status: 'GELESEN', readByMfaId: 'mfa-1' }) as never,
    );
    vi.mocked(prismaMock.auditLog.create).mockResolvedValue({} as never);

    await markVersandReadByMfa('session-1', 'mfa-1');

    expect(prismaMock.anliegenTracking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'GELESEN',
          readByMfaId: 'mfa-1',
        }),
      }),
    );
  });
});
