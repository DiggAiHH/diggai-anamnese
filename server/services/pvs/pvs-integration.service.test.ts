import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { serializeStoredFhirCredentials } from './security/credentials-parser';

const dbMocks = vi.hoisted(() => ({
  tenantFindUnique: vi.fn(),
  connectionCreate: vi.fn(),
  connectionFindUnique: vi.fn(),
  connectionUpdate: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  getPrismaClientForDomain: vi.fn(() => ({
    tenant: {
      findUnique: dbMocks.tenantFindUnique,
    },
    pvsConnection: {
      create: dbMocks.connectionCreate,
      findUnique: dbMocks.connectionFindUnique,
      update: dbMocks.connectionUpdate,
    },
    auditLog: {
      create: dbMocks.auditCreate,
    },
  })),
}));

import { PVSIntegrationService } from './pvs-integration.service';

describe('PVSIntegrationService credential hardening', () => {
  const pvsKey = '12345678901234567890123456789012';
  const originalPvsKey = process.env.PVS_ENCRYPTION_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PVS_ENCRYPTION_KEY = pvsKey;
    dbMocks.connectionUpdate.mockResolvedValue({});
    dbMocks.auditCreate.mockResolvedValue({ id: 'audit-1' });
  });

  afterEach(() => {
    if (originalPvsKey === undefined) {
      delete process.env.PVS_ENCRYPTION_KEY;
      return;
    }

    process.env.PVS_ENCRYPTION_KEY = originalPvsKey;
  });

  it('stores encrypted credentials during connection creation', async () => {
    const service = new PVSIntegrationService();

    dbMocks.connectionCreate.mockImplementationOnce(async ({ data }: { data: any }) => ({
      id: 'conn-create-1',
      praxisId: data.praxisId,
      pvsType: data.pvsType,
      isActive: data.isActive,
      fhirCredentials: data.fhirCredentials,
      customMappings: data.customMappings,
      lastSyncAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }));

    const result = await service.createConnection(
      'tenant-1',
      't2med',
      { apiKey: 'api-secret-key' },
      { autoExport: true, exportFormat: 'json', defaultMandant: 'haupt' },
    );

    const createArgs = dbMocks.connectionCreate.mock.calls[0][0] as {
      data: {
        fhirCredentials: string;
      };
    };

    expect(createArgs.data.fhirCredentials).not.toContain('api-secret-key');
    expect(JSON.parse(createArgs.data.fhirCredentials)).toMatchObject({
      version: 1,
    });

    expect(result.credentials.apiKey).toBe('api-secret-key');
    expect(result.settings.exportFormat).toBe('json');
  });

  it('decrypts stored credentials before export calls', async () => {
    const service = new PVSIntegrationService();
    const sendSpy = vi.spyOn(service as any, 'sendToPVS').mockResolvedValue({ success: true });

    dbMocks.connectionFindUnique.mockResolvedValueOnce({
      id: 'conn-export-1',
      praxisId: 'tenant-2',
      pvsType: 'tobit',
      fhirCredentials: serializeStoredFhirCredentials({ apiKey: 'export-secret' }),
      isActive: true,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    const result = await service.exportAnamnese('conn-export-1', 'patient-123', {
      patientId: 'patient-123',
      answers: { q1: 'yes' },
    });

    expect(result.success).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1);

    const sendArgs = sendSpy.mock.calls[0] as [any, { apiKey?: string }, any];
    expect(sendArgs[1].apiKey).toBe('export-secret');
    expect(dbMocks.auditCreate).toHaveBeenCalledTimes(1);
    expect(dbMocks.connectionUpdate).toHaveBeenCalledWith({
      where: { id: 'conn-export-1' },
      data: { lastSyncAt: expect.any(Date) },
    });
  });

  it('decrypts stored credentials before import routing', async () => {
    const service = new PVSIntegrationService();
    const importSpy = vi
      .spyOn(service as any, 'importFromMedatixx')
      .mockResolvedValue([{ id: 'patient-import-1' }]);

    dbMocks.connectionFindUnique.mockResolvedValueOnce({
      id: 'conn-import-1',
      praxisId: 'tenant-3',
      pvsType: 'medatixx',
      fhirCredentials: serializeStoredFhirCredentials({
        clientId: 'medatixx-client',
        clientSecret: 'medatixx-secret',
      }),
      isActive: true,
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
    });

    const result = await service.importPatients('conn-import-1', { limit: 25 });

    expect(result).toEqual([{ id: 'patient-import-1' }]);
    expect(importSpy).toHaveBeenCalledTimes(1);

    const importArgs = importSpy.mock.calls[0] as [
      { type: string },
      { clientId?: string; clientSecret?: string },
      { limit: number },
    ];

    expect(importArgs[0].type).toBe('medatixx');
    expect(importArgs[1].clientId).toBe('medatixx-client');
    expect(importArgs[1].clientSecret).toBe('medatixx-secret');
    expect(importArgs[2]).toEqual({ limit: 25 });
  });
});
