// ============================================
// PVS Error Classes
// ============================================
// Strukturierte Fehler mit Codes für bessere Fehlerbehandlung

export type PvsErrorCode =
  // GDT Errors (1000-1999)
  | 'PVS_GDT_1001_EXPORT_DIR_MISSING'
  | 'PVS_GDT_1002_IMPORT_DIR_MISSING'
  | 'PVS_GDT_1003_EXPORT_DIR_NOT_WRITABLE'
  | 'PVS_GDT_1004_IMPORT_DIR_NOT_READABLE'
  | 'PVS_GDT_1005_FILE_LOCKED'
  | 'PVS_GDT_1006_FILE_CORRUPTED'
  | 'PVS_GDT_1007_INVALID_ENCODING'
  | 'PVS_GDT_1008_INVALID_SATZART'
  | 'PVS_GDT_1009_PATIENT_NOT_FOUND'
  // FHIR Errors (2000-2999)
  | 'PVS_FHIR_2001_BASE_URL_MISSING'
  | 'PVS_FHIR_2002_AUTH_FAILED'
  | 'PVS_FHIR_2003_UNAUTHORIZED'
  | 'PVS_FHIR_2004_FORBIDDEN'
  | 'PVS_FHIR_2005_SERVER_ERROR'
  | 'PVS_FHIR_2006_TIMEOUT'
  | 'PVS_FHIR_2007_RATE_LIMITED'
  | 'PVS_FHIR_2008_RESOURCE_NOT_FOUND'
  | 'PVS_FHIR_2009_VALIDATION_FAILED'
  // Config Errors (3000-3999)
  | 'PVS_CFG_3001_CONNECTION_NOT_CONFIGURED'
  | 'PVS_CFG_3002_INVALID_PROTOCOL'
  | 'PVS_CFG_3003_INVALID_PVS_TYPE'
  | 'PVS_CFG_3004_CREDENTIALS_INVALID'
  // Network Errors (4000-4999)
  | 'PVS_NET_4001_CONNECTION_TIMEOUT'
  | 'PVS_NET_4002_DNS_ERROR'
  | 'PVS_NET_4003_TLS_ERROR'
  // System Errors (5000-5999)
  | 'PVS_SYS_5001_ADAPTER_NOT_INITIALIZED'
  | 'PVS_SYS_5002_ENCRYPTION_FAILED'
  | 'PVS_SYS_5003_DECRYPTION_FAILED'
  | 'PVS_SYS_5004_UNKNOWN_ERROR';

export interface PvsErrorDetails {
  field?: string;
  value?: unknown;
  expected?: unknown;
  suggestion?: string;
  body?: string;
  retryAfter?: number;
  state?: string;
  [key: string]: unknown;
}

/**
 * Structured PVS Error
 */
export class PvsError extends Error {
  readonly code: PvsErrorCode;
  readonly details?: PvsErrorDetails;
  readonly retryable: boolean;
  readonly timestamp: Date;
  readonly originalError?: Error;

