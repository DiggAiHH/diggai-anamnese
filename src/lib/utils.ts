/**
 * Utility Functions
 * 
 * Gemeinsame Hilfsfunktionen fuer die Anwendung.
 */

/**
 * Kombiniert CSS-Klassen (einfache Implementierung ohne clsx/tailwind-merge)
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs
    .filter(Boolean)
    .join(' ')
    .trim();
}

/**
 * Wartet eine bestimmte Zeit (Promise-basiert)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generiert eine zufaellige ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

/**
 * Kuerzt einen Text auf eine maximale Laenge
 */
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Formatert eine Zahl als Prozentwert
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Formatert eine Zahl mit Tausender-Trennzeichen
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE').format(value);
}
