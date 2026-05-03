/**
 * signatureService.ts
 *
 * Frontend-Service für das Speichern von Unterschriften im Backend.
 * CSRF-Token wird automatisch vom apiClient-Interceptor gesetzt (src/api/client.ts).
 * Sentry-Logging: NUR payloadKeys, KEINE Signatur-Bytes (Datenschutz).
 *
 * Fixes: K8 (Arzt-Feedback 2026-05-03)
 */

import * as Sentry from '@sentry/react';
import { apiClient } from '../api/client';
import type { AxiosError } from 'axios';

// ─── Types ───────────────────────────────────────────────────

export type SignatureFormType =
  | 'DSGVO'
  | 'BEHANDLUNG'
  | 'AVV'
  | 'VIDEO_CONSENT'
  | 'SONSTIG';

export interface SignaturePayload {
  /** Base64-PNG der Unterschrift. Wird NICHT in Logs gespeichert. */
  signatureData: string;
  /** SHA-256 Hash des unterzeichneten Dokuments (64 Hex-Zeichen). */
  documentHash: string;
  formType: SignatureFormType;
  documentVersion?: string;
  patientId?: string;
  sessionId?: string;
}

export interface SignatureFieldError {
  field: string;
  code: string;
  message?: string;
}

export type SignatureResult =
  | { ok: true; signatureId: string }
  | { ok: false; fieldError?: SignatureFieldError; generic?: true; message?: string };

// ─── Service Function ─────────────────────────────────────────

/**
 * Sendet eine Unterschrift an POST /api/signatures.
 *
 * Voraussetzung: Auth-Token muss bereits über setAuthToken() gesetzt sein
 * (geschieht automatisch nach createSession-Erfolg in usePatientApi.ts).
 *
 * Fehlerbehandlung:
 * - 400 + Zod-Details → strukturierter fieldError zurückgeben
 * - Andere Fehler → Sentry (ohne Signatur-Bytes) + generic: true
 *
 * @param payload - Signatur-Daten (signatureData wird NICHT geloggt)
 * @returns Strukturiertes Ergebnis
 */
export async function submitSignatureToBackend(
  payload: SignaturePayload,
): Promise<SignatureResult> {
  const loggableFields = {
    documentHash: payload.documentHash,
    formType: payload.formType,
    documentVersion: payload.documentVersion,
    patientId: payload.patientId,
    sessionId: payload.sessionId,
  };

  try {
    const response = await apiClient.post<{ success: boolean; signature: { id: string } }>(
      '/signatures',
      payload,
    );
    return { ok: true, signatureId: response.data.signature?.id ?? '' };
  } catch (rawErr) {
    const err = rawErr as AxiosError<{
      error?: string;
      details?: Array<{ path?: string[]; code?: string; message?: string }>;
    }>;

    // Zod-Validierungsfehler (400) → strukturierter fieldError
    if (err.response?.status === 400 && err.response.data?.details?.length) {
      const firstIssue = err.response.data.details[0];
      return {
        ok: false,
        fieldError: {
          field: firstIssue?.path?.[0] ?? 'unknown',
          code: firstIssue?.code ?? 'VALIDATION_ERROR',
          message: firstIssue?.message,
        },
      };
    }

    // Auth-Fehler (401 / 403) — Signatur fehlt im Backend, aber Nutzer kann fortfahren
    if (err.response?.status === 401 || err.response?.status === 403) {
      Sentry.captureMessage('Signature backend: auth error on submit', {
        level: 'warning',
        tags: { feature: 'signature_submit' },
        extra: { payloadKeys: Object.keys(loggableFields), status: err.response.status },
      });
      return {
        ok: false,
        message: 'Authentifizierung fehlgeschlagen. Unterschrift lokal gespeichert.',
      };
    }

    // Alle anderen Fehler (Netzwerk, 5xx, etc.)
    Sentry.captureException(rawErr, {
      tags: { feature: 'signature_submit' },
      // SICHERHEIT: Keine Signatur-Bytes — nur Payload-Schlüssel
      extra: { payloadKeys: Object.keys(loggableFields) },
    });

    const serverMessage =
      typeof err.response?.data?.error === 'string' ? err.response.data.error : undefined;

    return {
      ok: false,
      generic: true,
      message: serverMessage ?? 'Netzwerkfehler beim Speichern der Unterschrift.',
    };
  }
}
