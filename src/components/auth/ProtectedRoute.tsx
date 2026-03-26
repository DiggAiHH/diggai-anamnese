import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStaffSession } from '../../hooks/useStaffSession';

export type UserRole = 'patient' | 'arzt' | 'mfa' | 'admin';

interface Props {
  children: ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

/**
 * Client-side route guard. Checks JWT role against allowed roles.
 * Redirects unauthenticated users to "/" and unauthorized users to their home.
 */
export function ProtectedRoute({ children, allowedRoles, redirectTo }: Props) {
  const location = useLocation();
  const { data: user, isLoading } = useStaffSession();

  if (isLoading) {
    return null;
  }

  const role = user?.role ?? null;

  if (!role) {
    return <Navigate to={redirectTo ?? '/'} state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(role)) {
    // Redirect to role-appropriate home
    const roleHome: Record<UserRole, string> = {
      patient: '/patient',
      arzt: '/verwaltung/arzt',
      mfa: '/verwaltung/mfa',
      admin: '/verwaltung/admin',
    };
    return <Navigate to={roleHome[role] ?? '/'} replace />;
  }

  return <>{children}</>;
}
