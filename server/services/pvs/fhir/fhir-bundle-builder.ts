// ============================================
// FHIR R4 Bundle Builder für Anamnese-Export
// ============================================
// Erstellt komplette FHIR Bundles mit deutschen Basisprofilen
// Unterstützt: Anamnese-Export, Befundbericht, Vitalparameter

import type {
  FhirPatient,
  FhirEncounter,
  FhirQuestionnaireResponse,
  FhirBundle,
  FhirObservation,
  FhirComposition,
  FhirFlag,
  FhirRiskAssessment,
  FhirMedicationStatement,
  FhirProcedure,
  FhirCondition,
  FhirCoverage,
  PatientSessionFull,
} from '../types.js';

import {
  PROFILE_PATIENT_DE_BASIS,
  PROFILE_ENCOUNTER_DE_BASIS,
  PROFILE_QUESTIONNAIRE_RESPONSE_DE_BASIS,
  PROFILE_OBSERVATION_DE_VITALSIGN,
  PROFILE_COMPOSITION_DE_BASIS,
  PROFILE_MEDICATION_STATEMENT_DE_BASIS,
  PROFILE_PROCEDURE_DE_BASIS,
  PROFILE_CONDITION_DE_BASIS,
  PROFILE_COVERAGE_DE_BASIS,
  PROFILE_BUNDLE_DE_BASIS,
  NAMINGSYSTEM_GKV_KVID_10,
  NAMINGSYSTEM_GKV_PKN,
  CODESYSTEM_VERSICHERUNGSART_DE_BASIS,
  CODESYSTEM_IDENTIFIER_TYPE_DE_BASIS,
  getProfileUrl,
} from './german-profiles.js';

// ─── Bundle-Konfiguration ──────────────────────────────────

export interface BundleConfig {
  bundleType: 'transaction' | 'batch' | 'document' | 'collection';
  includeMetadata: boolean;
  timestamp: string;
  authorRef?: string;
  organizationRef?: string;
  generateNarrative: boolean;
}

export const DEFAULT_BUNDLE_CONFIG: BundleConfig = {
  bundleType: 'transaction',
  includeMetadata: true,
  timestamp: new Date().toISOString(),
  generateNarrative: true,
};

// ─── Narrative Generator ───────────────────────────────────

function generateNarrative(divContent: string): { status: 'generated'; div: string } {
  return {
    status: 'generated',
    div: `<div xmlns="http://www.w3.org/1999/xhtml">${divContent}</div>`,
  };
}

