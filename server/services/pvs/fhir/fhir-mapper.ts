// ============================================
// FHIR R4 Mapper — DiggAI ↔ FHIR Resources
// ============================================

import type {
  PatientSessionFull,
  FhirPatient,
  FhirEncounter,
  FhirQuestionnaireResponse,
  FhirQRItem,
  FhirFlag,
  FhirRiskAssessment,
  FhirMedicationStatement,
  FhirProcedure,
  FhirBundle,
} from '../types.js';

// ─── Gender Mapping ─────────────────────────────────────────

function mapGender(g?: string | null): 'male' | 'female' | 'other' | 'unknown' {
  if (!g) return 'unknown';
  switch (g.toUpperCase()) {
    case 'M': case 'MALE': return 'male';
    case 'W': case 'F': case 'FEMALE': return 'female';
    case 'D': case 'DIVERSE': case 'OTHER': return 'other';
    default: return 'unknown';
  }
}

// ─── Patient → FHIR Patient ────────────────────────────────

export function patientToFhir(patient: PatientSessionFull['patient']): FhirPatient | null {
  if (!patient) return null;

  const identifiers: FhirPatient['identifier'] = [
    {
      system: 'https://diggai.de/sid/patient-id',
      value: patient.id,
    },
  ];

  if (patient.versichertenNr) {
    identifiers.push({
      type: { coding: [{ system: 'http://fhir.de/CodeSystem/identifier-type-de-basis', code: 'GKV' }] },
      system: 'http://fhir.de/sid/gkv/kvid-10',
      value: patient.versichertenNr,
    });
  }

  return {
    resourceType: 'Patient',
    meta: {
      profile: ['https://fhir.kbv.de/StructureDefinition/KBV_PR_Base_Patient|1.5.0'],
    },
    identifier: identifiers,
    name: [{
      use: 'official',
      family: 'Patient', // encrypted in DB — would need decryption
      given: [patient.patientNumber || patient.id.substring(0, 8)],
    }],
    birthDate: patient.birthDate ? new Date(patient.birthDate).toISOString().split('T')[0] : undefined,
    gender: mapGender(patient.gender),
  };
}

// ─── Session → FHIR Encounter ───────────────────────────────

export function sessionToEncounter(session: PatientSessionFull): FhirEncounter {
  return {
    resourceType: 'Encounter',
    meta: {
      profile: ['https://fhir.kbv.de/StructureDefinition/KBV_PR_Base_Encounter|1.5.0'],
    },
    status: session.status === 'COMPLETED' ? 'finished' : 'in-progress',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
    },
    subject: {
      reference: `Patient/${session.patient?.id || session.patientId}`,
    },
    period: {
      start: new Date(session.createdAt).toISOString(),
      end: session.completedAt ? new Date(session.completedAt).toISOString() : undefined,
    },
    reasonCode: [{
      text: session.selectedService,
    }],
  };
}

// ─── Answers → FHIR QuestionnaireResponse ───────────────────

export function answersToQuestionnaireResponse(
  session: PatientSessionFull,
): FhirQuestionnaireResponse {
  const items: FhirQRItem[] = session.answers.map(a => {
    let answerValue: FhirQRItem['answer'] = undefined;

    try {
      const parsed = JSON.parse(a.value);
      const data = parsed.data ?? parsed.value ?? a.value;

      if (typeof data === 'boolean') {
        answerValue = [{ valueBoolean: data }];
      } else if (typeof data === 'number') {
        answerValue = [{ valueInteger: data }];
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
    questionnaire: 'https://diggai.de/fhir/Questionnaire/anamnese-v1',
    status: session.status === 'COMPLETED' ? 'completed' : 'in-progress',
    subject: {
      reference: `Patient/${session.patient?.id || session.patientId}`,
    },
    encounter: {
      reference: `Encounter/${session.id}`,
    },
    authored: new Date(session.createdAt).toISOString(),
    item: items,
  };
}

// ─── TriageEvent → FHIR Flag + RiskAssessment ───────────────

export function triageToFhir(
  triage: PatientSessionFull['triageEvents'][0],
  patientRef: string,
  encounterRef: string,
): [FhirFlag, FhirRiskAssessment] {
  const flag: FhirFlag = {
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
        code: triage.level.toLowerCase(),
        display: triage.level === 'CRITICAL' ? 'Kritisch' : 'Warnung',
      }],
    },
    subject: { reference: patientRef },
    period: { start: new Date().toISOString() },
  };

  const risk: FhirRiskAssessment = {
    resourceType: 'RiskAssessment',
    status: 'final',
    subject: { reference: patientRef },
    encounter: { reference: encounterRef },
    prediction: [{
      outcome: { text: triage.message },
      qualitativeRisk: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/risk-probability',
          code: triage.level === 'CRITICAL' ? 'high' : 'moderate',
          display: triage.level === 'CRITICAL' ? 'Hohes Risiko' : 'Mittleres Risiko',
        }],
      },
    }],
  };

  return [flag, risk];
}

