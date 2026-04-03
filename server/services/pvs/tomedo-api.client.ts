/**
 * Tomedo API Client
 * 
 * Echte REST-API Integration für Tomedo (Zollsoft) PVS.
 * Unterstützt OAuth2, FHIR R4, und deutsche Basisprofile.
 * 
 * @module tomedo-api-client
 * @phase PHASE_1_REAL_API
 */

import { createPvsRateLimiter, type FhirRateLimiter } from './fhir/fhir-rate-limiter.js';
import { createLogger } from '../../logger.js';
import { circuitBreakerRegistry } from './resilience/circuit-breaker.js';
import { tomedoCache } from './tomedo-cache.service.js';
import { tomedoMetrics } from './tomedo-metrics.service.js';
import type { PvsConnectionData, PatientSearchResult, PatientSessionFull } from './types.js';

const logger = createLogger('TomedoApiClient');

// ============================================================================
// TYPES
// ============================================================================

export interface TomedoAuthResult {
  success: boolean;
  accessToken?: string;
  expiresIn?: number;
  latencyMs: number;
  error?: string;
}

export interface TomedoPatient {
  id: string;
  resourceType: 'Patient';
  meta?: {
    profile?: string[];
    versionId?: string;
    lastUpdated?: string;
  };
  identifier: Array<{
    system?: string;
    value?: string;
    type?: { coding: Array<{ system: string; code: string }> };
  }>;
  name: Array<{
    use: string;
    family: string;
    given: string[];
  }>;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  address?: Array<{
    use?: string;
    line?: string[];
    city?: string;
    postalCode?: string;
    country?: string;
  }>;
  telecom?: Array<{
    system?: 'phone' | 'email';
    value?: string;
    use?: string;
  }>;
}

export interface TomedoFallakte {
  id: string;
  resourceType: 'Encounter';
  status: string;
  class?: { system?: string; code?: string; display?: string };
  subject?: { reference: string; display?: string };
  period?: { start?: string; end?: string };
  reasonCode?: Array<{ text?: string; coding?: Array<{ system: string; code: string; display: string }> }>;
}

export interface Karteieintrag {
  id?: string;
  type: 'Befund' | 'Therapieplan' | 'Anamnese' | 'Sonstiges';
  content: string;
  icd10Codes?: string[];
  metadata?: Record<string, unknown>;
}

export interface ExportStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reference?: string;
  timestamp: string;
  errorMessage?: string;
}

export interface TomedoApiError {
  code: string;
  message: string;
  httpStatus?: number;
  retryable: boolean;
}

export interface TomedoSearchParams {
  name?: string;
  birthDate?: string;
  kvnr?: string;
  _lastUpdated?: string;
  _count?: number;
}

// ============================================================================
// TOMEDO API CLIENT
// ============================================================================

export class TomedoApiClient {
  private baseUrl: string;
  private credentials: {
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
    apiKey?: string;
  } = {};
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private rateLimiter: FhirRateLimiter;
  private connectionId: string;