  constructor(
    code: PvsErrorCode,
    message: string,
    options?: {
      details?: PvsErrorDetails;
      retryable?: boolean;
      originalError?: Error;
      field?: string;
      value?: unknown;
      suggestion?: string;
      body?: string;
    }
  ) {
    super(message);
    this.name = 'PvsError';
    this.code = code;
    this.details = options?.details;
    this.retryable = options?.retryable ?? this.isRetryableByDefault(code);
    this.timestamp = new Date();
    this.originalError = options?.originalError;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PvsError);
    }
  }

  /**
   * Determine if error is retryable based on code
   */
  private isRetryableByDefault(code: PvsErrorCode): boolean {
    const retryableCodes: PvsErrorCode[] = [
      'PVS_GDT_1005_FILE_LOCKED',
      'PVS_FHIR_2005_SERVER_ERROR',
      'PVS_FHIR_2006_TIMEOUT',
      'PVS_FHIR_2007_RATE_LIMITED',
      'PVS_NET_4001_CONNECTION_TIMEOUT',
    ];
    return retryableCodes.includes(code);
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      originalError: this.originalError?.message,
    };
  }

  // Factory methods for common errors

  static exportDirMissing(path?: string): PvsError {
    return new PvsError(
      'PVS_GDT_1001_EXPORT_DIR_MISSING',
      `GDT Export-Verzeichnis nicht konfiguriert oder nicht gefunden: ${path}`,
      { field: 'gdtExportDir', value: path, suggestion: 'Stellen Sie sicher, dass das Export-Verzeichnis existiert und beschreibbar ist.' }
    );
  }

  static importDirMissing(path?: string): PvsError {
    return new PvsError(
      'PVS_GDT_1002_IMPORT_DIR_MISSING',
      `GDT Import-Verzeichnis nicht konfiguriert oder nicht gefunden: ${path}`,
      { field: 'gdtImportDir', value: path, suggestion: 'Stellen Sie sicher, dass das Import-Verzeichnis existiert und lesbar ist.' }
    );
  }

  static fileLocked(filePath: string): PvsError {
    return new PvsError(
      'PVS_GDT_1005_FILE_LOCKED',
      `Datei ist gesperrt: ${filePath}`,
      { value: filePath, retryable: true, suggestion: 'Das PVS schreibt möglicherweise noch in die Datei. Warten Sie einen Moment und versuchen Sie es erneut.' }
    );
  }

  static patientNotFound(searchCriteria: string): PvsError {
    return new PvsError(
      'PVS_GDT_1009_PATIENT_NOT_FOUND',
      `Patient nicht gefunden: ${searchCriteria}`,
      { value: searchCriteria, suggestion: 'Überprüfen Sie die Suchkriterien oder importieren Sie den Patienten manuell.' }
    );
  }

  static fhirAuthFailed(url: string, originalError?: Error): PvsError {
    return new PvsError(
      'PVS_FHIR_2002_AUTH_FAILED',
      `FHIR Authentifizierung fehlgeschlagen: ${url}`,
      { value: url, retryable: false, suggestion: 'Überprüfen Sie die Zugangsdaten und die Authentifizierungsmethode.', originalError }
    );
  }

  static fhirServerError(status: number, body?: string): PvsError {
    return new PvsError(
      'PVS_FHIR_2005_SERVER_ERROR',
      `FHIR Server-Fehler: HTTP ${status}`,
      { value: status, details: { body }, retryable: true, suggestion: 'Der PVS-Server hat einen internen Fehler. Versuchen Sie es später erneut.' }
    );
  }

  static connectionNotConfigured(): PvsError {
    return new PvsError(
      'PVS_CFG_3001_CONNECTION_NOT_CONFIGURED',
      'Keine PVS-Verbindung konfiguriert',
      { suggestion: 'Konfigurieren Sie eine PVS-Verbindung in den Einstellungen.' }
    );
  }

  static adapterNotInitialized(pvsType: string): PvsError {
    return new PvsError(
      'PVS_SYS_5001_ADAPTER_NOT_INITIALIZED',
      `Adapter für ${pvsType} nicht initialisiert`,
      { value: pvsType, suggestion: 'Rufen Sie initialize() auf, bevor Sie den Adapter verwenden.' }
    );
  }
}

/**
 * Error categorization helper
 */
export function categorizeError(error: unknown): { category: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } {
  if (error instanceof PvsError) {
    const code = error.code;
    
    if (code.startsWith('PVS_GDT_')) return { category: 'GDT', severity: 'MEDIUM' };
    if (code.startsWith('PVS_FHIR_')) return { category: 'FHIR', severity: 'HIGH' };
    if (code.startsWith('PVS_CFG_')) return { category: 'CONFIG', severity: 'HIGH' };
    if (code.startsWith('PVS_NET_')) return { category: 'NETWORK', severity: 'MEDIUM' };
    if (code.startsWith('PVS_SYS_')) return { category: 'SYSTEM', severity: 'CRITICAL' };
  }
  
  return { category: 'UNKNOWN', severity: 'MEDIUM' };
}
