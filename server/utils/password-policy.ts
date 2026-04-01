/**
 * @module password-policy
 * @description BSI TR-02102 konforme Passwort-Richtlinien für medizinische Anwendungen.
 *
 * Anforderungen gemäß BSI TR-02102-1 (Version 2023):
 * - Mindestlänge: 12 Zeichen
 * - Komplexität: Großbuchstaben, Kleinbuchstaben, Ziffern, Sonderzeichen
 * - Verbot von Trivialpasswörtern (häufige Muster, Wörterbuch-Angriffe)
 *
 * Anwendung: Passwortregistrierung, Passwort-Reset, Admin-Passwort-Änderung
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/** Häufig verwendete Passwort-Muster die verboten sind */
const FORBIDDEN_PATTERNS = [
  'password', 'passwort', 'kennwort',
  '123456789012', 'qwertyuiopas', 'abcdefghijkl',
  'praxis2026', 'praxis2025', 'changeme', 'admin1234',
];

/**
 * Validiert ein Passwort gemäß BSI TR-02102 Anforderungen.
 *
 * @param password - Das zu prüfende Passwort (Klartext)
 * @returns Validierungsergebnis mit Liste aller Fehler (leer wenn valid)
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // 1. Mindestlänge: 12 Zeichen (BSI TR-02102)
  if (password.length < 12) {
    errors.push('Mindestens 12 Zeichen erforderlich (BSI TR-02102)');
  }

  // 2. Maximallänge: 128 Zeichen (verhindert DoS durch zu lange Passwörter beim Hashing)
  if (password.length > 128) {
    errors.push('Maximal 128 Zeichen erlaubt');
  }

  // 3. Komplexität: Großbuchstaben
  if (!/[A-ZÄÖÜ]/.test(password)) {
    errors.push('Mindestens ein Großbuchstabe erforderlich');
  }

  // 4. Komplexität: Kleinbuchstaben
  if (!/[a-zäöüß]/.test(password)) {
    errors.push('Mindestens ein Kleinbuchstabe erforderlich');
  }

  // 5. Komplexität: Ziffer
  if (!/[0-9]/.test(password)) {
    errors.push('Mindestens eine Zahl erforderlich');
  }

  // 6. Komplexität: Sonderzeichen
  if (!/[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~]/.test(password)) {
    errors.push('Mindestens ein Sonderzeichen erforderlich (!@#$%^&* etc.)');
  }

  // 7. Verbot von bekannten schwachen Mustern
  const lower = password.toLowerCase();
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (lower.includes(pattern)) {
      errors.push('Passwort enthält ein häufig verwendetes Muster — bitte wählen Sie ein stärkeres Passwort');
      break;
    }
  }

  // 8. Kein wiederholtes Zeichen (z.B. "aaaaaaaaaaaa")
  if (/(.)\1{7,}/.test(password)) {
    errors.push('Passwort darf kein einzelnes Zeichen 8x oder mehr wiederholen');
  }

  return { valid: errors.length === 0, errors };
}
