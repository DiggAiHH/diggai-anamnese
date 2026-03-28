/**
 * @module ExternalFhirPush
 * @description Outbound FHIR R4 bundle push to external command centers.
 *
 * Primary integration targets:
 *   - M42 / Presight (Jordan Digital Health Center)
 *   - DoH Abu Dhabi future connectors
 *
 * Transport: Uses existing PvsConnection (type: FHIR_GENERIC) with
 *   baseUrl + credentials stored AES-256-GCM encrypted in DB.
 *   Transfer lifecycle tracked in PvsTransferLog.
 *
 * @security
 *   - Never log FHIR bundle contents (contain PHI)
 *   - Credentials decrypted in-memory only, never serialized post-decryption
 *   - TLS 1.2+ enforced via Node's built-in TLS stack
 *   - Requests timeout after 30 s (avoids goroutine leaks)
 */

import { prisma } from '../../db';
import { decrypt } from '../encryption';

// ─── Types ───────────────────────────────────────────────────

interface FhirBundle {
  resourceType: 'Bundle';
  type: string;
  timestamp?: string;
  entry?: Array<{ resource: Record<string, unknown> }>;
}

interface PushResult {
  success: boolean;
  statusCode?: number;
  transferLogId?: string;
  error?: string;
}

// Maximum payload size we accept from an external FHIR endpoint response (to prevent memory exhaustion)
const MAX_RESPONSE_SIZE_BYTES = 1024 * 512; // 512 KB

// ─── OAuth2 Token Cache (in-memory, per-connection) ──────────

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getOAuthToken(
  connectionId: string,
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const cached = tokenCache.get(connectionId);
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.token;
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!resp.ok) {
    throw new Error(`OAuth2 token request failed: ${resp.status}`);
  }

  const json = await resp.json() as { access_token: string; expires_in?: number };
  const token = json.access_token;
  const expiresIn = (json.expires_in ?? 3600) * 1000;

  tokenCache.set(connectionId, { token, expiresAt: Date.now() + expiresIn });
  return token;
}

// ─── Auth Header Builder ─────────────────────────────────────

async function buildAuthHeaders(
  connectionId: string,
  authType: string,
  encryptedCredentials: string | null,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/fhir+json',
    Accept: 'application/fhir+json',
    'X-DiggAI-Source': 'DiggAI-Anamnese/3.0',
  };

  if (!encryptedCredentials || authType === 'none') return headers;

  let creds: Record<string, string>;
  try {
    creds = JSON.parse(decrypt(encryptedCredentials)) as Record<string, string>;
  } catch {
    throw new Error('Failed to decrypt FHIR connection credentials');
  }

  switch (authType) {
    case 'basic': {
      if (creds.username && creds.password) {
        const encoded = Buffer.from(`${creds.username}:${creds.password}`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
      }
      break;
    }
    case 'apikey': {
      if (creds.apiKey) {
        headers['Authorization'] = `Bearer ${creds.apiKey}`;
      } else if (creds.apiKeyHeader && creds.apiKeyValue) {
        headers[creds.apiKeyHeader] = creds.apiKeyValue;
      }
      break;
    }
    case 'oauth2': {
      if (creds.tokenUrl && creds.clientId && creds.clientSecret) {
        const token = await getOAuthToken(connectionId, creds.tokenUrl, creds.clientId, creds.clientSecret);
        headers['Authorization'] = `Bearer ${token}`;
      }
      break;
    }
    default:
      break;
  }

  return headers;
}

// ─── Core Push Function ──────────────────────────────────────

/**
 * Pushes a FHIR R4 bundle to all active FHIR_GENERIC PvsConnections for a tenant.
 * Each push is tracked as a PvsTransferLog entry.
 * Non-blocking — designed to run in setImmediate() after session submit.
 *
 * @param tenantId   Tenant whose PvsConnections to use
 * @param sessionId  Source session (for transfer log correlation)
 * @param bundle     FHIR R4 bundle to POST
 * @returns Array of results per connection
 */
export async function pushFhirBundle(
  tenantId: string,
  sessionId: string,
  bundle: FhirBundle,
): Promise<PushResult[]> {
  // Find ALL active FHIR_GENERIC connections for this tenant
  const connections = await prisma.pvsConnection.findMany({
    where: {
      praxisId: tenantId,
      pvsType: 'FHIR_GENERIC',
      isActive: true,
    },
  });

  if (connections.length === 0) {
    return [];
  }

  const results: PushResult[] = [];

  for (const conn of connections) {
    // Create transfer log entry — IN_PROGRESS
    const transferLog = await prisma.pvsTransferLog.create({
      data: {
        connectionId: conn.id,
        direction: 'EXPORT',
        protocol: 'FHIR',
        status: 'IN_PROGRESS',
        entityType: 'PatientSession',
        entityId: sessionId,
      },
    });

    const startMs = Date.now();
    let result: PushResult;

    try {
      const authHeaders = await buildAuthHeaders(
        conn.id,
        conn.fhirAuthType ?? 'none',
        conn.fhirCredentials ?? null,
      );

      const endpoint = conn.fhirBaseUrl?.replace(/\/$/, '') + '/Bundle';

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      let responseStatus: number | undefined;
      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(bundle),
          signal: controller.signal,
        });

        responseStatus = resp.status;

        if (!resp.ok) {
          // Read limited error body
          const errorText = await resp.text().then(t => t.slice(0, 500));
          throw new Error(`FHIR server returned ${resp.status}: ${errorText}`);
        }

        // Discard response body (we don't need it, and it may be large)
        await resp.body?.cancel();

        result = { success: true, statusCode: resp.status, transferLogId: transferLog.id };
      } finally {
        clearTimeout(timeout);
      }

      await prisma.pvsTransferLog.update({
        where: { id: transferLog.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          durationMs: Date.now() - startMs,
        },
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Increment retry count, keep RETRYING unless retries exhausted
      const currentRetryAttempt = transferLog.retryAttempt ?? 0;

      await prisma.pvsTransferLog.update({
        where: { id: transferLog.id },
        data: {
          status: currentRetryAttempt < transferLog.maxRetries ? 'RETRYING' : 'FAILED',
          completedAt: new Date(),
          durationMs: Date.now() - startMs,
          errorMessage: errorMessage.slice(0, 500),
          retryAttempt: currentRetryAttempt + 1,
        },
      });

      console.error(
        `[ExternalFhirPush] Failed for connection ${conn.id} (session ${sessionId}):`,
        errorMessage.slice(0, 200),
      );

      result = { success: false, error: errorMessage, transferLogId: transferLog.id };
    }

    results.push(result);
  }

  return results;
}

/**
 * Convenience wrapper — fire-and-forget for use inside setImmediate().
 * Logs errors without throwing.
 */
export async function triggerFhirPushAsync(
  tenantId: string,
  sessionId: string,
  bundle: FhirBundle,
): Promise<void> {
  try {
    const results = await pushFhirBundle(tenantId, sessionId, bundle);
    const successCount = results.filter(r => r.success).length;
    if (results.length > 0) {
      console.info(
        `[ExternalFhirPush] Session ${sessionId}: ${successCount}/${results.length} pushed successfully`,
      );
    }
  } catch (err: unknown) {
    console.error('[ExternalFhirPush] Unexpected error during push (non-critical):', err);
  }
}
