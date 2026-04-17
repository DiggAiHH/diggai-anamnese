// ============================================
// Tomedo Adapter — FHIR R4 (Zollsoft)
// ============================================
// Tomedo (Zollsoft) ist Platz 1 in Usability (Zi-Studie 2025)
// Moderne FHIR R4 API mit OAuth2 Authentifizierung
// Unterstützt deutsche FHIR Basisprofile

import type {
  PvsAdapter,
  PvsConnectionData,
  PvsType,
  PvsProtocol,
  AdapterCapabilities,
  TransferResult,
  PatientSessionFull,
  PatientSearchResult,
  FhirPatient,
  FhirClientConfig,
  FhirResource,
} from '../types.js';
import { FhirClient } from '../fhir/fhir-client.js';
import { buildAnamneseBundle, patientToFhir } from '../fhir/fhir-mapper.js';
import { parseStoredFhirCredentials } from '../security/credentials-parser.js';
import {
  buildTomedoStatusSnapshot,
  parseFhirReference,
  type TomedoStatusSnapshot,
} from '../tomedo-status.mapper.js';

/**
 * Adapter for Tomedo (Zollsoft) PVS systems.
 * Uses FHIR R4 with German Basisprofile and OAuth2 authentication.
 * 
 * Tomedo-spezifische Eigenschaften:
 * - FHIR R4 Standard
 * - OAuth2 Authentifizierung
 * - Deutsche FHIR Basisprofile (http://fhir.de)
 * - KVNR-Identifier: http://fhir.de/sid/gkv/kvid-10
 * - Höchste Usability-Bewertung (Zi-Studie 2025)
 * - 95% Weiterempfehlungsrate
 * 
 * API-Endpunkte:
 * - Base: /fhir/R4
 * - OAuth: /oauth/token
 * - Patient: /fhir/R4/Patient
 * - QuestionnaireResponse: /fhir/R4/QuestionnaireResponse
 */
export class TomedoAdapter implements PvsAdapter {
  readonly type: PvsType = 'TOMEDO';
  readonly supportedProtocols: PvsProtocol[] = ['FHIR'];

  private client: FhirClient | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  /**
   * Initialize the adapter with connection configuration.
   */
  async initialize(connection: PvsConnectionData): Promise<void> {
    if (!connection.fhirBaseUrl) {
      throw new Error('FHIR Base URL nicht konfiguriert');
    }

    let credentials: FhirClientConfig['credentials'] = {};

    // Parse plaintext or encrypted credential payload.
    if (connection.fhirCredentials) {
      try {
        credentials = parseStoredFhirCredentials(connection.fhirCredentials);
      } catch {
        credentials = {};
      }
    }

    this.client = new FhirClient({
      baseUrl: connection.fhirBaseUrl,
      authType: (connection.fhirAuthType as FhirClientConfig['authType']) || 'oauth2',
      credentials,
      timeout: 10000,
      retryCount: connection.retryCount,
    });

    // Perform OAuth2 authentication if needed
    if (credentials.clientId && credentials.clientSecret) {
      await this.authenticate(credentials);
    }
  }

  /**
   * OAuth2 authentication for Tomedo API.
   */
  private async authenticate(credentials: FhirClientConfig['credentials']): Promise<void> {
    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error('OAuth2 credentials (clientId, clientSecret) erforderlich');
    }

