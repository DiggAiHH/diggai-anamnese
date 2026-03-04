// ─── Telemedizin Service Types ─────────────────────────────
// Modul 8: Video consultation + WebRTC signaling

export type SessionStatus = 'SCHEDULED' | 'WAITING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type ParticipantRole = 'ARZT' | 'PATIENT' | 'MFA' | 'TRANSLATOR';

export interface TelemedicineSessionData {
  id: string;
  patientSessionId?: string;
  arztId: string;
  patientId: string;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  status: SessionStatus;
  roomToken: string;
  iceServers: IceServer[];
  consentGiven: boolean;
  consentTimestamp?: string;
  recordingEnabled: boolean;
  recordingUrl?: string;
  notes?: string;
  prescriptions: string[];
  followUpDate?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface CreateSessionInput {
  patientSessionId?: string;
  arztId: string;
  patientId: string;
  scheduledAt: string;
  duration?: number;
  notes?: string;
}

export interface JoinSessionInput {
  sessionId: string;
  participantId: string;
  role: ParticipantRole;
  consentGiven: boolean;
}

export interface SignalPayload {
  sessionId: string;
  fromId: string;
  toId: string;
  type: 'offer' | 'answer' | 'ice-candidate' | 'hangup' | 'mute' | 'unmute' | 'screen-share-start' | 'screen-share-stop';
  data: any;
}

export interface SessionSummary {
  id: string;
  arztId: string;
  patientId: string;
  status: SessionStatus;
  scheduledAt: string;
  duration?: number;
  consentGiven: boolean;
}

export interface TelemedizinStats {
  totalSessions: number;
  completedSessions: number;
  averageDuration: number;
  noShowRate: number;
  byStatus: { status: string; count: number }[];
  upcomingSessions: SessionSummary[];
}

export const DEFAULT_ICE_SERVERS: IceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const MAX_SESSION_DURATION = 60 * 60 * 1000; // 1 hour max
export const SESSION_WARNING_TIME = 5 * 60 * 1000; // 5 min warning
