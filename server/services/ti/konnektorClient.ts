// Modul 6: TI-Konnektor Client — SOAP mTLS with node-soap (falls back to mock in dev/cloud mode)
import * as soap from 'node-soap';
import * as fs from 'fs';
import type {
  TIConnectionConfig,
  TIConfig,
  TIPingResult,
  TIConnectionStatus,
  TICardStatus,
  EGKReadResult,
  CardInfo,
  VerifyPinResult,
  VSDData,
} from './types';

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

// ─── SOAP Helpers ────────────────────────────────────────────

/**
 * Build mTLS options for node-soap from TIConfig cert paths.
 * Only adds ssl options when the cert files actually exist on disk.
 */
function buildSoapSslOptions(config: TIConfig): Record<string, any> {
  const options: Record<string, any> = {};
  try {
    if (config.clientCertPath && config.clientKeyPath) {
      if (fs.existsSync(config.clientCertPath) && fs.existsSync(config.clientKeyPath)) {
        options.cert = fs.readFileSync(config.clientCertPath);
        options.key = fs.readFileSync(config.clientKeyPath);
      }
    }
    if (config.caCertPath && fs.existsSync(config.caCertPath)) {
      options.ca = fs.readFileSync(config.caCertPath);
    }
  } catch (e: any) {
    console.warn('[konnektorClient] Could not load TI certs:', e.message);
  }
  return options;
}

/**
 * Create a node-soap client for the given WSDL URL using TI mTLS certs.
 * Throws a descriptive error when the WSDL is not reachable.
 */
export async function createSoapClient(wsdlUrl: string, config?: TIConfig): Promise<soap.Client> {
  const sslOptions = config ? buildSoapSslOptions(config) : {};

  const clientOptions: soap.IOptions = {
    wsdl_options: Object.keys(sslOptions).length > 0 ? sslOptions : undefined,
    wsdl_headers: {},
  };

  try {
    const client = await soap.createClientAsync(wsdlUrl, clientOptions);
    if (Object.keys(sslOptions).length > 0) {
      client.setSecurity(new soap.ClientSSLSecurity(
        sslOptions.key as Buffer,
        sslOptions.cert as Buffer,
        sslOptions.ca as Buffer | undefined,
      ));
    }
    return client;
  } catch (e: any) {
    throw new Error(`[konnektorClient] WSDL nicht erreichbar (${wsdlUrl}): ${e.message}`);
  }
}

/**
 * Generic SOAP call to the Konnektor EventService.
 * Endpoint: ${config.konnektorUrl}/ws/EventService
 */
