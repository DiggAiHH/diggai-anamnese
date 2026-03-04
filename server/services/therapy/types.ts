// ─── Modul 4: Therapy Types ─────────────────────────────────

export type TherapyStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type MeasureStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'OVERDUE';
export type MeasureType = 'MEDICATION' | 'PROCEDURE' | 'REFERRAL' | 'LAB_ORDER' | 'IMAGING' | 'LIFESTYLE' | 'FOLLOW_UP' | 'DOCUMENTATION' | 'CUSTOM';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
export type AlertCategory = 'VITAL_SIGN' | 'DRUG_INTERACTION' | 'ALLERGY_CONFLICT' | 'TRIAGE_ESCALATION' | 'SYMPTOM_PATTERN' | 'AGE_RISK' | 'CUSTOM';

// ─── Plan & Measure ─────────────────────────────────────────

export interface TherapyPlanData {
  id: string;
  sessionId: string;
  patientId: string;
  createdById: string;
  title: string;
  status: TherapyStatus;
  diagnosis?: string | null;
  icdCodes: string[];
  summary?: string | null;
  aiGenerated: boolean;
  aiModel?: string | null;
  aiConfidence?: number | null;
  startDate: Date;
  targetEndDate?: Date | null;
  actualEndDate?: Date | null;
  lastReviewedAt?: Date | null;
  nextReviewDate?: Date | null;
  pvsExported: boolean;
  pvsExportedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  measures?: TherapyMeasureData[];
  alerts?: ClinicalAlertData[];
}

export interface TherapyMeasureData {
  id: string;
  planId: string;
  type: MeasureType;
  title: string;
  description?: string | null;
  status: MeasureStatus;
  priority: number;
  medicationName?: string | null;
  dosage?: string | null;
  duration?: string | null;
  pzn?: string | null;
  atcCode?: string | null;
  referralTo?: string | null;
  referralReason?: string | null;
  referralUrgency?: string | null;
  labParameters: string[];
  scheduledDate?: Date | null;
  completedDate?: Date | null;
  dueDate?: Date | null;
  aiSuggested: boolean;
  aiConfidence?: number | null;
  arztApproved: boolean;
  arztModified: boolean;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClinicalAlertData {
  id: string;
  sessionId?: string | null;
  planId?: string | null;
  patientId: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  triggerField?: string | null;
  triggerValue?: string | null;
  triggerRule?: string | null;
  isRead: boolean;
  readAt?: Date | null;
  readBy?: string | null;
  isDismissed: boolean;
  dismissedAt?: Date | null;
  dismissedBy?: string | null;
  dismissReason?: string | null;
  actionTaken?: string | null;
  actionTakenAt?: Date | null;
  actionTakenBy?: string | null;
  createdAt: Date;
}

export interface TherapyTemplateData {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  icdCodes: string[];
  measures: TemplateMeasure[];
  defaultDuration?: string | null;
  isDefault: boolean;
  createdById?: string | null;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateMeasure {
  type: MeasureType;
  title: string;
  description?: string;
  dosage?: string;
  duration?: string;
  priority: number;
  referralTo?: string;
  labParameters?: string[];
}

// ─── Create/Update DTOs ─────────────────────────────────────

export interface CreateTherapyPlanInput {
  sessionId: string;
  patientId: string;
  title: string;
  diagnosis?: string;
  icdCodes?: string[];
  summary?: string;
  templateId?: string;
  aiGenerate?: boolean;
  startDate?: string;
  targetEndDate?: string;
  nextReviewDate?: string;
}

export interface UpdateTherapyPlanInput {
  title?: string;
  diagnosis?: string;
  icdCodes?: string[];
  summary?: string;
  targetEndDate?: string;
  nextReviewDate?: string;
}

export interface CreateMeasureInput {
  type: MeasureType;
  title: string;
  description?: string;
  priority?: number;
  medicationName?: string;
  dosage?: string;
  duration?: string;
  pzn?: string;
  atcCode?: string;
  referralTo?: string;
  referralReason?: string;
  referralUrgency?: string;
  labParameters?: string[];
  scheduledDate?: string;
  dueDate?: string;
  notes?: string;
  aiSuggested?: boolean;
  aiConfidence?: number;
}

export interface UpdateMeasureInput {
  title?: string;
  description?: string;
  priority?: number;
  dosage?: string;
  duration?: string;
  scheduledDate?: string;
  dueDate?: string;
  notes?: string;
  arztApproved?: boolean;
  arztModified?: boolean;
}

export interface CreateAlertInput {
  sessionId?: string;
  planId?: string;
  patientId: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  triggerField?: string;
  triggerValue?: string;
  triggerRule?: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category: string;
  icdCodes?: string[];
  measures: TemplateMeasure[];
  defaultDuration?: string;
  isDefault?: boolean;
}

// ─── Alert Rules ────────────────────────────────────────────

export interface AlertRule {
  id: string;
  name: string;
  category: AlertCategory;
  severity: AlertSeverity;
  condition: {
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'contains' | 'regex' | 'in';
    value: string | number | string[];
    andConditions?: Array<{
      field: string;
      operator: string;
      value: string | number;
    }>;
  };
  titleTemplate: string;
  messageTemplate: string;
}

export interface AlertContext {
  answers: Record<string, string | number>;
  medications: Array<{ name: string; dosage?: string }>;
  triageEvents: Array<{ level: string; atomId: string; message: string }>;
  patientAge?: number;
  patientGender?: string;
}

// ─── Anonymization ──────────────────────────────────────────

export interface AnonPatientData {
  id: string;
  patientId: string;
  pseudonym: string;
  createdAt: Date;
}

// ─── Analytics ──────────────────────────────────────────────

export interface TherapyAnalytics {
  period: string;
  totalPlans: number;
  statusDistribution: Record<TherapyStatus, number>;
  topDiagnoses: Array<{ icd: string; name: string; count: number; percentage: number }>;
  measureTypes: Record<MeasureType, number>;
  avgMeasuresPerPlan: number;
  avgPlanDurationDays: number;
  aiUsage: {
    aiGeneratedPlans: number;
    avgAiConfidence: number;
    arztModificationRate: number;
  };
  alertStats: {
    total: number;
    bySeverity: Record<AlertSeverity, number>;
    avgResponseTimeMinutes: number;
    dismissRate: number;
  };
}
