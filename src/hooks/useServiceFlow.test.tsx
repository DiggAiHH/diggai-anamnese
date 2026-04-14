import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useServiceFlow } from './useServiceFlow';
import { useSessionStore } from '../store/sessionStore';

const navigateMock = vi.fn();
const createSessionMock = vi.fn();

let createStatus: 'idle' | 'pending' | 'success' | 'error' = 'idle';

vi.mock('./useApi/usePatientApi', () => ({
  useCreateSession: () => ({
    mutate: createSessionMock,
    status: createStatus,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function ServiceFlowProbe({ serviceId }: { serviceId: Parameters<typeof useServiceFlow>[0] }) {
  useServiceFlow(serviceId);
  return null;
}

describe('useServiceFlow routing', () => {
  beforeEach(() => {
    createStatus = 'idle';
    createSessionMock.mockReset();
    navigateMock.mockReset();
    useSessionStore.setState({
      sessionId: null,
      selectedService: undefined,
      flowStep: 'landing',
    });
  });

  it('navigates service pages into the patient questionnaire path', async () => {
    const view = render(
      <MemoryRouter initialEntries={['/anamnese']}>
        <Routes>
          <Route path="/anamnese" element={<ServiceFlowProbe serviceId="anamnese" />} />
        </Routes>
      </MemoryRouter>,
    );

    act(() => {
      createStatus = 'success';
      useSessionStore.setState({ sessionId: 'session-123' });
    });

    view.rerender(
      <MemoryRouter initialEntries={['/anamnese']}>
        <Routes>
          <Route path="/anamnese" element={<ServiceFlowProbe serviceId="anamnese" />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/patient?service=anamnese', { replace: true });
    });
  });

  it('keeps the BSNR prefix when redirecting into the questionnaire', async () => {
    const view = render(
      <MemoryRouter initialEntries={['/123456789/anamnese']}>
        <Routes>
          <Route path="/:bsnr/anamnese" element={<ServiceFlowProbe serviceId="anamnese" />} />
        </Routes>
      </MemoryRouter>,
    );

    act(() => {
      createStatus = 'success';
      useSessionStore.setState({ sessionId: 'session-123' });
    });

    view.rerender(
      <MemoryRouter initialEntries={['/123456789/anamnese']}>
        <Routes>
          <Route path="/:bsnr/anamnese" element={<ServiceFlowProbe serviceId="anamnese" />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/123456789/patient?service=anamnese', { replace: true });
    });
  });
});