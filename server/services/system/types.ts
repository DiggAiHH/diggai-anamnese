// Modul 6: System Management Types

export type DeploymentMode = 'CLOUD' | 'HYBRID' | 'LOCAL';

export interface SystemConfigData {
  id: string;
  key: string;
  value: string;
  valueType: string;
  category: string;
  description?: string;
  isSecret: boolean;
  isEditable: boolean;
  updatedAt: string;
}

export interface SystemConfigUpdate {
  key: string;
  value: string;
}

export interface DeploymentInfo {
  mode: DeploymentMode;
  version: string;
  features: FeatureFlags;
  environment: string;
}

export interface FeatureFlags {
  tiEnabled: boolean;
  epaEnabled: boolean;
  kimEnabled: boolean;
  localLlmEnabled: boolean;
  backupEnabled: boolean;
  pushEnabled: boolean;
  offlineModeEnabled: boolean;
}

export interface BackupRequest {
  type?: 'full' | 'incremental' | 'schema_only';
  trigger?: 'manual' | 'scheduled' | 'pre_update';
  encryptionKey?: string;
  tables?: string[];
}

export interface BackupRecordData {
  id: string;
  filename: string;
  fileSize: number;
  checksum: string;
  status: string;
  type: string;
  trigger: string;
  dbVersion?: string;
  appVersion?: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  errorMessage?: string;
}

export interface RestoreRequest {
  backupId: string;
  verifyChecksum?: boolean;
  targetTables?: string[];
}

export interface NetworkStatus {
  database: ServiceHealth;
  redis: ServiceHealth;
  tiKonnektor: ServiceHealth;
  internet: ServiceHealth;
  dns: ServiceHealth;
  uptime: number;
  lastCheck: string;
}

export interface ServiceHealth {
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  latencyMs?: number;
  lastChecked?: string;
  errorMessage?: string;
}

export interface SystemLogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface BackupSchedule {
  enabled: boolean;
  cronExpression: string;
  type: 'full' | 'incremental';
  retentionDays: number;
  maxBackups: number;
}