    // Tomedo OAuth2 token endpoint
    const tokenUrl = credentials.tokenUrl || `${(this.client as any)?.config?.baseUrl ?? ''}/oauth/token`;
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        scope: 'fhir/Patient.read fhir/Patient.write fhir/QuestionnaireResponse.write',
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth2 authentication failed: ${response.statusText}`);
    }

    const tokenData = await response.json() as Record<string, any>;
    this.accessToken = (tokenData as any).access_token;

    // Calculate token expiry
    const expiresIn = (tokenData as any).expires_in || 3600;
    this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);
  }

  /**
   * Check if token needs refresh.
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiry || this.tokenExpiry < new Date()) {
      // Token expired or not present, re-authenticate
      const credentials: FhirClientConfig['credentials'] = (this.client as any)?.config?.credentials || {};
      if (credentials.clientId && credentials.clientSecret) {
        await this.authenticate(credentials);
      }
    }
  }

  /**
   * Test the connection to Tomedo FHIR API.
   */
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.client) {
      return { ok: false, message: 'FHIR-Client nicht initialisiert' };
    }

    try {
      await this.ensureValidToken();
      
      // Try to read the conformance statement (metadata)
      const response = await fetch(`${(this.client as any).config?.baseUrl ?? ''}/metadata`, {
        headers: this.accessToken ? { 'Authorization': `Bearer ${this.accessToken}` } : {},
      });

      if (response.ok) {
        const metadata = await response.json() as Record<string, any>;
        return {
          ok: true,
          message: `Tomedo FHIR API verbunden (${(metadata as any).software?.name || 'FHIR'})`
        };
      } else {
        return { 
          ok: false, 
          message: `FHIR API Fehler: ${response.status} ${response.statusText}` 
        };
      }
    } catch (error) {
      return { 
        ok: false, 
        message: `Verbindungsfehler: ${(error as Error).message}` 
      };
    }
  }

  /**
   * Disconnect and cleanup resources.
   */
  async disconnect(): Promise<void> {
    this.client = null;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Import patient data from Tomedo via FHIR API.
   */
  async importPatient(externalId: string): Promise<FhirPatient> {
    if (!this.client) throw new Error('FHIR-Client nicht initialisiert');
    
    await this.ensureValidToken();
    
    const patient = await this.client.read<FhirPatient>('Patient', externalId);
    
    return patient;
  }

  /**
   * Export patient data to Tomedo via FHIR API.
   */
  async exportPatient(patient: PatientSearchResult): Promise<string> {
    if (!this.client) throw new Error('FHIR-Client nicht initialisiert');

    await this.ensureValidToken();

    // Build FHIR Patient with German Basisprofile
    const fhirPatient: FhirPatient = {
      resourceType: 'Patient',
      meta: {
        profile: ['http://fhir.de/StructureDefinition/patient-de-basis'],
      },
      identifier: [
        {
          system: 'https://diggai.de/sid/patient-id',
          value: patient.pvsPatientId,
        },
        ...(patient.insuranceNr ? [{
          type: {
            coding: [{
              system: 'http://fhir.de/CodeSystem/identifier-type-de-basis',
              code: 'GKV',
            }],
          },
          system: 'http://fhir.de/sid/gkv/kvid-10',
          value: patient.insuranceNr,
        }] : []),
      ],
      name: [{
        use: 'official',
        family: patient.lastName,
        given: [patient.firstName],
      }],
      birthDate: patient.birthDate,
      gender: (patient.gender as FhirPatient['gender']) || 'unknown',
    };

    const created = await this.client.create(fhirPatient);
    
    return created.id || patient.pvsPatientId;
  }

  /**
   * Search for patients in Tomedo via FHIR API.
   */
  async searchPatient(query: { name?: string; birthDate?: string; kvnr?: string }): Promise<PatientSearchResult[]> {
    if (!this.client) throw new Error('FHIR-Client nicht initialisiert');

    await this.ensureValidToken();

    const params: Record<string, string> = {};
    if (query.name) params['name'] = query.name;
    if (query.birthDate) params['birthdate'] = query.birthDate;
    if (query.kvnr) params['identifier'] = `http://fhir.de/sid/gkv/kvid-10|${query.kvnr}`;

    const bundle = await this.client.search<FhirPatient>('Patient', params);
    
    const results: PatientSearchResult[] = [];

    for (const entry of bundle.entry || []) {
      const p = entry.resource as FhirPatient;
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

    return results;
  }

  /**
   * Resolve processing status for a FHIR reference.
   * Used by Tomedo status sync / import chain.
   */
  async fetchStatusByReference(reference: string): Promise<TomedoStatusSnapshot | null> {
    if (!this.client) {
      throw new Error('FHIR-Client nicht initialisiert');
    }

    await this.ensureValidToken();

    const parsed = parseFhirReference(reference);
    if (!parsed) {
      return null;
    }

    try {
      const resource = await this.client.read<FhirResource & Record<string, unknown>>(
        parsed.resourceType,
        parsed.id,
      );

      return buildTomedoStatusSnapshot(parsed.normalized, resource);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (/\b404\b/.test(message)) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Export anamnese results to Tomedo via FHIR Bundle.
   */
  async exportAnamneseResult(session: PatientSessionFull): Promise<TransferResult> {
    if (!this.client) {
      return { success: false, transferLogId: '', error: 'FHIR-Client nicht initialisiert' };
    }

    try {
      await this.ensureValidToken();

      const bundle = buildAnamneseBundle(session);
      
      // Add German Basisprofile to QuestionnaireResponse
      const qrEntry = bundle.entry?.find(e => 
        e.resource?.resourceType === 'QuestionnaireResponse'
      );
      if (qrEntry && qrEntry.resource) {
        (qrEntry.resource as any).meta = {
          profile: ['http://fhir.de/StructureDefinition/questionnaireresponse-de-basis'],
        };
      }

      const result = await this.client.submitBundle(bundle);

      const refIds = (result.entry || [])
        .map(e => e.response?.location)
        .filter(Boolean);

      return {
        success: true,
        transferLogId: `fhir-${Date.now()}`,
        pvsReferenceId: refIds[0] || undefined,
        warnings: [],
      };
    } catch (err) {
      return {
        success: false,
        transferLogId: '',
        error: (err as Error).message,
      };
    }
  }

  /**
   * Get adapter capabilities.
   */
  getCapabilities(): AdapterCapabilities {
    return {
      canImportPatients: true,
      canExportResults: true,
      canExportTherapyPlans: true,
      canReceiveOrders: true,
      canSearchPatients: true,
      supportsRealtime: false,
      supportedSatzarten: [],
      supportedFhirResources: [
        'Patient', 
        'Encounter', 
        'QuestionnaireResponse',
        'Flag', 
        'RiskAssessment', 
        'MedicationStatement',
        'Procedure', 
        'CarePlan',
        'Observation',
        'Condition',
      ],
    };
  }
}
