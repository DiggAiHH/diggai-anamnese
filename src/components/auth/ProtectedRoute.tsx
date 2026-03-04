import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAuthToken } from '../../api/client';

export type UserRole = 'patient' | 'arzt' | 'mfa' | 'admin';

function parseJwt(token: string): { role?: UserRole; exp?: number } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function getCurrentRole(): UserRole | null {
  const token = getAuthToken();
  if (!token) return null;
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return null;
  if (payload.exp * 1000 < Date.now()) return null;
  return payload.role ?? null;
}

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
  const role = getCurrentRole();

  if (!role) {
    return <Navigate to={redirectTo ?? '/'} state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(role)) {
    // Redirect to role-appropriate home
    const roleHome: Record<UserRole, string> = {
      patient: '/patient',
      arzt: '/arzt',
      mfa: '/mfa',
      admin: '/admin',
    };
    return <Navigate to={roleHome[role] ?? '/'} replace />;
  }

  return <>{children}</>;
}
