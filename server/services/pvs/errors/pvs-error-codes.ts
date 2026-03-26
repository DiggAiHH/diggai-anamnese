// ============================================
// PVS Error Codes — Strukturierte Fehlerklassifikation
// ============================================
// Format: PVS_[GDT|FHIR|SYSTEM]_[KATEGORIE]_[NUMMER]
// ============================================

/**
 * Fehler-Kategorien für PVS-Integration
 */
export type PvsErrorCategory = 
  | 'CONFIG'      // Konfigurationsfehler
  | 'NETWORK'     // Netzwerk/Kommunikationsfehler
  | 'AUTH'        // Authentifizierungs-/Autorisierungsfehler
  | 'VALIDATION'  // Validierungsfehler
  | 'SYSTEM'      // Systemfehler
  | 'TIMEOUT'     // Zeitüberschreitungen
  | 'RATE_LIMIT'; // Ratenbegrenzung

/**
 * Retry-Strategien für verschiedene Fehlertypen
 */
export interface RetryStrategy {
  /** Ist der Fehler retry-bar? */
  retryable: boolean;
  /** Maximale Anzahl Retries */
  maxRetries: number;
  /** Basis-Backoff in ms */
  baseDelayMs: number;
  /** Maximaler Backoff in ms */
  maxDelayMs: number;
  /** Exponential-Faktor */
  exponentialFactor: number;
  /** Jitter aktivieren */
  useJitter: boolean;
  /** Circuit Breaker öffnen? */
  triggersCircuitBreaker: boolean;
}

/**
 * Alle PVS-Fehlercodes mit Metadaten
 */
