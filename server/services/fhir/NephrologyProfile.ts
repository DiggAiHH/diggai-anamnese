/**
 * @module NephrologyProfile
 * @description FHIR R4 resources for nephrology / tele-dialysis use-case
 *
 * Supports Dr. Sarah Al-oudat (Sarah Speciality Hospital, Mafraq, Jordan)
 * and the Jordan Digital Health Center / M42 tele-nephrology network.
 *
 * LOINC codes used:
 *  - 33914-3  eGFR (CKD-EPI)
 *  - 14682-9  Serum Creatinine
 *  - 2160-0   Creatinine [Mass/volume] in Serum or Plasma
 *  - 8480-6   Systolic blood pressure
 *  - 8462-4   Diastolic blood pressure
 *
 * SNOMED CT concepts:
 *  - 709044004  Chronic kidney disease (CKD) — broad parent
 *  - 439976001  Kidney dialysis (procedure)
 *  - 302497006  Haemodialysis (procedure)
 *  - 71192002   Peritoneal dialysis (procedure)
 *  - 91747002   Shunt, device
 *
 * @security PHI contained within FHIR resources. Encrypt transport layer (TLS 1.3+).
 *   Never log Patient.identifier or Observation values at INFO level.
 */

// ─── Minimal shared FHIR R4 types (inline to avoid circular deps) ──────────

interface FhirCoding {
  system: string;
  code: string;
  display?: string;
}

interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

interface FhirObservation {
  resourceType: 'Observation';
  id?: string;
  status: 'final' | 'preliminary' | 'amended';
  category?: { coding: FhirCoding[] }[];
  code: FhirCodeableConcept;
  subject: { reference: string };
  effectiveDateTime?: string;
  valueQuantity?: { value: number; unit: string; system: string; code: string };
  valueCodeableConcept?: FhirCodeableConcept;
  interpretation?: FhirCodeableConcept[];
  component?: Array<{
    code: FhirCodeableConcept;
    valueQuantity?: { value: number; unit: string; system: string; code: string };
  }>;
}

interface FhirProcedure {
  resourceType: 'Procedure';
  id?: string;
  status: 'completed' | 'in-progress' | 'not-done' | 'unknown';
  code: FhirCodeableConcept;
  subject: { reference: string };
  performedPeriod?: { start?: string; end?: string };
  note?: Array<{ text: string }>;
}

interface FhirCondition {
  resourceType: 'Condition';
  id?: string;
  clinicalStatus: FhirCodeableConcept;
  verificationStatus: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: { reference: string };
  onsetDateTime?: string;
  note?: Array<{ text: string }>;
}

// ─── KDIGO CKD Staging ───────────────────────────────────────

export type KdigoStage = 1 | 2 | 3 | 4 | 5;
export type DialysisModality = 'haemodialysis' | 'peritoneal' | 'none';

export interface NephrologyData {
  patientReference: string;   // e.g. "Patient/abc123"
  recordedAt: string;          // ISO datetime

  // Lab values (optional — populated from session answers if present)
  eGFR?: number;               // mL/min/1.73m²
  serumCreatinine?: number;    // mg/dL
  systolicBP?: number;         // mmHg
  diastolicBP?: number;        // mmHg

  // Clinical context
  kdigoStage?: KdigoStage;
  dialysisModality?: DialysisModality;
  dialysisFrequencyPerWeek?: number;
  shuntType?: string;           // e.g. "AV-Fistel", "Katheter"
  ckdDiagnosisDate?: string;   // ISO date YYYY-MM-DD
  ckdEtiology?: string;        // free-text (e.g. "diabetische Nephropathie")
}

// ─── KDIGO Stage → FHIR Interpretation ──────────────────────

const KDIGO_STAGE_DISPLAY: Record<KdigoStage, string> = {
  1: 'CKD Stage G1 — Normal or high (eGFR ≥90)',
  2: 'CKD Stage G2 — Mildly decreased (eGFR 60–89)',
  3: 'CKD Stage G3 — Moderately decreased (eGFR 30–59)',
  4: 'CKD Stage G4 — Severely decreased (eGFR 15–29)',
  5: 'CKD Stage G5 — Kidney failure (eGFR <15)',
};

const KDIGO_INTERPRETATION: Record<KdigoStage, { code: string; display: string }> = {
  1: { code: 'N',  display: 'Normal' },
  2: { code: 'L',  display: 'Low' },
  3: { code: 'LL', display: 'Critical low' },
  4: { code: 'LL', display: 'Critical low' },
  5: { code: 'LL', display: 'Critically low — dialysis range' },
};

// ─── Resource Builders ───────────────────────────────────────

