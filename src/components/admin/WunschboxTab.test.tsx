import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WunschboxTab } from './WunschboxTab';
import {
  useWunschboxList,
  useWunschboxSubmit,
  useWunschboxProcess,
  useWunschboxReview,
  useWunschboxExport,
} from '../../hooks/useOpsApi';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../hooks/useOpsApi', () => ({
  useWunschboxList: vi.fn(),
  useWunschboxSubmit: vi.fn(),
  useWunschboxProcess: vi.fn(),
  useWunschboxReview: vi.fn(),
  useWunschboxExport: vi.fn(),
}));

describe('WunschboxTab i18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useWunschboxList).mockReturnValue({
      data: {
        entries: [
          {
            id: 'wish-1',
            originalText: 'Bitte dunkles Design verbessern',
            status: 'PENDING',
            createdAt: '2026-03-29T10:00:00.000Z',
            aiParsedChanges: [],
          },
        ],
      },
      isLoading: false,
    } as never);

    vi.mocked(useWunschboxSubmit).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);

    vi.mocked(useWunschboxProcess).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);

    vi.mocked(useWunschboxReview).mockReturnValue({
      mutate: vi.fn(),
    } as never);

    vi.mocked(useWunschboxExport).mockReturnValue({
      mutate: vi.fn(),
    } as never);
  });

  it('renders wishbox labels via translation keys', () => {
    render(<WunschboxTab />);

    expect(screen.getByRole('heading', { name: 'wunschbox.title' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('wunschbox.placeholder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wunschbox\.submit/i })).toBeInTheDocument();
    expect(screen.getAllByText('wunschbox.status_pending').length).toBeGreaterThan(0);

    expect(screen.queryByText('Wunschbox')).not.toBeInTheDocument();
    expect(screen.queryByText('Beschreiben Sie Ihren Feature-Wunsch...')).not.toBeInTheDocument();
    expect(screen.queryByText('Einreichen')).not.toBeInTheDocument();
  });

  it('uses translated loading label', () => {
    vi.mocked(useWunschboxList).mockReturnValue({
      data: { entries: [] },
      isLoading: true,
    } as never);

    render(<WunschboxTab />);

    expect(screen.getByText('app.dashboard_loading')).toBeInTheDocument();
    expect(screen.queryByText('Lade Wunschbox...')).not.toBeInTheDocument();
  });
});
