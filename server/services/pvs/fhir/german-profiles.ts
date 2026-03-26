// ============================================
// FHIR German Profiles (de.basisprofil.r4)
// ============================================
// Implementation Guide: de.basisprofil.r4 v1.5.0

// fhir/r4 types replaced with local definitions
type Patient = any;
type Observation = any;
type Coverage = any;
type Organization = any;
type Practitioner = any;

// Profile URLs
export const GERMAN_PROFILES = {
  // Patient Profiles
  PATIENT_BASIS: 'http://fhir.de/StructureDefinition/patient-de-basis',
  PATIENT_PSEUDONYM: 'http://fhir.de/StructureDefinition/patient-pseudonym',
  
  // Coverage (Versicherung)
  COVERAGE_GKV: 'http://fhir.de/StructureDefinition/coverage-de-gkv',
  COVERAGE_PKV: 'http://fhir.de/StructureDefinition/coverage-de-pkv',
  
  // Observation (Vitalparameter)
  OBSERVATION_VITALSIGNS: 'http://fhir.de/StructureDefinition/observation-de-vitalsign',
  OBSERVATION_LAB: 'http://fhir.de/StructureDefinition/observation-de-labor',
  
  // Organization
  ORGANIZATION_BASIS: 'http://fhir.de/StructureDefinition/organization-de-basis',
  
  // Practitioner
  PRACTITIONER_BASIS: 'http://fhir.de/StructureDefinition/practitioner-de-basis',
} as const;

// Naming Systems
export const NAMING_SYSTEMS = {
  // Versicherungsnummern
  GKV_KVID: 'http://fhir.de/NamingSystem/gkv/kvid-10',
  GKV_PKN: 'http://fhir.de/NamingSystem/gkv/pkn',
  PKV: 'http://fhir.de/NamingSystem/pkv/kvid-10',
  
  // Institutionen
  BSNR: 'http://fhir.de/NamingSystem/bsnr',
  LANR: 'http://fhir.de/NamingSystem/lanr',
  
  // Dokumente
  KBV_NR: 'http://fhir.de/NamingSystem/kbvnr',
} as const;

// Extensions
export const EXTENSIONS = {
  // Patient
  GESCHLECHT: 'http://fhir.de/StructureDefinition/gender-amtlich-de',
  GEBURTSNAME: 'http://hl7.org/fhir/StructureDefinition/birthPlace',
  
  // Coverage
  VERSICHERTENART: 'http://fhir.de/StructureDefinition/gkv/versichertenart',
  KOSTENTRAEGER: 'http://fhir.de/StructureDefinition/gkv/kostentraeger',
  
  // Observation
  SEITE: 'http://fhir.de/StructureDefinition/seitenlokalisation',
} as const;

// ─── Constants used by fhir-bundle-builder ────────────────
export const PROFILE_PATIENT_DE_BASIS = 'http://fhir.de/StructureDefinition/patient-de-basis';
export const PROFILE_ENCOUNTER_DE_BASIS = 'http://fhir.de/StructureDefinition/encounter-de-basis';
export const PROFILE_QUESTIONNAIRE_RESPONSE_DE_BASIS = 'http://fhir.de/StructureDefinition/questionnaire-response-de-basis';
export const PROFILE_OBSERVATION_DE_VITALSIGN = 'http://fhir.de/StructureDefinition/observation-de-vitalsign';
export const PROFILE_COMPOSITION_DE_BASIS = 'http://fhir.de/StructureDefinition/composition-de-basis';
export const PROFILE_MEDICATION_STATEMENT_DE_BASIS = 'http://fhir.de/StructureDefinition/medication-statement-de-basis';
export const PROFILE_PROCEDURE_DE_BASIS = 'http://fhir.de/StructureDefinition/procedure-de-basis';
export const PROFILE_CONDITION_DE_BASIS = 'http://fhir.de/StructureDefinition/condition-de-basis';
export const PROFILE_COVERAGE_DE_BASIS = 'http://fhir.de/StructureDefinition/coverage-de-basis';
export const PROFILE_BUNDLE_DE_BASIS = 'http://fhir.de/StructureDefinition/bundle-de-basis';

export const NAMINGSYSTEM_GKV_KVID_10 = 'http://fhir.de/NamingSystem/gkv/kvid-10';
export const NAMINGSYSTEM_GKV_PKN = 'http://fhir.de/NamingSystem/gkv/pkn';

export const CODESYSTEM_VERSICHERUNGSART_DE_BASIS = 'http://fhir.de/CodeSystem/versicherungsart-de-basis';
export const CODESYSTEM_IDENTIFIER_TYPE_DE_BASIS = 'http://fhir.de/CodeSystem/identifier-type-de-basis';

export function getProfileUrl(profile: string): string {
  return profile;
}

/**
 * Create Patient with German Base Profile
 */
