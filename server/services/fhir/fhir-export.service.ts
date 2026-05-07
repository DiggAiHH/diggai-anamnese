/**
 * server/services/fhir/fhir-export.service.ts
 *
 * FHIR-Export-Service für DiGA-Voraussetzung F4.
 *
 * Anker:
 *   - Open-Items-Tracker F4 ("Interoperabilität KIM/FHIR implementieren")
 *   - DiGAV §6 (Datenverarbeitung) und §7 (Schnittstellen)
 *   - gematik FHIR-IG „Patientenakte" und „MIO" (Medizinische Informationsobjekte)
 *   - gematik KIM-Spezifikation: gemSpec_CM_KOMLE v1.5 + gemSpec_TI-Messenger v1.0
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
 * Status:
 *   - captureToFhirBundle: funktionsfähig (Feature-Flag-geschützt)
 *   - sendViaKim: Stub — Production benötigt gematik-Konformitätsbescheinigung + TI-Anbindung
 */

// ── Feature Flag ──────────────────────────────────────────────

const truthy = (v: string | undefined): boolean =>
    v === '1' || v === 'true' || v === 'TRUE' || v === 'yes';

export const FHIR_EXPORT_ENABLED: boolean = truthy(process.env.FHIR_EXPORT_ENABLED);

// ── Input / Output Types ──────────────────────────────────────

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

// ── KIM (Kommunikation im Medizinwesen) Types ─────────────────

/**
 * KIM-Konfiguration pro Tenant.
 *
 * KIM ist die gematik-zertifizierte sichere E-Mail-Schiene der Telematikinfrastruktur (TI)
 * für Praxis-zu-Praxis-Kommunikation (gemSpec_CM_KOMLE v1.5).
 *
 * Voraussetzungen für Production:
 *   1. TI-Konnektor in der Praxis (Secunet, RISE, Telekom Health AG, etc.)
 *   2. Praxis-SMC-B (Sicherheitsmodul Institutionskarte) für KIM-Authentifizierung
 *   3. KIM-Adresse (@praxis.kim.telematik) beim KIM-Anbieter registriert
 *   4. DiggAi-Sender-SMC-B + gematik-Konformitätsbescheinigung
 *   5. AVV mit Empfänger-Praxis (DSGVO Art. 26)
 */
export interface KimConfig {
    /** TI-Konnektor-URL (z.B. https://konnektor.praxis.local:443) */
    tiKonnektorUrl: string;
    /** Absender-KIM-Adresse (Format: <alias>@<praxis-id>.kim.telematik) */
    senderKimAddress: string;
    /** SMC-B PIN für Konnektor-Authentifizierung (nie persistieren — nur In-Memory) */
    smcbPin?: string;
    /** Mandanten-ID im TI-Konnektor (ClientID) */
    mandantId: string;
    /** Arbeitsplatz-ID im TI-Konnektor */
    workplaceId: string;
    /** Kartenhandle für die SMC-B im Konnektor */
    cardHandle?: string;
    /** Timeout in ms für Konnektor-Requests (default: 10_000) */
    timeoutMs?: number;
}

/**
 * KIM-Nachricht-Struktur.
 *
 * KIM-Nachrichten sind S/MIME-signierte und -verschlüsselte E-Mails (RFC 5751).
 * FHIR-Bundles werden als application/fhir+json Anhänge versandt.
 */
export interface KimMessage {
    /** Empfänger-KIM-Adresse */
    to: string;
    /** Betreff — enthält NUR administrative Referenz, keine klinischen Inhalte */
    subject: string;
    /** Plain-Text-Body (S/MIME outer layer) */
    body: string;
    /** FHIR-Bundle als Attachment */
    attachments: Array<{
        filename: string;
        contentType: 'application/fhir+json';
        /** Base64-encoded FHIR-Bundle JSON */
        data: string;
    }>;
    /** gematik-Kategorie-Code gemäß KIM-Verzeichnis */
    kimCategory?: 'eRezept' | 'eAU' | 'Arztbrief' | 'Befund' | 'Anmeldung';
}

/**
 * Ergebnis eines KIM-Versands.
 */
