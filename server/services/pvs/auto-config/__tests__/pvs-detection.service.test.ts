import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pvsDetectionService } from '../pvs-detection.service.js';
import * as fs from 'fs';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      access: vi.fn(),
      readdir: vi.fn(),
      readFile: vi.fn(),
    },
  };
});

describe('PvsDetectionService', () => {
  beforeEach(() => {
    pvsDetectionService.clearResults();
  });

  describe('detectLocalPVS', () => {
    it('should detect Turbomed from GDT directories', async () => {
      const mockReaddir = vi.mocked(fs.promises.readdir);
      mockReaddir.mockResolvedValueOnce(['turbomed.gdt', 'test.dat'] as any);

      const results = await pvsDetectionService.detectLocalPVS();

      expect(results).toHaveLength(1);
      expect((results[0] as any).pvsType ?? results[0].type).toBe('TURBOMED');
      expect(results[0].confidence).toBeGreaterThan(0.5);
    });

    it('should detect CGM M1 from installation paths', async () => {
      const mockAccess = vi.mocked(fs.promises.access);
      mockAccess.mockResolvedValueOnce(undefined);

      const results = await pvsDetectionService.detectLocalPVS();

      const cgmResult = results.find(r => (r as any).pvsType === 'CGM_M1' || r.type === 'CGM_M1');
      expect(cgmResult).toBeDefined();
    });

    it('should handle file system errors gracefully', async () => {
      const mockReaddir = vi.mocked(fs.promises.readdir);
      mockReaddir.mockRejectedValue(new Error('Permission denied'));

      const results = await pvsDetectionService.detectLocalPVS();

      expect(results).toEqual([]);
    });
  });

  describe('detectNetworkPVS', () => {
    it('should return empty for file-based PVS', async () => {
      const results = await pvsDetectionService.detectNetworkPVS();
      expect(results).toEqual([]);
    });
  });

  describe('getLastResults', () => {
    it('should return cached results', async () => {
      await pvsDetectionService.detectLocalPVS();
      const cached = pvsDetectionService.getLastResults();
      expect(cached).toBeDefined();
    });
  });
});
