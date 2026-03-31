import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserManagementTab } from './UserManagementTab';
import {
  useAdminUsers,
  useAdminCreateUser,
  useAdminUpdateUser,
  useAdminDeleteUser,
} from '../../hooks/useOpsApi';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../hooks/useOpsApi', () => ({
  useAdminUsers: vi.fn(),
  useAdminCreateUser: vi.fn(),
  useAdminUpdateUser: vi.fn(),
  useAdminDeleteUser: vi.fn(),
}));

describe('UserManagementTab i18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAdminUsers).mockReturnValue({
      data: [
        {
          id: 'user-1',
          username: 'mfa01',
          displayName: 'MFA One',
          role: 'MFA',
          isActive: true,
          _count: { assignedSessions: 3 },
        },
      ],
      isLoading: false,
    } as never);

    vi.mocked(useAdminCreateUser).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);

    vi.mocked(useAdminUpdateUser).mockReturnValue({
      mutate: vi.fn(),
    } as never);

    vi.mocked(useAdminDeleteUser).mockReturnValue({
      mutate: vi.fn(),
    } as never);
  });

  it('renders user management labels via translation keys', () => {
    render(<UserManagementTab />);

    expect(screen.getByRole('heading', { name: 'admin.users_title' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /admin\.users_create/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'admin.users_role' })).toBeInTheDocument();
    expect(screen.getByText('admin.content_active')).toBeInTheDocument();

    expect(screen.queryByText('Mitarbeiter-Verwaltung')).not.toBeInTheDocument();
    expect(screen.queryByText('Neuer Benutzer')).not.toBeInTheDocument();
    expect(screen.queryByText('Aktiv')).not.toBeInTheDocument();
  });

  it('uses translated loading label', () => {
    vi.mocked(useAdminUsers).mockReturnValue({
      data: [],
      isLoading: true,
    } as never);

    render(<UserManagementTab />);

    expect(screen.getByText('app.dashboard_loading')).toBeInTheDocument();
    expect(screen.queryByText('Lade Benutzer...')).not.toBeInTheDocument();
  });
});