export function createGermanPatient(params: {
  kvnr?: string;
  versichertenArt?: 'GKV' | 'PKV' | 'BG' | 'SOZ' | 'GPV' | 'Privat';
  name: Array<{
    use?: 'official' | 'usual' | 'nickname';
    family: string;
    given: string[];
    prefix?: string[];
  }>;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  geschlechtAmtlich?: 'M' | 'W' | 'X' | 'D' | 'O' | 'U';
  address?: Array<{
    type?: 'both' | 'postal' | 'physical';
    line: string[];
    city: string;
    postalCode: string;
    country?: string;
  }>;
  phone?: string;
  email?: string;
}): Patient {
  const patient: Patient = {
    resourceType: 'Patient',
    meta: {
      profile: [GERMAN_PROFILES.PATIENT_BASIS],
    },
    identifier: [],
    name: params.name.map(n => ({
      use: n.use || 'official',
      family: n.family,
      given: n.given,
      prefix: n.prefix,
    })),
  };

  // GKV Versichertennummer
  if (params.kvnr && params.versichertenArt === 'GKV') {
    patient.identifier!.push({
      type: {
        coding: [{
          system: 'http://fhir.de/CodeSystem/identifier-type-de-basis',
          code: 'GKV',
        }],
      },
      system: NAMING_SYSTEMS.GKV_KVID,
      value: params.kvnr,
    });
  }

  // Geburtsdatum
  if (params.birthDate) {
    patient.birthDate = params.birthDate;
  }

  // Geschlecht
  if (params.gender) {
    patient.gender = params.gender;
  }

  // Amtliches Geschlecht (Extension)
  if (params.geschlechtAmtlich) {
    patient.extension = [{
      url: EXTENSIONS.GESCHLECHT,
      valueCoding: {
        system: 'http://fhir.de/CodeSystem/gender-amtlich-de',
        code: params.geschlechtAmtlich,
      },
    }];
  }

  // Adresse
  if (params.address) {
    patient.address = params.address.map(a => ({
      type: a.type,
      line: a.line,
      city: a.city,
      postalCode: a.postalCode,
      country: a.country || 'DE',
    }));
  }

  // Telecom
  const telecom: Patient['telecom'] = [];
  if (params.phone) {
    telecom.push({ system: 'phone', value: params.phone });
  }
  if (params.email) {
    telecom.push({ system: 'email', value: params.email });
  }
  if (telecom.length > 0) {
    patient.telecom = telecom;
  }

  return patient;
}

/**
 * Create Coverage (GKV)
 */
export function createGkvCoverage(params: {
  kvnr: string;
  kassenname: string;
  kassennummer: string;
  versichertenart?: '1' | '3' | '5'; // 1=Versicherter, 3=Familieversicherter, 5=Rentner
  kostentraeger?: string;
  wop?: string; // Wohnortprämie
}): Coverage {
  const coverage: Coverage = {
    resourceType: 'Coverage',
    meta: {
      profile: [GERMAN_PROFILES.COVERAGE_GKV],
    },
    identifier: [{
      system: NAMING_SYSTEMS.GKV_KVID,
      value: params.kvnr,
    }],
    status: 'active',
    type: {
      coding: [{
        system: 'http://fhir.de/CodeSystem/versicherungsart-de-basis',
        code: 'GKV',
        display: 'Gesetzliche Krankenversicherung',
      }],
    },
    subscriber: {
      identifier: {
        system: NAMING_SYSTEMS.GKV_KVID,
        value: params.kvnr,
      },
    },
    beneficiary: {
      identifier: {
        system: NAMING_SYSTEMS.GKV_KVID,
        value: params.kvnr,
      },
    },
    payor: [{
      identifier: {
        system: NAMING_SYSTEMS.BSNR,
        value: params.kassennummer,
      },
      display: params.kassenname,
    }],
    extension: [],
  };

  // Versichertenart
  if (params.versichertenart) {
    coverage.extension!.push({
      url: EXTENSIONS.VERSICHERTENART,
      valueCoding: {
        system: 'http://fhir.de/CodeSystem/versichertenart',
        code: params.versichertenart,
      },
    });
  }

  return coverage;
}

/**
 * Create Observation with German Vital Signs Profile
 */
export function createGermanVitalSign(params: {
  type: 'blood-pressure' | 'body-temp' | 'heart-rate' | 'body-weight' | 'body-height';
  value: number;
  unit: string;
  system?: string;
  code: string;
  patientReference: string;
  effectiveDateTime?: string;
}): Observation {
  const observation: Observation = {
    resourceType: 'Observation',
    meta: {
      profile: [GERMAN_PROFILES.OBSERVATION_VITALSIGNS],
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
        system: params.system || 'http://loinc.org',
        code: params.code,
      }],
    },
    subject: {
      reference: params.patientReference,
    },
    effectiveDateTime: params.effectiveDateTime || new Date().toISOString(),
    valueQuantity: {
      value: params.value,
      unit: params.unit,
      system: 'http://unitsofmeasure.org',
      code: params.unit,
    },
  };

  return observation;
}

/**
 * Validate German Profile constraints
 */
export function validateGermanProfile(resource: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic validation
  if (!resource || typeof resource !== 'object') {
    return { valid: false, errors: ['Resource must be an object'] };
  }

  const r = resource as Record<string, unknown>;

  // Check resourceType
  if (!r.resourceType) {
    errors.push('Resource must have a resourceType');
  }

  // Check meta.profile for German profiles
  const profiles = (r.meta as Record<string, unknown> | undefined)?.profile as string[] | undefined;
  if (!profiles || !profiles.some(p => p.includes('fhir.de'))) {
    errors.push('Resource should have a German profile in meta.profile');
  }

  return { valid: errors.length === 0, errors };
}
