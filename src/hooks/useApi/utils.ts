/**
 * Hilfsfunktionen für useApi Hooks
 * 
 * Enthält gemeinsame Utility-Funktionen, die von mehreren
 * API-Hooks verwendet werden.
 */

import type { ApiErrorResponse } from './types';

/**
 * Extrahiert eine Fehlermeldung aus einem API-Fehler
 * 
 * @param error - Der aufgetretene Fehler
 * @param fallback - Fallback-Text wenn keine Fehlermeldung extrahiert werden kann
 * @returns Die Fehlermeldung oder der Fallback-Text
 * 
 * @example
 * ```ts
 * const errorMessage = getErrorMessage(error, 'Verbindungsfehler');
 * ```
 */
export function getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as ApiErrorResponse).response;
        if (response?.data?.error) return response.data.error;
    }
    return fallback;
}

/**
 * Hilfsfunktion zur Erstellung von Query-Keys für React Query
 * 
 * @param base - Basis-Key
 * @param params - Optionale Parameter
 * @returns Ein Array von Query-Keys
 */
export function createQueryKey(
    base: string,
    params?: Record<string, unknown> | string | null
): string[] {
    if (params === undefined || params === null) {
        return [base];
    }
    
    if (typeof params === 'string') {
        return [base, params];
    }
    
    return [base, JSON.stringify(params)];
}

/**
 * Standard staleTime Werte für verschiedene Datenarten
 */
export const STALE_TIME = {
    /** Für Daten, die sich nie ändern */
    STATIC: Infinity,
    /** Für langsam ändernde Daten (5 Minuten) */
    SLOW: 5 * 60 * 1000,
    /** Für normale Daten (30 Sekunden) */
    NORMAL: 30 * 1000,
    /** Für schnell ändernde Daten (10 Sekunden) */
    FAST: 10 * 1000,
    /** Für sehr schnell ändernde Daten (5 Sekunden) */
    REALTIME: 5 * 1000,
} as const;

/**
 * Standard refetchInterval Werte für Polling
 */
export const REFETCH_INTERVAL = {
    /** Kein Polling */
    NONE: false,
    /** Sehr schnelles Polling (5 Sekunden) */
    REALTIME: 5 * 1000,
    /** Schnelles Polling (10 Sekunden) */
    FAST: 10 * 1000,
    /** Normales Polling (30 Sekunden) */
    NORMAL: 30 * 1000,
    /** Langsames Polling (60 Sekunden) */
    SLOW: 60 * 1000,
} as const;
