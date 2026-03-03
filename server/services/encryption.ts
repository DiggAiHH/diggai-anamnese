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
 * AES-256-GCM Verschlüsselung für PII (Personenbezogene Daten)
 * NHS/HIPAA-konform
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
 * AES-256-GCM Entschlüsselung
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
 * SHA-256 Hash für E-Mail (Pseudonymisierung)
 * H-02 FIX: Mit Salt versehen gegen Rainbow-Table-Angriffe
 */
export function hashEmail(email: string): string {
    return crypto.createHash('sha256')
        .update(EMAIL_HASH_SALT + email.toLowerCase().trim())
        .digest('hex');
}

/**
 * Prüft ob ein Feld als PII markiert ist und verschlüsselt werden muss
 * PII-Atome: Name, Vorname, Adresse, E-Mail, Telefon
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

export function isPIIAtom(atomId: string): boolean {
    return PII_ATOM_IDS.has(atomId);
}
