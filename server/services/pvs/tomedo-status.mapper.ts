export type NormalizedTomedoStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'UNKNOWN';

export interface ParsedFhirReference {
  original: string;
  normalized: string;
  resourceType: string;
  id: string;
}

export interface TomedoStatusSnapshot {
  reference: string;
  resourceType: string;
  resourceId: string;
  rawStatus: string | null;
  normalizedStatus: NormalizedTomedoStatus;
  patientExternalId: string | null;
  lastUpdated: string | null;
}

const FINAL_STATUS_VALUES = new Set([
  'completed',
  'complete',
  'final',
  'finished',
  'fulfilled',
  'done',
  'closed',
  'resolved',
]);

const PROGRESS_STATUS_VALUES = new Set([
  'in-progress',
  'inprogress',
  'active',
  'arrived',
  'ready',
  'accepted',
  'booked',
  'processing',
  'in-process',
]);

const PENDING_STATUS_VALUES = new Set([
  'draft',
  'requested',
  'pending',
  'new',
  'proposed',
  'planned',
]);

const FAILED_STATUS_VALUES = new Set([
  'failed',
  'failure',
  'error',
  'cancelled',
  'canceled',
  'rejected',
  'revoked',
  'entered-in-error',
  'noshow',
  'no-show',
]);

function normalizeStatusToken(status: string | null | undefined): string {
  return (status || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function sanitizeReferenceInput(reference: string): string {
  const trimmed = reference.trim();

  if (trimmed.toUpperCase().startsWith('FHIR:')) {
    return trimmed.slice(5).trim();
  }

  return trimmed;
}

function parsePathSegments(reference: string): string[] {
  if (isAbsoluteUrl(reference)) {
    try {
      const parsed = new URL(reference);
      return parsed.pathname.split('/').filter(Boolean);
    } catch {
      return [];
    }
  }

  return reference.split(/[?#]/)[0]?.split('/').filter(Boolean) || [];
}

function extractResourceIdFromReference(reference: string | null | undefined): string | null {
  if (!reference) {
    return null;
  }

  const parsed = parseFhirReference(reference);
  if (!parsed) {
    return null;
  }

  return parsed.id;
}

function extractStatusFromResource(resource: Record<string, unknown>): string | null {
  const candidates: Array<unknown> = [
    resource.status,
    resource.lifecycleStatus,
    resource.appointmentStatus,
    resource.processingStatus,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

function extractPatientExternalIdFromResource(resource: Record<string, unknown>): string | null {
  const directReferenceCandidates: Array<unknown> = [
    resource.subject,
    resource.patient,
    resource.beneficiary,
  ];

  for (const candidate of directReferenceCandidates) {
    if (candidate && typeof candidate === 'object') {
      const reference = (candidate as { reference?: unknown }).reference;
      if (typeof reference === 'string') {
        const patientId = extractResourceIdFromReference(reference);
        if (patientId) {
          return patientId;
        }
      }
    }
  }

  return null;
}

function extractLastUpdated(resource: Record<string, unknown>): string | null {
  const meta = resource.meta;
  if (!meta || typeof meta !== 'object') {
    return null;
  }

  const lastUpdated = (meta as { lastUpdated?: unknown }).lastUpdated;
  if (typeof lastUpdated !== 'string' || lastUpdated.trim().length === 0) {
    return null;
  }

  return lastUpdated;
}

export function normalizeTomedoStatus(rawStatus: string | null | undefined): NormalizedTomedoStatus {
  const normalized = normalizeStatusToken(rawStatus);

  if (!normalized) {
    return 'UNKNOWN';
  }

  if (FINAL_STATUS_VALUES.has(normalized)) {
    return 'COMPLETED';
  }

  if (FAILED_STATUS_VALUES.has(normalized)) {
    return 'FAILED';
  }

  if (PROGRESS_STATUS_VALUES.has(normalized)) {
    return 'IN_PROGRESS';
  }

  if (PENDING_STATUS_VALUES.has(normalized)) {
    return 'PENDING';
  }

  return 'UNKNOWN';
}

export function parseFhirReference(reference: string): ParsedFhirReference | null {
  const input = sanitizeReferenceInput(reference);
  if (!input) {
    return null;
  }

  const segments = parsePathSegments(input);
  if (segments.length < 2) {
    return null;
  }

  let resourceTypeIndex = segments.length - 2;
  let resourceIdIndex = segments.length - 1;

  if (segments[resourceTypeIndex] === '_history' && segments.length >= 4) {
    resourceTypeIndex = segments.length - 4;
    resourceIdIndex = segments.length - 3;
  }

  const resourceType = segments[resourceTypeIndex];
  const resourceId = segments[resourceIdIndex];

  if (!resourceType || !resourceId) {
    return null;
  }

  if (!/^[A-Za-z][A-Za-z0-9]+$/.test(resourceType)) {
    return null;
  }

  return {
    original: reference,
    normalized: `${resourceType}/${resourceId}`,
    resourceType,
    id: resourceId,
  };
}

export function extractFhirReferences(exportReference: string | null | undefined): ParsedFhirReference[] {
  if (!exportReference) {
    return [];
  }

  const candidates = exportReference
    .split('|')
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean);

  const references = new Map<string, ParsedFhirReference>();

  for (const candidate of candidates) {
    const normalizedCandidate = candidate.toUpperCase();
    const looksLikeProtocolPrefix = /^[A-Z_]+:/.test(candidate) && !isAbsoluteUrl(candidate);

    if (looksLikeProtocolPrefix && !normalizedCandidate.startsWith('FHIR:')) {
      continue;
    }

    const parsed = parseFhirReference(candidate);
    if (!parsed) {
      continue;
    }

    references.set(parsed.normalized, parsed);
  }

  return Array.from(references.values());
}

export function buildTomedoStatusSnapshot(
  reference: string,
  resource: Record<string, unknown>,
): TomedoStatusSnapshot | null {
  const parsedReference = parseFhirReference(reference);
  if (!parsedReference) {
    return null;
  }

  const rawStatus = extractStatusFromResource(resource);

  return {
    reference: parsedReference.normalized,
    resourceType: parsedReference.resourceType,
    resourceId: parsedReference.id,
    rawStatus,
    normalizedStatus: normalizeTomedoStatus(rawStatus),
    patientExternalId: extractPatientExternalIdFromResource(resource),
    lastUpdated: extractLastUpdated(resource),
  };
}
