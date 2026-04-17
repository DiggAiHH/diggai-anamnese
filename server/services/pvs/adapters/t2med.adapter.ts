// ============================================
// T2Med Adapter — FHIR R4
// ============================================
// T2Med Systems GmbH - Platz 3 in Usability (Zi-Studie 2025)
// Moderne FHIR R4 API mit API-Key Authentifizierung

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
} from '../types.js';
import { FhirClient } from '../fhir/fhir-client.js';
import { buildAnamneseBundle, patientToFhir } from '../fhir/fhir-mapper.js';
import { parseStoredFhirCredentials } from '../security/credentials-parser.js';

/**
 * Adapter for T2Med PVS systems.
 * Uses FHIR R4 with API-Key authentication.
 * 
 * T2Med-spezifische Eigenschaften:
 * - FHIR R4 Standard
 * - API-Key Authentifizierung (einfacher als OAuth2)
 * - Gute API-Dokumentation
 * - Platz 3 in Zi-Studie 2025 (Note 1.8)
 * - REST und FHIR Endpunkte verfügbar
 * 
 * API-Endpunkte:
 * - Base: /fhir/R4
 * - Patient: /fhir/R4/Patient
 * - Termine: /api/v1/appointments (proprietär)
 * - QuestionnaireResponse: /fhir/R4/QuestionnaireResponse
 */
export class T2MedAdapter implements PvsAdapter {
  readonly type: PvsType = 'T2MED';
  readonly supportedProtocols: PvsProtocol[] = ['FHIR', 'REST'];

  private client: FhirClient | null = null;
  private apiKey: string | null = null;

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
        this.apiKey = credentials.apiKey || null;
      } catch {
        credentials = {};
      }
    }

    this.client = new FhirClient({
      baseUrl: connection.fhirBaseUrl,
      authType: (connection.fhirAuthType as FhirClientConfig['authType']) || 'apikey',
      credentials,
      timeout: 10000,
      retryCount: connection.retryCount,
    });
  }

  /**
   * Get headers with API key for T2Med requests.
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/fhir+json',
    };
    
    if (this.apiKey) {
      // T2Med unterstützt beide Varianten: X-API-Key oder Authorization Bearer
      headers['X-API-Key'] = this.apiKey;
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }

  /**
   * Test the connection to T2Med FHIR API.
   */
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.client) {
      return { ok: false, message: 'FHIR-Client nicht initialisiert' };
    }

    try {
      // Try to read the capability statement
      const response = await fetch(`${(this.client as any).config?.baseUrl ?? ''}/metadata`, {
        headers: this.getHeaders(),
      });

      if (response.ok) {
        const metadata = await response.json() as Record<string, any>;
        return {
          ok: true,
          message: `T2Med FHIR API verbunden (${(metadata as any).software?.name || 'FHIR R4'})`
        };
      } else if (response.status === 401) {
        return { 
          ok: false, 
          message: 'Authentifizierung fehlgeschlagen: Ungültiger API-Key' 
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
    this.apiKey = null;
  }

  /**
   * Import patient data from T2Med via FHIR API.
   */
  async importPatient(externalId: string): Promise<FhirPatient> {
    if (!this.client) throw new Error('FHIR-Client nicht initialisiert');
    
    const patient = await this.client.read<FhirPatient>('Patient', externalId);
    
    return patient;
  }

  /**
   * Export patient data to T2Med via FHIR API.
   */
  async exportPatient(patient: PatientSearchResult): Promise<string> {
    if (!this.client) throw new Error('FHIR-Client nicht initialisiert');

    const fhirPatient: FhirPatient = {
      resourceType: 'Patient',
      identifier: [
        {
          system: 'https://diggai.de/sid/patient-id',
          value: patient.pvsPatientId,
        },
        ...(patient.insuranceNr ? [{
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
   * Search for patients in T2Med via FHIR API.
   */
  async searchPatient(query: { name?: string; birthDate?: string; kvnr?: string }): Promise<PatientSearchResult[]> {
    if (!this.client) throw new Error('FHIR-Client nicht initialisiert');

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
          i.system?.includes('kvid')
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
   * Export anamnese results to T2Med via FHIR Bundle.
   */
  async exportAnamneseResult(session: PatientSessionFull): Promise<TransferResult> {
    if (!this.client) {
      return { success: false, transferLogId: '', error: 'FHIR-Client nicht initialisiert' };
    }

    try {
      const bundle = buildAnamneseBundle(session);
      
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
        'Appointment',
      ],
    };
  }
}
