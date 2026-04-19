/**
 * Starface Click2Dial Service — REST adapter for Starface PBX.
 *
 * Configuration (all optional — Starface integration is disabled if unset):
 *   STARFACE_BASE_URL   Base URL of the Starface instance, e.g. https://pbx.praxis.de
 *   STARFACE_USER       Starface login (username or extension number)
 *   STARFACE_PASSWORD   Starface password or API token
 *   STARFACE_EXTENSION  Caller extension for Click2Dial (MFA desk number)
 *
 * Starface REST API reference: https://knowledge.starface.de/pages/viewpage.action?pageId=7864733
 */

export interface StarfaceCallResult {
  initiated: boolean;
  mode: 'click2dial' | 'unavailable';
  callId?: string;
  error?: string;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.STARFACE_BASE_URL &&
    process.env.STARFACE_USER &&
    process.env.STARFACE_PASSWORD,
  );
}

/** Returns true when Starface credentials are configured in the environment. */
export function isStarfaceAvailable(): boolean {
  return isConfigured();
}

/**
 * Initiates a Click2Dial call via the Starface REST API.
 * Starface calls the MFA's extension first, then connects to the patient.
 *
 * @param callee  - Patient's phone number (E.164 format: +49...)
 * @param caller  - MFA's desk extension (defaults to STARFACE_EXTENSION env var)
 */
export async function initiateClick2Dial(params: {
  callee: string;
  caller?: string;
}): Promise<StarfaceCallResult> {
  if (!isConfigured()) {
    return { initiated: false, mode: 'unavailable', error: 'Starface nicht konfiguriert (STARFACE_* fehlt)' };
  }

  // Basic phone number validation — accept E.164 or local formats
  const phoneRegex = /^\+?[0-9\s\-().]{6,20}$/;
  if (!phoneRegex.test(params.callee)) {
    return { initiated: false, mode: 'unavailable', error: 'Ungültige Zielrufnummer' };
  }

  const baseUrl = process.env.STARFACE_BASE_URL!.replace(/\/$/, '');
  const user     = process.env.STARFACE_USER!;
  const password = process.env.STARFACE_PASSWORD!;
  const caller   = params.caller || process.env.STARFACE_EXTENSION || user;

  try {
    // Authenticate and get session token
    const loginUrl = `${baseUrl}/rest/login`;
    const loginRes = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: user, password }),
    });

    if (!loginRes.ok) {
      return { initiated: false, mode: 'click2dial', error: `Starface Login fehlgeschlagen (${loginRes.status})` };
    }

    const loginData = await loginRes.json() as { sessionId?: string; token?: string };
    const sessionId = loginData.sessionId || loginData.token;
    if (!sessionId) {
      return { initiated: false, mode: 'click2dial', error: 'Kein Session-Token erhalten' };
    }

    // Initiate Click2Dial
    const callUrl = `${baseUrl}/rest/calls`;
    const callRes = await fetch(callUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authToken': sessionId,
      },
      body: JSON.stringify({ callee: params.callee, caller }),
    });

    if (!callRes.ok) {
      const errText = await callRes.text();
      return { initiated: false, mode: 'click2dial', error: `Click2Dial fehlgeschlagen (${callRes.status}): ${errText.slice(0, 200)}` };
    }

    const callData = await callRes.json() as { callId?: string; id?: string };
    const callId = callData.callId || callData.id;

    return { initiated: true, mode: 'click2dial', callId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { initiated: false, mode: 'click2dial', error: message };
  }
}
