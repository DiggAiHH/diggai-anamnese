import { describe, it, expect } from 'vitest';
import { renderSessionMarkdown } from './session-summary.service';

const baseInput = {
  sessionId: 'ses-123',
  selectedService: 'Termin / Anamnese',
  createdAt: new Date('2026-04-21T08:00:00.000Z'),
  completedAt: new Date('2026-04-21T08:06:00.000Z'),
  answers: [] as Array<{ atomId: string; value: string; answeredAt: Date }>,
  triageEvents: [] as Array<{ level: string; message: string; triggerValues: string; createdAt: Date }>,
};

describe('renderSessionMarkdown', () => {
  it('produces a header with service, session id and duration', () => {
    const md = renderSessionMarkdown(baseInput);
    expect(md).toContain('# Anamnese-Zusammenfassung — Termin / Anamnese');
    expect(md).toContain('`ses-123`');
    expect(md).toMatch(/Dauer:\*\* 6 min/);
    expect(md).toContain('Beantwortete Atome:** 0');
  });

  it('emits a Kritische Hinweise section when a CRITICAL triage event is present', () => {
    const md = renderSessionMarkdown({
      ...baseInput,
      triageEvents: [
        { level: 'CRITICAL', message: 'ACS-Verdacht', triggerValues: '{}', createdAt: baseInput.createdAt },
        { level: 'WARNING',  message: 'Hoher Blutdruck', triggerValues: '{}', createdAt: baseInput.createdAt },
      ],
    });
    expect(md).toContain('## Kritische Hinweise');
    expect(md).toContain('ACS-Verdacht');
    expect(md).toContain('## Hinweise');
    expect(md).toContain('Hoher Blutdruck');
  });

  it('skips empty or JSON-null answer values in highlights', () => {
    const md = renderSessionMarkdown({
      ...baseInput,
      answers: [
        { atomId: '0100', value: '"Kopfschmerz"', answeredAt: baseInput.createdAt },
        { atomId: '0101', value: '""', answeredAt: baseInput.createdAt },
        { atomId: '0102', value: 'null', answeredAt: baseInput.createdAt },
        { atomId: '0103', value: '42', answeredAt: baseInput.createdAt },
      ],
    });
    expect(md).toContain('**0100:** Kopfschmerz');
    expect(md).not.toContain('**0101:**');
    expect(md).not.toContain('**0102:**');
    expect(md).toContain('**0103:** 42');
  });

  it('caps highlights at 12 entries', () => {
    const answers = Array.from({ length: 30 }, (_, i) => ({
      atomId: `A${i.toString().padStart(3, '0')}`,
      value: `"v${i}"`,
      answeredAt: baseInput.createdAt,
    }));
    const md = renderSessionMarkdown({ ...baseInput, answers });
    const matches = md.match(/\*\*A\d{3}:\*\*/g) ?? [];
    expect(matches.length).toBe(12);
  });

  it('is idempotent-safe — contains the session id verbatim so duplicate detection works', () => {
    const md = renderSessionMarkdown(baseInput);
    expect(md).toContain('`ses-123`');
  });
});
