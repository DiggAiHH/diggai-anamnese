// Modul 6: TI (Telematik-Infrastruktur) Types

export type TICardType = 'SMC_B' | 'SMC_KT' | 'EGK' | 'HBA';

export interface TIConnectionConfig {
  konnektorUrl: string;
  mandantId: string;
  clientSystemId: string;
  workplaceId: string;
  clientCertPath?: string;
  clientKeyPath?: string;
  caCertPath?: string;
}

export interface TIConnectionStatus {
  praxisId: string;
  konnektorUrl: string;
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR' | 'MAINTENANCE';
  konnektorVersion?: string;
  lastPingAt?: string;
  lastPingMs?: number;
  lastError?: string;
  cards: TICardStatus[];
  features: TIFeatureStatus;
}

export interface TICardStatus {
  type: TICardType;
  inserted: boolean;
  iccsn?: string;
  holderName?: string;
  expiry?: string;
  pinStatus?: 'VERIFIED' | 'UNVERIFIED' | 'BLOCKED' | 'UNKNOWN';
}

export interface TIFeatureStatus {
  vsdm: boolean;   // Versichertenstammdatenmanagement
  nfdm: boolean;   // Notfalldatenmanagement
  epa: boolean;    // Elektronische Patientenakte
  kim: boolean;    // Kommunikation im Medizinwesen
  erp: boolean;    // E-Rezept
}

export interface VSDData {
  versichertenNr: string;
  versichertenArt: string;
  kassennummer: string;
  kassenname: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  geschlecht: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  gueltigBis?: string;
}

export interface EGKReadResult {
  success: boolean;
  vsd?: VSDData;
  errorCode?: string;
  errorMessage?: string;
}

export interface TIPingResult {
  reachable: boolean;
  latencyMs: number;
  version?: string;
  productName?: string;
  errorMessage?: string;
}

export interface KIMDirectoryEntry {
  kimAddress: string;
  displayName: string;
  organizationName?: string;
  telematikId: string;
  professionOid?: string;
  speciality?: string;
}

// ─── Card Service Types ──────────────────────────────────────

export interface CardInfo {
  cardHandle: string;
  cardType: 'SMC_B' | 'HBA' | 'EGK' | 'SMC_KT';
  iccsn: string;
  cardHolderName?: string;
  expirationDate?: Date;
}

export interface VerifyPinResult {
  status: 'OK' | 'FAILED' | 'BLOCKED';
  retriesLeft?: number;
}

// Alias for TIConnectionConfig used in SOAP calls
export type TIConfig = TIConnectionConfig;
