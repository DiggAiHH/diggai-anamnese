/**
 * TutaMail SMTP Service — DiggAI E-Mail-Pipeline
 *
 * Sendet formatierte Anamnese-Daten an die praxisspezifische
 * TutaMail-Adresse: <BSNR>@diggai.de
 *
 * Die BSNR wird aus dem Tenant (subdomain) der Session gewonnen.
 * Tomedo zieht E-Mails aus diesem Postfach und ordnet sie automatisch
 * der Patientenkartei zu (basierend auf Betreff-Matching).
 *
 * SECURITY: Keine PII in Logs. Nur Session-/Tenant-IDs.
 */

import * as nodemailer from 'nodemailer';
import { config } from '../config';

// ─── Transporter (lazy-initialized) ─────────────────────────

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
    if (transporter) return transporter;

    if (!config.smtp.host || !config.smtp.user) {
        throw new Error('[TutaMail] SMTP ist nicht konfiguriert. Setze SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    }

    transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure, // true for 465, false for other ports
        auth: {
            user: config.smtp.user,
            pass: config.smtp.pass,
        },
        // TLS for TutaMail
        tls: {
            rejectUnauthorized: true,
        },
    });

    return transporter;
}

// ─── Public API ─────────────────────────────────────────────

interface SendAnamneseEmailParams {
    /** BSNR (from tenant subdomain) — used to build recipient: <bsnr>@diggai.de */
    bsnr: string;
    /** Formatted subject line for Tomedo inbox matching */
    subject: string;
    /** Plain text body (Key-Value format for Tomedo) */
    bodyText: string;
    /** Session ID for audit reference */
    sessionId: string;
}

/**
 * Send the formatted anamnesis data to the practice's TutaMail inbox.
 *
 * @returns messageId on success, null if SMTP is not configured (graceful skip)
 */
export async function sendAnamneseEmail(params: SendAnamneseEmailParams): Promise<string | null> {
    const { bsnr, subject, bodyText, sessionId } = params;

    // Gracefully skip if SMTP is not configured (e.g. local development)
    if (!config.smtp.host || !config.smtp.user) {
        console.warn(`[TutaMail] SMTP nicht konfiguriert — E-Mail für Session ${sessionId} wird übersprungen.`);
        return null;
    }

    const recipient = `${bsnr}@${config.emailDomain}`;

    try {
        const transport = getTransporter();

        const info = await transport.sendMail({
            from: config.smtp.from,
            to: recipient,
            subject,
            text: bodyText,
            // Headers for Tomedo processing
            headers: {
                'X-DiggAI-Session': sessionId,
                'X-DiggAI-BSNR': bsnr,
                'X-Mailer': 'DiggAI Anamnese v3',
            },
        });

        console.log(`[TutaMail] E-Mail gesendet an ${recipient} für Session ${sessionId} (messageId: ${info.messageId})`);
        return info.messageId || null;
    } catch (err) {
        console.error(`[TutaMail] Fehler beim Senden für Session ${sessionId}:`, err);
        throw err;
    }
}

/**
 * Verify SMTP connection is working (health check).
 */
export async function verifySmtpConnection(): Promise<boolean> {
    if (!config.smtp.host || !config.smtp.user) {
        return false;
    }
    try {
        const transport = getTransporter();
        await transport.verify();
        console.log('[TutaMail] SMTP-Verbindung verifiziert.');
        return true;
    } catch (err) {
        console.error('[TutaMail] SMTP-Verbindungstest fehlgeschlagen:', err);
        return false;
    }
}
