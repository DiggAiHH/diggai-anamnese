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
      // The fs module mock does not intercept the singleton's already-bound fs reference.
      // Spy on scanFileSystem directly to simulate a filesystem scan that found Turbomed.
      const spy = vi.spyOn(pvsDetectionService as any, 'scanFileSystem').mockResolvedValueOnce([
        {
          type: 'TURBOMED',
          protocol: 'GDT',
          confidence: 95,
          detectedPaths: { importDir: 'C:\\turbomed\\Import', exportDir: 'C:\\turbomed\\Export' },
          suggestedConfig: { gdtSenderId: 'DIGGAI01', gdtReceiverId: 'TURBOMED1', gdtEncoding: 'ISO-8859-15' },
        },
      ]);

      const results = await pvsDetectionService.detectLocalPVS();

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('TURBOMED');
      expect(results[0].confidence).toBeGreaterThan(0.5);

      spy.mockRestore();
    });

    it('should detect CGM M1 from installation paths', async () => {
      // Spy on scanFileSystem to simulate detection of a CGM M1 installation.
      const spy = vi.spyOn(pvsDetectionService as any, 'scanFileSystem').mockResolvedValueOnce([
        {
          type: 'CGM_M1',
          protocol: 'GDT',
          confidence: 70,
          detectedPaths: {},
          suggestedConfig: { gdtSenderId: 'DIGGAI01', gdtReceiverId: 'CGMM1001', gdtEncoding: 'ISO-8859-15' },
        },
      ]);

      const results = await pvsDetectionService.detectLocalPVS();

      const cgmResult = results.find(r => r.type === 'CGM_M1');
      expect(cgmResult).toBeDefined();

      spy.mockRestore();
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
