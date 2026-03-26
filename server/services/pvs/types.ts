// ============================================
// PVS Integration — Shared Types & Interfaces
// ============================================

// ─── Enums (mirror Prisma but usable w/o generated client) ──

export type PvsType = 'CGM_M1' | 'MEDATIXX' | 'MEDISTAR' | 'T2MED' | 'X_ISYNET' | 'DOCTOLIB' | 'TURBOMED' | 'FHIR_GENERIC' | 'ALBIS' | 'TOMEDO';
export type PvsProtocol = 'GDT' | 'BDT' | 'FHIR' | 'REST' | 'KIM';
export type TransferDirection = 'IMPORT' | 'EXPORT' | 'BIDIRECTIONAL';
export type TransferStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'RETRYING' | 'CANCELLED';

// ─── GDT Types ──────────────────────────────────────────────

export interface GdtRecord {
  satzart: string;
  version: string;
  senderId: string;
  receiverId: string;
  fields: Map<string, string[]>; // Feldkennung → Werte (can repeat)
  raw: string;
}

export interface GdtPatientData {
  patNr: string;
  lastName: string;
  firstName: string;
  birthDate: Date | null;
  gender: 'male' | 'female' | 'diverse' | 'unknown';
  insuranceType?: string;
  insuranceNr?: string;
  insuranceName?: string;
  insuranceId?: string;
}

export interface GdtExportOptions {
  satzart: string;
  senderId: string;
  receiverId: string;
  encoding?: string; // ISO-8859-15 | CP437
}

export interface GdtLine {
  length: number; // 3 chars
  fieldId: string; // 4 chars
  content: string;
}

// ─── FHIR Types (R4 Subset) ────────────────────────────────

export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: {
    profile?: string[];
    versionId?: string;
    lastUpdated?: string;
  };
}

export interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  identifier?: Array<{
    type?: { coding?: Array<{ system?: string; code?: string; display?: string }> };
    system?: string;
    value?: string;
  }>;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
  }>;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  text?: { status: string; div: string };
}

export interface FhirEncounter extends FhirResource {
  resourceType: 'Encounter';
  status: string;
  class?: { system?: string; code?: string; display?: string };
  subject?: { reference?: string };
  period?: { start?: string; end?: string };
  reasonCode?: Array<{ text?: string }>;
}

export interface FhirQuestionnaireResponse extends FhirResource {
  resourceType: 'QuestionnaireResponse';
  questionnaire?: string;
  status: 'in-progress' | 'completed' | 'amended' | 'entered-in-error' | 'stopped';
  subject?: { reference?: string };
  encounter?: { reference?: string };
  authored?: string;
  item?: FhirQRItem[];
}

export interface FhirQRItem {
  linkId: string;
  text?: string;
  answer?: Array<{
    valueString?: string;
    valueInteger?: number;
    valueBoolean?: boolean;
    valueDate?: string;
    valueCoding?: { system?: string; code?: string; display?: string };
  }>;
  item?: FhirQRItem[];
}

export interface FhirFlag extends FhirResource {
  resourceType: 'Flag';
  status: 'active' | 'inactive' | 'entered-in-error';
  category?: Array<{ coding?: Array<{ system?: string; code?: string; display?: string }> }>;
  code: { text?: string; coding?: Array<{ system?: string; code?: string; display?: string }> };
  subject?: { reference?: string };
  period?: { start?: string; end?: string };
}

export interface FhirRiskAssessment extends FhirResource {
  resourceType: 'RiskAssessment';
  status: string;
  subject?: { reference?: string };
  encounter?: { reference?: string };
  prediction?: Array<{
    outcome?: { text?: string };
    qualitativeRisk?: { coding?: Array<{ system?: string; code?: string; display?: string }> };
  }>;
}

export interface FhirMedicationStatement extends FhirResource {
  resourceType: 'MedicationStatement';
  status: string;
  medicationCodeableConcept?: {
    text?: string;
    coding?: Array<{ system?: string; code?: string; display?: string }>;
  };
  subject?: { reference?: string };
  dosage?: Array<{ text?: string }>;
}

export interface FhirProcedure extends FhirResource {
  resourceType: 'Procedure';
  status: string;
  code?: {
    text?: string;
    coding?: Array<{ system?: string; code?: string; display?: string }>;
  };
  subject?: { reference?: string };
  performedString?: string;
  performedDateTime?: string;
  performedPeriod?: { start?: string; end?: string };
  note?: Array<{ text?: string }>;
}

export interface FhirObservation extends FhirResource {
  resourceType: 'Observation';
  status: string;
  category?: Array<{ coding?: Array<{ system?: string; code?: string; display?: string }> }>;
  code: {
    coding?: Array<{ system?: string; code?: string; display?: string }>;
    text?: string;
  };
  subject?: { reference?: string };
  encounter?: { reference?: string };
  effectiveDateTime?: string;
  valueQuantity?: { value?: number; unit?: string; system?: string; code?: string };
}

