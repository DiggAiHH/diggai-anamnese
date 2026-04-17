// ============================================
// T2MedAdapter Tests — Korrigierte Version mit korrektem vi.mock()
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
  getBaseUrl: vi.fn().mockReturnValue('https://api.t2med.de/fhir/R4'),
}));

const mockRead = fhirClientMocks.read;
const mockCreate = fhirClientMocks.create;
const mockSearch = fhirClientMocks.search;
const mockSubmitBundle = fhirClientMocks.submitBundle;
const mockTestConnection = fhirClientMocks.testConnection;
const mockGetBaseUrl = fhirClientMocks.getBaseUrl;

vi.mock('../../fhir/fhir-client.js', () => ({
  FhirClient: vi.fn().mockImplementation(function MockFhirClient() {
    return {
      getBaseUrl: fhirClientMocks.getBaseUrl,
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
import { T2MedAdapter } from '../t2med.adapter.js';
import { FhirClient } from '../../fhir/fhir-client.js';
import { buildAnamneseBundle } from '../../fhir/fhir-mapper.js';

describe('T2MedAdapter', () => {
  let adapter: T2MedAdapter;
  let mockConnection: PvsConnectionData;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    adapter = new T2MedAdapter();
    mockConnection = {
      id: 'test-conn-1',
      praxisId: 'praxis-1',
      pvsType: 'T2MED',
      protocol: 'FHIR',
      fhirBaseUrl: 'https://api.t2med.de/fhir/R4',
      fhirAuthType: 'apikey',
      fhirCredentials: JSON.stringify({ apiKey: 'test-api-key' }),
      isActive: true,
      syncIntervalSec: 60,
      retryCount: 3,
      autoMapFields: true,
    };
    
    fetchMock = vi.fn();
    global.fetch = fetchMock as any;

    // Reset mock implementations
    mockRead.mockReset();
    mockCreate.mockReset();
    mockSearch.mockReset();
    mockSubmitBundle.mockReset();
    mockTestConnection.mockReset();
    mockGetBaseUrl.mockReturnValue('https://api.t2med.de/fhir/R4');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with API key', async () => {
      await adapter.initialize(mockConnection);
      expect(adapter.type).toBe('T2MED');
      expect(adapter.supportedProtocols).toContain('FHIR');
      expect(FhirClient).toHaveBeenCalledWith(expect.objectContaining({
        baseUrl: 'https://api.t2med.de/fhir/R4',
        authType: 'apikey',
      }));
    });

    it('should throw error when FHIR base URL is missing', async () => {
      const connWithoutUrl = { ...mockConnection, fhirBaseUrl: null };
      await expect(adapter.initialize(connWithoutUrl)).rejects.toThrow('FHIR Base URL nicht konfiguriert');
    });

    it('should handle invalid credentials JSON', async () => {
      const connWithBadCreds = { 
        ...mockConnection, 
        fhirCredentials: 'invalid-json' 
      };
      
      // Sollte nicht werfen, sondern mit leeren credentials arbeiten
      await expect(adapter.initialize(connWithBadCreds)).resolves.not.toThrow();
    });

    it('should extract API key from credentials', async () => {
      await adapter.initialize(mockConnection);
      
      // Test connection sollte API-Key verwenden
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ software: { name: 'T2Med FHIR Server' } }),
      });

      await adapter.testConnection();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
          }),
        })
      );
    });
  });

  describe('testConnection', () => {
    it('should return error when client not initialized', async () => {
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.message).toContain('FHIR-Client nicht initialisiert');
    });

    it('should return success when connection works', async () => {
      await adapter.initialize(mockConnection);
      
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ software: { name: 'T2Med FHIR Server' } }),
      });

      const result = await adapter.testConnection();

      expect(result.ok).toBe(true);
      expect(result.message).toContain('T2Med FHIR API verbunden');
    });

    it('should return error for invalid API key', async () => {
      await adapter.initialize(mockConnection);
      
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Authentifizierung fehlgeschlagen');
    });

    it('should handle network errors', async () => {
      await adapter.initialize(mockConnection);
      
      fetchMock.mockRejectedValue(new Error('Network error'));

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Verbindungsfehler');
    });

    it('should handle non-401 errors', async () => {
      await adapter.initialize(mockConnection);
      
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('FHIR API Fehler');
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
        name: [{ family: 'Schmidt', given: ['Maria'] }],
        birthDate: '1985-05-15',
      };

      await adapter.initialize(mockConnection);
      mockRead.mockResolvedValue(mockPatient);

      const result = await adapter.importPatient('123');

      expect(result).toEqual(mockPatient);
      expect(mockRead).toHaveBeenCalledWith('Patient', '123');
    });

    it('should handle import errors', async () => {
      await adapter.initialize(mockConnection);
      mockRead.mockRejectedValue(new Error('Patient not found'));

      await expect(adapter.importPatient('123')).rejects.toThrow('Patient not found');
    });
  });

  describe('exportPatient', () => {
    it('should throw error when client not initialized', async () => {
      await expect(adapter.exportPatient({
        pvsPatientId: '123',
        lastName: 'Schmidt',
        firstName: 'Maria',
      })).rejects.toThrow('FHIR-Client nicht initialisiert');
    });

    it('should export patient successfully', async () => {
      await adapter.initialize(mockConnection);
      mockCreate.mockResolvedValue({ id: 'new-patient-123' });

      const result = await adapter.exportPatient({
        pvsPatientId: '123',
        lastName: 'Schmidt',
        firstName: 'Maria',
        birthDate: '1985-05-15',
        gender: 'female',
        insuranceNr: 'B987654321',
      });

      expect(result).toBe('new-patient-123');
      expect(mockCreate).toHaveBeenCalled();
      
      const createdPatient = mockCreate.mock.calls[0][0];
      expect(createdPatient.resourceType).toBe('Patient');
      expect(createdPatient.name[0].family).toBe('Schmidt');
      expect(createdPatient.identifier).toContainEqual(expect.objectContaining({
        system: 'http://fhir.de/sid/gkv/kvid-10',
        value: 'B987654321',
      }));
    });

    it('should export patient without insurance', async () => {
      await adapter.initialize(mockConnection);
      mockCreate.mockResolvedValue({ id: 'patient-456' });

      const result = await adapter.exportPatient({
        pvsPatientId: '456',
        lastName: 'Meier',
        firstName: 'Hans',
      });

      expect(result).toBe('patient-456');
      const createdPatient = mockCreate.mock.calls[0][0];
      expect(createdPatient.identifier).toHaveLength(1);
    });
  });

  describe('searchPatient', () => {
    it('should throw error when client not initialized', async () => {
      await expect(adapter.searchPatient({ name: 'Schmidt' })).rejects.toThrow('FHIR-Client nicht initialisiert');
    });

    it('should search patients by name', async () => {
      await adapter.initialize(mockConnection);
      
      mockSearch.mockResolvedValue({
        entry: [{
          resource: {
            resourceType: 'Patient',
            id: '123',
            name: [{ family: 'Müller', given: ['Hans'] }],
            birthDate: '1980-01-01',
            gender: 'male',
          },
        }],
      });

      const results = await adapter.searchPatient({ name: 'Müller' });

      expect(results).toHaveLength(1);
      expect(results[0].lastName).toBe('Müller');
      expect(results[0].firstName).toBe('Hans');
      expect(mockSearch).toHaveBeenCalledWith('Patient', { name: 'Müller' });
    });

    it('should search patients by birthDate', async () => {
      await adapter.initialize(mockConnection);
      
      mockSearch.mockResolvedValue({
        entry: [{
          resource: {
            resourceType: 'Patient',
            id: '123',
            name: [{ family: 'Müller', given: ['Hans'] }],
            birthDate: '1980-01-01',
          },
        }],
      });

      const results = await adapter.searchPatient({ birthDate: '1980-01-01' });

      expect(results).toHaveLength(1);
      expect(mockSearch).toHaveBeenCalledWith('Patient', { birthdate: '1980-01-01' });
    });

    it('should search patients by KVNR', async () => {
      await adapter.initialize(mockConnection);
      
      mockSearch.mockResolvedValue({
        entry: [{
          resource: {
            resourceType: 'Patient',
            id: '123',
            name: [{ family: 'Müller', given: ['Hans'] }],
            identifier: [{
              system: 'http://fhir.de/sid/gkv/kvid-10',
              value: 'A123456789',
            }],
          },
        }],
      });

      const results = await adapter.searchPatient({ kvnr: 'A123456789' });

      expect(results).toHaveLength(1);
      expect(results[0].insuranceNr).toBe('A123456789');
    });

    it('should return empty array for no results', async () => {
      await adapter.initialize(mockConnection);
      
      mockSearch.mockResolvedValue({ entry: [] });

      const results = await adapter.searchPatient({ name: 'Unknown' });

      expect(results).toHaveLength(0);
    });

    it('should handle search errors', async () => {
      await adapter.initialize(mockConnection);
      
      mockSearch.mockRejectedValue(new Error('Search failed'));

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

    it('should export anamnese bundle successfully', async () => {
      await adapter.initialize(mockConnection);
      
      const mockBundle = {
        resourceType: 'Bundle',
        entry: [{
          resource: { resourceType: 'QuestionnaireResponse', id: 'qr-123' },
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

      const result = await adapter.exportAnamneseResult(mockSession);

      expect(result.success).toBe(true);
      expect(result.transferLogId).toMatch(/^fhir-/);
      expect(result.pvsReferenceId).toBe('QuestionnaireResponse/qr-123');
      expect(mockBuildAnamneseBundle).toHaveBeenCalledWith(mockSession);
    });

    it('should handle export errors', async () => {
      await adapter.initialize(mockConnection);
      
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
      expect(caps.supportedFhirResources).toContain('Appointment');
    });
  });

  describe('disconnect', () => {
    it('should clear connection on disconnect', async () => {
      await adapter.initialize(mockConnection);
      await adapter.disconnect();
      
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
    });
  });
});
