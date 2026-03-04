// Modul 6: TI-Konnektor Client — SOAP mTLS stub (requires actual Konnektor hardware)
import type { TIConnectionConfig, TIPingResult, TIConnectionStatus, TICardStatus, EGKReadResult } from './types';

const prisma = () => (globalThis as any).__prisma;

export function getTIConfig(): TIConnectionConfig | null {
  const url = process.env.TI_KONNEKTOR_URL;
  if (!url) return null;

  return {
    konnektorUrl: url,
    mandantId: process.env.TI_MANDANT_ID || '',
    clientSystemId: process.env.TI_CLIENT_SYSTEM_ID || 'DiggAI_Anamnese',
    workplaceId: process.env.TI_WORKPLACE_ID || 'WP_001',
    clientCertPath: process.env.TI_CLIENT_CERT_PATH,
    clientKeyPath: process.env.TI_CLIENT_KEY_PATH,
    caCertPath: process.env.TI_CA_CERT_PATH,
  };
}

export async function pingKonnektor(): Promise<TIPingResult> {
  const config = getTIConfig();
  if (!config) {
    return { reachable: false, latencyMs: 0, errorMessage: 'TI-Konnektor nicht konfiguriert' };
  }

  const start = Date.now();
  try {
    // SDS (Service Directory Service) endpoint — standard Konnektor discovery
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${config.konnektorUrl}/connector.sds`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    if (response.ok) {
      const text = await response.text();
      // Parse SDS XML for version (simplified)
      const versionMatch = text.match(/<ProductVersion[^>]*>([^<]+)<\/ProductVersion>/);
      const nameMatch = text.match(/<ProductName[^>]*>([^<]+)<\/ProductName>/);

      return {
        reachable: true,
        latencyMs,
        version: versionMatch?.[1],
        productName: nameMatch?.[1],
      };
    }

    return { reachable: false, latencyMs, errorMessage: `HTTP ${response.status} ${response.statusText}` };
  } catch (e: any) {
    return { reachable: false, latencyMs: Date.now() - start, errorMessage: e.message };
  }
}

export async function getConnectionStatus(): Promise<TIConnectionStatus | null> {
  const db = prisma();
  if (!db) return null;

  const connection = await db.tIConnection.findFirst({
    orderBy: { updatedAt: 'desc' },
  });

  if (!connection) {
    // No stored connection — check ENV config
    const config = getTIConfig();
    if (!config) return null;

    return {
      praxisId: 'default',
      konnektorUrl: config.konnektorUrl,
      status: 'DISCONNECTED',
      cards: [],
      features: { vsdm: false, nfdm: false, epa: false, kim: false, erp: false },
    };
  }

  return {
    praxisId: connection.praxisId,
    konnektorUrl: connection.konnektorUrl,
    konnektorVersion: connection.konnektorVersion,
    status: connection.status,
    lastPingAt: connection.lastPingAt?.toISOString(),
    lastPingMs: connection.lastPingMs,
    lastError: connection.lastError,
    cards: buildCardStatus(connection),
    features: {
      vsdm: connection.vsdmEnabled,
      nfdm: connection.nfdmEnabled,
      epa: connection.epaEnabled,
      kim: connection.kimEnabled,
      erp: false,
    },
  };
}

export async function updateConnectionStatus(): Promise<TIConnectionStatus | null> {
  const db = prisma();
  if (!db) return null;

  const ping = await pingKonnektor();
  const config = getTIConfig();
  if (!config) return null;

  const praxisId = config.mandantId || 'default';

  const data = {
    konnektorUrl: config.konnektorUrl,
    mandantId: config.mandantId,
    clientSystemId: config.clientSystemId,
    workplaceId: config.workplaceId,
    status: ping.reachable ? 'CONNECTED' : 'ERROR',
    konnektorVersion: ping.version || undefined,
    lastPingAt: new Date(),
    lastPingMs: ping.latencyMs,
    lastError: ping.errorMessage || null,
    clientCertPath: config.clientCertPath,
    clientKeyPath: config.clientKeyPath,
    caCertPath: config.caCertPath,
  };

  const connection = await db.tIConnection.upsert({
    where: { praxisId },
    update: data,
    create: { praxisId, ...data },
  });

  return {
    praxisId: connection.praxisId,
    konnektorUrl: connection.konnektorUrl,
    konnektorVersion: connection.konnektorVersion,
    status: connection.status,
    lastPingAt: connection.lastPingAt?.toISOString(),
    lastPingMs: connection.lastPingMs,
    lastError: connection.lastError,
    cards: buildCardStatus(connection),
    features: {
      vsdm: connection.vsdmEnabled,
      nfdm: connection.nfdmEnabled,
      epa: connection.epaEnabled,
      kim: connection.kimEnabled,
      erp: false,
    },
  };
}

export async function readEGK(): Promise<EGKReadResult> {
  // Stub: In production, this would use SOAP call to EventService/GetCards + AuthenticationService/ExternalAuthenticate
  const config = getTIConfig();
  if (!config) {
    return { success: false, errorCode: 'TI_NOT_CONFIGURED', errorMessage: 'TI-Konnektor nicht konfiguriert' };
  }

  // Check connection first
  const ping = await pingKonnektor();
  if (!ping.reachable) {
    return { success: false, errorCode: 'TI_UNREACHABLE', errorMessage: 'TI-Konnektor nicht erreichbar' };
  }

  // Stub response — real implementation would:
  // 1. Call EventService.GetCards() to find eGK slot
  // 2. Call VSDService.ReadVSD() to get versichertenstammdaten
  // 3. Parse the VSD XML response
  return {
    success: false,
    errorCode: 'NOT_IMPLEMENTED',
    errorMessage: 'eGK-Lesung erfordert physischen TI-Konnektor. Stub-Modus aktiv.',
  };
}

function buildCardStatus(connection: any): TICardStatus[] {
  const cards: TICardStatus[] = [];

  if (connection.smcbInserted || connection.smcbIccsn) {
    cards.push({
      type: 'SMC_B',
      inserted: connection.smcbInserted,
      iccsn: connection.smcbIccsn,
      expiry: connection.smcbExpiry?.toISOString(),
      pinStatus: connection.smcbInserted ? 'VERIFIED' : 'UNKNOWN',
    });
  }

  if (connection.hbaInserted || connection.hbaExpiry) {
    cards.push({
      type: 'HBA',
      inserted: connection.hbaInserted,
      expiry: connection.hbaExpiry?.toISOString(),
      pinStatus: connection.hbaInserted ? 'VERIFIED' : 'UNKNOWN',
    });
  }

  return cards;
}
