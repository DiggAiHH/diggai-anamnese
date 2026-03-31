import { describe, expect, it } from 'vitest';
import {
  buildTomedoStatusSnapshot,
  extractFhirReferences,
  normalizeTomedoStatus,
  parseFhirReference,
} from '../tomedo-status.mapper.js';

describe('tomedo status mapper', () => {
  it('parses FHIR references from hybrid export refs', () => {
    const refs = extractFhirReferences('FHIR:QuestionnaireResponse/qr-123 | GDT:1234 | FHIR:https://example.test/fhir/R4/Task/task-42');

    expect(refs.map((entry) => entry.normalized)).toEqual([
      'QuestionnaireResponse/qr-123',
      'Task/task-42',
    ]);
  });

  it('normalizes status values to sync status groups', () => {
    expect(normalizeTomedoStatus('completed')).toBe('COMPLETED');
    expect(normalizeTomedoStatus('in-progress')).toBe('IN_PROGRESS');
    expect(normalizeTomedoStatus('draft')).toBe('PENDING');
    expect(normalizeTomedoStatus('entered-in-error')).toBe('FAILED');
    expect(normalizeTomedoStatus('mystery-status')).toBe('UNKNOWN');
  });

  it('builds a status snapshot including patient reference and lastUpdated', () => {
    const snapshot = buildTomedoStatusSnapshot('QuestionnaireResponse/qr-123', {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      subject: { reference: 'Patient/pat-9' },
      meta: { lastUpdated: '2026-03-30T03:00:00.000Z' },
    });

    expect(snapshot).toEqual({
      reference: 'QuestionnaireResponse/qr-123',
      resourceType: 'QuestionnaireResponse',
      resourceId: 'qr-123',
      rawStatus: 'completed',
      normalizedStatus: 'COMPLETED',
      patientExternalId: 'pat-9',
      lastUpdated: '2026-03-30T03:00:00.000Z',
    });
  });

  it('parses absolute FHIR references with history segments', () => {
    const parsed = parseFhirReference('https://example.test/fhir/R4/Task/task-1/_history/2');

    expect(parsed).toEqual({
      original: 'https://example.test/fhir/R4/Task/task-1/_history/2',
      normalized: 'Task/task-1',
      resourceType: 'Task',
      id: 'task-1',
    });
  });
});
