/**
 * Date Utilities
 * 
 * Hilfsfunktionen fuer Datumsformatierung und -berechnung.
 * Wrapper um date-fns mit Fallbacks.
 */

import { format, formatDistanceToNow as fnsFormatDistanceToNow, subMinutes } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * Formatiert ein Datum in deutsches Format
 */
export function formatDate(date: Date | string | number, formatStr: string = 'dd.MM.yyyy'): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, formatStr, { locale: de });
  } catch {
    return String(date);
  }
}

/**
 * Formatiert eine Zeit in deutsches Format
 */
export function formatTime(date: Date | string | number, formatStr: string = 'HH:mm'): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, formatStr, { locale: de });
  } catch {
    return String(date);
  }
  }

/**
 * Gibt die relative Zeit seit einem Datum zurueck (z.B. "vor 5 Minuten")
 */
export function formatDistanceToNow(date: Date | string | number, options?: { addSuffix?: boolean }): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return fnsFormatDistanceToNow(d, { 
      locale: de, 
      addSuffix: options?.addSuffix ?? true 
    });
  } catch {
    return String(date);
  }
}

/**
 * Formatiert eine Dauer in Minuten als lesbaren String
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} Min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} Std`;
  }
  
  return `${hours} Std ${remainingMinutes} Min`;
}

/**
 * Formatiert eine Dauer mit Farbcodierung fuer Wartezeiten
 */
export function formatWaitTime(minutes: number): { text: string; color: string } {
  const text = formatDuration(minutes);
  
  if (minutes < 15) {
    return { text, color: 'text-emerald-400' };
  }
  if (minutes < 30) {
    return { text, color: 'text-amber-400' };
  }
  return { text, color: 'text-red-400' };
}

// Re-export fuer Kompatibilitaet
export { subMinutes };
