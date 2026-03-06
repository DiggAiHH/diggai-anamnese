// ============================================
// FHIR R4 — KBV DE-Basisprofile Validation
// ============================================

export interface FhirProfileValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

/** KBV DE-Basisprofile URLs */
export const KBV_PROFILES = {
  Patient: 'https://fhir.kbv.de/StructureDefinition/KBV_PR_Base_Patient',
  Encounter: 'https://fhir.kbv.de/StructureDefinition/KBV_PR_Base_Encounter',
  QuestionnaireResponse: 'http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse',
  Flag: 'http://hl7.org/fhir/StructureDefinition/Flag',
  MedicationStatement: 'https://fhir.kbv.de/StructureDefinition/KBV_PR_Base_MedicationStatement',
  Procedure: 'https://fhir.kbv.de/StructureDefinition/KBV_PR_Base_Procedure',
  Condition: 'https://fhir.kbv.de/StructureDefinition/KBV_PR_Base_Condition',
  Observation: 'https://fhir.kbv.de/StructureDefinition/KBV_PR_Base_Observation',
  Bundle: 'http://hl7.org/fhir/StructureDefinition/Bundle',
} as const;

/** Required fields per resource type (simplified structural validation) */
const REQUIRED_FIELDS: Record<string, string[]> = {
  Patient: ['resourceType', 'name', 'birthDate'],
  Encounter: ['resourceType', 'status', 'class', 'subject'],
  QuestionnaireResponse: ['resourceType', 'status', 'questionnaire'],
  Flag: ['resourceType', 'status', 'code', 'subject'],
  MedicationStatement: ['resourceType', 'status', 'medicationCodeableConcept', 'subject'],
  Procedure: ['resourceType', 'status', 'code', 'subject'],
  Condition: ['resourceType', 'clinicalStatus', 'code', 'subject'],
  Bundle: ['resourceType', 'type', 'entry'],
};

/**
 * Validate a FHIR resource against its KBV profile (structural validation).
 * Full profile validation requires a FHIR validation server.
 */
export function validateAgainstProfile(
  resource: Record<string, unknown>,
  resourceType: string
): FhirProfileValidationError[] {
  const errors: FhirProfileValidationError[] = [];

  if (!resource.resourceType) {
    errors.push({
      path: 'resourceType',
      message: 'resourceType fehlt',
      severity: 'error',
    });
    return errors;
  }

  if (resource.resourceType !== resourceType) {
    errors.push({
      path: 'resourceType',
      message: `Erwarteter resourceType "${resourceType}", erhalten "${resource.resourceType}"`,
      severity: 'error',
    });
  }

  // Required fields
  const required = REQUIRED_FIELDS[resourceType];
  if (required) {
    for (const field of required) {
      if (!(field in resource) || resource[field] == null) {
        errors.push({
          path: field,
          message: `Pflichtfeld "${field}" fehlt für ${resourceType}`,
          severity: 'error',
        });
      }
    }
  }

  // Profile URL
  const expectedProfile = KBV_PROFILES[resourceType as keyof typeof KBV_PROFILES];
  if (expectedProfile) {
    const meta = resource.meta as { profile?: string[] } | undefined;
    if (!meta?.profile?.includes(expectedProfile)) {
      errors.push({
        path: 'meta.profile',
        message: `KBV-Profil "${expectedProfile}" nicht in meta.profile`,
        severity: 'warning',
      });
    }
  }

  // Type-specific validations
  if (resourceType === 'Patient') {
    validatePatient(resource, errors);
  } else if (resourceType === 'Bundle') {
    validateBundle(resource, errors);
  }

  return errors;
}

function validatePatient(
  resource: Record<string, unknown>,
  errors: FhirProfileValidationError[]
): void {
  const name = resource.name as Array<{ family?: string; given?: string[] }> | undefined;
  if (name && name.length > 0) {
    if (!name[0].family) {
      errors.push({
        path: 'name[0].family',
        message: 'Familienname (name.family) fehlt',
        severity: 'warning',
      });
    }
  }

  const identifier = resource.identifier as Array<{ system?: string; value?: string }> | undefined;
  if (!identifier || identifier.length === 0) {
    errors.push({
      path: 'identifier',
      message: 'Mindestens ein Identifier empfohlen (z.B. Versichertennummer)',
      severity: 'warning',
    });
  }

  const gender = resource.gender;
  if (gender && !['male', 'female', 'other', 'unknown'].includes(gender as string)) {
    errors.push({
      path: 'gender',
      message: `Ungültiges Geschlecht "${gender}"`,
      severity: 'error',
    });
  }
}

function validateBundle(
  resource: Record<string, unknown>,
  errors: FhirProfileValidationError[]
): void {
  const type = resource.type as string | undefined;
  if (type && !['transaction', 'batch', 'document', 'collection'].includes(type)) {
    errors.push({
      path: 'type',
      message: `Bundle-Typ "${type}" nicht unterstützt`,
      severity: 'warning',
    });
  }

  const entry = resource.entry as Array<{ resource?: Record<string, unknown>; request?: { method?: string; url?: string } }> | undefined;
  if (entry) {
    for (let i = 0; i < entry.length; i++) {
      if (!entry[i].resource) {
        errors.push({
          path: `entry[${i}].resource`,
          message: `Bundle-Entry ${i} hat keine Ressource`,
          severity: 'error',
        });
      }
      if (type === 'transaction' && (!entry[i].request?.method || !entry[i].request?.url)) {
        errors.push({
          path: `entry[${i}].request`,
          message: `Transaction-Bundle Entry ${i}: request.method und request.url erforderlich`,
          severity: 'error',
        });
      }
    }
  }
}

/**
 * Ensure a resource has the correct KBV profile URL in meta.profile.
 */
export function ensureProfileUrl(
  resource: Record<string, unknown>,
  resourceType: string
): Record<string, unknown> {
  const profileUrl = KBV_PROFILES[resourceType as keyof typeof KBV_PROFILES];
  if (!profileUrl) return resource;

  const meta = (resource.meta as Record<string, unknown>) || {};
  const profiles = (meta.profile as string[]) || [];

  if (!profiles.includes(profileUrl)) {
    return {
      ...resource,
      meta: {
        ...meta,
        profile: [...profiles, profileUrl],
      },
    };
  }

  return resource;
}
