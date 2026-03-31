import type { NormalizedTomedoStatus } from './tomedo-status.mapper.js';

export interface ScopeIdentity {
  tenantId: string;
  connectionId: string;
}

export interface StatusEventKeyInput extends ScopeIdentity {
  sessionId: string;
  reference: string;
  normalizedStatus: NormalizedTomedoStatus;
  patientExternalId?: string | null;
  lastUpdated?: string | null;
}

export interface SafeSyncError {
  code: string;
  message: string;
}

const DEFAULT_SAFE_MESSAGE = 'Tomedo-Synchronisation fehlgeschlagen';
const MIN_POLL_INTERVAL_MS = 5_000;
const MAX_POLL_INTERVAL_MS = 300_000;

const REDACTION_PATTERNS: RegExp[] = [
  /(bearer\s+)[a-z0-9._\-]+/gi,
  /([?&](token|access_token|refresh_token|client_secret|password)=)[^&\s]+/gi,
  /(authorization:\s*)(.+)$/gim,
];

function normalizeKeySegment(value: string | null | undefined): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\-.:/]/g, '');
}

function sanitizeErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return DEFAULT_SAFE_MESSAGE;
  }

  const redacted = REDACTION_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, '$1[REDACTED]'),
    trimmed,
  );

  return redacted.slice(0, 200);
}

export function buildScopeKey(scope: ScopeIdentity): string {
  return `${scope.tenantId}:${scope.connectionId}`;
}

export function buildStatusEventKey(input: StatusEventKeyInput): string {
  const parts = [
    normalizeKeySegment(input.tenantId),
    normalizeKeySegment(input.connectionId),
    normalizeKeySegment(input.sessionId),
    normalizeKeySegment(input.reference),
    normalizeKeySegment(input.normalizedStatus),
    normalizeKeySegment(input.patientExternalId || ''),
    normalizeKeySegment(input.lastUpdated || ''),
  ];

  return parts.join('|');
}

export function toSafeSyncError(error: unknown): SafeSyncError {
  if (error instanceof Error) {
    const message = sanitizeErrorMessage(error.message);
    const code = normalizeKeySegment(error.name || 'TOMEDO_SYNC_ERROR').toUpperCase() || 'TOMEDO_SYNC_ERROR';

    return {
      code,
      message: message || DEFAULT_SAFE_MESSAGE,
    };
  }

  if (typeof error === 'string') {
    return {
      code: 'TOMEDO_SYNC_ERROR',
      message: sanitizeErrorMessage(error),
    };
  }

  return {
    code: 'TOMEDO_SYNC_ERROR',
    message: DEFAULT_SAFE_MESSAGE,
  };
}

export function shouldImportPatient(status: NormalizedTomedoStatus): boolean {
  return status === 'COMPLETED';
}

export function mapSyncStatusToVersand(status: NormalizedTomedoStatus): 'VERARBEITET' | 'ABGESCHLOSSEN' | null {
  if (status === 'COMPLETED') {
    return 'ABGESCHLOSSEN';
  }

  if (status === 'IN_PROGRESS' || status === 'PENDING') {
    return 'VERARBEITET';
  }

  return null;
}

export function clampPollingIntervalMs(intervalMs: number | undefined, fallbackMs: number): number {
  const candidate = Number.isFinite(intervalMs) && intervalMs !== undefined
    ? intervalMs
    : fallbackMs;

  if (!Number.isFinite(candidate) || candidate <= 0) {
    return 60_000;
  }

  return Math.min(MAX_POLL_INTERVAL_MS, Math.max(MIN_POLL_INTERVAL_MS, candidate));
}

export function pruneEventCache(
  cache: ReadonlyMap<string, number>,
  nowMs: number,
  ttlMs: number,
  maxEntries: number,
): Map<string, number> {
  const validEntries = Array.from(cache.entries())
    .filter(([, timestamp]) => nowMs - timestamp <= ttlMs)
    .sort((left, right) => right[1] - left[1])
    .slice(0, maxEntries);

  return new Map(validEntries);
}
