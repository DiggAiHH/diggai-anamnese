// ============================================
// FHIR R4 HTTP Client
// ============================================

import type {
  FhirClientConfig,
  FhirResource,
  FhirBundle,
  FhirPatient,
} from '../types.js';

/**
 * Lightweight FHIR R4 HTTP client.
 * Supports basic, oauth2, and apikey auth.
 * No heavy FHIR library dependency — uses native fetch.
 */
export class FhirClient {
  private config: FhirClientConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: FhirClientConfig) {
    this.config = {
      timeout: 10000,
      retryCount: 3,
      ...config,
    };
  }

  // ─── Auth Headers ─────────────────────────────────────────

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json',
    };

    switch (this.config.authType) {
      case 'basic': {
        const { username, password } = this.config.credentials;
        if (username && password) {
          headers['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
        }
        break;
      }
      case 'oauth2': {
        const token = await this.getOAuth2Token();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        break;
      }
      case 'apikey': {
        const { apiKey } = this.config.credentials;
        if (apiKey) headers['X-API-Key'] = apiKey;
        break;
      }
    }

    return headers;
  }

  private async getOAuth2Token(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 30000) {
      return this.accessToken;
    }

    const { clientId, clientSecret, tokenUrl } = this.config.credentials;
    if (!clientId || !clientSecret || !tokenUrl) return null;

    try {
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
      const data = await res.json() as { access_token?: string; expires_in?: number };
      if (data.access_token) {
        this.accessToken = data.access_token;
        this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
        return this.accessToken;
      }
    } catch (err) {
      console.error('[FHIR] OAuth2 token error:', err);
    }
    return null;
  }

  // ─── HTTP Methods ─────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    attempt = 1,
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers = await this.getAuthHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout!);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const err = new Error(`FHIR ${method} ${path} → ${res.status}: ${text}`);
        if (attempt < this.config.retryCount! && res.status >= 500) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          return this.request<T>(method, path, body, attempt + 1);
        }
        throw err;
      }

      return await res.json() as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ─── CRUD Operations ─────────────────────────────────────

  async read<T extends FhirResource>(resourceType: string, id: string): Promise<T> {
    return this.request<T>('GET', `/${resourceType}/${id}`);
  }

  async search<T extends FhirResource>(
    resourceType: string,
    params: Record<string, string>,
  ): Promise<FhirBundle> {
    const qs = new URLSearchParams(params).toString();
    return this.request<FhirBundle>('GET', `/${resourceType}?${qs}`);
  }

  async create<T extends FhirResource>(resource: T): Promise<T> {
    return this.request<T>('POST', `/${resource.resourceType}`, resource);
  }

  async update<T extends FhirResource>(resource: T): Promise<T> {
    if (!resource.id) throw new Error('Resource ID required for update');
    return this.request<T>('PUT', `/${resource.resourceType}/${resource.id}`, resource);
  }

  async transaction(bundle: FhirBundle): Promise<FhirBundle> {
    return this.request<FhirBundle>('POST', '/', bundle);
  }

  // ─── Convenience Methods ──────────────────────────────────

  async searchPatient(kvnr: string): Promise<FhirPatient | null> {
    const bundle = await this.search<FhirPatient>('Patient', {
      identifier: `http://fhir.de/sid/gkv/kvid-10|${kvnr}`,
    });
    const entry = bundle.entry?.[0];
    return (entry?.resource as FhirPatient) ?? null;
  }

  async submitBundle(bundle: FhirBundle): Promise<FhirBundle> {
    return this.transaction(bundle);
  }

  // ─── Connection Test ──────────────────────────────────────

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${this.config.baseUrl}/metadata`, {
        headers,
        signal: AbortSignal.timeout(this.config.timeout!),
      });
      if (res.ok) {
        return { ok: true, message: 'FHIR-Server erreichbar (CapabilityStatement OK)' };
      }
      return { ok: false, message: `FHIR-Server antwortet mit Status ${res.status}` };
    } catch (err) {
      return { ok: false, message: `FHIR-Server nicht erreichbar: ${(err as Error).message}` };
    }
  }
}
