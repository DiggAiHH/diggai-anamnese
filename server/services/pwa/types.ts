// ─── Modul 5: Patient Portal PWA — Types ────────────────────

// ─── Enums (mirror Prisma enums for service-layer usage) ────

export type DiaryMood = 'VERY_BAD' | 'BAD' | 'NEUTRAL' | 'GOOD' | 'VERY_GOOD';

export type ConsentType =
  | 'DATA_PROCESSING'
  | 'EMERGENCY_CONTACT'
  | 'MEDICATION_REMINDER'
  | 'PUSH_NOTIFICATIONS'
  | 'DATA_SHARING';

export type MessageDirection =
  | 'PATIENT_TO_PROVIDER'
  | 'PROVIDER_TO_PATIENT'
  | 'SYSTEM';

export type DeviceType = 'ios' | 'android' | 'web';

// ─── Auth ────────────────────────────────────────────────────

export interface PatientAccountData {
  id: string;
  patientId: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  isVerified: boolean;
  verifiedAt: Date | null;
  lastLoginAt: Date | null;
  loginCount: number;
  locale: string;
  notifyEmail: boolean;
  notifyPush: boolean;
  notifySms: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientRegistrationData {
  patientNumber: string;
  birthDate: string; // ISO date string
  email?: string;
  phone?: string;
  password: string;
  pin?: string;
}

export interface PatientLoginRequest {
  /** Email, phone number, or patient number */
  identifier: string;
  password: string;
}

export interface PatientLoginResponse {
  token: string;
  expiresAt: string; // ISO datetime
  account: PatientAccountData;
}

export interface PatientPinLoginRequest {
  patientId: string;
  pin: string;
}

// ─── Diary ───────────────────────────────────────────────────

export interface DiaryVitals {
  bp?: string;        // e.g. "120/80"
  pulse?: number;
  temp?: number;
  weight?: number;
  bloodSugar?: number;
}

export interface DiaryEntryCreate {
  date?: string;       // ISO date, defaults to now
  mood?: DiaryMood;
  painLevel?: number;  // 0-10
  sleepQuality?: number; // 0-10
  sleepHours?: number;
  symptoms?: string[];
  notes?: string;
  vitals?: DiaryVitals;
  offlineCreated?: boolean;
}

export interface DiaryEntryUpdate {
  mood?: DiaryMood;
  painLevel?: number;
  sleepQuality?: number;
  sleepHours?: number;
  symptoms?: string[];
  notes?: string;
  vitals?: DiaryVitals;
}

export interface DiaryEntryData {
  id: string;
  accountId: string;
  patientId: string;
  date: Date;
  mood: DiaryMood | null;
  painLevel: number | null;
  sleepQuality: number | null;
  sleepHours: number | null;
  symptoms: string[];
  notes: string | null;
  vitalBp: string | null;
  vitalPulse: number | null;
  vitalTemp: number | null;
  vitalWeight: number | null;
  vitalBloodSugar: number | null;
  offlineCreated: boolean;
  syncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Measure Tracking ───────────────────────────────────────

export interface MeasureTrackingCreate {
  measureId: string;
  scheduledDate: string; // ISO date
  completedDate?: string;
  dose?: string;
  notes?: string;
  sideEffects?: string[];
  offlineCreated?: boolean;
}

export interface MeasureTrackingData {
  id: string;
  accountId: string;
  measureId: string;
  scheduledDate: Date;
  completedDate: Date | null;
  skippedDate: Date | null;
  skippedReason: string | null;
  dose: string | null;
  notes: string | null;
  sideEffects: string[];
  offlineCreated: boolean;
  syncedAt: Date | null;
  createdAt: Date;
}

// ─── Messaging ──────────────────────────────────────────────

export interface MessageCreate {
  subject?: string;
  body: string;
  direction: MessageDirection;
}

export interface MessageData {
  id: string;
  accountId: string;
  patientId: string;
  direction: MessageDirection;
  subject: string | null;
  body: string;
  senderName: string | null;
  senderRole: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

// ─── Consent ────────────────────────────────────────────────

export interface ConsentUpdate {
  type: ConsentType;
  granted: boolean;
}

export interface ConsentData {
  id: string;
  accountId: string;
  type: ConsentType;
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Device ─────────────────────────────────────────────────

export interface DeviceRegistration {
  deviceName: string;
  deviceType: DeviceType;
  pushToken?: string;
  userAgent?: string;
}

export interface DeviceData {
  id: string;
  accountId: string;
  deviceName: string;
  deviceType: string;
  pushToken: string | null;
  isActive: boolean;
  lastSeenAt: Date;
  createdAt: Date;
}

// ─── Offline Sync ───────────────────────────────────────────

export interface OfflineSyncPayload {
  diaryEntries: DiaryEntryCreate[];
  measureTrackings: MeasureTrackingCreate[];
  lastSyncAt: string; // ISO datetime
}

export interface SyncResult {
  synced: number;
  conflicts: number;
  serverTimestamp: string; // ISO datetime
}

export interface ChangesSinceResult {
  diaryEntries: DiaryEntryData[];
  measureTrackings: MeasureTrackingData[];
  messages: MessageData[];
  consents: ConsentData[];
  serverTimestamp: string;
}

// ─── Dashboard ──────────────────────────────────────────────

export interface NextAppointment {
  id: string;
  date: Date;
  title: string;
  doctor?: string;
  location?: string;
}

export interface PatientDashboardData {
  nextAppointment: NextAppointment | null;
  activeMeasures: number;
  unreadMessages: number;
  recentDiary: DiaryEntryData[];
  alerts: string[];
}

// ─── JWT Payload ────────────────────────────────────────────

export interface PwaJwtPayload {
  accountId: string;
  patientId: string;
  role: 'patient_portal';
  /** JWT ID — erforderlich für Token-Blacklist bei Logout (SECURITY FIX C3) */
  jti?: string;
  iat?: number;
  exp?: number;
}