export const PvsErrorCodes = {
  // ═══════════════════════════════════════════════════════════
  // GDT FEHLER (001-099)
  // ═══════════════════════════════════════════════════════════
  
  // Config Errors
  PVS_GDT_001_EXPORT_DIR_MISSING: {
    code: 'PVS_GDT_001_EXPORT_DIR_MISSING',
    category: 'CONFIG' as PvsErrorCategory,
    message: 'GDT Export-Verzeichnis nicht konfiguriert',
    description: 'Das Export-Verzeichnis für GDT-Dateien wurde nicht angegeben',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_GDT_002_IMPORT_DIR_MISSING: {
    code: 'PVS_GDT_002_IMPORT_DIR_MISSING',
    category: 'CONFIG' as PvsErrorCategory,
    message: 'GDT Import-Verzeichnis nicht konfiguriert',
    description: 'Das Import-Verzeichnis für GDT-Dateien wurde nicht angegeben',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_GDT_003_SENDER_ID_MISSING: {
    code: 'PVS_GDT_003_SENDER_ID_MISSING',
    category: 'CONFIG' as PvsErrorCategory,
    message: 'GDT Sender-ID nicht konfiguriert',
    description: 'Die Sender-ID für GDT-Nachrichten fehlt',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_GDT_004_RECEIVER_ID_MISSING: {
    code: 'PVS_GDT_004_RECEIVER_ID_MISSING',
    category: 'CONFIG' as PvsErrorCategory,
    message: 'GDT Receiver-ID nicht konfiguriert',
    description: 'Die Empfänger-ID für GDT-Nachrichten fehlt',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_GDT_005_ENCODING_INVALID: {
    code: 'PVS_GDT_005_ENCODING_INVALID',
    category: 'CONFIG' as PvsErrorCategory,
    message: 'Ungültige GDT-Encoding-Konfiguration',
    description: 'Das angegebene Encoding wird nicht unterstützt (unterstützt: ISO-8859-15, CP437)',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },

  // Network Errors
  PVS_GDT_100_EXPORT_DIR_NOT_WRITABLE: {
    code: 'PVS_GDT_100_EXPORT_DIR_NOT_WRITABLE',
    category: 'NETWORK' as PvsErrorCategory,
    message: 'GDT Export-Verzeichnis nicht beschreibbar',
    description: 'Keine Schreibrechte im Export-Verzeichnis',
    retryStrategy: {
      retryable: true,
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      exponentialFactor: 2,
      useJitter: true,
      triggersCircuitBreaker: true,
    },
  },
  
  PVS_GDT_101_IMPORT_DIR_NOT_READABLE: {
    code: 'PVS_GDT_101_IMPORT_DIR_NOT_READABLE',
    category: 'NETWORK' as PvsErrorCategory,
    message: 'GDT Import-Verzeichnis nicht lesbar',
    description: 'Keine Leserechte im Import-Verzeichnis',
    retryStrategy: {
      retryable: true,
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      exponentialFactor: 2,
      useJitter: true,
      triggersCircuitBreaker: true,
    },
  },
  
  PVS_GDT_102_FILE_LOCK_TIMEOUT: {
    code: 'PVS_GDT_102_FILE_LOCK_TIMEOUT',
    category: 'NETWORK' as PvsErrorCategory,
    message: 'GDT-Datei ist gesperrt (Timeout)',
    description: 'Die Datei wird von einem anderen Prozess verwendet',
    retryStrategy: {
      retryable: true,
      maxRetries: 5,
      baseDelayMs: 500,
      maxDelayMs: 5000,
      exponentialFactor: 1.5,
      useJitter: true,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_GDT_103_DISK_FULL: {
    code: 'PVS_GDT_103_DISK_FULL',
    category: 'SYSTEM' as PvsErrorCategory,
    message: 'Speicherplatz für GDT-Export voll',
    description: 'Nicht genügend freier Speicherplatz für Datei-Export',
    retryStrategy: {
      retryable: true,
      maxRetries: 10,
      baseDelayMs: 5000,
      maxDelayMs: 60000,
      exponentialFactor: 2,
      useJitter: false,
      triggersCircuitBreaker: true,
    },
  },

  // Validation Errors
  PVS_GDT_200_INVALID_SATZART: {
    code: 'PVS_GDT_200_INVALID_SATZART',
    category: 'VALIDATION' as PvsErrorCategory,
    message: 'Ungültige GDT-Satzart',
    description: 'Die angegebene Satzart wird nicht unterstützt',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_GDT_201_INVALID_FIELD_FORMAT: {
    code: 'PVS_GDT_201_INVALID_FIELD_FORMAT',
    category: 'VALIDATION' as PvsErrorCategory,
    message: 'Ungültiges GDT-Feldformat',
    description: 'Ein GDT-Feld entspricht nicht dem erwarteten Format',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_GDT_202_PATIENT_NOT_FOUND: {
    code: 'PVS_GDT_202_PATIENT_NOT_FOUND',
    category: 'VALIDATION' as PvsErrorCategory,
    message: 'Patient nicht in GDT-Dateien gefunden',
    description: 'Der gesuchte Patient wurde in den GDT-Import-Dateien nicht gefunden',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_GDT_203_INVALID_LINE_LENGTH: {
    code: 'PVS_GDT_203_INVALID_LINE_LENGTH',
    category: 'VALIDATION' as PvsErrorCategory,
    message: 'Ungültige GDT-Zeilenlänge',
    description: 'Die angegebene Zeilenlänge stimmt nicht mit dem Inhalt überein',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },

  // System Errors
  PVS_GDT_300_FILE_SYSTEM_ERROR: {
    code: 'PVS_GDT_300_FILE_SYSTEM_ERROR',
    category: 'SYSTEM' as PvsErrorCategory,
    message: 'GDT Dateisystem-Fehler',
    description: 'Ein allgemeiner Dateisystem-Fehler ist aufgetreten',
    retryStrategy: {
      retryable: true,
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      exponentialFactor: 2,
      useJitter: true,
      triggersCircuitBreaker: true,
    },
  },
  
  PVS_GDT_301_ATOMIC_WRITE_FAILED: {
    code: 'PVS_GDT_301_ATOMIC_WRITE_FAILED',
    category: 'SYSTEM' as PvsErrorCategory,
    message: 'Atomarer GDT-Schreibvorgang fehlgeschlagen',
    description: 'Die temporäre Datei konnte nicht umbenannt werden',
    retryStrategy: {
      retryable: true,
      maxRetries: 2,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      exponentialFactor: 2,
      useJitter: true,
      triggersCircuitBreaker: false,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // FHIR FEHLER (400-499)
  // ═══════════════════════════════════════════════════════════
  
  // Config Errors
  PVS_FHIR_400_BASE_URL_MISSING: {
    code: 'PVS_FHIR_400_BASE_URL_MISSING',
    category: 'CONFIG' as PvsErrorCategory,
    message: 'FHIR Base-URL nicht konfiguriert',
    description: 'Die Basis-URL des FHIR-Servers fehlt',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_FHIR_401_AUTH_TYPE_INVALID: {
    code: 'PVS_FHIR_401_AUTH_TYPE_INVALID',
    category: 'CONFIG' as PvsErrorCategory,
    message: 'Ungültiger FHIR-Authentifizierungstyp',
    description: 'Der angegebene Auth-Typ wird nicht unterstützt (unterstützt: basic, oauth2, apikey)',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_FHIR_402_CREDENTIALS_INCOMPLETE: {
    code: 'PVS_FHIR_402_CREDENTIALS_INCOMPLETE',
    category: 'CONFIG' as PvsErrorCategory,
    message: 'FHIR-Anmeldedaten unvollständig',
    description: 'Für den gewählten Auth-Typ fehlen erforderliche Credentials',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },

  // Auth Errors
  PVS_FHIR_401_UNAUTHORIZED: {
    code: 'PVS_FHIR_401_UNAUTHORIZED',
    category: 'AUTH' as PvsErrorCategory,
    message: 'FHIR-Authentifizierung fehlgeschlagen',
    description: 'Ungültige Anmeldedaten oder abgelaufenes Token',
    retryStrategy: {
      retryable: true,
      maxRetries: 1,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
      exponentialFactor: 1,
      useJitter: false,
      triggersCircuitBreaker: true,
    },
  },
  
  PVS_FHIR_403_FORBIDDEN: {
    code: 'PVS_FHIR_403_FORBIDDEN',
    category: 'AUTH' as PvsErrorCategory,
    message: 'FHIR-Zugriff verweigert',
    description: 'Authentifiziert, aber keine Berechtigung für die angeforderte Ressource',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_FHIR_420_TOKEN_EXPIRED: {
    code: 'PVS_FHIR_420_TOKEN_EXPIRED',
    category: 'AUTH' as PvsErrorCategory,
    message: 'FHIR OAuth2 Token abgelaufen',
    description: 'Das Access-Token ist abgelaufen und konnte nicht erneuert werden',
    retryStrategy: {
      retryable: true,
      maxRetries: 2,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
      exponentialFactor: 1,
      useJitter: false,
      triggersCircuitBreaker: true,
    },
  },
  
  PVS_FHIR_421_TOKEN_REFRESH_FAILED: {
    code: 'PVS_FHIR_421_TOKEN_REFRESH_FAILED',
    category: 'AUTH' as PvsErrorCategory,
    message: 'FHIR Token-Refresh fehlgeschlagen',
    description: 'Die Erneuerung des OAuth2-Tokens ist fehlgeschlagen',
    retryStrategy: {
      retryable: true,
      maxRetries: 3,
      baseDelayMs: 2000,
      maxDelayMs: 10000,
      exponentialFactor: 2,
      useJitter: true,
      triggersCircuitBreaker: true,
    },
  },

  // Network Errors
  PVS_FHIR_440_CONNECTION_TIMEOUT: {
    code: 'PVS_FHIR_440_CONNECTION_TIMEOUT',
    category: 'TIMEOUT' as PvsErrorCategory,
    message: 'FHIR-Verbindungs-Timeout',
    description: 'Der FHIR-Server hat nicht innerhalb des Timeouts geantwortet',
    retryStrategy: {
      retryable: true,
      maxRetries: 3,
      baseDelayMs: 2000,
      maxDelayMs: 30000,
      exponentialFactor: 2,
      useJitter: true,
      triggersCircuitBreaker: true,
    },
  },
  
  PVS_FHIR_441_READ_TIMEOUT: {
    code: 'PVS_FHIR_441_READ_TIMEOUT',
    category: 'TIMEOUT' as PvsErrorCategory,
    message: 'FHIR-Lese-Timeout',
    description: 'Das Lesen der Antwort vom FHIR-Server hat zu lange gedauert',
    retryStrategy: {
      retryable: true,
      maxRetries: 3,
      baseDelayMs: 2000,
      maxDelayMs: 30000,
      exponentialFactor: 2,
      useJitter: true,
      triggersCircuitBreaker: true,
    },
  },
  
  PVS_FHIR_442_DNS_RESOLUTION_FAILED: {
    code: 'PVS_FHIR_442_DNS_RESOLUTION_FAILED',
    category: 'NETWORK' as PvsErrorCategory,
    message: 'FHIR-Server DNS-Auflösung fehlgeschlagen',
    description: 'Der Hostname des FHIR-Servers konnte nicht aufgelöst werden',
    retryStrategy: {
      retryable: true,
      maxRetries: 5,
      baseDelayMs: 3000,
      maxDelayMs: 60000,
      exponentialFactor: 2,
      useJitter: true,
      triggersCircuitBreaker: true,
    },
  },
  
  PVS_FHIR_443_CONNECTION_RESET: {
    code: 'PVS_FHIR_443_CONNECTION_RESET',
    category: 'NETWORK' as PvsErrorCategory,
    message: 'FHIR-Verbindung zurückgesetzt',
    description: 'Die TCP-Verbindung wurde unerwartet beendet',
    retryStrategy: {
      retryable: true,
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      exponentialFactor: 2,
      useJitter: true,
      triggersCircuitBreaker: true,
    },
  },
  
  PVS_FHIR_444_TLS_HANDSHAKE_FAILED: {
    code: 'PVS_FHIR_444_TLS_HANDSHAKE_FAILED',
    category: 'NETWORK' as PvsErrorCategory,
    message: 'FHIR TLS-Handshake fehlgeschlagen',
    description: 'Die SSL/TLS-Verbindung konnte nicht aufgebaut werden',
    retryStrategy: {
      retryable: true,
      maxRetries: 2,
      baseDelayMs: 2000,
      maxDelayMs: 10000,
      exponentialFactor: 2,
      useJitter: true,
      triggersCircuitBreaker: true,
    },
  },

  // HTTP Status Errors
  PVS_FHIR_404_NOT_FOUND: {
    code: 'PVS_FHIR_404_NOT_FOUND',
    category: 'VALIDATION' as PvsErrorCategory,
    message: 'FHIR-Ressource nicht gefunden',
    description: 'Die angeforderte FHIR-Ressource existiert nicht',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_FHIR_409_CONFLICT: {
    code: 'PVS_FHIR_409_CONFLICT',
    category: 'VALIDATION' as PvsErrorCategory,
    message: 'FHIR-Konflikt bei Aktualisierung',
    description: 'Versionskonflikt oder duplizierter Identifier',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_FHIR_422_UNPROCESSABLE: {
    code: 'PVS_FHIR_422_UNPROCESSABLE',
    category: 'VALIDATION' as PvsErrorCategory,
    message: 'FHIR-Ressource unverarbeitbar',
    description: 'Die Ressource enthält ungültige Daten oder verletzt Constraints',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_FHIR_429_RATE_LIMIT: {
    code: 'PVS_FHIR_429_RATE_LIMIT',
    category: 'RATE_LIMIT' as PvsErrorCategory,
    message: 'FHIR Ratenbegrenzung überschritten',
    description: 'Zu viele Anfragen - Retry-After Header beachten',
    retryStrategy: {
      retryable: true,
      maxRetries: 10,
      baseDelayMs: 5000,
      maxDelayMs: 60000,
      exponentialFactor: 2,
      useJitter: false,
      triggersCircuitBreaker: true,
    },
  },
  
  PVS_FHIR_500_SERVER_ERROR: {
    code: 'PVS_FHIR_500_SERVER_ERROR',
    category: 'SYSTEM' as PvsErrorCategory,
    message: 'Interner FHIR-Serverfehler',
    description: 'Der FHIR-Server hat einen internen Fehler gemeldet',
    retryStrategy: {
      retryable: true,
      maxRetries: 3,
      baseDelayMs: 2000,
      maxDelayMs: 30000,
      exponentialFactor: 2,
      useJitter: true,
      triggersCircuitBreaker: true,
    },
  },
  
  PVS_FHIR_502_BAD_GATEWAY: {
    code: 'PVS_FHIR_502_BAD_GATEWAY',
    category: 'NETWORK' as PvsErrorCategory,
    message: 'FHIR Bad Gateway',
    description: 'Ungültige Antwort vom upstream Server',
    retryStrategy: {
      retryable: true,
      maxRetries: 3,
      baseDelayMs: 3000,
      maxDelayMs: 30000,
      exponentialFactor: 2,
      useJitter: true,
      triggersCircuitBreaker: true,
    },
  },
  
  PVS_FHIR_503_SERVICE_UNAVAILABLE: {
    code: 'PVS_FHIR_503_SERVICE_UNAVAILABLE',
    category: 'SYSTEM' as PvsErrorCategory,
    message: 'FHIR-Server nicht verfügbar',
    description: 'Der FHIR-Server ist vorübergehend nicht erreichbar',
    retryStrategy: {
      retryable: true,
      maxRetries: 10,
      baseDelayMs: 5000,
      maxDelayMs: 120000,
      exponentialFactor: 2,
      useJitter: false,
      triggersCircuitBreaker: true,
    },
  },
  
  PVS_FHIR_504_GATEWAY_TIMEOUT: {
    code: 'PVS_FHIR_504_GATEWAY_TIMEOUT',
    category: 'TIMEOUT' as PvsErrorCategory,
    message: 'FHIR Gateway-Timeout',
    description: 'Der upstream Server hat nicht rechtzeitig geantwortet',
    retryStrategy: {
      retryable: true,
      maxRetries: 3,
      baseDelayMs: 3000,
      maxDelayMs: 30000,
      exponentialFactor: 2,
      useJitter: true,
      triggersCircuitBreaker: true,
    },
  },

  // Validation Errors
  PVS_FHIR_460_INVALID_RESOURCE: {
    code: 'PVS_FHIR_460_INVALID_RESOURCE',
    category: 'VALIDATION' as PvsErrorCategory,
    message: 'Ungültige FHIR-Ressource',
    description: 'Die Ressource entspricht nicht dem FHIR-Profil',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_FHIR_461_INVALID_SEARCH_PARAMS: {
    code: 'PVS_FHIR_461_INVALID_SEARCH_PARAMS',
    category: 'VALIDATION' as PvsErrorCategory,
    message: 'Ungültige FHIR-Suchparameter',
    description: 'Die angegebenen Suchparameter sind nicht valide',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // SYSTEM FEHLER (900-999)
  // ═══════════════════════════════════════════════════════════
  
  PVS_SYSTEM_900_UNKNOWN: {
    code: 'PVS_SYSTEM_900_UNKNOWN',
    category: 'SYSTEM' as PvsErrorCategory,
    message: 'Unbekannter PVS-Systemfehler',
    description: 'Ein unerwarteter Fehler ist aufgetreten',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: true,
    },
  },
  
  PVS_SYSTEM_901_ADAPTER_NOT_INITIALIZED: {
    code: 'PVS_SYSTEM_901_ADAPTER_NOT_INITIALIZED',
    category: 'SYSTEM' as PvsErrorCategory,
    message: 'PVS-Adapter nicht initialisiert',
    description: 'Der Adapter wurde nicht initialisiert oder wurde getrennt',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_SYSTEM_902_UNSUPPORTED_OPERATION: {
    code: 'PVS_SYSTEM_902_UNSUPPORTED_OPERATION',
    category: 'SYSTEM' as PvsErrorCategory,
    message: 'Nicht unterstützte Operation',
    description: 'Diese Operation wird vom Adapter nicht unterstützt',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_SYSTEM_903_ENCRYPTION_ERROR: {
    code: 'PVS_SYSTEM_903_ENCRYPTION_ERROR',
    category: 'SYSTEM' as PvsErrorCategory,
    message: 'Verschlüsselungsfehler',
    description: 'Fehler bei der Verschlüsselung oder Entschlüsselung von Daten',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_SYSTEM_904_SERIALIZATION_ERROR: {
    code: 'PVS_SYSTEM_904_SERIALIZATION_ERROR',
    category: 'SYSTEM' as PvsErrorCategory,
    message: 'Serialisierungsfehler',
    description: 'Fehler bei der Datenkonvertierung',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: false,
    },
  },
  
  PVS_SYSTEM_905_MEMORY_LIMIT: {
    code: 'PVS_SYSTEM_905_MEMORY_LIMIT',
    category: 'SYSTEM' as PvsErrorCategory,
    message: 'Speicherlimit erreicht',
    description: 'Die Operation benötigt zu viel Speicher',
    retryStrategy: {
      retryable: false,
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialFactor: 0,
      useJitter: false,
      triggersCircuitBreaker: true,
    },
  },
} as const;

/**
 * Type für alle PVS-Fehlercodes
 */
export type PvsErrorCode = keyof typeof PvsErrorCodes;

/**
 * Type für Fehlercode-Metadaten
 */
export type PvsErrorMetadata = typeof PvsErrorCodes[PvsErrorCode];

/**
 * Hilfsfunktion: Retry-Strategie für einen Fehlercode abrufen
 */
export function getRetryStrategy(code: PvsErrorCode): RetryStrategy {
  return PvsErrorCodes[code].retryStrategy;
}

/**
 * Hilfsfunktion: Fehlermeldung für einen Fehlercode abrufen
 */
export function getErrorMessage(code: PvsErrorCode): string {
  return PvsErrorCodes[code].message;
}

/**
 * Hilfsfunktion: Fehlerkategorie für einen Fehlercode abrufen
 */
export function getErrorCategory(code: PvsErrorCode): PvsErrorCategory {
  return PvsErrorCodes[code].category;
}

/**
 * Liste aller Fehlercodes gruppiert nach Kategorie
 */
export const ErrorCodesByCategory: Record<PvsErrorCategory, PvsErrorCode[]> = {
  CONFIG: [
    'PVS_GDT_001_EXPORT_DIR_MISSING',
    'PVS_GDT_002_IMPORT_DIR_MISSING',
    'PVS_GDT_003_SENDER_ID_MISSING',
    'PVS_GDT_004_RECEIVER_ID_MISSING',
    'PVS_GDT_005_ENCODING_INVALID',
    'PVS_FHIR_400_BASE_URL_MISSING',
    'PVS_FHIR_401_AUTH_TYPE_INVALID',
    'PVS_FHIR_402_CREDENTIALS_INCOMPLETE',
  ],
  NETWORK: [
    'PVS_GDT_100_EXPORT_DIR_NOT_WRITABLE',
    'PVS_GDT_101_IMPORT_DIR_NOT_READABLE',
    'PVS_GDT_102_FILE_LOCK_TIMEOUT',
    'PVS_FHIR_442_DNS_RESOLUTION_FAILED',
    'PVS_FHIR_443_CONNECTION_RESET',
    'PVS_FHIR_444_TLS_HANDSHAKE_FAILED',
    'PVS_FHIR_502_BAD_GATEWAY',
  ],
  AUTH: [
    'PVS_FHIR_401_UNAUTHORIZED',
    'PVS_FHIR_403_FORBIDDEN',
    'PVS_FHIR_420_TOKEN_EXPIRED',
    'PVS_FHIR_421_TOKEN_REFRESH_FAILED',
  ],
  VALIDATION: [
    'PVS_GDT_200_INVALID_SATZART',
    'PVS_GDT_201_INVALID_FIELD_FORMAT',
    'PVS_GDT_202_PATIENT_NOT_FOUND',
    'PVS_GDT_203_INVALID_LINE_LENGTH',
    'PVS_FHIR_404_NOT_FOUND',
    'PVS_FHIR_409_CONFLICT',
    'PVS_FHIR_422_UNPROCESSABLE',
    'PVS_FHIR_460_INVALID_RESOURCE',
    'PVS_FHIR_461_INVALID_SEARCH_PARAMS',
  ],
  SYSTEM: [
    'PVS_GDT_103_DISK_FULL',
    'PVS_GDT_300_FILE_SYSTEM_ERROR',
    'PVS_GDT_301_ATOMIC_WRITE_FAILED',
    'PVS_FHIR_500_SERVER_ERROR',
    'PVS_FHIR_503_SERVICE_UNAVAILABLE',
    'PVS_SYSTEM_900_UNKNOWN',
    'PVS_SYSTEM_901_ADAPTER_NOT_INITIALIZED',
    'PVS_SYSTEM_902_UNSUPPORTED_OPERATION',
    'PVS_SYSTEM_903_ENCRYPTION_ERROR',
    'PVS_SYSTEM_904_SERIALIZATION_ERROR',
    'PVS_SYSTEM_905_MEMORY_LIMIT',
  ],
  TIMEOUT: [
    'PVS_GDT_102_FILE_LOCK_TIMEOUT',
    'PVS_FHIR_440_CONNECTION_TIMEOUT',
    'PVS_FHIR_441_READ_TIMEOUT',
    'PVS_FHIR_504_GATEWAY_TIMEOUT',
  ],
  RATE_LIMIT: [
    'PVS_FHIR_429_RATE_LIMIT',
  ],
};

/**
 * HTTP Status Code zu PVS Fehlercode Mapping
 */
export const HttpStatusToErrorCode: Record<number, PvsErrorCode> = {
  400: 'PVS_FHIR_460_INVALID_RESOURCE',
  401: 'PVS_FHIR_401_UNAUTHORIZED',
  403: 'PVS_FHIR_403_FORBIDDEN',
  404: 'PVS_FHIR_404_NOT_FOUND',
  409: 'PVS_FHIR_409_CONFLICT',
  422: 'PVS_FHIR_422_UNPROCESSABLE',
  429: 'PVS_FHIR_429_RATE_LIMIT',
  500: 'PVS_FHIR_500_SERVER_ERROR',
  502: 'PVS_FHIR_502_BAD_GATEWAY',
  503: 'PVS_FHIR_503_SERVICE_UNAVAILABLE',
  504: 'PVS_FHIR_504_GATEWAY_TIMEOUT',
};

/**
 * Konvertiert einen HTTP-Status-Code in einen PVS-Fehlercode
 */
export function mapHttpStatusToErrorCode(status: number): PvsErrorCode {
  return HttpStatusToErrorCode[status] || 'PVS_SYSTEM_900_UNKNOWN';
}
