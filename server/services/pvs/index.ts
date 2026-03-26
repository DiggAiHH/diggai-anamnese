// ============================================
// PVS Service — Public Façade
// ============================================

export { pvsRouter } from './pvs-router.service.js';
export { buildBefundtext, countExportFields } from './mapping-engine.js';
export { parseGdtFile, extractPatientData, validateGdtRecord } from './gdt/gdt-parser.js';
export { buildAnamneseResult, writeGdtFile, buildStammdatenAnfordern } from './gdt/gdt-writer.js';
export { GDT_FIELDS, GDT_SATZARTEN, GDT_VERSION } from './gdt/gdt-constants.js';
export { FhirClient } from './fhir/fhir-client.js';
export * from './fhir/fhir-mapper.js';
export * from './types.js';

// Adapter exports
export { 
  CgmM1Adapter, 
  FhirGenericAdapter, 
  TurbomedAdapter, 
  TomedoAdapter,
  MedistarAdapter,
  T2MedAdapter,
  xIsynetAdapter,
  AlbisAdapter,
} from './adapters/index.js';

// Base adapter
export { GdtBaseAdapter } from './adapters/gdt-base.adapter.js';

// Optimization modules
export { pvsDetectionService } from './auto-config/index.js';
export { smartSyncService } from './sync/index.js';

// Security
export { 
  CredentialEncryptionService,
  credentialEncryption,
  type EncryptedCredentials,
} from './security/credential-encryption.service.js';
export { 
  PvsAuditLogger,
  pvsAuditLogger,
  type AuditEntry,
  type AuditOperation,
} from './security/audit-logger.js';

// Error handling
export { 
  PvsError,
  categorizeError,
  type PvsErrorCode,
  type PvsErrorDetails,
} from './errors/pvs-error.js';

// Caching
export {
  PvsCache,
  PatientIndexCache,
  AdapterCache,
  patientIndexCache,
  adapterCache,
  gdtFileCache,
} from './cache/pvs-cache.service.js';

// File watching
export {
  GdtFileWatcher,
  HybridFileWatcher,
  createGdtWatcher,
  createHybridWatcher,
  type FileWatcherOptions,
  type FileEvent,
} from './watching/gdt-file-watcher.js';

// Performance
export {
  BatchProcessor,
  SessionBatchProcessor,
  sessionBatchProcessor,
  type BatchTask,
  type BatchResult,
} from './performance/batch-processor.js';

// Resilience
export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  circuitBreakerRegistry,
  type CircuitState,
  type CircuitBreakerOptions,
  type CircuitStats,
} from './resilience/circuit-breaker.js';
export {
  DeadLetterQueue,
  gdtExportDLQ,
  fhirExportDLQ,
  type DeadLetterItem,
  type DLQStats,
} from './resilience/dead-letter-queue.js';

// Monitoring
export {
  Counter,
  Gauge,
  Histogram,
  PvsMetrics,
  pvsMetrics,
  type MetricValue,
} from './monitoring/metrics.service.js';

// Validation
export {
  validateConnection,
  validateGdtContent,
  validateFhirBundle,
  validateExportData,
  GdtConnectionSchema,
  FhirConnectionSchema,
  PvsConnectionSchema,
  PatientDataSchema,
  type ValidatedGdtConnection,
  type ValidatedFhirConnection,
  type ValidatedPvsConnection,
  type ValidatedPatientData,
} from './validation/pvs-validation.service.js';

// FHIR German Profiles
export {
  GERMAN_PROFILES,
  NAMING_SYSTEMS,
  EXTENSIONS,
  createGermanPatient,
  createGkvCoverage,
  createGermanVitalSign,
  validateGermanProfile,
} from './fhir/german-profiles.js';

// Real-time
export {
  PvsWebSocketNotifier,
  pvsWebSocketNotifier,
  type PvsNotification,
  type PvsNotificationType,
} from './realtime/websocket-notifier.js';

// FHIR Subscriptions
export {
  FhirSubscriptionManager,
  createSubscriptionManager,
  type FhirSubscription,
  type SubscriptionNotification,
} from './fhir/fhir-subscription-manager.js';

// Conflict Resolution
export {
  ConflictResolver,
  conflictResolver,
  type Conflict,
  type ConflictType,
  type ResolutionStrategy,
} from './conflict/conflict-resolver.js';

// Health Monitoring
export {
  PvsHealthMonitor,
  pvsHealthMonitor,
  type HealthStatus,
} from './health/health-monitor.js';

// Analytics
export {
  PvsAnalytics,
  pvsAnalytics,
  type PvsUsageMetrics,
  type PvsTrend,
} from './analytics/pvs-analytics.js';

// Compression
export {
  DataCompressionService,
  dataCompression,
  type CompressedData,
  type CompressionOptions,
} from './compression/data-compression.js';

// Testing
export {
  PvsTestFactory,
  testFactory,
} from './testing/test-factory.js';
export {
  PvsMockServer,
  createMockServer,
} from './testing/mock-server.js';

// CLI
export { PvsCli } from './cli/pvs-cli.js';

// Backup
export {
  PvsBackupService,
  pvsBackupService,
  type BackupMetadata,
} from './backup/pvs-backup.js';

// Middleware
export {
  RateLimiter,
  pvsExportLimiter,
  pvsImportLimiter,
  pvsSearchLimiter,
  type RateLimitConfig,
  type RateLimitInfo,
} from './middleware/rate-limiter.js';
export {
  TenantIsolationService,
  tenantIsolation,
  type TenantContext,
} from './middleware/tenant-isolation.js';

// Config
export {
  PvsConfigManager,
  pvsConfig,
  type PvsDefaults,
  type PvsFeatureFlags,
} from './config/pvs-config.js';

// Documentation
export {
  PvsApiGenerator,
  pvsApiGenerator,
  type ApiEndpoint,
} from './documentation/api-generator.js';
