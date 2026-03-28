/**
 * @module encryption
 * @description AES-256-GCM Verschlüsselung und Pseudonymisierung für PII-Daten
 *
 * @security Alle Funktionen dieses Moduls implementieren DSGVO Art. 32, HIPAA §164.312
 *   und BSI TR-03161 Anforderungen für medizinische Datenverschlüsselung.
 *
 * @algorithm AES-256-GCM (Authenticated Encryption with Associated Data)
 *   - Schlüssel: 256-bit (genau 32 Bytes, aus env ENCRYPTION_KEY)
 *   - IV: zufällige 12 Bytes per Verschlüsselungsvorgang (nie wiederverwenden)
 *   - Auth-Tag: 16 Bytes GCM-Authentifizierungstag (Tamper-Detection)
 *   - Speicherformat: `<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 *
 * @rules
 * - NEVER log decrypted PII values — use patient ID in logs instead
 * - NEVER store plaintext PII in database columns without `encrypted` prefix
 * - NEVER call decrypt() in a loop without try/catch — handle per-field errors
 *
 * @example
 * // Store PII:
 * const encryptedName = encrypt(patientName);  // → "a1b2c3...:d4e5f6...:7890ab..."
 *
 * // Retrieve PII:
 * const name = decrypt(patient.encryptedName);
 *
 * // Pseudonymize email for lookup:
 * const hash = hashEmail(email);  // deterministic, salted SHA-256
 */
import * as crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = config.encryptionIvLength;

// K-10 FIX: Validate encryption key is exactly 32 bytes
const ENCRYPTION_KEY = Buffer.from(config.encryptionKey, 'utf-8');
if (ENCRYPTION_KEY.length !== 32) {
    throw new Error(
        `FATAL: ENCRYPTION_KEY muss exakt 32 Bytes lang sein (aktuell: ${ENCRYPTION_KEY.length}). ` +
        `Bitte ENCRYPTION_KEY in .env korrigieren!`
    );
}

// H-02 FIX: Salt für E-Mail-Hashing (aus ENCRYPTION_KEY abgeleitet)
const EMAIL_HASH_SALT = crypto.createHash('sha256')
    .update(`email-salt:${config.encryptionKey}`)
    .digest('hex')
    .slice(0, 32);


/**
 * Verschlüsselt einen Klartext-String mit AES-256-GCM.
 * Jeder Aufruf erzeugt eine einmalige IV — gleicher Plaintext erzeugt unterschiedliche Ciphertexte.
 *
 * @security HIPAA/DSGVO-konform. Nur für PII-Felder verwenden (Name, Adresse, E-Mail, Telefon).
 * @param plaintext - Zu verschlüsselnder Klartext (darf NICHT leer sein)
 * @returns Verschlüsselter String im Format `<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 * @throws {Error} Wenn ENCRYPTION_KEY nicht gesetzt oder ungültig ist (beim Laden des Moduls)
 */
