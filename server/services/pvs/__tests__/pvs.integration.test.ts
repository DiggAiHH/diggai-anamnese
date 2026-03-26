// ============================================
// PVS Integration Tests — End-to-End
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pvsRouter } from '../pvs-router.service.js';
import type { PvsConnectionData, PatientSessionFull } from '../types.js';

// Mock all adapters
vi.mock('../adapters/cgm-m1.adapter.js');
vi.mock('../adapters/fhir-generic.adapter.js');
vi.mock('../adapters/turbomed.adapter.js');
vi.mock('../adapters/tomedo.adapter.js');

describe('PVS Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Adapter Registration', () => {
    it('should have all 10 PVS types registered', () => {
      const expectedTypes = [
        'CGM_M1', 'MEDATIXX', 'MEDISTAR', 'T2MED', 'X_ISYNET',
        'DOCTOLIB', 'TURBOMED', 'FHIR_GENERIC', 'ALBIS', 'TOMEDO'
      ];

      for (const type of expectedTypes) {
        const caps = pvsRouter.getCapabilities(type as any);
        expect(caps).not.toBeNull();
      }
    });

    it('should return correct capabilities for Turbomed', () => {
      const caps = pvsRouter.getCapabilities('TURBOMED');
      expect(caps?.canImportPatients).toBe(true);
      expect(caps?.canExportResults).toBe(true);
      expect(caps?.supportsRealtime).toBe(false);
      expect(caps?.supportedSatzarten).toContain('6310');
    });

    it('should return correct capabilities for Tomedo', () => {
      const caps = pvsRouter.getCapabilities('TOMEDO');
      expect(caps?.canImportPatients).toBe(true);
      expect(caps?.canExportResults).toBe(true);
      expect(caps?.supportsRealtime).toBe(false);
      expect(caps?.supportedFhirResources).toContain('Patient');
    });
  });

  describe('Adapter Factory', () => {
    it('should throw error for unknown PVS type', async () => {
      const connection = {
        id: 'test-unknown',
        praxisId: 'praxis-1',
        pvsType: 'UNKNOWN_TYPE' as any,
        protocol: 'GDT',
        isActive: true,
        syncIntervalSec: 60,
        retryCount: 3,
        autoMapFields: true,
      };

      await expect(pvsRouter.getAdapter(connection as any)).rejects.toThrow('Kein Adapter für PVS-Typ');
    });
  });
});
