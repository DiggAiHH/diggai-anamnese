/**
 * server/services/fhir/fhir-export.service.ts
 *
 * FHIR-Export-Service-Skeleton für DiGA-Voraussetzung F4.
 *
 * Anker:
 *   - Open-Items-Tracker F4 ("Interoperabilität KIM/FHIR implementieren")
 *   - DiGAV §6 (Datenverarbeitung) und §7 (Schnittstellen)
 *   - gematik FHIR-IG „Patientenakte" und „MIO" (Medizinische Informationsobjekte)
 *
 * Was tut dieser Service:
 *   Konvertiert DiggAi-PatientSession-Daten (administrative Anmelde-Daten + freie
 *   Anliegen-Beschreibung) in FHIR R4 Patient + Encounter + DocumentReference
 *   Resources. Verwendet DEUTSCHE FHIR-Profile (KBV, ePA-Profile) wo verfügbar.
 *
 * REGULATORY GUARD (Class-I-Schutz):
 *   - Dieser Service ist Capture-Side, exportiert NUR administrative + frei eingegebene Daten
 *   - KEINE Diagnose-Codes (ICD-10), KEINE Procedure-Codes, KEINE klinische Interpretation
 *   - Wenn Suite später FHIR mit Diagnose/Therapie-Daten exportieren möchte, ist das
 *     ein separater Service in packages/suite/, der ICD-10 / Therapy-Plan / Alerts handhabt
 *
 * Status: Skeleton für POC. Production benötigt:
 *   1) FHIR-Validation gegen offizielle KBV-/gematik-Profile
 *   2) AVV mit Empfänger-Praxen-Systeme (FHIR-Subscription-Targets)
 *   3) gematik-Konformitätsbescheinigung (vorbereitet, nicht zertifiziert)
 *   4) Feature-Flag FHIR_EXPORT_ENABLED
 */

const truthy = (v: string | undefined): boolean =>
    v === '1' || v === 'true' || v === 'TRUE' || v === 'yes';

export const FHIR_EXPORT_ENABLED: boolean = truthy(process.env.FHIR_EXPORT_ENABLED);

export interface CapturePatientSessionForFhir {
    sessionId: string;
    patientPseudoId: string;
    patientFullName?: string;
    patientBirthDate?: string;
    patientGender?: 'male' | 'female' | 'other' | 'unknown';
    insuranceNumber?: string;
    practiceTenantId: string;
    /** Free-text concern / Anliegen — ohne klinische Interpretation */
    concernText?: string;
    /** Stammdaten + freie Anliegen-Antworten als Frage-ID/Antwort-Map */
    structuredAnswers?: Record<string, string>;
    /** ISO-Timestamps */
    createdAt: string;
    updatedAt?: string;
    /** DSGVO-Consent-Verifikations-Token */
    consentRecorded: boolean;
}

export interface FhirBundle {
    resourceType: 'Bundle';
    type: 'collection' | 'document' | 'transaction';
    timestamp: string;
    entry: Array<{ resource: object; fullUrl?: string }>;
}

/**
 * Konvertiert eine Capture-Session in ein FHIR-Bundle (administrative-only).
 * Output ist deterministisch und enthält keine klinischen Codes.
 */
export function captureToFhirBundle(s: CapturePatientSessionForFhir): FhirBundle {
    if (!FHIR_EXPORT_ENABLED) {
        throw new FhirExportNotEnabledError(
            'FHIR_EXPORT_ENABLED muss true sein, bevor captureToFhirBundle aufgerufen werden darf.'
        );
    }

    if (!s.consentRecorded) {
        throw new Error('FHIR-Export ohne dokumentierten DSGVO-Consent ist unzulässig.');
    }

    const patient = {
        resourceType: 'Patient',
        id: s.patientPseudoId,
        name: s.patientFullName ? [{ text: s.patientFullName }] : undefined,
        birthDate: s.patientBirthDate,
        gender: s.patientGender ?? 'unknown',
        identifier: s.insuranceNumber ? [{
            system: 'urn:oid:1.2.276.0.76.4.8', // KVNR-OID (KV-Identifier)
            value: s.insuranceNumber,
        }] : undefined,
        meta: {
            profile: ['https://fhir.kbv.de/StructureDefinition/KBV_PR_Base_Patient'],
        },
    };

    const encounter = {
        resourceType: 'Encounter',
        id: `enc-${s.sessionId}`,
        status: 'planned',
        class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulant' },
        subject: { reference: `Patient/${s.patientPseudoId}` },
        period: { start: s.createdAt },
        // Bewusst KEIN reasonCode oder reasonReference — das wäre klinische Interpretation
        serviceProvider: { reference: `Organization/${s.practiceTenantId}` },
        meta: { tag: [{ system: 'urn:diggai', code: 'capture-administrative', display: 'Capture administrative pre-registration' }] },
    };

    // Anliegen als DocumentReference mit freiem Text — keine Codierung
    const docRefs = [];
    if (s.concernText) {
        docRefs.push({
            resourceType: 'DocumentReference',
            id: `dr-concern-${s.sessionId}`,
            status: 'current',
            type: { text: 'Patient-Anliegen (freier Text, ohne klinische Interpretation)' },
            subject: { reference: `Patient/${s.patientPseudoId}` },
            date: s.createdAt,
            content: [{ attachment: { contentType: 'text/plain', data: Buffer.from(s.concernText, 'utf8').toString('base64') } }],
            context: { encounter: [{ reference: `Encounter/${encounter.id}` }] },
        });
    }

    return {
        resourceType: 'Bundle',
        type: 'collection',
        timestamp: new Date().toISOString(),
        entry: [
            { resource: patient, fullUrl: `urn:uuid:patient-${s.patientPseudoId}` },
            { resource: encounter, fullUrl: `urn:uuid:encounter-${s.sessionId}` },
            ...docRefs.map((dr, i) => ({ resource: dr, fullUrl: `urn:uuid:docref-${s.sessionId}-${i}` })),
        ],
    };
}

/**
 * KIM-Versand-Stub. KIM (Kommunikation im Medizinwesen) ist die gematik-zertifizierte
 * sichere E-Mail-Schiene für Praxis-zu-Praxis-Kommunikation. Voraussetzung:
 *   - Praxis hat KIM-Adresse (über Telematikinfrastruktur)
 *   - DiggAi hat KIM-Sender-Konfiguration (gematik-Konformitätsbescheinigung)
 */
export async function sendViaKim(_bundle: FhirBundle, _kimRecipient: string): Promise<{ messageId: string }> {
    throw new FhirExportNotEnabledError(
        'KIM-Versand: Skeleton. Production benötigt gematik-Konformitätsbescheinigung + Telematik-Infrastruktur-Anbindung.'
    );
}

export class FhirExportNotEnabledError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FhirExportNotEnabledError';
    }
}
