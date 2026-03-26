// ============================================
// PVS Test Setup — Globale Test-Konfiguration
// ============================================

import { vi, beforeAll, afterAll } from 'vitest';

/**
 * Globale Test-Setup für PVS-Tests
 */
export function setupPvsTests() {
  // Mock console methods für sauberere Test-Ausgaben
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  beforeAll(() => {
    // Unterdrücke erwartete Fehlermeldungen in Tests
    console.error = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      if (
        message.includes('[FHIR]') ||
        message.includes('PVS Export failed') ||
        message.includes('Verbindungsfehler')
      ) {
        return; // Ignoriere erwartete Fehler
      }
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      if (message.includes('[PVS]')) {
        return; // Ignoriere erwartete Warnungen
      }
      originalConsoleWarn.apply(console, args);
    };
  });

  afterAll(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });
}

/**
 * Erstellt eine Mock-Verbindung für Tests
 */
export function createMockConnection(overrides: Partial<any> = {}): any {
  return {
    id: 'test-conn-1',
    praxisId: 'praxis-test',
    pvsType: 'TOMEDO',
    protocol: 'FHIR',
    fhirBaseUrl: 'https://api.test.de/fhir/R4',
    fhirAuthType: 'oauth2',
    fhirCredentials: JSON.stringify({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    }),
    isActive: true,
    syncIntervalSec: 60,
    retryCount: 3,
    autoMapFields: true,
    ...overrides,
  };
}

/**
 * Erstellt eine GDT-basierte Mock-Verbindung
 */
export function createMockGdtConnection(overrides: Partial<any> = {}): any {
  return {
    id: 'test-gdt-conn-1',
    praxisId: 'praxis-test',
    pvsType: 'MEDISTAR',
    protocol: 'GDT',
    gdtImportDir: '/tmp/test/import',
    gdtExportDir: '/tmp/test/export',
    gdtSenderId: 'DIGGAI01',
    gdtReceiverId: 'PVS01',
    isActive: true,
    syncIntervalSec: 30,
    retryCount: 3,
    autoMapFields: true,
    ...overrides,
  };
}

/**
 * Erstellt einen Mock-Patienten
 */
export function createMockPatient(overrides: Partial<any> = {}): any {
  return {
    pvsPatientId: 'PAT-12345',
    pvsPatientNr: '12345',
    lastName: 'Mustermann',
    firstName: 'Max',
    birthDate: '1980-01-15',
    gender: 'male',
    insuranceNr: 'A123456789',
    ...overrides,
  };
}

/**
 * Erstellt eine Mock-PatientSession
 */
export function createMockSession(overrides: Partial<any> = {}): any {
  return {
    id: 'session-test-001',
    patientId: 'patient-001',
    patient: {
      id: 'patient-001',
      encryptedName: null,
      birthDate: new Date('1980-01-15'),
      gender: 'male',
      versichertenNr: 'A123456789',
      versichertenArt: '1',
      kassenname: 'TestKasse',
      kassennummer: '123456',
      patientNumber: '12345',
    },
    status: 'COMPLETED',
    selectedService: 'ANAMNESE',
    insuranceType: 'GKV',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    completedAt: new Date('2024-01-15T10:15:00Z'),
    answers: [
      { id: 'ans-1', atomId: 'chief_complaint', value: 'Schmerzen', encryptedValue: null },
      { id: 'ans-2', atomId: 'pain_level', value: '7', encryptedValue: null },
      { id: 'ans-3', atomId: 'allergies', value: 'Pollen', encryptedValue: null },
    ],
    triageEvents: [
      { id: 'triage-1', level: 'WARNING', atomId: 'pain_level', triggerValues: '7', message: 'Hoher Schmerzwert' },
    ],
    ...overrides,
  };
}

/**
 * Erstellt einen Mock-FHIR Patienten
 */
export function createMockFhirPatient(overrides: Partial<any> = {}): any {
  return {
    resourceType: 'Patient',
    id: 'fhir-pat-001',
    meta: {
      profile: ['http://fhir.de/StructureDefinition/patient-de-basis'],
    },
    identifier: [
      {
        system: 'https://diggai.de/sid/patient-id',
        value: 'patient-001',
      },
      {
        type: {
          coding: [{
            system: 'http://fhir.de/CodeSystem/identifier-type-de-basis',
            code: 'GKV',
          }],
        },
        system: 'http://fhir.de/sid/gkv/kvid-10',
        value: 'A123456789',
      },
    ],
    name: [{
      use: 'official',
      family: 'Mustermann',
      given: ['Max'],
    }],
    birthDate: '1980-01-15',
    gender: 'male',
    ...overrides,
  };
}

/**
 * Erstellt ein Mock-FHIR Bundle
 */
export function createMockFhirBundle(overrides: Partial<any> = {}): any {
  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: [
      {
        fullUrl: 'urn:uuid:patient-001',
        resource: createMockFhirPatient(),
        request: { method: 'POST', url: 'Patient' },
      },
      {
        fullUrl: 'urn:uuid:session-001',
        resource: {
          resourceType: 'Encounter',
          status: 'finished',
          class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
          subject: { reference: 'Patient/patient-001' },
          period: {
            start: '2024-01-15T10:00:00Z',
            end: '2024-01-15T10:15:00Z',
          },
        },
        request: { method: 'POST', url: 'Encounter' },
      },
    ],
    ...overrides,
  };
}

/**
 * Hilfsfunktion für asynchrone Delays
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Erstellt einen Mock-Fetch-Response
 */
export function createMockFetchResponse(options: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  json?: any;
  text?: string;
}): Response {
  const {
    ok = true,
    status = 200,
    statusText = 'OK',
    json = {},
    text = '',
  } = options;

  return {
    ok,
    status,
    statusText,
    json: async () => json,
    text: async () => text,
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: () => createMockFetchResponse(options),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob([]),
    formData: async () => new FormData(),
  } as Response;
}
