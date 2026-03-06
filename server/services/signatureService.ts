import crypto from 'crypto';
import { encrypt, decrypt } from './encryption';
import { config } from '../config';

/**
 * Compute SHA-256 hash of document text (Unveränderlichkeitsnachweis).
 */
export function hashDocument(documentText: string): string {
    return crypto.createHash('sha256').update(documentText, 'utf8').digest('hex');
}

/**
 * Store signature: encrypt Base64-PNG with AES-256-GCM.
 */
export function encryptSignature(base64Png: string): string {
    return encrypt(base64Png);
}

/**
 * Retrieve signature: decrypt the stored ciphertext back to Base64-PNG.
 */
export function decryptSignature(ciphertext: string): string {
    return decrypt(ciphertext);
}

/**
 * Verify that a document's current SHA-256 hash matches the stored hash.
 * Returns true if the document is unchanged.
 */
export function verifyDocumentHash(documentText: string, storedHash: string): boolean {
    const currentHash = hashDocument(documentText);
    // Constant-time comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(Buffer.from(currentHash, 'hex'), Buffer.from(storedHash, 'hex'));
    } catch {
        return false;
    }
}

/**
 * Hash an IP address with a fixed salt for DSGVO-compliant pseudonymisation.
 */
export function hashIp(ip: string): string {
    const salt = config.jwtSecret.slice(0, 16); // Use first 16 chars of JWT secret as salt
    return crypto.createHash('sha256').update(`${ip}:${salt}`, 'utf8').digest('hex');
}

/**
 * Validate that a Base64 string looks like a PNG signature (must start with PNG data URL or raw base64).
 */
export function isValidSignatureData(data: string): boolean {
    if (!data || typeof data !== 'string') return false;
    // Allow data:image/png;base64,... or raw base64
    const base64Regex = /^(data:image\/png;base64,)?[A-Za-z0-9+/]+=*$/;
    return base64Regex.test(data) && data.length > 100; // Must have real content
}
