// ============================================
// PVS Integration Tests — End-to-End
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pvsRouter } from '../pvs-router.service.js';
import type { PvsConnectionData, PatientSessionFull } from '../types.js';

// Mock all adapters with minimal implementations so getCapabilities() works
vi.mock('../adapters/cgm-m1.adapter.js', () => ({
  CgmM1Adapter: class {
    readonly type = 'CGM_M1';
    readonly supportedProtocols = ['GDT'];
    async initialize() {}
    async testConnection() { return { ok: true, message: '' }; }
    async disconnect() {}
    async importPatient() { return {}; }
    async exportPatient() { return ''; }
    async searchPatient() { return []; }
    async exportAnamneseResult() { return { success: true, transferLogId: '' }; }
    getCapabilities() {
      return {
        canImportPatients: true, canExportResults: true, canExportTherapyPlans: false,
        canReceiveOrders: false, canSearchPatients: true, supportsRealtime: false,
        supportedSatzarten: ['6310', '6311', '6302', '6301'], supportedFhirResources: [],
      };
    }
  },
}));

vi.mock('../adapters/fhir-generic.adapter.js', () => ({
  FhirGenericAdapter: class {
    readonly type = 'FHIR_GENERIC';
    readonly supportedProtocols = ['FHIR'];
    async initialize() {}
    async testConnection() { return { ok: true, message: '' }; }
    async disconnect() {}
    async importPatient() { return {}; }
    async exportPatient() { return ''; }
    async searchPatient() { return []; }
    async exportAnamneseResult() { return { success: true, transferLogId: '' }; }
    getCapabilities() {
      return {
        canImportPatients: true, canExportResults: true, canExportTherapyPlans: false,
        canReceiveOrders: false, canSearchPatients: true, supportsRealtime: false,
        supportedSatzarten: [], supportedFhirResources: ['Patient', 'Encounter', 'QuestionnaireResponse'],
      };
    }
  },
}));

vi.mock('../adapters/turbomed.adapter.js', () => ({
  TurbomedAdapter: class {
    readonly type = 'TURBOMED';
    readonly supportedProtocols = ['GDT'];
    async initialize() {}
    async testConnection() { return { ok: true, message: '' }; }
    async disconnect() {}
    async importPatient() { return {}; }
    async exportPatient() { return ''; }
    async searchPatient() { return []; }
    async exportAnamneseResult() { return { success: true, transferLogId: '' }; }
    getCapabilities() {
      return {
        canImportPatients: true, canExportResults: true, canExportTherapyPlans: false,
        canReceiveOrders: false, canSearchPatients: true, supportsRealtime: false,
        supportedSatzarten: ['6310', '6311', '6302', '6301'], supportedFhirResources: [],
      };
    }
  },
}));

vi.mock('../adapters/tomedo.adapter.js', () => ({
  TomedoAdapter: class {
    readonly type = 'TOMEDO';
    readonly supportedProtocols = ['FHIR'];
    async initialize() {}
    async testConnection() { return { ok: true, message: '' }; }
    async disconnect() {}
    async importPatient() { return {}; }
    async exportPatient() { return ''; }
    async searchPatient() { return []; }
    async exportAnamneseResult() { return { success: true, transferLogId: '' }; }
    getCapabilities() {
      return {
        canImportPatients: true, canExportResults: true, canExportTherapyPlans: true,
        canReceiveOrders: true, canSearchPatients: true, supportsRealtime: false,
        supportedSatzarten: [], supportedFhirResources: [
          'Patient', 'Encounter', 'QuestionnaireResponse', 'Flag',
          'RiskAssessment', 'MedicationStatement', 'Procedure', 'CarePlan',
        ],
      };
    }
  },
}));

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