export interface KimSendResult {
    success: boolean;
    /** Message-ID aus dem SMTP-Response-Header */
    messageId?: string;
    /** KIM-Message-UID im Konnektor */
    kimMessageId?: string;
    errorCode?: KimErrorCode;
    errorDetail?: string;
}

export type KimErrorCode =
    | 'KIM_NOT_CONFIGURED'
    | 'KIM_TI_NOT_REACHABLE'
    | 'KIM_SMCB_LOCKED'
    | 'KIM_SMCB_INVALID'
    | 'KIM_RECIPIENT_NOT_FOUND'
    | 'KIM_SEND_FAILED'
    | 'KIM_VALIDATION_FAILED';

// ── Error Classes ─────────────────────────────────────────────

export class FhirExportNotEnabledError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FhirExportNotEnabledError';
    }
}

export class KimError extends Error {
    constructor(
        message: string,
        public readonly code: KimErrorCode,
    ) {
        super(message);
        this.name = 'KimError';
    }
}

export class KimNotConfiguredError extends KimError {
    constructor(detail?: string) {
        super(
            `KIM nicht konfiguriert: ${detail ?? 'Kein TI-Konnektor oder keine KIM-Adresse gesetzt.'}`,
            'KIM_NOT_CONFIGURED',
        );
        this.name = 'KimNotConfiguredError';
    }
}

export class KimTiNotReachableError extends KimError {
    constructor(konnektorUrl: string) {
        super(
            `TI-Konnektor nicht erreichbar: ${konnektorUrl}. Prüfen Sie Konnektor-Status + VPN.`,
            'KIM_TI_NOT_REACHABLE',
        );
        this.name = 'KimTiNotReachableError';
    }
}

export class KimSmcbError extends KimError {
    constructor(code: 'KIM_SMCB_LOCKED' | 'KIM_SMCB_INVALID') {
        super(
            code === 'KIM_SMCB_LOCKED'
                ? 'SMC-B ist gesperrt. PIN-Eingabe am Kartenlesegerät erforderlich.'
                : 'SMC-B ungültig oder abgelaufen. Neue Karte beim KV-Zugelassenen beantragen.',
            code,
        );
        this.name = 'KimSmcbError';
    }
}

// ── Helpers ───────────────────────────────────────────────────

/**
 * Validiert KimConfig auf Vollständigkeit.
 * Wirft KimNotConfiguredError wenn Pflichtfelder fehlen.
 */
export function validateKimConfig(cfg: Partial<KimConfig>): asserts cfg is KimConfig {
    const missing: string[] = [];
    if (!cfg.tiKonnektorUrl) missing.push('tiKonnektorUrl');
    if (!cfg.senderKimAddress) missing.push('senderKimAddress');
    if (!cfg.mandantId) missing.push('mandantId');
    if (!cfg.workplaceId) missing.push('workplaceId');

    if (!cfg.senderKimAddress?.endsWith('.kim.telematik')) {
        missing.push('senderKimAddress (muss auf .kim.telematik enden)');
    }

    if (missing.length > 0) {
        throw new KimNotConfiguredError(`Fehlende Felder: ${missing.join(', ')}`);
    }
}

/**
 * Baut eine KIM-Nachricht aus einem FHIR-Bundle.
 * Kann aufgerufen werden ohne TI-Verbindung (reine Datentransformation).
 */
export function buildKimMessage(
    bundle: FhirBundle,
    recipient: string,
    sessionId: string,
): KimMessage {
    const bundleJson = JSON.stringify(bundle, null, 2);
    const bundleBase64 = Buffer.from(bundleJson, 'utf8').toString('base64');

    return {
        to: recipient,
        subject: `DiggAi Anmeldedaten ${new Date().toLocaleDateString('de-DE')} [Ref: ${sessionId.slice(0, 8)}]`,
        body: [
            'Sehr geehrte Kolleginnen und Kollegen,',
            '',
            'im Anhang erhalten Sie die administrativen Anmeldedaten eines Patienten',
            'als FHIR R4 Bundle (administrative-only, ohne klinische Diagnose-Codes).',
            '',
            'Übermittelt durch: DiggAi Anamnese-Plattform (diggai.de)',
            'Referenz-ID: ' + sessionId.slice(0, 8),
            '',
            'Diese Nachricht wurde sicher über die gematik Telematikinfrastruktur (KIM) übermittelt.',
        ].join('\n'),
        attachments: [{
            filename: `anmeldedaten-${sessionId.slice(0, 8)}.fhir.json`,
            contentType: 'application/fhir+json',
            data: bundleBase64,
        }],
        kimCategory: 'Anmeldung',
    };
}