/**
 * Builds FHIR Observation for eGFR (KDIGO stage-aware).
 * LOINC: 33914-3 — Glomerular filtration rate/1.73 sq M.predicted [Volume Rate/Area] in Serum, Plasma or Blood by Creatinine-based formula (CKD-EPI)
 */
export function buildEGFRObservation(data: NephrologyData): FhirObservation | null {
  if (data.eGFR === undefined) return null;

  const obs: FhirObservation = {
    resourceType: 'Observation',
    id: `egfr-${Date.now()}`,
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] }],
    code: {
      coding: [{ system: 'http://loinc.org', code: '33914-3', display: 'eGFR (CKD-EPI)' }],
      text: 'eGFR CKD-EPI',
    },
    subject: { reference: data.patientReference },
    effectiveDateTime: data.recordedAt,
    valueQuantity: {
      value: data.eGFR,
      unit: 'mL/min/1.73m²',
      system: 'http://unitsofmeasure.org',
      code: 'mL/min/{1.73_m2}',
    },
  };

  if (data.kdigoStage) {
    obs.interpretation = [{
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', ...KDIGO_INTERPRETATION[data.kdigoStage] }],
      text: KDIGO_STAGE_DISPLAY[data.kdigoStage],
    }];
  }

  return obs;
}

/**
 * Builds FHIR Observation for serum creatinine.
 * LOINC: 14682-9 — Creatinine [Moles/volume] in Serum or Plasma
 */
export function buildCreatinineObservation(data: NephrologyData): FhirObservation | null {
  if (data.serumCreatinine === undefined) return null;

  return {
    resourceType: 'Observation',
    id: `creatinine-${Date.now()}`,
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] }],
    code: {
      coding: [{ system: 'http://loinc.org', code: '14682-9', display: 'Creatinine [Moles/volume] in Serum or Plasma' }],
      text: 'Serum Kreatinin',
    },
    subject: { reference: data.patientReference },
    effectiveDateTime: data.recordedAt,
    valueQuantity: {
      value: data.serumCreatinine,
      unit: 'mg/dL',
      system: 'http://unitsofmeasure.org',
      code: 'mg/dL',
    },
  };
}

/**
 * Builds FHIR Observation for blood pressure (systolic + diastolic as components).
 * LOINC: 55284-4 — Blood pressure panel with all children
 */
export function buildBloodPressureObservation(data: NephrologyData): FhirObservation | null {
  if (data.systolicBP === undefined || data.diastolicBP === undefined) return null;

  return {
    resourceType: 'Observation',
    id: `bp-${Date.now()}`,
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }],
    code: {
      coding: [{ system: 'http://loinc.org', code: '55284-4', display: 'Blood pressure systolic and diastolic' }],
      text: 'Blutdruck',
    },
    subject: { reference: data.patientReference },
    effectiveDateTime: data.recordedAt,
    component: [
      {
        code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] },
        valueQuantity: { value: data.systolicBP, unit: 'mm[Hg]', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
      },
      {
        code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }] },
        valueQuantity: { value: data.diastolicBP, unit: 'mm[Hg]', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
      },
    ],
  };
}

/**
 * Builds FHIR Condition for chronic kidney disease with KDIGO stage.
 * SNOMED: 709044004 — Chronic kidney disease
 */
export function buildCKDCondition(data: NephrologyData): FhirCondition | null {
  if (!data.kdigoStage && !data.ckdEtiology) return null;

  const note: FhirCondition['note'] = [];
  if (data.ckdEtiology) note.push({ text: `Ätiologie: ${data.ckdEtiology}` });
  if (data.kdigoStage) note.push({ text: KDIGO_STAGE_DISPLAY[data.kdigoStage] });

  return {
    resourceType: 'Condition',
    id: `ckd-${Date.now()}`,
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }],
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed', display: 'Confirmed' }],
    },
    category: [{
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item', display: 'Problem List Item' }],
    }],
    code: {
      coding: [{ system: 'http://snomed.info/sct', code: '709044004', display: 'Chronic kidney disease (disorder)' }],
      text: 'Chronische Niereninsuffizienz (CKD)',
    },
    subject: { reference: data.patientReference },
    onsetDateTime: data.ckdDiagnosisDate,
    note: note.length ? note : undefined,
  };
}

/**
 * Builds FHIR Procedure for active dialysis treatment.
 * SNOMED: 302497006 — Haemodialysis | 71192002 — Peritoneal dialysis
 */
