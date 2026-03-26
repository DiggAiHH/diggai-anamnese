// ============================================
// FHIR Validator
// ============================================
// Validierung gegen deutsche FHIR Basisprofile

import type { FhirBundle, FhirPatient, FhirObservation } from '../types.js';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  code: string;
  message: string;
  severity: 'error' | 'fatal';
}

export interface ValidationWarning {
  path: string;
  code: string;
  message: string;
}

/**
 * German FHIR Profile Constants
 */
export const GERMAN_PROFILES = {
  PATIENT_BASE: 'http://fhir.de/StructureDefinition/patient-de-basis',
  COVERAGE_BASE: 'http://fhir.de/StructureDefinition/coverage-de-basis',
  OBSERVATION_VITALS: 'http://fhir.de/StructureDefinition/observation-de-vitalsign',
  ORGANIZATION_BASE: 'http://fhir.de/StructureDefinition/organization-de-basis',
  PRACTITIONER_BASE: 'http://fhir.de/StructureDefinition/practitioner-de-basis',
} as const;

/**
 * German NamingSystems
 */
export const GERMAN_NAMING_SYSTEMS = {
  GKV_KVID: 'http://fhir.de/NamingSystem/gkv/kvid-10',
  PKV_PKN: 'http://fhir.de/NamingSystem/gkv/pkn',
  KVID: 'http://fhir.de/NamingSystem/gkv/kvid-10',
  LANR: 'http://fhir.de/NamingSystem/asv/teamnummer',
  BSNR: 'http://fhir.de/NamingSystem/kzbv/betriebsstaettennummer',
} as const;

/**
 * FHIR Validator for German Base Profiles
 */
export class FhirValidator {
  /**
   * Validate FHIR Patient against German base profile
   */
  validatePatient(patient: FhirPatient): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check profile
    if (!patient.meta?.profile?.includes(GERMAN_PROFILES.PATIENT_BASE)) {
      warnings.push({
        path: 'meta.profile',
        code: 'PROFILE_MISSING',
        message: `German base profile not declared: ${GERMAN_PROFILES.PATIENT_BASE}`,
      });
    }

    // Check identifier (KVNR required)
    if (!patient.identifier || patient.identifier.length === 0) {
      errors.push({
        path: 'identifier',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'At least one identifier is required (KVNR for GKV patients)',
        severity: 'error',
      });
    } else {
      const kvnrIdentifier = patient.identifier.find(
        id => id.system === GERMAN_NAMING_SYSTEMS.GKV_KVID
      );
      
      if (!kvnrIdentifier) {
        warnings.push({
          path: 'identifier',
          code: 'KVNR_MISSING',
          message: 'KVNR identifier recommended for German patients',
        });
      } else if (kvnrIdentifier.value && !this.isValidKvnr(kvnrIdentifier.value)) {
        errors.push({
          path: 'identifier.value',
          code: 'INVALID_KVNR',
          message: `Invalid KVNR format: ${kvnrIdentifier.value}`,
          severity: 'error',
        });
      }
    }

    // Check name
    if (!patient.name || patient.name.length === 0) {
      errors.push({
        path: 'name',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'Patient name is required',
        severity: 'error',
      });
    } else {
      const officialName = patient.name.find(n => n.use === 'official');
      if (!officialName) {
        warnings.push({
          path: 'name.use',
          code: 'NO_OFFICIAL_NAME',
          message: 'No official name specified',
        });
      }
    }

    // Check birthDate
    if (!patient.birthDate) {
      warnings.push({
        path: 'birthDate',
        code: 'BIRTHDATE_MISSING',
        message: 'Birth date recommended for German patients',
      });
    } else if (!this.isValidDate(patient.birthDate)) {
      errors.push({
        path: 'birthDate',
        code: 'INVALID_DATE',
        message: `Invalid date format: ${patient.birthDate}`,
        severity: 'error',
      });
    }

    // Check address (German format)
    const patientAny = patient as any;
    if (patientAny.address && patientAny.address.length > 0) {
      for (let i = 0; i < patientAny.address.length; i++) {
        const addr = patientAny.address[i];
        if (!addr.postalCode) {
          warnings.push({
            path: `address[${i}].postalCode`,
            code: 'POSTAL_CODE_MISSING',
            message: 'German postal code recommended',
          });
        } else if (addr.postalCode && !/^\d{5}$/.test(addr.postalCode)) {
          warnings.push({
            path: `address[${i}].postalCode`,
            code: 'INVALID_POSTAL_CODE',
            message: `Invalid German postal code: ${addr.postalCode}`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate FHIR Bundle
   */
  validateBundle(bundle: FhirBundle): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check bundle type
    if (!bundle.type) {
      errors.push({
        path: 'type',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'Bundle type is required',
        severity: 'error',
      });
    } else if (!['document', 'message', 'transaction', 'transaction-response', 'batch', 'batch-response', 'history', 'searchset', 'collection'].includes(bundle.type)) {
      errors.push({
        path: 'type',
        code: 'INVALID_BUNDLE_TYPE',
        message: `Invalid bundle type: ${bundle.type}`,
        severity: 'error',
      });
    }

    // Check entries
    if (!bundle.entry || bundle.entry.length === 0) {
      warnings.push({
        path: 'entry',
        code: 'EMPTY_BUNDLE',
        message: 'Bundle contains no entries',
      });
    } else {
      // Validate each entry
      for (let i = 0; i < bundle.entry.length; i++) {
        const entry = bundle.entry[i];
        if (!entry.resource) {
          errors.push({
            path: `entry[${i}].resource`,
            code: 'MISSING_RESOURCE',
            message: `Entry ${i} has no resource`,
            severity: 'error',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate Observation (Vital Signs)
   */
  validateObservation(obs: FhirObservation): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check status
    if (!obs.status) {
      errors.push({
        path: 'status',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'Observation status is required',
        severity: 'error',
      });
    }

    // Check code
    if (!obs.code) {
      errors.push({
        path: 'code',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'Observation code is required',
        severity: 'error',
      });
    }

    // Check subject
    if (!obs.subject) {
      warnings.push({
        path: 'subject',
        code: 'SUBJECT_MISSING',
        message: 'Subject (patient) reference recommended',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate KVNR format (German health insurance number)
   * Format: A123456789 (1 letter + 9 digits)
   */
  private isValidKvnr(kvnr: string): boolean {
    return /^[A-Z]\d{9}$/.test(kvnr);
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  private isValidDate(date: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
  }
}

// Export singleton
export const fhirValidator = new FhirValidator();
