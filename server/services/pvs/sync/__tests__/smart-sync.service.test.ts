import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { smartSyncService } from '../smart-sync.service.js';
import type { PvsConnectionData } from '../../types.js';

vi.mock('../../pvs-router.service.js', () => ({
  pvsRouter: {
    exportAnamnese: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('SmartSyncService', () => {
  const mockConnection: PvsConnectionData = {
    id: 'test-conn',
    praxisId: 'praxis-1',
    pvsType: 'TURBOMED',
    protocol: 'GDT',
    isActive: true,
    syncIntervalSec: 30,
    retryCount: 3,
    autoMapFields: true,
    gdtImportDir: '/tmp/gdt/in',
    gdtExportDir: '/tmp/gdt/out',
  };

  beforeEach(() => {
    // Reset internal state
    (smartSyncService as any).watchers.clear();
    (smartSyncService as any).syncStats.clear();
  });

  afterEach(async () => {
    await smartSyncService.shutdown();
  });

  describe('startWatching', () => {
    it('should start polling for GDT connections', async () => {
      await smartSyncService.startWatching(mockConnection);
      
      const stats = smartSyncService.getStats(mockConnection.id);
      expect(stats).toBeDefined();
      expect(stats?.totalTransfers).toBe(0);
    });

    it('should ignore non-GDT connections', async () => {
      const fhirConnection = { ...mockConnection, protocol: 'FHIR' as const };
      await smartSyncService.startWatching(fhirConnection);
      
      const stats = smartSyncService.getStats(fhirConnection.id);
      expect(stats).toBeUndefined();
    });
  });

  describe('smartExport', () => {
    it('should retry on failure', async () => {
      const { pvsRouter } = await import('../../pvs-router.service.js');
      vi.mocked(pvsRouter.exportAnamnese)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ success: true } as any);

      const mockSession = {
        id: 'session-1',
        patientId: 'patient-1',
        answers: [],
      } as any;

      const result = await smartSyncService.smartExport(mockConnection, mockSession, 3);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });

    it('should return failure after all retries exhausted', async () => {
      const { pvsRouter } = await import('../../pvs-router.service.js');
      vi.mocked(pvsRouter.exportAnamnese).mockRejectedValue(new Error('Persistent error'));

      const mockSession = {
        id: 'session-1',
        patientId: 'patient-1',
        answers: [],
      } as any;

      const result = await smartSyncService.smartExport(mockConnection, mockSession, 2);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return undefined for unknown connections', () => {
      const stats = smartSyncService.getStats('unknown-id');
      expect(stats).toBeUndefined();
    });
  });

  describe('stopWatching', () => {
    it('should stop polling', async () => {
      await smartSyncService.startWatching(mockConnection);
      smartSyncService.stopWatching(mockConnection.id);
      
      // Should not throw
      expect(() => smartSyncService.stopWatching(mockConnection.id)).not.toThrow();
    });
  });
});
