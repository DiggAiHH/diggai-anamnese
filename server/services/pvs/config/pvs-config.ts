// ============================================
// PVS Configuration Manager
// ============================================

import { EventEmitter } from 'events';

export interface PvsDefaults {
  syncIntervalSec: number;
  retryCount: number;
  retryDelayMs: number;
  timeoutMs: number;
  gdtEncoding: string;
  gdtSenderId: string;
  batchSize: number;
  cacheTtlMs: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface PvsFeatureFlags {
  autoConfigEnabled: boolean;
  smartSyncEnabled: boolean;
  healthMonitoringEnabled: boolean;
  analyticsEnabled: boolean;
  compressionEnabled: boolean;
  websocketsEnabled: boolean;
  circuitBreakerEnabled: boolean;
  dlqEnabled: boolean;
}

/**
 * PVS Configuration Manager
 */
export class PvsConfigManager extends EventEmitter {
  private defaults: PvsDefaults = {
    syncIntervalSec: 30,
    retryCount: 3,
    retryDelayMs: 1000,
    timeoutMs: 30000,
    gdtEncoding: 'ISO-8859-15',
    gdtSenderId: 'DIGGAI01',
    batchSize: 10,
    cacheTtlMs: 300000,
    compressionEnabled: true,
    encryptionEnabled: true,
  };

  private featureFlags: PvsFeatureFlags = {
    autoConfigEnabled: true,
    smartSyncEnabled: true,
    healthMonitoringEnabled: true,
    analyticsEnabled: true,
    compressionEnabled: true,
    websocketsEnabled: true,
    circuitBreakerEnabled: true,
    dlqEnabled: true,
  };

  /**
   * Get default value
   */
  getDefault<K extends keyof PvsDefaults>(key: K): PvsDefaults[K] {
    return this.defaults[key];
  }

  /**
   * Set default value
   */
  setDefault<K extends keyof PvsDefaults>(key: K, value: PvsDefaults[K]): void {
    this.defaults[key] = value;
    this.emit('defaultChanged', { key, value });
  }

  /**
   * Check feature flag
   */
  isEnabled(feature: keyof PvsFeatureFlags): boolean {
    return this.featureFlags[feature];
  }

  /**
   * Enable/disable feature
   */
  setFeature(feature: keyof PvsFeatureFlags, enabled: boolean): void {
    this.featureFlags[feature] = enabled;
    this.emit('featureChanged', { feature, enabled });
  }

  /**
   * Get all defaults
   */
  getAllDefaults(): PvsDefaults {
    return { ...this.defaults };
  }

  /**
   * Get all feature flags
   */
  getAllFeatures(): PvsFeatureFlags {
    return { ...this.featureFlags };
  }

  /**
   * Load from environment
   */
  loadFromEnv(): void {
    this.defaults.syncIntervalSec = parseInt(process.env.PVS_SYNC_INTERVAL_SEC || '30', 10);
    this.defaults.retryCount = parseInt(process.env.PVS_RETRY_COUNT || '3', 10);
    this.defaults.timeoutMs = parseInt(process.env.PVS_TIMEOUT_MS || '30000', 10);
    this.defaults.compressionEnabled = process.env.PVS_COMPRESSION_ENABLED !== 'false';
    this.defaults.encryptionEnabled = process.env.PVS_ENCRYPTION_ENABLED !== 'false';

    this.featureFlags.autoConfigEnabled = process.env.PVS_AUTO_CONFIG_ENABLED !== 'false';
    this.featureFlags.smartSyncEnabled = process.env.PVS_SMART_SYNC_ENABLED !== 'false';
    this.featureFlags.healthMonitoringEnabled = process.env.PVS_HEALTH_MONITORING_ENABLED !== 'false';
  }
}

export const pvsConfig = new PvsConfigManager();