export function buildDialysisProcedure(data: NephrologyData): FhirProcedure | null {
  if (!data.dialysisModality || data.dialysisModality === 'none') return null;

  const isHaemo = data.dialysisModality === 'haemodialysis';

  const notes: string[] = [];
  if (data.dialysisFrequencyPerWeek !== undefined) {
    notes.push(`Frequenz: ${data.dialysisFrequencyPerWeek}x/Woche`);
  }
  if (data.shuntType) {
    notes.push(`Gefäßzugang: ${data.shuntType}`);
  }

  return {
    resourceType: 'Procedure',
    id: `dialysis-${Date.now()}`,
    status: 'in-progress',
    code: {
      coding: [{
        system: 'http://snomed.info/sct',
        code: isHaemo ? '302497006' : '71192002',
        display: isHaemo ? 'Haemodialysis (procedure)' : 'Peritoneal dialysis (procedure)',
      }],
      text: isHaemo ? 'Hämodialyse' : 'Peritonealdialyse',
    },
    subject: { reference: data.patientReference },
    note: notes.length ? notes.map(t => ({ text: t })) : undefined,
  };
}

/**
 * Assembles all nephrology FHIR resources from session answers into a flat array.
 * Safe to call with incomplete data — returns only non-null resources.
 *
 * @param data NephrologyData extracted from session answers
 * @returns Array of FHIR resources ready to embed in a Bundle
 */
export function buildNephrologyResources(data: NephrologyData): Array<FhirObservation | FhirProcedure | FhirCondition> {
  return [
    buildEGFRObservation(data),
    buildCreatinineObservation(data),
    buildBloodPressureObservation(data),
    buildCKDCondition(data),
    buildDialysisProcedure(data),
  ].filter((r): r is FhirObservation | FhirProcedure | FhirCondition => r !== null);
}

// ─── Session Answer Extractor ────────────────────────────────

/**
 * Canonical atom IDs for nephrology questions.
 * These must match the IDs in src/data/questions.ts.
 *
 * Atom IDs in the 'N' (Nephrologie) namespace:
 *   N001 — eGFR-Wert (letzte Messung)
 *   N002 — Serum-Kreatinin (mg/dL)
 *   N003 — Systolischer Blutdruck
 *   N004 — Diastolischer Blutdruck
 *   N010 — KDIGO Stage (1–5)
 *   N011 — Dialyse-Modalität (Hämodialyse / Peritonealdialyse / keine)
 *   N012 — Dialyse-Frequenz pro Woche
 *   N013 — Gefäßzugang / Shunt-Typ
 *   N014 — CKD-Ätiologie (Freitext)
 *   N015 — Erstdiagnose-Datum CKD
 */
export const NEPHROLOGY_ATOM_IDS = new Set([
  'N001', 'N002', 'N003', 'N004',
  'N010', 'N011', 'N012', 'N013', 'N014', 'N015',
]);

interface SessionAnswer {
  atomId: string;
  value: string;
}

/**
 * Extracts NephrologyData from raw session answers.
 * Gracefully handles missing/invalid values.
 */
export function extractNephrologyData(
  patientReference: string,
  answers: SessionAnswer[],
): NephrologyData {
  const get = (id: string): string | undefined =>
    answers.find(a => a.atomId === id)?.value;

  const parseNum = (v: string | undefined): number | undefined => {
    if (!v) return undefined;
    try {
      const parsed = JSON.parse(v);
      const n = typeof parsed === 'object' && parsed?.data !== undefined
        ? Number(parsed.data)
        : Number(parsed);
      return isNaN(n) ? undefined : n;
    } catch {
      const n = Number(v);
      return isNaN(n) ? undefined : n;
    }
  };

  const parseStr = (v: string | undefined): string | undefined => {
    if (!v) return undefined;
    try {
      const parsed = JSON.parse(v);
      return typeof parsed === 'object' && parsed?.data !== undefined
        ? String(parsed.data)
        : String(parsed);
    } catch {
      return v;
    }
  };

  const dialysisRaw = parseStr(get('N011'))?.toLowerCase();
  let dialysisModality: DialysisModality = 'none';
  if (dialysisRaw?.includes('hämo') || dialysisRaw?.includes('haemo') || dialysisRaw?.includes('hemodialysis')) {
    dialysisModality = 'haemodialysis';
  } else if (dialysisRaw?.includes('peritoneal')) {
    dialysisModality = 'peritoneal';
  }

  const kdigoRaw = parseNum(get('N010'));

  return {
    patientReference,
    recordedAt: new Date().toISOString(),
    eGFR: parseNum(get('N001')),
    serumCreatinine: parseNum(get('N002')),
    systolicBP: parseNum(get('N003')),
    diastolicBP: parseNum(get('N004')),
    kdigoStage: (kdigoRaw && kdigoRaw >= 1 && kdigoRaw <= 5) ? kdigoRaw as KdigoStage : undefined,
    dialysisModality,
    dialysisFrequencyPerWeek: parseNum(get('N012')),
    shuntType: parseStr(get('N013')),
    ckdDiagnosisDate: parseStr(get('N015')),
    ckdEtiology: parseStr(get('N014')),
  };
}
