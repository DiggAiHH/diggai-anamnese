// ============================================
// PVS Test Factory
// ============================================
// Factory for creating test data

import { randomUUID } from 'crypto';
import type { PvsConnectionData, GdtPatientData, PatientSessionFull, FhirPatient } from '../types.js';

export class PvsTestFactory {
  
  static createConnection(overrides: Partial<PvsConnectionData> = {}): PvsConnectionData {
    return {
      id: randomUUID(),
      praxisId: randomUUID(),
      pvsType: 'MEDISTAR',
      protocol: 'GDT',
      isActive: true,
      syncIntervalSec: 30,
      retryCount: 3,
      autoMapFields: true,
      gdtImportDir: '/tmp/gdt/import',
      gdtExportDir: '/tmp/gdt/export',
      gdtSenderId: 'DIGGAI01',
      gdtReceiverId: 'MEDISTAR01',
      gdtEncoding: 'ISO-8859-15',
      ...overrides,
    };
  }

  static createGdtPatient(overrides: Partial<GdtPatientData> = {}): GdtPatientData {
    return {
      patNr: `P${Math.floor(Math.random() * 1000000)}`,
      lastName: 'Muster',
      firstName: 'Max',
      birthDate: new Date('1980-01-01'),
      gender: 'male',
      insuranceType: 'GKV',
      insuranceNr: 'A123456789',
      insuranceName: 'AOK',
      insuranceId: '12345678',
      ...overrides,
    };
  }

  static createPatientSession(overrides: Partial<PatientSessionFull> = {}): PatientSessionFull {
    return {
      id: randomUUID(),
      patientId: randomUUID(),
      patient: {
        id: randomUUID(),
        encryptedName: 'encrypted:Muster,Max',
        birthDate: new Date('1980-01-01'),
        gender: 'male',
        versichertenNr: 'A123456789',
        versichertenArt: 'GKV',
        kassenname: 'AOK',
        kassennummer: '12345678',
        patientNumber: 'P123456',
      },
      status: 'COMPLETED',
      selectedService: 'standard',
      insuranceType: 'GKV',
      createdAt: new Date(),
      completedAt: new Date(),
      answers: [
        { id: randomUUID(), atomId: 'symptoms', value: 'headache', encryptedValue: null },
        { id: randomUUID(), atomId: 'duration', value: '3 days', encryptedValue: null },
      ],
      triageEvents: [],
      ...overrides,
    };
  }

  static createFhirPatient(overrides: Partial<FhirPatient> = {}): FhirPatient {
    return {
      resourceType: 'Patient',
      id: randomUUID(),
      identifier: [{
        type: { coding: [{ system: 'http://fhir.de/NamingSystem/gkv/kvid-10', code: 'GKV' }] },
        system: 'http://fhir.de/NamingSystem/gkv/kvid-10',
        value: 'A123456789',
      }],
      name: [{
        use: 'official',
        family: 'Muster',
        given: ['Max'],
      }],
      birthDate: '1980-01-01',
      gender: 'male',
      ...overrides,
    };
  }

  static createGdtFileContent(patient: Partial<GdtPatientData> = {}): string {
    const p = { ...this.createGdtPatient(), ...patient };
    return `80006342
8100${'DIGGAI01'.padEnd(15, ' ')}
8200${'MEDISTAR01'.padEnd(15, ' ')}
8315${p.insuranceNr}
8316${p.insuranceName}
8401${p.lastName}
8402${p.firstName}
8501${p.patNr}
8601${p.birthDate?.toISOString().split('T')[0].replace(/-/g, '')}
8619${p.gender === 'male' ? 'M' : 'W'}
92006342`;
  }
}

export const testFactory = PvsTestFactory;