function generatePatientNarrative(patient: Partial<FhirPatient>): { status: 'generated'; div: string } {
  const name = patient.name?.[0];
  const nameStr = name ? `${name.given?.join(' ') || ''} ${name.family || ''}`.trim() : 'Unbekannt';
  const birthDate = patient.birthDate || 'unbekannt';
  const gender = patient.gender === 'male' ? 'männlich' : 
                 patient.gender === 'female' ? 'weiblich' : 
                 patient.gender === 'other' ? 'divers' : 'unbekannt';
  
  return generateNarrative(`
    <p><b>Name:</b> ${escapeXml(nameStr)}</p>
    <p><b>Geburtsdatum:</b> ${birthDate}</p>
    <p><b>Geschlecht:</b> ${gender}</p>
  `);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── Ressourcen-Builder ────────────────────────────────────

export interface BuildPatientOptions {
  includeNarrative?: boolean;
  includeAddress?: boolean;
  insuranceInfo?: {
    type: 'GKV' | 'PKV' | 'BG';
    kvnr?: string;
    pkn?: string;
    kassenname?: string;
    kassennummer?: string;
  };
}

/**
 * Erstellt einen Patienten nach Patient-de-basis Profil
 */
export function buildPatientDeBasis(
  session: PatientSessionFull,
  options: BuildPatientOptions = {}
): FhirPatient {
  const patient = session.patient;
  if (!patient) {
    throw new Error('Patient-Daten fehlen');
  }

  const identifiers: FhirPatient['identifier'] = [
    {
      system: 'https://diggai.de/sid/patient-id',
      value: patient.id,
    },
  ];

  // KVNR hinzufügen
  if (patient.versichertenNr) {
    identifiers.push({
      type: {
        coding: [{
          system: CODESYSTEM_IDENTIFIER_TYPE_DE_BASIS,
          code: patient.versichertenArt === 'PKV' ? 'PKV' : 'GKV',
          display: patient.versichertenArt === 'PKV' ? 'Private Krankenversicherung' : 'Gesetzliche Krankenversicherung',
        }],
      },
      system: patient.versichertenArt === 'PKV' ? NAMINGSYSTEM_GKV_PKN : NAMINGSYSTEM_GKV_KVID_10,
      value: patient.versichertenNr,
    });
  }

  // Versichertennummer aus Versicherungsinfo
  if (options.insuranceInfo?.kvnr && !patient.versichertenNr) {
    identifiers.push({
      type: {
        coding: [{
          system: CODESYSTEM_IDENTIFIER_TYPE_DE_BASIS,
          code: 'GKV',
          display: 'Gesetzliche Krankenversicherung',
        }],
      },
      system: NAMINGSYSTEM_GKV_KVID_10,
      value: options.insuranceInfo.kvnr,
    });
  }

  // PKV Nummer
  if (options.insuranceInfo?.pkn) {
    identifiers.push({
      type: {
        coding: [{
          system: CODESYSTEM_IDENTIFIER_TYPE_DE_BASIS,
          code: 'PKV',
          display: 'Private Krankenversicherung',
        }],
      },
      system: NAMINGSYSTEM_GKV_PKN,
      value: options.insuranceInfo.pkn,
    });
  }

  const result: FhirPatient = {
    resourceType: 'Patient',
    meta: {
      profile: [getProfileUrl(PROFILE_PATIENT_DE_BASIS)],
    },
    identifier: identifiers,
    name: [{
      use: 'official',
      family: 'Patient', // Verschlüsselt in DB
      given: [patient.patientNumber || patient.id.substring(0, 8)],
    }],
    gender: mapGender(patient.gender),
  };

  if (patient.birthDate) {
    result.birthDate = new Date(patient.birthDate).toISOString().split('T')[0];
  }

  if (options.includeNarrative !== false) {
    result.text = generatePatientNarrative(result);
  }

  return result;
}

function mapGender(g?: string | null): 'male' | 'female' | 'other' | 'unknown' {
  if (!g) return 'unknown';
  switch (g.toUpperCase()) {
    case 'M':
    case 'MALE':
    case 'MAENNLICH':
      return 'male';
    case 'W':
    case 'F':
    case 'FEMALE':
    case 'WEIBLICH':
      return 'female';
    case 'D':
    case 'DIVERSE':
    case 'OTHER':
      return 'other';
    default:
      return 'unknown';
  }
}

/**
 * Erstellt einen Encounter nach Encounter-de-basis Profil
 */
export function buildEncounterDeBasis(
  session: PatientSessionFull,
  patientRef: string
): FhirEncounter {
  return {
    resourceType: 'Encounter',
    meta: {
      profile: [getProfileUrl(PROFILE_ENCOUNTER_DE_BASIS)],
    },
    status: session.status === 'COMPLETED' ? 'finished' : 'in-progress',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory',
    },
    subject: {
      reference: patientRef,
    },
    period: {
      start: new Date(session.createdAt).toISOString(),
      end: session.completedAt ? new Date(session.completedAt).toISOString() : undefined,
    },
    reasonCode: session.selectedService ? [{
      text: session.selectedService,
    }] : undefined,
  };
}

/**
 * Erstellt eine Coverage (Versicherung) nach Coverage-de-basis
 */
