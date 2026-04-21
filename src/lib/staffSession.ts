import { setAuthToken } from '../api/client';

export type StaffRole = 'arzt' | 'mfa' | 'admin';

export interface StaffUser {
  id: string;
  username: string;
  displayName: string;
  role: StaffRole;
}

const STAFF_SESSION_STORAGE_KEY = 'diggai.staff.session';

export function normalizeStaffRole(role: string | null | undefined): StaffRole | null {
  const normalized = role?.toLowerCase();
  if (normalized === 'arzt' || normalized === 'mfa' || normalized === 'admin') {
    return normalized;
  }
  return null;
}

function isStaffUser(value: unknown): value is StaffUser {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const user = value as Record<string, unknown>;
  return (
    typeof user.id === 'string' &&
    typeof user.username === 'string' &&
    typeof user.displayName === 'string' &&
    normalizeStaffRole(typeof user.role === 'string' ? user.role : null) !== null
  );
}

export function getStoredStaffUser(): StaffUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(STAFF_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!isStaffUser(parsed)) {
      sessionStorage.removeItem(STAFF_SESSION_STORAGE_KEY);
      return null;
    }

    return {
      ...parsed,
      role: normalizeStaffRole(parsed.role)!,
    };
  } catch {
    sessionStorage.removeItem(STAFF_SESSION_STORAGE_KEY);
    return null;
  }
}

const STAFF_TOKEN_STORAGE_KEY = 'diggai.staff.token';

export function getStoredStaffToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(STAFF_TOKEN_STORAGE_KEY);
}

export function setStoredStaffToken(token: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (!token) {
    localStorage.removeItem(STAFF_TOKEN_STORAGE_KEY);
    setAuthToken(null);
    return;
  }
  localStorage.setItem(STAFF_TOKEN_STORAGE_KEY, token);
  setAuthToken(token);
}

export function bootstrapStaffAuth(): void {
  const token = getStoredStaffToken();
  if (token) {
    setAuthToken(token);
  }
}

export function setStoredStaffUser(user: StaffUser | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!user) {
    sessionStorage.removeItem(STAFF_SESSION_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(STAFF_SESSION_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredStaffUser(): void {
  setStoredStaffUser(null);
  setStoredStaffToken(null);
}
