// ─── Shared Admin Types ─────────────────────────────────────
// Used across admin components to replace `any` with proper types

export interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  userId: string | null;
  ipAddress: string | null;
  createdAt: string;
  details?: Record<string, unknown>;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
}

export interface ArztUser {
  id: string;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'ARZT' | 'MFA';
  isActive: boolean;
  _count?: { assignedSessions: number };
  createdAt?: string;
}

export interface WunschboxEntry {
  id: string;
  originalText: string;
  status: string;
  createdAt: string;
  aiParsedChanges?: AiParsedChange[];
  processedAt?: string;
  reviewedAt?: string;
}

export interface AiParsedChange {
  area: string;
  component: string;
  description: string;
  priority: string;
  estimatedEffort: string;
}

export interface WaitingContentItem {
  id: string;
  type: string;
  category: string;
  title: string;
  body: string;
  displayDurationSec: number;
  priority: number;
  isActive: boolean;
  seasonal: string;
  language: string;
  viewCount?: number;
  likeCount?: number;
  createdAt?: string;
}

export interface MedicalAtomAdmin {
  id: string;
  questionText: string;
  module: string;
  answerType: string;
  isActive: boolean;
  required?: boolean;
  isRequired?: boolean;
  isRedFlag?: boolean;
  isPII?: boolean;
  redFlagCondition?: string;
  options?: string[];
  logic?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AtomDraft {
  id: string;
  atomId: string;
  draftData: Record<string, unknown>;
  status: string;
  changeNote?: string;
  createdAt: string;
}

export interface ClinicalAlert {
  id: string;
  title: string;
  message: string;
  severity: 'EMERGENCY' | 'CRITICAL' | 'WARNING' | 'INFO';
  category?: string;
  isRead: boolean;
  isDismissed: boolean;
  actionTaken?: string;
  triggerField?: string;
  createdAt: string;
}

export interface PvsConnection {
  id: string;
  name: string;
  pvsType: string;
  protocol: string;
  isActive: boolean;
  lastSyncAt?: string;
  config?: Record<string, unknown>;
}

export interface TICard {
  type: string;
  inserted: boolean;
  iccsn?: string;
  expiry?: string;
}
