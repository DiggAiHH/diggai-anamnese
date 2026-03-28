import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormRunnerPage } from './FormRunnerPage';
import { useFormGet, useFormSubmit } from '../../hooks/useApi';
import { useParams } from 'react-router-dom';
import { useSessionStore } from '../../store/sessionStore';

vi.mock('../../hooks/useApi', () => ({
  useFormGet: vi.fn(),
  useFormSubmit: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

let submitMutateAsync = vi.fn();

describe('FormRunnerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    submitMutateAsync = vi.fn().mockResolvedValue({ ok: true });
    useSessionStore.setState({ sessionId: null });
    vi.mocked(useParams).mockReturnValue({ formId: 'form-1' });
    vi.mocked(useFormGet).mockReturnValue({
      data: {
        id: 'form-1',
        questions: [
          {
            id: 'q1',
            label: 'Welche Beschwerden haben Sie?',
            type: 'TEXT',
            required: true,
            options: [],
            placeholder: 'Beschwerden',
          },
        ],
      },
      isLoading: false,
      error: null,
    } as never);
    vi.mocked(useFormSubmit).mockReturnValue({
      mutateAsync: submitMutateAsync,
      isPending: false,
    } as never);
  });

  it('loads questions from the form API when a form id is present', async () => {
    render(<FormRunnerPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Welche Beschwerden haben Sie?')).toBeInTheDocument();
    expect(screen.queryByText('Wie ist Ihr vollständiger Name?')).not.toBeInTheDocument();
  });

  it('blocks submit when required visible answers are missing', async () => {
    render(<FormRunnerPage />, { wrapper: createWrapper() });

    fireEvent.click(await screen.findByText('Absenden'));

    expect(await screen.findByText('Dieses Feld ist erforderlich.')).toBeInTheDocument();
    expect(submitMutateAsync).not.toHaveBeenCalled();
  });

  it('submits answers through the backend contract when session id is available', async () => {
    useSessionStore.setState({ sessionId: 'session-42' });
    const mutateAsync = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useFormSubmit).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as never);

    render(<FormRunnerPage />, { wrapper: createWrapper() });

    fireEvent.change(await screen.findByPlaceholderText('Beschwerden'), {
      target: { value: 'Seit gestern Husten' },
    });
    fireEvent.click(screen.getByText('Absenden'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          formId: 'form-1',
          sessionId: 'session-42',
          answers: { q1: 'Seit gestern Husten' },
        })
      );
    });

    expect(await screen.findByText('Vielen Dank!')).toBeInTheDocument();
  });

  it('shows a session error instead of submitting when no session id is available', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useFormSubmit).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as never);

    render(<FormRunnerPage />, { wrapper: createWrapper() });

    fireEvent.change(await screen.findByPlaceholderText('Beschwerden'), {
      target: { value: 'Seit gestern Husten' },
    });
    fireEvent.click(screen.getByText('Absenden'));

    expect(await screen.findByText('Sitzung nicht verfügbar.')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