export function buildCoverageDeBasis(
  session: PatientSessionFull,
  patientRef: string,
  payorRef?: string
): FhirCoverage | null {
  const patient = session.patient;
  if (!patient?.versichertenNr && !patient?.kassennummer) {
    return null;
  }

  const isPKV = patient.versichertenArt === 'PKV';
  
  return {
    resourceType: 'Coverage',
    meta: {
      profile: [getProfileUrl(PROFILE_COVERAGE_DE_BASIS)],
    },
    status: 'active',
    type: {
      coding: [{
        system: CODESYSTEM_VERSICHERUNGSART_DE_BASIS,
        code: isPKV ? 'PKV' : 'GKV',
        display: isPKV ? 'Private Krankenversicherung' : 'Gesetzliche Krankenversicherung',
      }],
    },
    beneficiary: {
      reference: patientRef,
    },
    subscriberId: patient.versichertenNr || undefined,
    payor: payorRef ? [{
      reference: payorRef,
    }] : [{
      display: patient.kassenname || 'Unbekannte Kasse',
    }],
  };
}

/**
 * Erstellt einen QuestionnaireResponse nach deutschem Profil
 */
export function buildQuestionnaireResponseDeBasis(
  session: PatientSessionFull,
  patientRef: string,
  encounterRef: string
): FhirQuestionnaireResponse {
  const items = session.answers.map(a => {
    let answerValue: Array<{
      valueString?: string;
      valueInteger?: number;
      valueBoolean?: boolean;
      valueDate?: string;
    }> = [];

    try {
      const parsed = JSON.parse(a.value);
      const data = parsed.data ?? parsed.value ?? a.value;

      if (typeof data === 'boolean') {
        answerValue = [{ valueBoolean: data }];
      } else if (typeof data === 'number') {
        answerValue = [{ valueInteger: data }];
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        answerValue = [{ valueDate: data }];
      } else {
        answerValue = [{ valueString: String(data) }];
      }
    } catch {
      answerValue = [{ valueString: a.value }];
    }

    return {
      linkId: a.atomId,
      answer: answerValue,
    };
  });

  return {
    resourceType: 'QuestionnaireResponse',
    meta: {
      profile: [getProfileUrl(PROFILE_QUESTIONNAIRE_RESPONSE_DE_BASIS)],
    },
    questionnaire: 'https://diggai.de/fhir/Questionnaire/anamnese-v1',
    status: session.status === 'COMPLETED' ? 'completed' : 'in-progress',
    subject: {
      reference: patientRef,
    },
    encounter: {
      reference: encounterRef,
    },
    authored: new Date(session.createdAt).toISOString(),
    item: items,
  };
}

/**
 * Erstellt eine Observation für Vitalparameter
 */
export function buildVitalSignObservation(
  code: string,
  display: string,
  value: number,
  unit: string,
  system: string,
  patientRef: string,
  encounterRef?: string,
  effectiveDateTime?: string
): FhirObservation {
  return {
    resourceType: 'Observation',
    meta: {
      profile: [getProfileUrl(PROFILE_OBSERVATION_DE_VITALSIGN)],
    },
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'vital-signs',
        display: 'Vital Signs',
      }],
    }],
    code: {
      coding: [{
        system,
        code,
        display,
      }],
      text: display,
    },
    subject: {
      reference: patientRef,
    },
    encounter: encounterRef ? {
      reference: encounterRef,
    } : undefined,
    effectiveDateTime: effectiveDateTime || new Date().toISOString(),
    valueQuantity: {
      value,
      unit,
      system: 'http://unitsofmeasure.org',
      code: unit,
    },
  };
}

/**
 * Erstellt eine Composition für den Befundbericht
 */
