// ============================================
// TomedoAdapter Tests — Korrigierte Version mit korrektem vi.mock()
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { PvsConnectionData, PatientSessionFull } from '../../types.js';

// ============================================
// Mocks MÜSSEN vor den Importen stehen
// ============================================

// Mock FhirClient mit factory function
const fhirClientMocks = vi.hoisted(() => ({
  read: vi.fn(),
  create: vi.fn(),
  search: vi.fn(),
  submitBundle: vi.fn(),
  testConnection: vi.fn(),
  getBaseUrl: vi.fn().mockReturnValue('https://api.tomedo.de/fhir/R4'),
  getCredentials: vi.fn().mockReturnValue({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  }),
}));

const mockRead = fhirClientMocks.read;
const mockCreate = fhirClientMocks.create;
const mockSearch = fhirClientMocks.search;
const mockSubmitBundle = fhirClientMocks.submitBundle;
const mockTestConnection = fhirClientMocks.testConnection;
const mockGetBaseUrl = fhirClientMocks.getBaseUrl;
const mockGetCredentials = fhirClientMocks.getCredentials;

vi.mock('../../fhir/fhir-client.js', () => ({
  FhirClient: vi.fn().mockImplementation(function MockFhirClient() {
    return {
      getBaseUrl: fhirClientMocks.getBaseUrl,
      getCredentials: fhirClientMocks.getCredentials,
      read: fhirClientMocks.read,
      create: fhirClientMocks.create,
      search: fhirClientMocks.search,
      submitBundle: fhirClientMocks.submitBundle,
      testConnection: fhirClientMocks.testConnection,
    };
  }),
}));

// Mock FHIR mapper
const mapperMocks = vi.hoisted(() => ({
  buildAnamneseBundle: vi.fn(),
  patientToFhir: vi.fn(),
}));

const mockBuildAnamneseBundle = mapperMocks.buildAnamneseBundle;
const mockPatientToFhir = mapperMocks.patientToFhir;

vi.mock('../../fhir/fhir-mapper.js', () => ({
  buildAnamneseBundle: mapperMocks.buildAnamneseBundle,
  patientToFhir: mapperMocks.patientToFhir,
}));

// Imports nach den mocks
import { TomedoAdapter } from '../tomedo.adapter.js';
import { FhirClient } from '../../fhir/fhir-client.js';
import { buildAnamneseBundle } from '../../fhir/fhir-mapper.js';

