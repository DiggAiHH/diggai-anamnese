/**
 * SMS Service — Twilio adapter with graceful degradation.
 *
 * Configuration (all optional — SMS is disabled if unset):
 *   TWILIO_ACCOUNT_SID   Twilio account SID
 *   TWILIO_AUTH_TOKEN    Twilio auth token
 *   TWILIO_FROM_NUMBER   Sender number in E.164 format (+49...)
 *
 * When credentials are missing, sendSms() returns { sent: false, mode: 'unavailable' }
 * without throwing, so callers never need to handle a configuration error.
 */

export interface SmsSendResult {
  sent: boolean;
  mode: 'twilio' | 'unavailable';
  messageSid?: string;
  error?: string;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER,
  );
}

/**
 * Send a plain-text SMS to a phone number.
 * Phone numbers must be in E.164 format (+49...).
 * Messages are capped at 160 characters to stay within a single SMS segment.
 */
export async function sendSms(params: {
  to: string;
  body: string;
}): Promise<SmsSendResult> {
  if (!isConfigured()) {
    return { sent: false, mode: 'unavailable', error: 'SMS nicht konfiguriert (TWILIO_* fehlt)' };
  }

  // Validate E.164 format to prevent injection
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  if (!e164Regex.test(params.to)) {
    return { sent: false, mode: 'unavailable', error: 'Ungültige Telefonnummer (E.164 erwartet)' };
  }

  const body = params.body.slice(0, 160);

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken  = process.env.TWILIO_AUTH_TOKEN!;
    const from       = process.env.TWILIO_FROM_NUMBER!;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const form = new URLSearchParams({ To: params.to, From: from, Body: body });
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      return { sent: false, mode: 'twilio', error: `Twilio-Fehler ${response.status}: ${text.slice(0, 200)}` };
    }

    const data = await response.json() as { sid: string };
    return { sent: true, mode: 'twilio', messageSid: data.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { sent: false, mode: 'twilio', error: message };
  }
}

/** Returns true when Twilio credentials are set in the environment. */
export function isSmsAvailable(): boolean {
  return isConfigured();
}
