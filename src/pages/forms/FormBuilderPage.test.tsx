import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormBuilderPage } from './FormBuilderPage';
import { useFormCreate, useFormGet, useFormUpdate, useFormAiGenerate } from '../../hooks/useApi';
import { useStaffSession } from '../../hooks/useStaffSession';
import { useParams } from 'react-router-dom';

vi.mock('../../hooks/useApi', () => ({
  useFormGet: vi.fn(),
  useFormCreate: vi.fn(),
  useFormUpdate: vi.fn(),
  useFormAiGenerate: vi.fn(),
}));

vi.mock('../../hooks/useStaffSession', () => ({
  useStaffSession: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

describe('FormBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({});
    vi.mocked(useStaffSession).mockReturnValue({
      data: { id: 'staff-1', username: 'ada', displayName: 'Dr. Ada', role: 'arzt' },
    } as never);
    vi.mocked(useFormGet).mockReturnValue({ data: null } as never);
    vi.mocked(useFormCreate).mockReturnValue({ mutateAsync: vi.fn() } as never);
    vi.mocked(useFormUpdate).mockReturnValue({ mutateAsync: vi.fn() } as never);
    vi.mocked(useFormAiGenerate).mockReturnValue({ mutateAsync: vi.fn() } as never);
  });

  it('hydrates the builder when editing an existing form', async () => {
    vi.mocked(useParams).mockReturnValue({ formId: 'form-1' });
    vi.mocked(useFormGet).mockReturnValue({
      data: {
        id: 'form-1',
        name: 'Aufnahmeformular',
        description: 'Für neue Patienten',
        tags: ['aufnahme', 'neu'],
        questions: [
          {
            id: 'q1',
            label: 'Welche Beschwerden haben Sie?',
            type: 'TEXTAREA',
            required: true,
            options: [],
            placeholder: 'Beschwerden beschreiben',
          },
        ],
      },
    } as never);

    render(<FormBuilderPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Aufnahmeformular')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Für neue Patienten')).toBeInTheDocument();
    expect(screen.getByDisplayValue('aufnahme, neu')).toBeInTheDocument();
    expect(screen.getByText('Welche Beschwerden haben Sie?')).toBeInTheDocument();
  });

  it('creates a new form with transformed payload', async () => {
    const createSpy = vi.fn().mockResolvedValue({ id: 'new-form' });
    vi.mocked(useFormCreate).mockReturnValue({ mutateAsync: createSpy } as never);

    render(<FormBuilderPage />);

    fireEvent.change(screen.getByPlaceholderText('Formularname *'), {
      target: { value: 'Neues Formular' },
    });
    fireEvent.click(screen.getByText('Frage hinzufügen'));
    fireEvent.change(screen.getByPlaceholderText('z. B. Haben Sie Allergien?'), {
      target: { value: 'Welche Beschwerden haben Sie?' },
    });
    fireEvent.click(screen.getByText('Speichern'));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    const payload = createSpy.mock.calls[0][0];
    expect(payload).toEqual(
      expect.objectContaining({
        praxisId: 'default',
        createdBy: 'staff-1',
        name: 'Neues Formular',
        questions: [
          expect.objectContaining({
            label: 'Welche Beschwerden haben Sie?',
            type: 'TEXT',
            required: false,
            options: [],
          }),
        ],
      })
    );
    expect(payload.questions[0]).not.toHaveProperty('conditionalOn');
  });
});