export function encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Entschlüsselt einen AES-256-GCM verschlüsselten String.
 * Verifiziert automatisch den GCM Auth-Tag — wirft Fehler bei Manipulation.
 *
 * @security Der GCM Auth-Tag schützt vor Tampering. Fehler beim Entschlüsseln = Daten kompromittiert.
 * @param ciphertext - Verschlüsselter String im Format `<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 * @returns Entschlüsselter Klartext
 * @throws {Error} Bei ungültigem Format, falschem Schlüssel oder manipulierten Daten
 */
export function decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
        throw new Error('Ungültiges verschlüsseltes Format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    return decrypted;
}

/**
 * Pseudonymisiert eine E-Mail-Adresse via gesalzenem SHA-256.
 * Das Ergebnis ist deterministisch — gleiche E-Mail → gleicher Hash (für Lookup).
 * Der Salt wird aus ENCRYPTION_KEY abgeleitet, verhindert Rainbow-Table-Angriffe.
 *
 * @security Erfüllt DSGVO Art. 4(5) Pseudonymisierungsanforderung.
 *   Der Hash ist NICHT umkehrbar ohne den Salt (ENCRYPTION_KEY).
 * @param email - E-Mail-Adresse (wird vor dem Hashing normalisiert: lowercase + trim)
 * @returns Salted SHA-256 Hash als Hex-String (64 Zeichen)
 */
export function hashEmail(email: string): string {
    return crypto.createHash('sha256')
        .update(EMAIL_HASH_SALT + email.toLowerCase().trim())
        .digest('hex');
}

/**
 * Whitelist der Frage-IDs, deren Antworten PII enthalten und AES-256-GCM verschlüsselt
 * in `Answer.encryptedValue` gespeichert werden müssen (nicht in `Answer.value`).
 *
 * @see docs/DATA_SCHEMA.md — PII fields section
 */
const PII_ATOM_IDS = new Set([
    '0001', // Nachname
    '0011', // Vorname
    '3000', // PLZ
    '3001', // Wohnort
    '3002', // Wohnanschrift
    '3003', // E-Mail
    '3004', // Mobilnummer
    '9010', // Bestätigungs-Email
    '9011', // Bestätigungs-Telefon
]);

/**
 * Prüft ob eine Frage-ID PII enthält und verschlüsselt gespeichert werden muss.
 *
 * @param atomId - Kanonische Frage-ID (z.B. '0001', '3003')
 * @returns true wenn die Antwort verschlüsselt in `Answer.encryptedValue` gespeichert werden muss
 *
 * @example
 * if (isPIIAtom(atomId)) {
 *   await prisma.answer.create({ data: { encryptedValue: encrypt(value), value: '[encrypted]' } });
 * }
 */
export function isPIIAtom(atomId: string): boolean {
    return PII_ATOM_IDS.has(atomId);
}

// ─── Key-Versioned Encryption (for future key rotation) ──────
//
// Reads ENCRYPTION_KEY_v1, ENCRYPTION_KEY_v2, ... from environment.
// Falls back to ENCRYPTION_KEY (= v1) when versioned keys are not set.
// Only the current version is used for NEW encryptions.
// All versions remain available for decryption (backwards compatibility).
//
// Environment variables:
//   ENCRYPTION_KEY_CURRENT_VERSION=2    (which version to use for new encrypts, default: 1)
//   ENCRYPTION_KEY_v1=<32 chars>        (= ENCRYPTION_KEY)
//   ENCRYPTION_KEY_v2=<32 chars>        (new rotated key)
//
// Usage:
//   const { ciphertext, version } = encryptVersioned(plaintext);
//   const plain = decryptVersioned(ciphertext, version);

function getVersionedKey(version: number): Buffer {
    const envKey = process.env[`ENCRYPTION_KEY_v${version}`] || (version === 1 ? config.encryptionKey : null);
    if (!envKey) {
        throw new Error(`ENCRYPTION_KEY_v${version} ist nicht gesetzt`);
    }
    const key = Buffer.from(envKey, 'utf-8');
    if (key.length !== 32) {
        throw new Error(`ENCRYPTION_KEY_v${version} muss exakt 32 Bytes lang sein`);
    }
    return key;
}

export const CURRENT_KEY_VERSION = parseInt(process.env.ENCRYPTION_KEY_CURRENT_VERSION ?? '1', 10);

/**
 * Verschlüsselt mit der aktuellen Schlüsselversion.
 * @returns ciphertext (Format: iv:authTag:cipher) und die verwendete version
 */
export function encryptVersioned(plaintext: string): { ciphertext: string; version: number } {
    const key = getVersionedKey(CURRENT_KEY_VERSION);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
        ciphertext: `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`,
        version: CURRENT_KEY_VERSION,
    };
}

/**
 * Entschlüsselt mit einer expliziten Schlüsselversion (backwards-compatible).
 * @param ciphertext Format: iv:authTag:cipher
 * @param version    Schlüsselversion aus DB (Answer.encryptionVersion / Patient.encryptionVersion)
 */
export function decryptVersioned(ciphertext: string, version: number): string {
    const key = getVersionedKey(version);
    const parts = ciphertext.split(':');
    if (parts.length !== 3) throw new Error('Ungültiges verschlüsseltes Format');

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
}

