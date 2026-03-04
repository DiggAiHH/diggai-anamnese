// ═══════════════════════════════════════════════════════════════
// Modul 7: NFC Service Types
// ═══════════════════════════════════════════════════════════════

export interface NfcTapPayload {
  locationId: string;
  praxisId: string;
  timestamp: number;
  signature: string;
  sessionHint?: string;
  deviceInfo?: string;
}

export interface NfcTapResult {
  accepted: boolean;
  scanId?: string;
  checkpointType?: string;
  roomName?: string;
  sessionId?: string;
  rejectReason?: string;
}

export interface NfcCheckpointConfig {
  locationId: string;
  praxisId: string;
  type: string;
  roomName?: string;
  coordinates?: { x: number; y: number; floor?: number };
  nfcUid: string;
  secretRef?: string;
  isActive?: boolean;
}

export interface FlowAdvancePayload {
  sessionId: string;
  fromStep: number;
  toStep: number;
  reason?: string;
  triggeredBy: 'NFC' | 'MFA' | 'ARZT' | 'SYSTEM';
}

export interface FlowDelayPayload {
  sessionId: string;
  delayMinutes: number;
  reason: string;
}

export interface FlowCallPayload {
  sessionId: string;
  targetRoom: string;
  message: string;
}

export interface FeedbackSubmission {
  praxisId: string;
  sessionId?: string;
  rating: number;
  text?: string;
  categories: string[];
}

export interface ThreatAnalysisResult {
  containsThreats: boolean;
  keywords: string[];
  confidence: number;
}

export const THREAT_KEYWORDS_DE = [
  'umbringen', 'töten', 'bedrohe', 'anzeige', 'klage', 'anwalt',
  'polizei', 'gewalt', 'schlagen', 'verletzen', 'rächen', 'bombe',
  'waffe', 'messer', 'drohen', 'drohung', 'verklagen', 'gericht',
];

export const NFC_TIMESTAMP_DRIFT_MS = 180_000; // ±3 minutes
export const NFC_NONCE_TTL_S = 600; // 10 minutes