describe('TomedoAdapter', () => {
  let adapter: TomedoAdapter;
  let mockConnection: PvsConnectionData;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    adapter = new TomedoAdapter();
    mockConnection = {
      id: 'test-conn-1',
      praxisId: 'praxis-1',
      pvsType: 'TOMEDO',
      protocol: 'FHIR',
      fhirBaseUrl: 'https://api.tomedo.de/fhir/R4',
      fhirAuthType: 'oauth2',
      fhirCredentials: JSON.stringify({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      }),
      isActive: true,
      syncIntervalSec: 60,
      retryCount: 3,
      autoMapFields: true,
    };

    // Reset mock implementations
    mockRead.mockReset();
    mockCreate.mockReset();
    mockSearch.mockReset();
    mockSubmitBundle.mockReset();
    mockTestConnection.mockReset();
    mockGetBaseUrl.mockReturnValue('https://api.tomedo.de/fhir/R4');
    mockGetCredentials.mockReturnValue({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with connection data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'test-token', expires_in: 3600 }),
      });

      await adapter.initialize(mockConnection);
      expect(adapter.type).toBe('TOMEDO');
      expect(adapter.supportedProtocols).toContain('FHIR');
      expect(FhirClient).toHaveBeenCalledWith(expect.objectContaining({
        baseUrl: 'https://api.tomedo.de/fhir/R4',
        authType: 'oauth2',
      }));
    });

    it('should throw error when FHIR base URL is missing', async () => {
      const connWithoutUrl = { ...mockConnection, fhirBaseUrl: null };
      await expect(adapter.initialize(connWithoutUrl)).rejects.toThrow('FHIR Base URL nicht konfiguriert');
    });

    it('should authenticate with OAuth2 when credentials provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'test-token', expires_in: 3600 }),
      });

      await adapter.initialize(mockConnection);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/oauth/token'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(URLSearchParams),
        })
      );
    });

    it('should handle invalid credentials JSON', async () => {
      const connWithBadCreds = { 
        ...mockConnection, 
        fhirCredentials: 'invalid-json' 
      };
      
      // Sollte nicht werfen, sondern mit leeren credentials arbeiten
      await expect(adapter.initialize(connWithBadCreds)).resolves.not.toThrow();
    });
  });

  describe('testConnection', () => {
    it('should return error when client not initialized', async () => {
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.message).toContain('FHIR-Client nicht initialisiert');
    });

    it('should return success when connection works', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test-token', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ software: { name: 'Tomedo FHIR Server' } }),
        });

      await adapter.initialize(mockConnection);
      const result = await adapter.testConnection();

      expect(result.ok).toBe(true);
      expect(result.message).toContain('Tomedo FHIR API verbunden');
    });

    it('should return error when authentication fails', async () => {
      const connWithoutOauthCreds = {
        ...mockConnection,
        fhirCredentials: JSON.stringify({}),
      };

      await adapter.initialize(connWithoutOauthCreds);
      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Verbindungsfehler');
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test-token', expires_in: 3600 }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      await adapter.initialize(mockConnection);
      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Verbindungsfehler');
    });
  });

  describe('importPatient', () => {
    it('should throw error when client not initialized', async () => {
      await expect(adapter.importPatient('123')).rejects.toThrow('FHIR-Client nicht initialisiert');
    });

    it('should import patient via FHIR API', async () => {
      const mockPatient = {
        resourceType: 'Patient',
        id: '123',
        name: [{ family: 'Mustermann', given: ['Max'] }],
        birthDate: '1980-01-01',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'test-token', expires_in: 3600 }),
      });
      mockRead.mockResolvedValue(mockPatient);

      await adapter.initialize(mockConnection);
      const result = await adapter.importPatient('123');

      expect(result).toEqual(mockPatient);
      expect(mockRead).toHaveBeenCalledWith('Patient', '123');
    });

    it('should handle import errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'test-token', expires_in: 3600 }),
      });
      mockRead.mockRejectedValue(new Error('Patient not found'));

      await adapter.initialize(mockConnection);
      await expect(adapter.importPatient('123')).rejects.toThrow('Patient not found');
    });
  });

  describe('exportPatient', () => {
    it('should throw error when client not initialized', async () => {
      await expect(adapter.exportPatient({
        pvsPatientId: '123',
        lastName: 'Mustermann',
        firstName: 'Max',
      })).rejects.toThrow('FHIR-Client nicht initialisiert');
    });

    it('should export patient with German Basisprofile', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'test-token', expires_in: 3600 }),
      });
      mockCreate.mockResolvedValue({ id: 'new-patient-123' });

      await adapter.initialize(mockConnection);
      const result = await adapter.exportPatient({
        pvsPatientId: '123',
        lastName: 'Mustermann',
        firstName: 'Max',
        birthDate: '1980-01-01',
        gender: 'male',
        insuranceNr: 'A123456789',
      });

      expect(result).toBe('new-patient-123');
      expect(mockCreate).toHaveBeenCalled();
      
      const createdPatient = mockCreate.mock.calls[0][0];
      expect(createdPatient.meta.profile).toContain('http://fhir.de/StructureDefinition/patient-de-basis');
      expect(createdPatient.identifier).toContainEqual(expect.objectContaining({
        system: 'http://fhir.de/sid/gkv/kvid-10',
        value: 'A123456789',
      }));
    });

    it('should export patient without insurance', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'test-token', expires_in: 3600 }),
      });
      mockCreate.mockResolvedValue({ id: 'patient-456' });

      await adapter.initialize(mockConnection);
      const result = await adapter.exportPatient({
        pvsPatientId: '456',
        lastName: 'Schmidt',
        firstName: 'Anna',
      });

      expect(result).toBe('patient-456');
      const createdPatient = mockCreate.mock.calls[0][0];
      expect(createdPatient.identifier).toHaveLength(1);
    });
  });

  describe('searchPatient', () => {
    it('should throw error when client not initialized', async () => {
      await expect(adapter.searchPatient({ name: 'Max' })).rejects.toThrow('FHIR-Client nicht initialisiert');
    });

    it('should search patients by name', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'test-token', expires_in: 3600 }),
      });
      mockSearch.mockResolvedValue({
        entry: [{
          resource: {
            resourceType: 'Patient',
            id: '123',
            name: [{ family: 'Mustermann', given: ['Max'] }],
            birthDate: '1980-01-01',
            gender: 'male',
          },
        }],
      });

      await adapter.initialize(mockConnection);
      const results = await adapter.searchPatient({ name: 'Mustermann' });

      expect(results).toHaveLength(1);
      expect(results[0].lastName).toBe('Mustermann');
      expect(results[0].firstName).toBe('Max');
      expect(mockSearch).toHaveBeenCalledWith('Patient', { name: 'Mustermann' });
    });

    it('should search patients by KVNR', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'test-token', expires_in: 3600 }),
      });
      mockSearch.mockResolvedValue({
        entry: [{
          resource: {
            resourceType: 'Patient',
            id: '123',
            name: [{ family: 'Mustermann', given: ['Max'] }],
            identifier: [{
              system: 'http://fhir.de/sid/gkv/kvid-10',
              value: 'A123456789',
            }],
          },
        }],
      });

      await adapter.initialize(mockConnection);
      const results = await adapter.searchPatient({ kvnr: 'A123456789' });

      expect(results).toHaveLength(1);
      expect(results[0].insuranceNr).toBe('A123456789');
    });

    it('should return empty array for no results', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'test-token', expires_in: 3600 }),
      });
      mockSearch.mockResolvedValue({ entry: [] });

      await adapter.initialize(mockConnection);
      const results = await adapter.searchPatient({ name: 'Unknown' });

      expect(results).toHaveLength(0);
    });

    it('should handle search errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'test-token', expires_in: 3600 }),
      });
      mockSearch.mockRejectedValue(new Error('Search failed'));

      await adapter.initialize(mockConnection);
      await expect(adapter.searchPatient({ name: 'Test' })).rejects.toThrow('Search failed');
    });
  });

  describe('exportAnamneseResult', () => {
    it('should return error when client not initialized', async () => {
      const mockSession = {
        id: 'session-1',
        patientId: 'patient-1',
        patient: null,
        status: 'COMPLETED',
        selectedService: 'ANAMNESE',
        answers: [],
        triageEvents: [],
        createdAt: new Date(),
      } as PatientSessionFull;

      const result = await adapter.exportAnamneseResult(mockSession);
      expect(result.success).toBe(false);
      expect(result.error).toContain('FHIR-Client nicht initialisiert');
    });

    it('should successfully export anamnese bundle', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'test-token', expires_in: 3600 }),
      });
      
      const mockBundle = {
        resourceType: 'Bundle',
        entry: [{
          resource: {
            resourceType: 'QuestionnaireResponse',
            id: 'qr-123',
          },
        }],
      };
      mockBuildAnamneseBundle.mockReturnValue(mockBundle);
      
      mockSubmitBundle.mockResolvedValue({
        entry: [{ response: { location: 'QuestionnaireResponse/qr-123' } }],
      });

      const mockSession = {
        id: 'session-1',
        patientId: 'patient-1',
        patient: null,
        status: 'COMPLETED',
        selectedService: 'ANAMNESE',
        answers: [],
        triageEvents: [],
        createdAt: new Date(),
      } as PatientSessionFull;

      await adapter.initialize(mockConnection);
      const result = await adapter.exportAnamneseResult(mockSession);

      expect(result.success).toBe(true);
      expect(result.transferLogId).toMatch(/^fhir-/);
      expect(result.pvsReferenceId).toBe('QuestionnaireResponse/qr-123');
      expect(mockBuildAnamneseBundle).toHaveBeenCalledWith(mockSession);
    });

    it('should handle export errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'test-token', expires_in: 3600 }),
      });
      
      mockBuildAnamneseBundle.mockReturnValue({ resourceType: 'Bundle', entry: [] });
      mockSubmitBundle.mockRejectedValue(new Error('Export failed'));

      const mockSession = {
        id: 'session-1',
        patientId: 'patient-1',
        patient: null,
        status: 'COMPLETED',
        selectedService: 'ANAMNESE',
        answers: [],
        triageEvents: [],
        createdAt: new Date(),
      } as PatientSessionFull;

      await adapter.initialize(mockConnection);
      const result = await adapter.exportAnamneseResult(mockSession);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Export failed');
    });
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities', () => {
      const caps = adapter.getCapabilities();

      expect(caps.canImportPatients).toBe(true);
      expect(caps.canExportResults).toBe(true);
      expect(caps.canExportTherapyPlans).toBe(true);
      expect(caps.canReceiveOrders).toBe(true);
      expect(caps.canSearchPatients).toBe(true);
      expect(caps.supportsRealtime).toBe(false);
      expect(caps.supportedFhirResources).toContain('Patient');
      expect(caps.supportedFhirResources).toContain('QuestionnaireResponse');
      expect(caps.supportedFhirResources).toContain('Observation');
    });
  });

  describe('disconnect', () => {
    it('should clear connection on disconnect', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'test-token', expires_in: 3600 }),
      });

      await adapter.initialize(mockConnection);
      await adapter.disconnect();
      
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
    });
  });
});
