/**
 * useRegistrationConfirmation
 *
 * React-Query Hook für die Capture-Anmeldebestätigung-PDF-API.
 *
 * REGULATORY GUARD (Klasse-I-Schutz):
 *   - Hook bedient ausschließlich administrative Daten
 *   - PDF-Output enthält keine klinischen Aussagen
 *   - Adressiert Connector-Strategie §2.6 (PDF-Tools) + Open-Items D6 (IFU-Vorstufe)
 *
 * Verwendung:
 *   const { mutate: requestPdf, isPending } = useRegistrationConfirmationPreview();
 *   requestPdf({
 *     sessionId: 'xyz',
 *     praxisName: 'Praxis Dr. Klapproth',
 *     praxisAdresse: 'Musterstraße 1\n20354 Hamburg',
 *     patientFullName: 'Max Mustermann',
 *     terminDatum: new Date('2026-05-15T10:30:00').toISOString(),
 *     dsgvoZeitstempel: new Date().toISOString(),
 *     language: 'de',
 *   });
 */

import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

export interface RegistrationConfirmationRequest {
    sessionId: string;
    praxisName: string;
    praxisAdresse: string;
    praxisTelefon?: string;
    praxisEmail?: string;
    patientFullName: string;
    /** ISO-DateTime String */
    terminDatum: string;
    /** ISO-DateTime String */
    dsgvoZeitstempel: string;
    language?: 'de' | 'en';
}

export interface RegistrationConfirmationResult {
    /** Blob-URL für <a href> oder <iframe src> */
    blobUrl: string;
    /** Bytes des PDF */
    sizeBytes: number;
    /** Vorgeschlagener Dateiname für Download */
    suggestedFilename: string;
}

/**
 * Lädt die Anmeldebestätigung als PDF und gibt eine Browser-Object-URL zurück.
 *
 * Der Aufrufer ist für das Aufräumen der Object-URL via URL.revokeObjectURL()
 * verantwortlich (z.B. in einer useEffect-Cleanup oder beim Modal-Schließen).
 */
export function useRegistrationConfirmationPreview() {
    return useMutation<RegistrationConfirmationResult, Error, RegistrationConfirmationRequest>({
        mutationFn: async ({ sessionId, ...body }): Promise<RegistrationConfirmationResult> => {
            const url = `${API_BASE}/registration/confirmation/${encodeURIComponent(sessionId)}/preview`;
            const response = await axios.post<ArrayBuffer>(url, body, {
                responseType: 'arraybuffer',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/pdf',
                },
                withCredentials: true,
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            return {
                blobUrl,
                sizeBytes: response.data.byteLength,
                suggestedFilename: `anmeldebestaetigung-${sessionId.slice(0, 8)}.pdf`,
            };
        },
    });
}

/**
 * Optionaler Hook für den Health-Check-Endpoint (Smoke-Test-Integration).
 */
export function useRegistrationConfirmationHealth() {
    return useMutation<{ status: string; pdfBytes: number; classification: string }, Error, void>({
        mutationFn: async () => {
            const url = `${API_BASE}/registration/confirmation/health`;
            const response = await axios.get(url, { withCredentials: true });
            return response.data;
        },
    });
}
