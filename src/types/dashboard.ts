/**
 * Dashboard Types
 * 
 * TypeScript-Interfaces für die Dashboard-Komponenten
 */

// === Core Types ===

export type QueueStatus = 
  | 'PENDING'           // Ausstehend
  | 'IN_ANAMNESE'       // In Anamnese
  | 'READY_FOR_DOCTOR'  // Bereit für Arzt
  | 'IN_TREATMENT'      // In Behandlung
  | 'COMPLETED'         // Behandelt
  | 'CANCELLED';        // Abgebrochen

export type TriageLevel = 'CRITICAL' | 'WARNING' | 'NORMAL';

export type CriticalFlagType = 'ALLERGY' | 'CHRONIC' | 'MEDICATION' | 'SURGICAL';

export interface CriticalFlag {
  id: string;
  type: CriticalFlagType;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

export interface QuickInfo {
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  hasRedFlags: boolean;
}

export interface PatientQueueItem {
  id: string;
  sessionId: string;
  patientName: string;        // Vollständiger Name (für Arzt)
  displayName: string;        // "Max M." (för MFA - Privacy)
  status: QueueStatus;
  triageLevel: TriageLevel;
  service: string;
  waitTimeMinutes: number;
  checkInTime: Date;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  criticalFlags: CriticalFlag[];
  quickInfo: QuickInfo;
  avatarUrl?: string;
}

// === Dashboard State ===

export interface DashboardStats {
  totalToday: number;
  activeCount: number;
  completedCount: number;
  averageWaitTime: number;
  criticalCount: number;
  warningCount: number;
}

export interface DashboardFilters {
  status: QueueStatus | null;
  triageLevel: TriageLevel | null;
  service: string | null;
  searchQuery: string;
  dateRange: 'today' | 'week' | 'month' | null;
}

export type DashboardViewMode = 'kanban' | 'list' | 'compact';

// === Analytics Types ===

export interface HourlyDataPoint {
  hour: string;           // "08:00", "09:00", etc.
  patients: number;
  avgWaitTime: number;
  triageAlerts: number;
}

export interface FunnelStage {
  name: string;
  value: number;
  dropOff: number;        // Anzahl Abbrüche
  avgTime: number;        // Durchschnittliche Zeit in Minuten
}

export interface HeatmapDataPoint {
  day: string;            // "Mo", "Di", etc.
  hour: number;           // 0-23
  value: number;          // Aktivitäts-Level
}

export interface KpiData {
  label: string;
  value: string | number;
  change: number;         // Prozentuale Änderung
  trend: 'up' | 'down' | 'neutral';
  icon: string;
}

// === Mock Engine Options ===

export interface MockOptions {
  patientCount?: number;
  simulationSpeed?: number;  // Milliseconds between updates
  enableRealtime?: boolean;
  criticalProbability?: number;
  warningProbability?: number;
}

// === Component Props ===

export interface PatientCardProps {
  patient: PatientQueueItem;
  viewMode: 'full' | 'privacy';
  onClick?: (patient: PatientQueueItem) => void;
  onStatusChange?: (patientId: string, newStatus: QueueStatus) => void;
  isDragging?: boolean;
}

export interface KanbanColumnProps {
  status: QueueStatus;
  title: string;
  patients: PatientQueueItem[];
  color: string;
  onDrop: (patientId: string, newStatus: QueueStatus) => void;
}

export interface TriageBadgeProps {
  level: TriageLevel;
  pulse?: boolean;
  showLabel?: boolean;
}

export interface WaitTimeTimerProps {
  startTime: Date;
  warningThreshold?: number;  // Minuten bis Warnung (default: 30)
  criticalThreshold?: number; // Minuten bis Kritisch (default: 45)
}

// === API Response Types ===

export interface QueueApiResponse {
  items: PatientQueueItem[];
  stats: DashboardStats;
  lastUpdated: string;
}

export interface AnalyticsApiResponse {
  hourlyThroughput: HourlyDataPoint[];
  funnelData: FunnelStage[];
  heatmapData: HeatmapDataPoint[];
  kpis: KpiData[];
}

// === Socket.IO Event Types ===

export interface QueueUpdateEvent {
  type: 'PATIENT_ADDED' | 'PATIENT_UPDATED' | 'PATIENT_REMOVED' | 'STATUS_CHANGED';
  patientId: string;
  data?: Partial<PatientQueueItem>;
  timestamp: string;
}

export interface TriageAlertEvent {
  patientId: string;
  level: TriageLevel;
  message: string;
  timestamp: string;
}
