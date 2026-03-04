// ─── Private ePA Types ───────────────────────────────────────────────

export type DocumentType = 'ANAMNESE' | 'BEFUND' | 'LABOR' | 'BILD' | 'OP_BERICHT';

export type ExportType = 'FULL_HISTORY' | 'LAST_VISIT' | 'MEDICATION_PLAN';

export type ExportFormat = 'MARKDOWN' | 'JSON' | 'PDF';

export interface PrivateEPARecord {
  id: string;
  patientId: string;
  consentSignedAt?: Date;
  consentVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EpaDocumentRecord {
  id: string;
  epaId: string;
  type: DocumentType;
  title: string;
  content?: string;
  fileUrl?: string;
  createdBy: string;
  createdAt: Date;
  validUntil?: Date;
}

export interface EpaShareRecord {
  id: string;
  epaId: string;
  sharedWith: string;
  accessScope: string[];
  accessToken: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date;
}

export interface AnonymizedExportRecord {
  id: string;
  patientId: string;
  exportType: ExportType;
  content: string;
  hash: string;
  createdAt: Date;
  expiresAt: Date;
}

// ─── Input DTOs ──────────────────────────────────────────────────────

export interface CreateDocumentInput {
  epaId: string;
  type: DocumentType;
  title: string;
  content?: string;
  fileUrl?: string;
  createdBy: string;
  validUntil?: Date;
}

export interface CreateShareInput {
  epaId: string;
  sharedWith: string;
  accessScope: string[];
  /** Defaults to 72 hours */
  expiresInHours?: number;
}

export interface CreateExportInput {
  patientId: string;
  exportType: ExportType;
  format?: ExportFormat;
}