export async function callEventService(
  config: TIConfig,
  operation: string,
  args: object,
): Promise<any> {
  const wsdlUrl = `${config.konnektorUrl}/ws/EventService?wsdl`;
  const client = await createSoapClient(wsdlUrl, config);

  const method = (client as any)[operation];
  if (typeof method !== 'function') {
    throw new Error(`[konnektorClient] EventService operation '${operation}' not found`);
  }

  return new Promise((resolve, reject) => {
    method.call(client, args, (err: any, result: any) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

/**
 * Mock card data returned when a real Konnektor is not available.
 */
const MOCK_CARDS: CardInfo[] = [
  {
    cardHandle: 'mock-smcb-001',
    cardType: 'SMC_B',
    iccsn: '80276883110000116873',
    cardHolderName: 'Praxis Demo GmbH',
    expirationDate: new Date('2028-12-31'),
  },
  {
    cardHandle: 'mock-egk-001',
    cardType: 'EGK',
    iccsn: '80276001011699900865',
    cardHolderName: 'Max Mustermann',
    expirationDate: new Date('2027-06-30'),
  },
];

/**
 * GetCards — Query the Konnektor EventService for all inserted smart cards.
 * Falls back to mock data when SOAP is unavailable (dev / cloud mode).
 */
export async function getCards(config: TIConfig): Promise<CardInfo[]> {
  try {
    const args = {
      Context: {
        MandantId: config.mandantId,
        ClientSystemId: config.clientSystemId,
        WorkplaceId: config.workplaceId,
      },
    };
    const response = await callEventService(config, 'GetCards', args);

    // Parse SOAP response — actual field names depend on Konnektor firmware
    const rawCards: any[] =
      response?.GetCardsResponse?.Cards?.Card ??
      response?.Cards?.Card ??
      [];

    const cards: CardInfo[] = (Array.isArray(rawCards) ? rawCards : [rawCards])
      .filter(Boolean)
      .map((c: any) => ({
        cardHandle: c.CardHandle ?? c.cardHandle ?? '',
        cardType: normaliseCardType(c.CardType ?? c.cardType ?? ''),
        iccsn: c.Iccsn ?? c.iccsn ?? c.ICCSN ?? '',
        cardHolderName: c.CardHolderName ?? c.cardHolderName,
        expirationDate: c.ExpirationDate ? new Date(c.ExpirationDate) : undefined,
      }));

    return cards;
  } catch (e: any) {
    console.warn('[konnektorClient] SOAP unavailable, using mock data:', e.message);
    return MOCK_CARDS;
  }
}

function normaliseCardType(raw: string): CardInfo['cardType'] {
  const upper = (raw ?? '').toUpperCase().replace(/-/g, '_');
  if (upper === 'SMC_B' || upper === 'SMCB') return 'SMC_B';
  if (upper === 'HBA') return 'HBA';
  if (upper === 'EGK') return 'EGK';
  if (upper === 'SMC_KT' || upper === 'SMCKT') return 'SMC_KT';
  return 'SMC_KT'; // safest unknown default
}

/**
 * VerifyPin — Call SignatureService.VerifyPin for a given card handle.
 * Falls back to { status: 'FAILED', retriesLeft: 3 } on SOAP error.
 */
export async function verifyPin(
  config: TIConfig,
  cardHandle: string,
  pinType: string,
): Promise<VerifyPinResult> {
  const wsdlUrl = `${config.konnektorUrl}/ws/SignatureService?wsdl`;
  try {
    const client = await createSoapClient(wsdlUrl, config);
    const args = {
      Context: {
        MandantId: config.mandantId,
        ClientSystemId: config.clientSystemId,
        WorkplaceId: config.workplaceId,
      },
      CardHandle: cardHandle,
      PinTyp: pinType,
    };

    const result: any = await new Promise((resolve, reject) => {
      (client as any).VerifyPin(args, (err: any, res: any) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    const pinResult = result?.VerifyPinResponse?.PinResult ?? result?.PinResult ?? {};
    const pinResultCode: string = (pinResult.PinResultCode ?? pinResult.Status ?? 'FAILED').toUpperCase();

    if (pinResultCode === 'OK' || pinResultCode === 'VERIFIED') {
      return { status: 'OK' };
    }
    if (pinResultCode === 'BLOCKED') {
      return { status: 'BLOCKED', retriesLeft: 0 };
    }

    const retriesLeft = parseInt(pinResult.LeftTries ?? pinResult.RetriesLeft ?? '3', 10);
    return { status: 'FAILED', retriesLeft };
  } catch (e: any) {
    console.warn('[konnektorClient] SOAP unavailable, using mock data:', e.message);
    return { status: 'FAILED', retriesLeft: 3 };
  }
}

/**
 * Mock VSD (Versichertenstammdaten) for development / demo mode.
 */
const MOCK_VSD: VSDData = {
  versichertenNr: 'A123456789',
  versichertenArt: '1',
  kassennummer: '108310400',
  kassenname: 'AOK Bayern',
  vorname: 'Max',
  nachname: 'Mustermann',
  geburtsdatum: '1985-06-15',
  geschlecht: 'M',
  strasse: 'Musterstraße 12',
  plz: '80331',
  ort: 'München',
  gueltigBis: '2027-06-30',
};

/**
 * ReadVSD — Read Versichertenstammdaten from an eGK via VSDService.
 * Falls back to realistic mock data on SOAP error or dev mode.
 */
export async function readVSD(config: TIConfig, cardHandle: string): Promise<VSDData> {
  const wsdlUrl = `${config.konnektorUrl}/ws/VSDService?wsdl`;
  try {
    const client = await createSoapClient(wsdlUrl, config);
    const args = {
      Context: {
        MandantId: config.mandantId,
        ClientSystemId: config.clientSystemId,
        WorkplaceId: config.workplaceId,
      },
      EhcHandle: cardHandle,
    };

    const result: any = await new Promise((resolve, reject) => {
      (client as any).ReadVSD(args, (err: any, res: any) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    // Map SOAP response fields (field names vary by Konnektor firmware)
    const pd = result?.ReadVSDResponse?.PersoenlicheVersichertendaten ?? result?.PersoenlicheVersichertendaten ?? {};
    const allgVD = result?.ReadVSDResponse?.AllgemeineVersicherungsdaten ?? result?.AllgemeineVersicherungsdaten ?? {};
    const gvd = allgVD?.Versicherter ?? {};

    const vsd: VSDData = {
      versichertenNr: pd.Versicherter?.VersichertenID ?? pd.VersichertenID ?? MOCK_VSD.versichertenNr,
      versichertenArt: gvd.VersichertenArt ?? MOCK_VSD.versichertenArt,
      kassennummer: allgVD.Kostentraeger?.Kassennummer ?? MOCK_VSD.kassennummer,
      kassenname: allgVD.Kostentraeger?.Name ?? MOCK_VSD.kassenname,
      vorname: pd.Versicherter?.Person?.Vorname ?? MOCK_VSD.vorname,
      nachname: pd.Versicherter?.Person?.Nachname ?? MOCK_VSD.nachname,
      geburtsdatum: pd.Versicherter?.Person?.Geburtsdatum ?? MOCK_VSD.geburtsdatum,
      geschlecht: pd.Versicherter?.Person?.Geschlecht ?? MOCK_VSD.geschlecht,
      strasse: pd.Versicherter?.Adresse?.Strasse,
      plz: pd.Versicherter?.Adresse?.Postleitzahl,
      ort: pd.Versicherter?.Adresse?.Ort,
      gueltigBis: gvd.Beginn
        ? undefined
        : result?.ReadVSDResponse?.GueltigBis ?? undefined,
    };

    return vsd;
  } catch (e: any) {
    console.warn('[konnektorClient] SOAP unavailable, using mock data:', e.message);
    return { ...MOCK_VSD };
  }
}

/**
 * matchVSDToPatient — Compare VSD familyName + birthDate against a stored patient.
 * Returns true when both fields match (case-insensitive name).
 */
export async function matchVSDToPatient(vsdData: VSDData, patientId: string): Promise<boolean> {
  const db = prisma();
  if (!db) return false;

  try {
    const patient = await db.patient.findUnique({ where: { id: patientId } });
    if (!patient) return false;

    const nameMatch =
      (patient.lastName ?? '').toLowerCase().trim() ===
      (vsdData.nachname ?? '').toLowerCase().trim();

    // birthDate stored as ISO string (YYYY-MM-DD) or Date
    const patientDob =
      patient.birthDate instanceof Date
        ? patient.birthDate.toISOString().slice(0, 10)
        : (patient.birthDate ?? '').toString().slice(0, 10);

    const vsdDob = (vsdData.geburtsdatum ?? '').slice(0, 10);

    return nameMatch && patientDob === vsdDob;
  } catch (e: any) {
    console.warn('[konnektorClient] matchVSDToPatient error:', e.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────

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
