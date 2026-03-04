// ============================================
// FHIR Generic Adapter — HTTP-basiert
// ============================================

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

/**
 * Generic FHIR R4 adapter for any FHIR-capable PVS.
 * Also usable for Doctolib, T2Med FHIR mode, etc.
 */
export class FhirGenericAdapter implements PvsAdapter {
  readonly type: PvsType = 'FHIR_GENERIC';
  readonly supportedProtocols: PvsProtocol[] = ['FHIR'];

  private connection: PvsConnectionData | null = null;
  private client: FhirClient | null = null;

  async initialize(connection: PvsConnectionData): Promise<void> {
    this.connection = connection;

    if (!connection.fhirBaseUrl) {
      throw new Error('FHIR Base URL nicht konfiguriert');
    }

    let credentials: FhirClientConfig['credentials'] = {};

    // Parse encrypted credentials (in real impl: decrypt AES-256-GCM)
    if (connection.fhirCredentials) {
      try {
        credentials = JSON.parse(connection.fhirCredentials);
      } catch {
        credentials = {};
      }
    }

    this.client = new FhirClient({
      baseUrl: connection.fhirBaseUrl,
      authType: (connection.fhirAuthType as FhirClientConfig['authType']) || 'basic',
      credentials,
      timeout: 10000,
      retryCount: connection.retryCount,
    });
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.client) {
      return { ok: false, message: 'FHIR-Client nicht initialisiert' };
    }
    return this.client.testConnection();
  }

  async disconnect(): Promise<void> {
    this.connection = null;
    this.client = null;
  }

  async importPatient(externalId: string): Promise<FhirPatient> {
    if (!this.client) throw new Error('FHIR-Client nicht initialisiert');
    const patient = await this.client.read<FhirPatient>('Patient', externalId);
    return patient;
  }

  async exportPatient(patient: PatientSearchResult): Promise<string> {
    if (!this.client) throw new Error('FHIR-Client nicht initialisiert');

    const fhirPatient: FhirPatient = {
      resourceType: 'Patient',
      identifier: [{
        system: 'https://diggai.de/sid/patient-id',
        value: patient.pvsPatientId,
      }],
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
        results.push({
          pvsPatientId: p.id || '',
          lastName: name?.family || '',
          firstName: name?.given?.[0] || '',
          birthDate: p.birthDate,
          gender: p.gender,
          insuranceNr: p.identifier?.find(i => i.system?.includes('kvid'))?.value,
        });
      }
    }

    return results;
  }

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

  getCapabilities(): AdapterCapabilities {
    return {
      canImportPatients: true,
      canExportResults: true,
      canExportTherapyPlans: true,
      canReceiveOrders: false,
      canSearchPatients: true,
      supportsRealtime: false,
      supportedSatzarten: [],
      supportedFhirResources: [
        'Patient', 'Encounter', 'QuestionnaireResponse',
        'Flag', 'RiskAssessment', 'MedicationStatement',
        'Procedure', 'CarePlan',
      ],
    };
  }
}