export function buildCompositionDeBasis(
  session: PatientSessionFull,
  patientRef: string,
  encounterRef: string,
  sectionEntries: string[]
): FhirComposition {
  return {
    resourceType: 'Composition',
    meta: {
      profile: [getProfileUrl(PROFILE_COMPOSITION_DE_BASIS)],
    },
    status: 'final',
    type: {
      coding: [{
        system: 'http://loinc.org',
        code: '11488-4',
        display: 'Consult note',
      }],
      text: 'Anamnese-Befundbericht',
    },
    subject: {
      reference: patientRef,
    },
    encounter: {
      reference: encounterRef,
    },
    date: new Date().toISOString(),
    title: 'Anamnese-Befundbericht',
    section: [{
      title: 'Anamnese-Ergebnisse',
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '11329-0',
          display: 'History.general',
        }],
      },
      entry: sectionEntries.map(ref => ({ reference: ref })),
    }],
  };
}

/**
 * Erstellt einen Triage-Flag
 */
export function buildTriageFlag(
  triage: PatientSessionFull['triageEvents'][0],
  patientRef: string
): FhirFlag {
  const levelMap: Record<string, { code: string; display: string; priority: string }> = {
    'CRITICAL': { code: 'critical', display: 'Kritisch', priority: 'stat' },
    'WARNING': { code: 'warning', display: 'Warnung', priority: 'urgent' },
    'INFO': { code: 'info', display: 'Information', priority: 'routine' },
  };

  const mapped = levelMap[triage.level] || levelMap['INFO'];

  return {
    resourceType: 'Flag',
    status: 'active',
    category: [{
      coding: [{
        system: 'https://diggai.de/fhir/CodeSystem/triage-category',
        code: 'triage',
        display: 'Triage-Flag',
      }],
    }],
    code: {
      text: triage.message,
      coding: [{
        system: 'https://diggai.de/fhir/CodeSystem/triage-level',
        code: mapped.code,
        display: mapped.display,
      }],
    },
    subject: { reference: patientRef },
    period: { start: new Date().toISOString() },
  };
}

/**
 * Erstellt eine RiskAssessment Ressource
 */
export function buildRiskAssessment(
  triage: PatientSessionFull['triageEvents'][0],
  patientRef: string,
  encounterRef: string
): FhirRiskAssessment {
  return {
    resourceType: 'RiskAssessment',
    status: 'final',
    subject: { reference: patientRef },
    encounter: { reference: encounterRef },
    prediction: [{
      outcome: { text: triage.message },
      qualitativeRisk: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/risk-probability',
          code: triage.level === 'CRITICAL' ? 'high' : triage.level === 'WARNING' ? 'moderate' : 'low',
          display: triage.level === 'CRITICAL' ? 'Hohes Risiko' : triage.level === 'WARNING' ? 'Mittleres Risiko' : 'Niedriges Risiko',
        }],
      },
    }],
  };
}

/**
 * Erstellt eine MedicationStatement Ressource
 */
export function buildMedicationStatementDeBasis(
  med: {
    name: string;
    dosage: string;
    frequency: string;
    notes?: string | null;
    pzn?: string;
  },
  patientRef: string
): FhirMedicationStatement {
  const result: FhirMedicationStatement = {
    resourceType: 'MedicationStatement',
    meta: {
      profile: [getProfileUrl(PROFILE_MEDICATION_STATEMENT_DE_BASIS)],
    },
    status: 'active',
    medicationCodeableConcept: {
      text: med.name,
      coding: med.pzn ? [{
        system: 'http://fhir.de/NamingSystem/pzn',
        code: med.pzn,
        display: med.name,
      }] : undefined,
    },
    subject: { reference: patientRef },
    dosage: [{
      text: `${med.dosage} ${med.frequency}${med.notes ? ' – ' + med.notes : ''}`,
    }],
  };

  return result;
}

/**
 * Erstellt eine Procedure Ressource
 */