// ─── Medication → FHIR MedicationStatement ──────────────────

export function medicationToFhir(
  med: { name: string; dosage: string; frequency: string; notes?: string | null },
  patientRef: string,
): FhirMedicationStatement {
  return {
    resourceType: 'MedicationStatement',
    status: 'active',
    medicationCodeableConcept: { text: med.name },
    subject: { reference: patientRef },
    dosage: [{ text: `${med.dosage} ${med.frequency}${med.notes ? ' – ' + med.notes : ''}` }],
  };
}

// ─── Surgery → FHIR Procedure ───────────────────────────────

export function surgeryToFhir(
  surgery: { surgeryName: string; date?: string | null; complications?: string | null; notes?: string | null },
  patientRef: string,
): FhirProcedure {
  return {
    resourceType: 'Procedure',
    status: 'completed',
    code: { text: surgery.surgeryName },
    subject: { reference: patientRef },
    performedString: surgery.date || undefined,
    note: surgery.notes ? [{ text: surgery.notes }] : undefined,
  };
}

// ─── Complete Anamnese → FHIR Transaction Bundle ────────────

export function buildAnamneseBundle(
  session: PatientSessionFull,
  medications?: Array<{ name: string; dosage: string; frequency: string; notes?: string | null }>,
  surgeries?: Array<{ surgeryName: string; date?: string | null; complications?: string | null; notes?: string | null }>,
): FhirBundle {
  const patientRef = `Patient/${session.patient?.id || session.patientId}`;
  const encounterRef = `Encounter/${session.id}`;
  const entries: FhirBundle['entry'] = [];

  // 1. Patient
  const fhirPatient = patientToFhir(session.patient);
  if (fhirPatient) {
    entries.push({
      fullUrl: `urn:uuid:${session.patient!.id}`,
      resource: fhirPatient,
      request: { method: 'POST', url: 'Patient' },
    });
  }

  // 2. Encounter
  entries.push({
    fullUrl: `urn:uuid:${session.id}`,
    resource: sessionToEncounter(session),
    request: { method: 'POST', url: 'Encounter' },
  });

  // 3. QuestionnaireResponse
  const qr = answersToQuestionnaireResponse(session);
  entries.push({
    fullUrl: `urn:uuid:qr-${session.id}`,
    resource: qr,
    request: { method: 'POST', url: 'QuestionnaireResponse' },
  });

  // 4. Triage Flags + RiskAssessments
  for (const t of session.triageEvents) {
    const [flag, risk] = triageToFhir(t, patientRef, encounterRef);
    entries.push({
      resource: flag,
      request: { method: 'POST', url: 'Flag' },
    });
    entries.push({
      resource: risk,
      request: { method: 'POST', url: 'RiskAssessment' },
    });
  }

  // 5. Medications
  if (medications) {
    for (const med of medications) {
      entries.push({
        resource: medicationToFhir(med, patientRef),
        request: { method: 'POST', url: 'MedicationStatement' },
      });
    }
  }

  // 6. Surgeries
  if (surgeries) {
    for (const s of surgeries) {
      entries.push({
        resource: surgeryToFhir(s, patientRef),
        request: { method: 'POST', url: 'Procedure' },
      });
    }
  }

  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: entries,
  };
}
