import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WaitingContentTab } from './WaitingContentTab';
import {
  useAdminContentList,
  useAdminContentCreate,
  useAdminContentUpdate,
  useAdminContentDelete,
} from '../../hooks/useOpsApi';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../hooks/useOpsApi', () => ({
  useAdminContentList: vi.fn(),
  useAdminContentCreate: vi.fn(),
  useAdminContentUpdate: vi.fn(),
  useAdminContentDelete: vi.fn(),
}));

describe('WaitingContentTab i18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAdminContentList).mockReturnValue({
      data: [
        {
          id: 'content-1',
          type: 'HEALTH_TIP',
          category: 'allgemein',
          title: 'Hydration',
          body: 'Drink water',
          isActive: true,
          viewCount: 8,
          likeCount: 3,
        },
      ],
      isLoading: false,
    } as never);

    vi.mocked(useAdminContentCreate).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);

    vi.mocked(useAdminContentUpdate).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);

    vi.mocked(useAdminContentDelete).mockReturnValue({
      mutate: vi.fn(),
    } as never);
  });

  it('renders admin content labels via translation keys', () => {
    render(<WaitingContentTab />);

    expect(screen.getByRole('heading', { name: 'admin.content_title' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /admin\.content_create/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'admin.content_type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'admin.content_category' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'admin.content_views' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'admin.content_likes' })).toBeInTheDocument();

    expect(screen.queryByText('Wartezeit-Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Neuer Content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /admin\.content_create/i }));
    expect(screen.getByPlaceholderText('admin.content_item_title')).toBeInTheDocument();
    expect(screen.getByLabelText('admin.content_language')).toBeInTheDocument();
  });

  it('uses translated loading label', () => {
    vi.mocked(useAdminContentList).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never);

    render(<WaitingContentTab />);

    expect(screen.getByText('app.dashboard_loading')).toBeInTheDocument();
    expect(screen.queryByText('Lade Content...')).not.toBeInTheDocument();
  });
});