  constructor(private connection: PvsConnectionData) {
    this.connectionId = connection.id;
    this.baseUrl = connection.fhirBaseUrl || '';
    
    // Parse credentials from encrypted storage
    if (connection.fhirCredentials) {
      try {
        // TODO: Decrypt AES-256-GCM here in production
        this.credentials = JSON.parse(connection.fhirCredentials);
      } catch (e) {
        logger.error('[TomedoApiClient] Failed to parse credentials', {
          connectionId: this.connectionId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Initialize rate limiter (180 req/min for Tomedo)
    this.rateLimiter = createPvsRateLimiter('TOMEDO');
    
    // Initialize circuit breaker
    this.circuitBreaker = circuitBreakerRegistry.get(`tomedo-${this.connectionId}`, {
      failureThreshold: 5,
      successThreshold: 3,
      timeoutMs: 60000,
      halfOpenMaxCalls: 3,
    });
  }
  
  private circuitBreaker;

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  /**
   * Authenticate with Tomedo OAuth2 endpoint
   */
  async authenticate(): Promise<TomedoAuthResult> {
    const startTime = Date.now();

    // Check if we have a valid cached token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date(Date.now() + 60000)) {
      return {
        success: true,
        accessToken: this.accessToken,
        latencyMs: Date.now() - startTime,
      };
    }

    if (!this.credentials.clientId || !this.credentials.clientSecret) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        error: 'OAuth2 credentials (clientId, clientSecret) required',
      };
    }

    const tokenUrl = this.credentials.tokenUrl || `${this.baseUrl}/oauth/token`;

    try {
      const response = await this.rateLimiter.execute(() =>
        fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.credentials.clientId!,
            client_secret: this.credentials.clientSecret!,
            scope: 'fhir/Patient.read fhir/Patient.write fhir/Encounter.read fhir/Encounter.write fhir/QuestionnaireResponse.write fhir/Composition.write fhir/Condition.write',
          }),
        })
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[TomedoApiClient] OAuth2 failed', {
          connectionId: this.connectionId,
          status: response.status,
          error: errorText,
        });
        return {
          success: false,
          latencyMs: Date.now() - startTime,
          error: `OAuth2 failed: ${response.status} ${response.statusText}`,
        };
      }

      const tokenData = await response.json() as {
        access_token: string;
        expires_in: number;
        token_type: string;
        scope?: string;
      };

      this.accessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      logger.info('[TomedoApiClient] OAuth2 authenticated', {
        connectionId: this.connectionId,
        expiresIn,
        latencyMs: Date.now() - startTime,
      });

      return {
        success: true,
        accessToken: this.accessToken,
        expiresIn,
        latencyMs: Date.now() - startTime,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[TomedoApiClient] OAuth2 error', {
        connectionId: this.connectionId,
        error: errorMsg,
      });
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        error: errorMsg,
      };
    }
  }

  /**
   * Refresh OAuth2 token
   */
  async refreshToken(): Promise<void> {
    // Invalidate current token
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Re-authenticate
    const result = await this.authenticate();
    if (!result.success) {
      throw new Error(`Token refresh failed: ${result.error}`);
    }
  }

  /**
   * Ensure valid token before API calls
   */
  private async ensureAuth(): Promise<string> {
    // Check if token needs refresh (within 1 minute of expiry)
    if (!this.accessToken || !this.tokenExpiry || this.tokenExpiry < new Date(Date.now() + 60000)) {
      const result = await this.authenticate();
      if (!result.success || !result.accessToken) {
        throw new Error(`Authentication failed: ${result.error}`);
      }
    }
    return this.accessToken!;
  }

  // ============================================================================
  // PATIENT OPERATIONS
  // ============================================================================

  /**
   * Search for patients in Tomedo
   */
  async searchPatient(query: TomedoSearchParams): Promise<PatientSearchResult[]> {
    const startTime = Date.now();
    const cacheKey = JSON.stringify(query);
    
    // Try cache first
    const cached = await tomedoCache.getPatientSearch(this.connection.praxisId, cacheKey);
    if (cached) {
      tomedoMetrics.updateCacheMetrics(1, 0);
      return cached;
    }
    
    const token = await this.ensureAuth();

    const params = new URLSearchParams();
    if (query.name) params.set('name', query.name);
    if (query.birthDate) params.set('birthdate', query.birthDate);
    if (query.kvnr) params.set('identifier', `http://fhir.de/sid/gkv/kvid-10|${query.kvnr}`);
    if (query._lastUpdated) params.set('_lastUpdated', query._lastUpdated);
    if (query._count) params.set('_count', query._count.toString());

    const url = `${this.baseUrl}/Patient?${params.toString()}`;

    const response = await this.rateLimiter.execute(() =>
      fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/fhir+json',
        },
      })
    );

    if (!response.ok) {
      throw new Error(`Patient search failed: ${response.status} ${response.statusText}`);
    }

    const bundle = await response.json() as {
      resourceType: 'Bundle';
      entry?: Array<{ resource: TomedoPatient }>;
    };

    const results: PatientSearchResult[] = [];

    for (const entry of bundle.entry || []) {
      const p = entry.resource;
      if (p?.resourceType === 'Patient') {
        const name = p.name?.[0];
        const kvnrIdentifier = p.identifier?.find(i =>
          i.system?.includes('kvid') || i.type?.coding?.some(c => c.code === 'GKV')
        );

        results.push({
          pvsPatientId: p.id || '',
          lastName: name?.family || '',
          firstName: name?.given?.[0] || '',
          birthDate: p.birthDate,
          gender: p.gender,
          insuranceNr: kvnrIdentifier?.value,
        });
      }
    }

    logger.info('[TomedoApiClient] Patient search completed', {
      connectionId: this.connectionId,
      query: { name: query.name, birthDate: query.birthDate },
      results: results.length,
    });
    
    // Cache results
    await tomedoCache.setPatientSearch(this.connection.praxisId, cacheKey, results);
    tomedoMetrics.updateCacheMetrics(0, 1);
    
    // Record metrics
    tomedoMetrics.recordPatientOperation('search', 'success');
    
    return results;
  }

  /**
   * Get patient by ID (with caching)
   */
  async getPatient(patientId: string): Promise<TomedoPatient> {
    // Try cache first
    const cached = await tomedoCache.getPatient(this.connection.praxisId, patientId);
    if (cached) {
      tomedoMetrics.updateCacheMetrics(1, 0);
      return cached;
    }
    
    const token = await this.ensureAuth();

    const response = await this.rateLimiter.execute(() =>
      fetch(`${this.baseUrl}/Patient/${patientId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/fhir+json',
        },
      })
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Patient not found: ${patientId}`);
      }
      throw new Error(`Get patient failed: ${response.status} ${response.statusText}`);
    }

    const patient = await response.json() as TomedoPatient;
    
    // Cache patient
    await tomedoCache.setPatient(this.connection.praxisId, patientId, patient);
    tomedoMetrics.updateCacheMetrics(0, 1);
    
    return patient;
  }

  /**
   * Create a new patient in Tomedo (with circuit breaker)
   */
  async createPatient(data: {
    firstName: string;
    lastName: string;
    birthDate?: string;
    gender?: 'male' | 'female' | 'other' | 'unknown';
    insuranceNr?: string;
    phone?: string;
    email?: string;
    address?: {
      street: string;
      city: string;
      postalCode: string;
      country?: string;
    };
  }): Promise<TomedoPatient> {
    const startTime = Date.now();
    
    return this.circuitBreaker.execute(async () => {
    const token = await this.ensureAuth();

    const patient: Omit<TomedoPatient, 'id'> = {
      resourceType: 'Patient',
      meta: {
        profile: ['http://fhir.de/StructureDefinition/patient-de-basis'],
      },
      identifier: [
        ...(data.insuranceNr ? [{
          type: {
            coding: [{
              system: 'http://fhir.de/CodeSystem/identifier-type-de-basis',
              code: 'GKV' as const,
            }],
          },
          system: 'http://fhir.de/sid/gkv/kvid-10',
          value: data.insuranceNr,
        }] : []),
      ],
      name: [{
        use: 'official',
        family: data.lastName,
        given: [data.firstName],
      }],
      ...(data.birthDate && { birthDate: data.birthDate }),
      ...(data.gender && { gender: data.gender }),
      ...(data.address && {
        address: [{
          use: 'home',
          line: [data.address.street],
          city: data.address.city,
          postalCode: data.address.postalCode,
          country: data.address.country || 'DE',
        }],
      }),
      ...(data.phone || data.email ? {
        telecom: [
          ...(data.phone ? [{ system: 'phone' as const, value: data.phone, use: 'home' }] : []),
          ...(data.email ? [{ system: 'email' as const, value: data.email, use: 'home' }] : []),
        ],
      } : {}),
    };

    const response = await this.rateLimiter.execute(() =>
      fetch(`${this.baseUrl}/Patient`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/fhir+json',
          'Accept': 'application/fhir+json',
        },
        body: JSON.stringify(patient),
      })
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Create patient failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const created = await response.json() as TomedoPatient;
    
    // Invalidate cache
    await tomedoCache.invalidatePatient(this.connection.praxisId, created.id);

    logger.info('[TomedoApiClient] Patient created', {
      connectionId: this.connectionId,
      patientId: created.id,
      name: `${data.firstName} ${data.lastName}`,
    });
    
    // Record metrics
    tomedoMetrics.recordPatientOperation('create', 'success');
    tomedoMetrics.recordApiCall('Patient', 'POST', 'success', Date.now() - startTime);

    return created;
    }).catch(error => {
      tomedoMetrics.recordPatientOperation('create', 'error');
      tomedoMetrics.recordApiCall('Patient', 'POST', 'error', Date.now() - startTime);
      throw error;
    });
  }

  // ============================================================================
  // FALLAKTE / ENCOUNTER OPERATIONS
  // ============================================================================

  /**
   * Create a new Fallakte (Encounter) in Tomedo (with circuit breaker)
   */
  async createFallakte(patientId: string, data: {
    startDate?: string;
    endDate?: string;
    reason?: string;
    type?: string;
  }): Promise<TomedoFallakte> {
    const startTime = Date.now();
    
    return this.circuitBreaker.execute(async () => {
    const token = await this.ensureAuth();

    const encounter = {
      resourceType: 'Encounter',
      status: 'in-progress',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'AMB',
        display: 'ambulatory',
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      ...(data.startDate && {
        period: {
          start: data.startDate,
          ...(data.endDate && { end: data.endDate }),
        },
      }),
      ...(data.reason && {
        reasonCode: [{
          text: data.reason,
        }],
      }),
    };

    const response = await this.rateLimiter.execute(() =>
      fetch(`${this.baseUrl}/Encounter`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/fhir+json',
          'Accept': 'application/fhir+json',
        },
        body: JSON.stringify(encounter),
      })
    );

    if (!response.ok) {
      throw new Error(`Create encounter failed: ${response.status} ${response.statusText}`);
    }

    const created = await response.json() as TomedoFallakte;

    logger.info('[TomedoApiClient] Fallakte created', {
      connectionId: this.connectionId,
      encounterId: created.id,
      patientId,
    });
    
    // Record metrics
    tomedoMetrics.recordFallakteOperation('create', 'success');
    tomedoMetrics.recordApiCall('Encounter', 'POST', 'success', Date.now() - startTime);

    return created;
    }).catch(error => {
      tomedoMetrics.recordFallakteOperation('create', 'error');
      tomedoMetrics.recordApiCall('Encounter', 'POST', 'error', Date.now() - startTime);
      throw error;
    });
  }

  // ============================================================================
  // KARTEIEINTRAG / DOCUMENTATION
  // ============================================================================

  /**
   * Add a Karteieintrag (Composition) to a patient's record (with circuit breaker)
   */
  async addKarteieintrag(fallakteId: string, entry: Karteieintrag): Promise<string> {
    const startTime = Date.now();
    
    return this.circuitBreaker.execute(async () => {
    const token = await this.ensureAuth();

    // First get the encounter to get patient reference
    const encounterResponse = await this.rateLimiter.execute(() =>
      fetch(`${this.baseUrl}/Encounter/${fallakteId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/fhir+json',
        },
      })
    );

    if (!encounterResponse.ok) {
      throw new Error(`Get encounter failed: ${encounterResponse.status} ${encounterResponse.statusText}`);
    }

    const encounter = await encounterResponse.json() as TomedoFallakte;
    const patientRef = encounter.subject?.reference;

    if (!patientRef) {
      throw new Error('Encounter has no patient reference');
    }

    // Create Composition (Karteieintrag)
    const composition = {
      resourceType: 'Composition',
      status: 'final',
      type: {
        coding: [{
          system: 'http://loinc.org',
          code: entry.type === 'Anamnese' ? '11488-4' :
                entry.type === 'Befund' ? '11488-4' :
                entry.type === 'Therapieplan' ? '18776-5' : '34117-2',
          display: entry.type,
        }],
      },
      subject: {
        reference: patientRef,
      },
      encounter: {
        reference: `Encounter/${fallakteId}`,
      },
      date: new Date().toISOString(),
      author: [{
        display: 'DiggAI Anamnese System',
      }],
      title: `${entry.type} - ${new Date().toLocaleDateString('de-DE')}`,
      section: [{
        title: entry.type,
        text: {
          status: 'generated',
          div: `<div xmlns="http://www.w3.org/1999/xhtml">${this.escapeHtml(entry.content)}</div>`,
        },
        ...(entry.icd10Codes && entry.icd10Codes.length > 0 ? {
          entry: entry.icd10Codes.map(code => ({
            reference: `Condition/${code}`,
          })),
        } : {}),
      }],
    };

    const response = await this.rateLimiter.execute(() =>
      fetch(`${this.baseUrl}/Composition`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/fhir+json',
          'Accept': 'application/fhir+json',
        },
        body: JSON.stringify(composition),
      })
    );

    if (!response.ok) {
      throw new Error(`Create karteieintrag failed: ${response.status} ${response.statusText}`);
    }

    const created = await response.json() as { id: string };

    logger.info('[TomedoApiClient] Karteieintrag added', {
      connectionId: this.connectionId,
      compositionId: created.id,
      fallakteId,
      type: entry.type,
    });
    
    // Record metrics
    tomedoMetrics.recordFallakteOperation('karteieintrag', 'success');
    tomedoMetrics.recordApiCall('Composition', 'POST', 'success', Date.now() - startTime);

    return created.id;
    }).catch(error => {
      tomedoMetrics.recordFallakteOperation('karteieintrag', 'error');
      tomedoMetrics.recordApiCall('Composition', 'POST', 'error', Date.now() - startTime);
      throw error;
    });
  }

  // ============================================================================
  // STATUS & EXPORT
  // ============================================================================

  /**
   * Get export status by reference
   */
  async getExportStatus(reference: string): Promise<ExportStatus> {
    const token = await this.ensureAuth();

    // Parse reference (e.g., "Patient/123" or "Encounter/456")
    const [resourceType, id] = reference.split('/');
    if (!resourceType || !id) {
      throw new Error(`Invalid reference format: ${reference}`);
    }

    try {
      const response = await this.rateLimiter.execute(() =>
        fetch(`${this.baseUrl}/${resourceType}/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/fhir+json',
          },
        })
      );

      if (response.ok) {
        return {
          status: 'completed',
          reference,
          timestamp: new Date().toISOString(),
        };
      } else if (response.status === 404) {
        return {
          status: 'failed',
          reference,
          timestamp: new Date().toISOString(),
          errorMessage: 'Resource not found',
        };
      } else {
        return {
          status: 'failed',
          reference,
          timestamp: new Date().toISOString(),
          errorMessage: `${response.status} ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        reference,
        timestamp: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test connection to Tomedo API
   */
  async testConnection(): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
    const startTime = Date.now();

    try {
      const authResult = await this.authenticate();
      
      if (!authResult.success) {
        return {
          ok: false,
          message: `Authentication failed: ${authResult.error}`,
          latencyMs: Date.now() - startTime,
        };
      }

      // Try to fetch metadata/capability statement
      const response = await this.rateLimiter.execute(() =>
        fetch(`${this.baseUrl}/metadata`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authResult.accessToken}`,
            'Accept': 'application/fhir+json',
          },
        })
      );

      if (!response.ok) {
        return {
          ok: false,
          message: `FHIR metadata fetch failed: ${response.status} ${response.statusText}`,
          latencyMs: Date.now() - startTime,
        };
      }

      const metadata = await response.json() as { software?: { name?: string; version?: string } };

      return {
        ok: true,
        message: `Connected to Tomedo FHIR API (${metadata.software?.name || 'FHIR'} ${metadata.software?.version || ''})`,
        latencyMs: Date.now() - startTime,
      };

    } catch (error) {
      return {
        ok: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : String(error)}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createTomedoApiClient(connection: PvsConnectionData): TomedoApiClient {
  return new TomedoApiClient(connection);
}