// ── Core FHIR Export Function ─────────────────────────────────

/**
 * Konvertiert eine Capture-Session in ein FHIR-Bundle (administrative-only).
 * Output ist deterministisch und enthält keine klinischen Codes.
 *
 * @throws FhirExportNotEnabledError wenn FHIR_EXPORT_ENABLED nicht gesetzt
 * @throws Error wenn DSGVO-Consent fehlt
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

    if (s.structuredAnswers && Object.keys(s.structuredAnswers).length > 0) {
        docRefs.push({
            resourceType: 'QuestionnaireResponse',
            id: `qr-${s.sessionId}`,
            status: 'completed',
            subject: { reference: `Patient/${s.patientPseudoId}` },
            encounter: { reference: `Encounter/${encounter.id}` },
            authored: s.createdAt,
            item: Object.entries(s.structuredAnswers).map(([linkId, value]) => ({
                linkId,
                answer: [{ valueString: value }],
            })),
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

// ── KIM Versand ───────────────────────────────────────────────

/**
 * KIM-Versand-Stub.
 *
 * KIM (Kommunikation im Medizinwesen) ist die gematik-zertifizierte sichere E-Mail-Schiene
 * der Telematikinfrastruktur für Praxis-zu-Praxis-Kommunikation (gemSpec_CM_KOMLE v1.5).
 *
 * Production-Implementierung benötigt:
 *   1. TI-Konnektor-SDK (Secunet/RISE/Telekom) — SOAP-Interface für CARD_SERVICE + SIGN_SERVICE
 *   2. gematik-Konformitätsbescheinigung für KIM-Sender (Typ: App im Sinn von §91a SGB V)
 *   3. SMC-B Kartenhandle + PIN (nie persistieren, nur in-memory während Versand)
 *   4. KOMLE-API-Client für Attachment-Verschlüsselung (Hybridverschlüsselung AES-256 + RSA-2048)
 *   5. TI-DNS-Lookup für Empfänger-Zertifikat aus dem VZD (Verzeichnisdienst)
 *
 * @param bundle   FHIR-Bundle das als Anhang versandt werden soll
 * @param config   KIM- und TI-Konnektor-Konfiguration
 * @param recipient Empfänger-KIM-Adresse (@praxis.kim.telematik)
 */
export async function sendViaKim(
    bundle: FhirBundle,
    config: Partial<KimConfig>,
    recipient: string,
): Promise<KimSendResult> {
    // Validierung — wirft KimNotConfiguredError wenn Felder fehlen
    validateKimConfig(config);

    // Nachricht bauen (reine Transformation, kein Netz-Call)
    const sessionId = (bundle.entry?.[0]?.resource as { id?: string })?.id ?? 'unknown';
    const _message = buildKimMessage(bundle, recipient, sessionId); // eslint-disable-line @typescript-eslint/no-unused-vars

    // Stub: Telematikinfrastruktur-Anbindung noch nicht implementiert
    throw new KimError(
        [
            'KIM-Versand: Production-Implementierung ausstehend.',
            `Konnektor-URL: ${config.tiKonnektorUrl}`,
            `Absender: ${config.senderKimAddress}`,
            `Empfänger: ${recipient}`,
            'Benötigt: gematik-Konformitätsbescheinigung + TI-Konnektor-SDK (Secunet/RISE/Telekom)',
        ].join('\n'),
        'KIM_NOT_CONFIGURED',
    );
}

/**
 * Convenience-Wrapper: Konvertiert Capture-Session zu FHIR-Bundle und versendet per KIM.
 * Kombiniert captureToFhirBundle + sendViaKim in einer Transaktion.
 */
export async function exportAndSendViaKim(
    session: CapturePatientSessionForFhir,
    config: Partial<KimConfig>,
    recipient: string,
): Promise<KimSendResult> {
    const bundle = captureToFhirBundle(session);
    return sendViaKim(bundle, config, recipient);
}