export function buildProcedureDeBasis(
  surgery: {
    surgeryName: string;
    date?: string | null;
    complications?: string | null;
    notes?: string | null;
    opsCode?: string;
  },
  patientRef: string
): FhirProcedure {
  const result: FhirProcedure = {
    resourceType: 'Procedure',
    meta: {
      profile: [getProfileUrl(PROFILE_PROCEDURE_DE_BASIS)],
    },
    status: 'completed',
    code: {
      text: surgery.surgeryName,
      coding: surgery.opsCode ? [{
        system: 'http://fhir.de/CodeSystem/ops',
        code: surgery.opsCode,
        display: surgery.surgeryName,
      }] : undefined,
    },
    subject: { reference: patientRef },
  };

  if (surgery.date) {
    // Prüfe ob es nur ein Jahr oder ein vollständiges Datum ist
    if (/^\d{4}$/.test(surgery.date)) {
      result.performedPeriod = {
        start: `${surgery.date}-01-01`,
        end: `${surgery.date}-12-31`,
      };
    } else if (/^\d{4}-\d{2}$/.test(surgery.date)) {
      result.performedDateTime = `${surgery.date}-01`;
    } else {
      result.performedDateTime = surgery.date;
    }
  }

  if (surgery.notes || surgery.complications) {
    result.note = [{
      text: [surgery.notes, surgery.complications].filter(Boolean).join('. '),
    }];
  }

  return result;
}

// ─── Bundle Builder ────────────────────────────────────────

export interface AnamneseBundleData {
  session: PatientSessionFull;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    notes?: string | null;
    pzn?: string;
  }>;
  surgeries?: Array<{
    surgeryName: string;
    date?: string | null;
    complications?: string | null;
    notes?: string | null;
    opsCode?: string;
  }>;
  vitalSigns?: Array<{
    code: string;
    display: string;
    value: number;
    unit: string;
    system: string;
    effectiveDateTime?: string;
  }>;
  insuranceInfo?: BuildPatientOptions['insuranceInfo'];
  config?: Partial<BundleConfig>;
}

/**
 * Baut ein komplettes Anamnese-Bundle mit deutschen Profilen
 */