export interface FhirComposition extends FhirResource {
  resourceType: 'Composition';
  status: string;
  type: {
    coding?: Array<{ system?: string; code?: string; display?: string }>;
    text?: string;
  };
  subject?: { reference?: string };
  encounter?: { reference?: string };
  date?: string;
  title?: string;
  section?: Array<{
    title?: string;
    code?: { coding?: Array<{ system?: string; code?: string; display?: string }> };
    entry?: Array<{ reference?: string }>;
  }>;
}

export interface FhirCondition extends FhirResource {
  resourceType: 'Condition';
  clinicalStatus?: { coding?: Array<{ system?: string; code?: string }> };
  code?: { coding?: Array<{ system?: string; code?: string; display?: string }>; text?: string };
  subject?: { reference?: string };
}

export interface FhirCoverage extends FhirResource {
  resourceType: 'Coverage';
  status: string;
  type?: { coding?: Array<{ system?: string; code?: string; display?: string }> };
  beneficiary?: { reference?: string };
  subscriberId?: string;
  payor?: Array<{ reference?: string; display?: string }>;
}

export interface FhirBundle extends FhirResource {
  resourceType: 'Bundle';
  type: 'transaction' | 'batch' | 'searchset' | 'collection' | 'document';
  timestamp?: string;
  entry?: Array<{
    fullUrl?: string;
    resource?: FhirResource;
    request?: { method: string; url: string };
    response?: { status?: string; location?: string };
  }>;
}

// ─── FHIR Client Config ────────────────────────────────────

export interface FhirClientConfig {
  baseUrl: string;
  authType: 'basic' | 'oauth2' | 'apikey';
  credentials: {
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
    apiKey?: string;
  };
  timeout?: number;
  retryCount?: number;
}

// ─── Adapter Types ──────────────────────────────────────────

export interface AdapterCapabilities {
  canImportPatients: boolean;
  canExportResults: boolean;
  canExportTherapyPlans: boolean;
  canReceiveOrders: boolean;
  canSearchPatients: boolean;
  supportsRealtime: boolean;
  supportedSatzarten: string[];
  supportedFhirResources: string[];
}

export interface TransferResult {
  success: boolean;
  transferLogId: string;
  pvsReferenceId?: string;
  warnings?: string[];
  error?: string;
}

export interface PatientSearchResult {
  pvsPatientId: string;
  pvsPatientNr?: string;
  lastName: string;
  firstName: string;
  birthDate?: string;
  gender?: string;
  insuranceNr?: string;
}

export interface PatientSessionFull {
  id: string;
  patientId: string | null;
  patient: {
    id: string;
    encryptedName?: string | null;
    birthDate?: Date | null;
    gender?: string | null;
    versichertenNr?: string | null;
    versichertenArt?: string | null;
    kassenname?: string | null;
    kassennummer?: string | null;
    patientNumber?: string | null;
  } | null;
  status: string;
  selectedService: string;
  insuranceType?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
  answers: Array<{
    id: string;
    atomId: string;
    value: string;
    encryptedValue?: string | null;
  }>;
  triageEvents: Array<{
    id: string;
    level: string;
    atomId: string;
    triggerValues: string;
    message: string;
  }>;
}

// ─── PVS Adapter Interface ──────────────────────────────────

export interface PvsConnectionData {
  id: string;
  praxisId: string;
  pvsType: PvsType;
  pvsVersion?: string | null;
  protocol: PvsProtocol;
  gdtImportDir?: string | null;
  gdtExportDir?: string | null;
  gdtFilePattern?: string | null;
  gdtEncoding?: string | null;
  gdtSenderId?: string | null;
  gdtReceiverId?: string | null;
  fhirBaseUrl?: string | null;
  fhirAuthType?: string | null;
  fhirCredentials?: string | null;
  fhirTenantId?: string | null;
  kimAddress?: string | null;
  kimSmtpHost?: string | null;
  kimSmtpPort?: number | null;
  isActive: boolean;
  syncIntervalSec: number;
  retryCount: number;
  autoMapFields: boolean;
}

export interface PvsAdapter {
  readonly type: PvsType;
  readonly supportedProtocols: PvsProtocol[];

  initialize(connection: PvsConnectionData): Promise<void>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
  disconnect(): Promise<void>;

  importPatient(externalId: string): Promise<GdtPatientData | FhirPatient>;
  exportPatient(patient: PatientSearchResult): Promise<string>;
  searchPatient(query: { name?: string; birthDate?: string; kvnr?: string }): Promise<PatientSearchResult[]>;

  exportAnamneseResult(session: PatientSessionFull, options?: Record<string, unknown>): Promise<TransferResult>;

  getCapabilities(): AdapterCapabilities;
}

// ─── Mapping Types ──────────────────────────────────────────

export interface FieldMapping {
  diggaiModel: string;
  diggaiField: string;
  pvsFieldId: string;
  pvsFieldName?: string;
  direction: TransferDirection;
  transformRule?: string;
  defaultValue?: string;
  isRequired: boolean;
}

export interface MappingResult {
  befundtext: string[];
  metadata: Record<string, string>;
  fieldCount: number;
}

export interface BefundtextOptions {
  format: 'structured' | 'freetext' | 'both';
  includeTriageDetails: boolean;
  includeMedications: boolean;
  includeSurgeries: boolean;
}
