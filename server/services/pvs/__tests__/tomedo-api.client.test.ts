/**
 * Tomedo API Client Tests
 * 
 * @phase PHASE_5_TESTS
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TomedoApiClient, createTomedoApiClient } from '../tomedo-api.client.js';
import type { PvsConnectionData } from '../types.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Redis
vi.mock('../../../redis.js', () => ({
  getRedisClient: vi.fn(() => null),
}));

// Mock logger
vi.mock('../../../logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('TomedoApiClient', () => {
  const mockConnection: PvsConnectionData = {
    id: 'test-conn-1',
    praxisId: 'praxis-1',
    pvsType: 'TOMEDO',
    protocol: 'FHIR',
    fhirBaseUrl: 'https://api.tomedo.test/fhir/R4',
    fhirAuthType: 'oauth2',
    fhirCredentials: JSON.stringify({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    }),
    isActive: true,
    syncIntervalSec: 300,
    retryCount: 3,
    autoMapFields: true,
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with connection data', () => {
      const client = createTomedoApiClient(mockConnection);
      expect(client).toBeInstanceOf(TomedoApiClient);
    });

    it('should handle missing credentials gracefully', () => {
      const connWithoutCreds = { ...mockConnection, fhirCredentials: undefined };
      const client = createTomedoApiClient(connWithoutCreds);
      expect(client).toBeInstanceOf(TomedoApiClient);
    });
  });

  describe('authenticate', () => {
    it('should authenticate successfully with valid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token-123',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      });

      const client = createTomedoApiClient(mockConnection);
      const result = await client.authenticate();

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('test-token-123');
      expect(result.latencyMs).toBeGreaterThan(0);
    });

    it('should return cached token if still valid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token-123',
          expires_in: 3600,
        }),
      });

      const client = createTomedoApiClient(mockConnection);
      
      // First call
      await client.authenticate();
      
      // Second call should use cache
      const result = await client.authenticate();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
    });

    it('should handle authentication failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      });

      const client = createTomedoApiClient(mockConnection);
      const result = await client.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('should handle missing credentials', async () => {
      const connWithoutCreds = {
        ...mockConnection,
        fhirCredentials: undefined,
      };
      const client = createTomedoApiClient(connWithoutCreds);
      const result = await client.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toContain('credentials');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = createTomedoApiClient(mockConnection);
      const result = await client.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('searchPatient', () => {
    it('should search patients by name', async () => {
      // Mock auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600,
        }),
      });

      // Mock search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resourceType: 'Bundle',
          entry: [
            {
              resource: {
                resourceType: 'Patient',
                id: 'patient-1',
                name: [{ family: 'Müller', given: ['Max'] }],
                birthDate: '1980-01-01',
              },
            },
          ],
        }),
      });

      const client = createTomedoApiClient(mockConnection);
      const results = await client.searchPatient({ name: 'Müller' });

      expect(results).toHaveLength(1);
      expect(results[0].lastName).toBe('Müller');
      expect(results[0].firstName).toBe('Max');
    });

    it('should return empty array for no results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600,
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resourceType: 'Bundle',
          entry: [],
        }),
      });

      const client = createTomedoApiClient(mockConnection);
      const results = await client.searchPatient({ name: 'Unknown' });

      expect(results).toHaveLength(0);
    });
  });

  describe('createPatient', () => {
    it('should create a new patient', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600,
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resourceType: 'Patient',
          id: 'new-patient-123',
          name: [{ family: 'Schmidt', given: ['Anna'] }],
          birthDate: '1990-05-15',
        }),
      });

      const client = createTomedoApiClient(mockConnection);
      const patient = await client.createPatient({
        firstName: 'Anna',
        lastName: 'Schmidt',
        birthDate: '1990-05-15',
        gender: 'female',
      });

      expect(patient.id).toBe('new-patient-123');
      expect(patient.name[0].family).toBe('Schmidt');
    });

    it('should handle creation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600,
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        text: async () => 'Invalid data',
      });

      const client = createTomedoApiClient(mockConnection);
      await expect(
        client.createPatient({ firstName: '', lastName: '' })
      ).rejects.toThrow('Bad Request');
    });
  });

  describe('createFallakte', () => {
    it('should create a new encounter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600,
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resourceType: 'Encounter',
          id: 'encounter-456',
          status: 'in-progress',
          subject: { reference: 'Patient/patient-123' },
        }),
      });

      const client = createTomedoApiClient(mockConnection);
      const encounter = await client.createFallakte('patient-123', {
        startDate: '2026-04-03T10:00:00Z',
        reason: 'Anamnese',
      });

      expect(encounter.id).toBe('encounter-456');
      expect(encounter.resourceType).toBe('Encounter');
    });
  });

  describe('addKarteieintrag', () => {
    it('should add a composition to a fallakte', async () => {
      // Auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600,
        }),
      });

      // Get encounter
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resourceType: 'Encounter',
          id: 'encounter-456',
          subject: { reference: 'Patient/patient-123' },
        }),
      });

      // Create composition
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resourceType: 'Composition',
          id: 'composition-789',
        }),
      });

      const client = createTomedoApiClient(mockConnection);
      const compositionId = await client.addKarteieintrag('encounter-456', {
        type: 'Anamnese',
        content: 'Test documentation',
        icd10Codes: ['I10'],
      });

      expect(compositionId).toBe('composition-789');
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          expires_in: 3600,
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resourceType: 'CapabilityStatement',
          software: {
            name: 'Tomedo FHIR Server',
            version: '1.0.0',
          },
        }),
      });

      const client = createTomedoApiClient(mockConnection);
      const result = await client.testConnection();

      expect(result.ok).toBe(true);
      expect(result.message).toContain('Tomedo');
      expect(result.latencyMs).toBeGreaterThan(0);
    });

    it('should return failure for invalid connection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Connection refused',
      });

      const client = createTomedoApiClient(mockConnection);
      const result = await client.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Connection refused');
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limits', async () => {
      const client = createTomedoApiClient(mockConnection);
      
      // Check initial rate limit status
      const status = client.getRateLimitStatus();
      expect(status.remaining).toBeGreaterThan(0);
      expect(status.limit).toBe(180); // Tomedo limit
    });
  });
});
