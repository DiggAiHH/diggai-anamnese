import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../encryption', () => ({
  encrypt: vi.fn((value: string) => `enc:${value}`),
}));

import { submitForm } from './formService';

describe('formService.submitForm', () => {
  const answerUpsert = vi.fn();
  const customFormUpdate = vi.fn();
  const customFormFindFirst = vi.fn();
  const patientSessionFindFirst = vi.fn();
  const transaction = vi.fn(async (operations: unknown[]) => operations);

  beforeEach(() => {
    vi.clearAllMocks();

    customFormFindFirst.mockResolvedValue({
      id: 'form-1',
      praxisId: 'tenant-1',
      isActive: true,
      usageCount: 0,
      version: 1,
      questions: [
        { id: 'q1', type: 'TEXT', label: 'Notiz', required: true },
        { id: 'q2', type: 'CHECKBOX', label: 'Einwilligung', required: false },
      ],
    });
    patientSessionFindFirst.mockResolvedValue({ id: 'session-1' });
    answerUpsert.mockResolvedValue({ id: 'answer-1' });
    customFormUpdate.mockResolvedValue({ id: 'form-1' });

    (globalThis as any).__prisma = {
      customForm: {
        findFirst: customFormFindFirst,
        update: customFormUpdate,
      },
      patientSession: {
        findFirst: patientSessionFindFirst,
      },
      answer: {
        upsert: answerUpsert,
      },
      $transaction: transaction,
    };
  });

  it('stores custom form answers encrypted and redacted', async () => {
    await submitForm(
      'form-1',
      {
        sessionId: 'session-1',
        answers: {
          q1: 'Patient beschreibt Beschwerden',
          q2: true,
          ignored: 'should not persist',
        },
      },
      { praxisId: 'tenant-1', requesterRole: 'patient', requesterSessionId: 'session-1' },
    );

    expect(answerUpsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        create: expect.objectContaining({
          encryptedValue: 'enc:{"type":"custom-form","formId":"form-1","questionId":"q1","data":"Patient beschreibt Beschwerden"}',
          value: JSON.stringify({
            type: 'custom-form',
            formId: 'form-1',
            questionId: 'q1',
            data: '[encrypted]',
            redacted: true,
            dataType: 'string',
          }),
        }),
      }),
    );

    expect(answerUpsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        create: expect.objectContaining({
          encryptedValue: 'enc:{"type":"custom-form","formId":"form-1","questionId":"q2","data":true}',
          value: JSON.stringify({
            type: 'custom-form',
            formId: 'form-1',
            questionId: 'q2',
            data: '[encrypted]',
            redacted: true,
            dataType: 'boolean',
          }),
        }),
      }),
    );

    expect(answerUpsert).toHaveBeenCalledTimes(2);
  });

  it('rejects patient submissions for other sessions', async () => {
    await expect(
      submitForm(
        'form-1',
        {
          sessionId: 'session-2',
          answers: { q1: 'Nicht erlaubt' },
        },
        { praxisId: 'tenant-1', requesterRole: 'patient', requesterSessionId: 'session-1' },
      ),
    ).rejects.toThrow('Session mismatch');

    expect(answerUpsert).not.toHaveBeenCalled();
  });

  it('rejects patient submissions without session context', async () => {
    await expect(
      submitForm(
        'form-1',
        {
          sessionId: 'session-1',
          answers: { q1: 'Nicht erlaubt' },
        },
        { praxisId: 'tenant-1', requesterRole: 'patient' },
      ),
    ).rejects.toThrow('Missing patient session context');

    expect(answerUpsert).not.toHaveBeenCalled();
  });

  it('rejects submissions without valid form answers', async () => {
    await expect(
      submitForm(
        'form-1',
        {
          sessionId: 'session-1',
          answers: { ignored: 'not on the form' },
          submittedAt: '2001-01-01T00:00:00.000Z',
        },
        { praxisId: 'tenant-1', requesterRole: 'arzt' },
      ),
    ).rejects.toThrow('No valid answers provided');

    expect(answerUpsert).not.toHaveBeenCalled();
    expect(customFormUpdate).not.toHaveBeenCalled();
  });
});