/**
 * API Konfiguration
 * 
 * Diese Datei dokumentiert die API-Konfiguration und Interceptors.
 * Die eigentliche Axios-Konfiguration befindet sich in `../../api/client.ts`.
 * 
 * Für direkte API-Client-Nutzung:
 * ```ts
 * import { api, setAuthToken } from '../../api/client';
 * ```
 */

/**
 * Standard-Konfiguration für React Query
 */
export const defaultQueryConfig = {
    /** Fehler werden nicht automatisch retry'd */
    retry: false,
    /** Daten gelten als frisch für 30 Sekunden */
    staleTime: 30 * 1000,
    /** Refetch bei Fenster-Fokus aktiviert */
    refetchOnWindowFocus: true,
    /** Refetch bei Netzwerk-Reconnect aktiviert */
    refetchOnReconnect: true,
} as const;

/**
 * Konfiguration für Echtzeit-Daten (z.B. Queue, Chat)
 */
export const realtimeQueryConfig = {
    retry: false,
    staleTime: 0,
    refetchInterval: 10 * 1000, // 10 Sekunden
    refetchOnWindowFocus: true,
} as const;

/**
 * Konfiguration für statische Daten (z.B. Fragenkatalog)
 */
export const staticQueryConfig = {
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    refetchOnWindowFocus: false,
} as const;

/**
 * API-Error-Codes und ihre Bedeutung
 */
export const ApiErrorCode = {
    /** Session nicht gefunden oder abgelaufen */
    SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
    /** Ungültige Antwort-Daten */
    INVALID_ANSWER: 'INVALID_ANSWER',
    /** Atom nicht gefunden */
    ATOM_NOT_FOUND: 'ATOM_NOT_FOUND',
    /** Unzureichende Berechtigungen */
    FORBIDDEN: 'FORBIDDEN',
    /** Nicht authentifiziert */
    UNAUTHORIZED: 'UNAUTHORIZED',
    /** Validierungsfehler */
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    /** Serverfehler */
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    /** Dienst nicht verfügbar */
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

/**
 * HTTP-Status-Codes
 */
export const HttpStatus = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
} as const;
