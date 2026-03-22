/**
 * useAbortableRequest Hook
 * 
 * Utility-Hook für abortable API Requests.
 * Verhindert Race Conditions durch automatisches Abbrechen laufender Requests
 * bei Unmount oder Dependency-Änderungen.
 * 
 * @example
 * ```ts
 * export function usePatientData(sessionId: string) {
 *   const { getSignal } = useAbortableRequest();
 *   
 *   return useQuery({
 *     queryKey: ['patient', sessionId],
 *     queryFn: async () => {
 *       const signal = getSignal();
 *       const response = await api.get(`/api/sessions/${sessionId}`, { signal });
 *       return response.data;
 *     },
 *     enabled: !!sessionId,
 *   });
 * }
 * ```
 */

import { useEffect, useRef, useCallback } from 'react';

export interface AbortableRequestResult {
    /** Gibt den AbortSignal für den aktuellen Request zurück */
    getSignal: () => AbortSignal;
    /** Bricht den aktuellen Request manuell ab */
    abort: (reason?: string) => void;
    /** Prüft ob der aktuelle Request abgebrochen wurde */
    isAborted: () => boolean;
}

/**
 * Hook zum Verwalten von abortable Requests
 * 
 * WICHTIG: Nur für GET-Requests verwenden! Mutations sollten nicht abbrechbar sein,
 * da sie Side-Effects haben können (z.B. Datenbank-Schreiboperationen).
 * 
 * Features:
 * - Automatisches Abbrechen bei Unmount
 * - Automatisches Abbrechen bei Dependency-Änderungen (neuer getSignal Aufruf)
 * - Graceful Handling von AbortError (keine Fehleranzeige)
 */
export function useAbortableRequest(): AbortableRequestResult {
    const abortControllerRef = useRef<AbortController | null>(null);
    const isAbortedRef = useRef<boolean>(false);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort('Component unmounted');
                abortControllerRef.current = null;
            }
        };
    }, []);

    /**
     * Gibt ein AbortSignal zurück und bricht vorherige Requests ab
     */
    const getSignal = useCallback((): AbortSignal => {
        // Abort previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort('New request initiated');
        }
        
        // Create new controller
        abortControllerRef.current = new AbortController();
        isAbortedRef.current = false;
        
        // Listen for abort to update ref
        abortControllerRef.current.signal.addEventListener('abort', () => {
            isAbortedRef.current = true;
        });
        
        return abortControllerRef.current.signal;
    }, []);

    /**
     * Manuelles Abbrechen des aktuellen Requests
     */
    const abort = useCallback((reason?: string): void => {
        if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
            abortControllerRef.current.abort(reason);
        }
    }, []);

    /**
     * Prüft ob der aktuelle Request abgebrochen wurde
     */
    const isAborted = useCallback((): boolean => {
        return isAbortedRef.current || abortControllerRef.current?.signal.aborted || false;
    }, []);

    return { getSignal, abort, isAborted };
}

/**
 * Type Guard für AbortError
 * 
 * Prüft ob ein Fehler ein AbortError ist (vom AbortController)
 */
export function isAbortError(error: unknown): boolean {
    if (error instanceof Error) {
        return error.name === 'AbortError' || error.name === 'CanceledError';
    }
    // Axios specific check
    if (typeof error === 'object' && error !== null) {
        const err = error as { code?: string; name?: string };
        return err.code === 'ERR_CANCELED' || err.name === 'CanceledError';
    }
    return false;
}

/**
 * Hilfsfunktion zum sicheren Ausführen von API Calls mit AbortError Handling
 * 
 * @param fn - Die auszuführende Funktion
 * @param fallbackError - Fallback-Fehlermeldung
 * @returns Das Ergebnis der Funktion oder undefined bei AbortError
 */
export async function withAbortHandling<T>(
    fn: () => Promise<T>,
    fallbackError?: string
): Promise<T | undefined> {
    try {
        return await fn();
    } catch (error) {
        if (isAbortError(error)) {
            // AbortError soll nicht als Fehler angezeigt werden
            return undefined;
        }
        if (fallbackError) {
            throw new Error(fallbackError);
        }
        throw error;
    }
}

export default useAbortableRequest;