export function buildAnamneseBundleDeBasis(data: AnamneseBundleData): FhirBundle {
  const config = { ...DEFAULT_BUNDLE_CONFIG, ...data.config };
  const { session } = data;
  
  const entries: FhirBundle['entry'] = [];
  const sectionEntries: string[] = [];
  
  // Generate UUIDs für interne Referenzen
  const patientUuid = session.patient?.id || `patient-${session.id}`;
  const encounterUuid = `encounter-${session.id}`;
  const compositionUuid = `composition-${session.id}`;
  
  const patientRef = `urn:uuid:${patientUuid}`;
  const encounterRef = `urn:uuid:${encounterUuid}`;
  
  // 1. Patient
  if (session.patient) {
    const patient = buildPatientDeBasis(session, {
      includeNarrative: config.generateNarrative,
      insuranceInfo: data.insuranceInfo,
    });
    
    entries.push({
      fullUrl: patientRef,
      resource: patient,
      request: { method: 'POST', url: 'Patient' },
    });
  }
  
  // 2. Coverage (Versicherung)
  if (session.patient?.versichertenNr || session.patient?.kassennummer) {
    const coverage = buildCoverageDeBasis(session, patientRef);
    if (coverage) {
      const coverageUuid = `coverage-${session.id}`;
      entries.push({
        fullUrl: `urn:uuid:${coverageUuid}`,
        resource: coverage,
        request: { method: 'POST', url: 'Coverage' },
      });
    }
  }
  
  // 3. Encounter
  const encounter = buildEncounterDeBasis(session, patientRef);
  entries.push({
    fullUrl: encounterRef,
    resource: encounter,
    request: { method: 'POST', url: 'Encounter' },
  });
  
  // 4. QuestionnaireResponse
  const qr = buildQuestionnaireResponseDeBasis(session, patientRef, encounterRef);
  const qrUuid = `qr-${session.id}`;
  entries.push({
    fullUrl: `urn:uuid:${qrUuid}`,
    resource: qr,
    request: { method: 'POST', url: 'QuestionnaireResponse' },
  });
  sectionEntries.push(`urn:uuid:${qrUuid}`);
  
  // 5. Triage Flags und RiskAssessments
  for (const triage of session.triageEvents) {
    const flag = buildTriageFlag(triage, patientRef);
    const flagUuid = `flag-${triage.id}`;
    entries.push({
      fullUrl: `urn:uuid:${flagUuid}`,
      resource: flag,
      request: { method: 'POST', url: 'Flag' },
    });
    sectionEntries.push(`urn:uuid:${flagUuid}`);
    
    const risk = buildRiskAssessment(triage, patientRef, encounterRef);
    const riskUuid = `risk-${triage.id}`;
    entries.push({
      fullUrl: `urn:uuid:${riskUuid}`,
      resource: risk,
      request: { method: 'POST', url: 'RiskAssessment' },
    });
    sectionEntries.push(`urn:uuid:${riskUuid}`);
  }
  
  // 6. Vitalparameter (Observations)
  if (data.vitalSigns) {
    for (const vital of data.vitalSigns) {
      const obs = buildVitalSignObservation(
        vital.code,
        vital.display,
        vital.value,
        vital.unit,
        vital.system,
        patientRef,
        encounterRef,
        vital.effectiveDateTime
      );
      const obsUuid = `obs-${vital.code}-${Date.now()}`;
      entries.push({
        fullUrl: `urn:uuid:${obsUuid}`,
        resource: obs,
        request: { method: 'POST', url: 'Observation' },
      });
      sectionEntries.push(`urn:uuid:${obsUuid}`);
    }
  }
  
  // 7. Medications
  if (data.medications) {
    for (const med of data.medications) {
      const medStatement = buildMedicationStatementDeBasis(med, patientRef);
      const medUuid = `med-${med.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
      entries.push({
        fullUrl: `urn:uuid:${medUuid}`,
        resource: medStatement,
        request: { method: 'POST', url: 'MedicationStatement' },
      });
      sectionEntries.push(`urn:uuid:${medUuid}`);
    }
  }
  
  // 8. Surgeries (Procedures)
  if (data.surgeries) {
    for (const surgery of data.surgeries) {
      const procedure = buildProcedureDeBasis(surgery, patientRef);
      const procUuid = `proc-${surgery.surgeryName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
      entries.push({
        fullUrl: `urn:uuid:${procUuid}`,
        resource: procedure,
        request: { method: 'POST', url: 'Procedure' },
      });
      sectionEntries.push(`urn:uuid:${procUuid}`);
    }
  }
  
  // 9. Composition (Befundbericht)
  if (config.bundleType === 'document') {
    const composition = buildCompositionDeBasis(session, patientRef, encounterRef, sectionEntries);
    entries.unshift({
      fullUrl: `urn:uuid:${compositionUuid}`,
      resource: composition,
      request: { method: 'POST', url: 'Composition' },
    });
  }
  
  return {
    resourceType: 'Bundle',
    meta: {
      profile: [getProfileUrl(PROFILE_BUNDLE_DE_BASIS)],
    },
    type: config.bundleType,
    timestamp: config.timestamp,
    entry: entries,
  };
}

/**
 * Baut ein einfaches Transaction Bundle für schnellen Export
 */
export function buildSimpleTransactionBundle(
  session: PatientSessionFull,
  options?: {
    includeMedications?: boolean;
    includeSurgeries?: boolean;
  }
): FhirBundle {
  return buildAnamneseBundleDeBasis({
    session,
    config: {
      bundleType: 'transaction',
      includeMetadata: true,
      timestamp: new Date().toISOString(),
      generateNarrative: true,
    },
  });
}

/**
 * Baut ein Document Bundle für PDF-Export/Archivierung
 */
export function buildDocumentBundle(
  session: PatientSessionFull,
  authorRef?: string
): FhirBundle {
  return buildAnamneseBundleDeBasis({
    session,
    config: {
      bundleType: 'document',
      includeMetadata: true,
      timestamp: new Date().toISOString(),
      authorRef,
      generateNarrative: true,
    },
  });
}
