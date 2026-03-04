// Modul 6: Deployment Mode Manager — Feature Gates for Cloud/Hybrid/Local
import type { DeploymentMode, DeploymentInfo, FeatureFlags } from './types';

const prisma = () => (globalThis as any).__prisma;

// Default feature flags per deployment mode
const MODE_FEATURES: Record<DeploymentMode, FeatureFlags> = {
  CLOUD: {
    tiEnabled: false,
    epaEnabled: false,
    kimEnabled: false,
    localLlmEnabled: false,
    backupEnabled: false,
    pushEnabled: true,
    offlineModeEnabled: true,
  },
  HYBRID: {
    tiEnabled: true,
    epaEnabled: false,
    kimEnabled: false,
    localLlmEnabled: false,
    backupEnabled: true,
    pushEnabled: true,
    offlineModeEnabled: true,
  },
  LOCAL: {
    tiEnabled: true,
    epaEnabled: true,
    kimEnabled: true,
    localLlmEnabled: true,
    backupEnabled: true,
    pushEnabled: false, // No external push in local mode
    offlineModeEnabled: true,
  },
};

export function getDeploymentMode(): DeploymentMode {
  const mode = (process.env.DEPLOYMENT_MODE || 'CLOUD').toUpperCase() as DeploymentMode;
  if (!['CLOUD', 'HYBRID', 'LOCAL'].includes(mode)) return 'CLOUD';
  return mode;
}

export function getFeatureFlags(): FeatureFlags {
  const mode = getDeploymentMode();
  const defaults = { ...MODE_FEATURES[mode] };

  // Override from ENV
  if (process.env.TI_ENABLED === 'true') defaults.tiEnabled = true;
  if (process.env.TI_ENABLED === 'false') defaults.tiEnabled = false;
  if (process.env.EPA_ENABLED === 'true') defaults.epaEnabled = true;
  if (process.env.KIM_ENABLED === 'true') defaults.kimEnabled = true;
  if (process.env.LOCAL_LLM_ENABLED === 'true') defaults.localLlmEnabled = true;
  if (process.env.BACKUP_ENABLED === 'true') defaults.backupEnabled = true;

  return defaults;
}

export function requireFeature(feature: keyof FeatureFlags): void {
  const flags = getFeatureFlags();
  if (!flags[feature]) {
    throw new Error(`Feature '${feature}' ist im Deployment-Modus '${getDeploymentMode()}' nicht verfügbar.`);
  }
}

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return getFeatureFlags()[feature];
}

export async function getDeploymentInfo(): Promise<DeploymentInfo> {
  return {
    mode: getDeploymentMode(),
    version: process.env.APP_VERSION || '3.0.0',
    features: getFeatureFlags(),
    environment: process.env.NODE_ENV || 'development',
  };
}

export async function getSystemConfigs(category?: string): Promise<any[]> {
  const db = prisma();
  if (!db) return [];

  const where = category ? { category } : {};
  const configs = await db.systemConfig.findMany({ where, orderBy: { key: 'asc' } });

  // Mask secret values
  return configs.map((c: any) => ({
    ...c,
    value: c.isSecret ? '••••••••' : c.value,
  }));
}

export async function updateSystemConfig(key: string, value: string, modifiedBy?: string): Promise<any> {
  const db = prisma();
  if (!db) throw new Error('Database not available');

  return db.systemConfig.upsert({
    where: { key },
    update: { value, lastModifiedBy: modifiedBy, updatedAt: new Date() },
    create: { key, value, valueType: 'string', category: 'general', lastModifiedBy: modifiedBy },
  });
}

export async function initializeDefaultConfigs(): Promise<void> {
  const db = prisma();
  if (!db) return;

  const defaults = [
    { key: 'deployment.mode', value: getDeploymentMode(), category: 'deployment', description: 'Deployment-Modus (CLOUD/HYBRID/LOCAL)', isEditable: false },
    { key: 'backup.schedule.enabled', value: 'false', category: 'backup', description: 'Automatische Backups aktiviert' },
    { key: 'backup.schedule.cron', value: '0 2 * * *', category: 'backup', description: 'Backup-Zeitplan (Cron)' },
    { key: 'backup.retention.days', value: '30', category: 'backup', description: 'Backup-Aufbewahrungsdauer (Tage)' },
    { key: 'backup.max.count', value: '10', category: 'backup', description: 'Maximale Anzahl Backups' },
    { key: 'network.monitor.interval', value: '60', category: 'network', description: 'Netzwerk-Prüfintervall (Sekunden)' },
    { key: 'ti.konnektor.url', value: process.env.TI_KONNEKTOR_URL || '', category: 'ti', description: 'TI-Konnektor URL', isSecret: false },
    { key: 'ti.mandant.id', value: process.env.TI_MANDANT_ID || '', category: 'ti', description: 'TI Mandant-ID' },
    { key: 'security.session.timeout', value: '3600', category: 'security', description: 'Session-Timeout (Sekunden)' },
    { key: 'llm.provider', value: process.env.LOCAL_LLM_PROVIDER || 'none', category: 'llm', description: 'LLM-Provider (none/ollama/openai)' },
    { key: 'llm.model', value: process.env.LOCAL_LLM_MODEL || 'llama3', category: 'llm', description: 'LLM-Modellname' },
    { key: 'llm.endpoint', value: process.env.LOCAL_LLM_ENDPOINT || 'http://ollama:11434', category: 'llm', description: 'LLM-Endpunkt URL' },
  ];

  for (const config of defaults) {
    await db.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: {
        ...config,
        valueType: 'string',
        isSecret: config.isSecret ?? false,
        isEditable: config.isEditable ?? true,
      },
    });
  }
}
