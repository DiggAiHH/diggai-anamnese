/**
 * userInitials — Generates avatar initials with sensible logic for German medical practice users.
 *
 * M1 (Arzt-Feedback 2026-05-03): Initialen wirkten zufaellig. Logik soll sein:
 * - Initialen aus Vor- + Nachname (z.B. "Christian Klaproth" -> "CK")
 * - Praefix (z.B. "Dr.") als Tooltip, nicht im Avatar
 * - Fallback: erste 2 Buchstaben Vorname, dann erste 2 Praefix
 */

export interface UserInitialsInput {
  firstName?: string | null;
  lastName?: string | null;
  prefix?: string | null;
}

export interface UserInitialsResult {
  initials: string;
  prefixTooltip?: string;
}

const cleanPrefix = (prefix?: string | null): string =>
  (prefix ?? '').trim().replace(/\.+$/, '');

const firstChar = (s?: string | null): string =>
  (s ?? '').trim().charAt(0).toUpperCase();

export function getUserInitials(user: UserInitialsInput): UserInitialsResult {
  const fnInitial = firstChar(user.firstName);
  const lnInitial = firstChar(user.lastName);
  const prefix = cleanPrefix(user.prefix);

  let initials: string;
  if (fnInitial && lnInitial) {
    initials = `${fnInitial}${lnInitial}`;
  } else if (fnInitial) {
    initials = (user.firstName ?? '').slice(0, 2).toUpperCase();
  } else if (lnInitial) {
    initials = (user.lastName ?? '').slice(0, 2).toUpperCase();
  } else if (prefix) {
    initials = prefix.slice(0, 2).toUpperCase();
  } else {
    initials = '?';
  }

  return prefix
    ? { initials, prefixTooltip: `${prefix}.` }
    : { initials };
}
