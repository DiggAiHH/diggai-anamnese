/**
 * Encrypted localStorage wrapper using AES-GCM via Web Crypto API.
 * Encrypts sensitive session data (answers, PII) at rest in the browser.
 *
 * Key derivation: PBKDF2 from a device-specific fingerprint + session salt.
 * This prevents simple localStorage dumps from revealing patient data.
 */

const SALT_KEY = 'anamnese_salt';
const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const ITERATIONS = 100_000;

/**
 * Get or create a persistent salt for this device
 */
function getOrCreateSalt(): Uint8Array {
    const stored = localStorage.getItem(SALT_KEY);
    if (stored) {
        return Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem(SALT_KEY, btoa(String.fromCharCode(...salt)));
    return salt;
}

/**
 * Derive an AES key from a passphrase using PBKDF2
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt.buffer as ArrayBuffer,
            iterations: ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: ALGORITHM, length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Get a stable device fingerprint for key derivation.
 * Not meant to be cryptographically secure — just adds a layer
 * so raw localStorage dumps aren't immediately usable.
 */
function getDeviceFingerprint(): string {
    const parts = [
        navigator.userAgent,
        navigator.language,
        screen.width.toString(),
        screen.height.toString(),
        new Date().getTimezoneOffset().toString(),
        'anamnese-v14',
    ];
    return parts.join('|');
}

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
    if (cachedKey) return cachedKey;
    const salt = getOrCreateSalt();
    cachedKey = await deriveKey(getDeviceFingerprint(), salt);
    return cachedKey;
}

/**
 * Encrypt a string value
 */
export async function encryptValue(plaintext: string): Promise<string> {
    try {
        const key = await getKey();
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const encoder = new TextEncoder();

        const encrypted = await crypto.subtle.encrypt(
            { name: ALGORITHM, iv },
            key,
            encoder.encode(plaintext)
        );

        // Combine IV + ciphertext and base64 encode
        const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);

        return btoa(String.fromCharCode(...combined));
    } catch {
        // Fallback: return plaintext if crypto isn't available (e.g. HTTP context)
        return plaintext;
    }
}

/**
 * Decrypt a string value
 */
export async function decryptValue(ciphertext: string): Promise<string> {
    try {
        const key = await getKey();
        const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

        const iv = combined.slice(0, IV_LENGTH);
        const data = combined.slice(IV_LENGTH);

        const decrypted = await crypto.subtle.decrypt(
            { name: ALGORITHM, iv },
            key,
            data
        );

        return new TextDecoder().decode(decrypted);
    } catch {
        // If decryption fails, assume it's unencrypted legacy data
        return ciphertext;
    }
}

/**
 * Zustand-compatible encrypted storage adapter.
 * Drop-in replacement for createJSONStorage(() => localStorage).
 */
export const encryptedStorage = {
    getItem: async (name: string): Promise<string | null> => {
        const raw = localStorage.getItem(name);
        if (!raw) return null;

        // Check if data looks encrypted (base64) or is plain JSON
        if (raw.startsWith('{') || raw.startsWith('[')) {
            // Legacy unencrypted data — return as-is, will be re-encrypted on next write
            return raw;
        }

        try {
            return await decryptValue(raw);
        } catch {
            return raw;
        }
    },

    setItem: async (name: string, value: string): Promise<void> => {
        const encrypted = await encryptValue(value);
        localStorage.setItem(name, encrypted);
    },

    removeItem: async (name: string): Promise<void> => {
        localStorage.removeItem(name);
    },
};
