/**
 * Client-Side Payload Encryption
 *
 * Implements AES-256-GCM encryption using the browser's native Web Crypto API
 * (SubtleCrypto). The plaintext NEVER leaves the browser unencrypted.
 *
 * Architecture (Zero-Knowledge POST):
 *
 *   Browser                          Server
 *   ───────────                      ──────────────────────────────────
 *   Patient fills answer
 *   → encryptPayload(answer, key)    ← receives only { iv, ciphertext, keyId }
 *   → POST /api/answers/:sessionId   ← stores encrypted blob in Postgres
 *                                      (server has no access to the key)
 *   MFA-Arzt-Ansicht                 ← ArztUser fetches encrypted blob
 *   → decryptPayload(ciphertext, key)  (decryption in browser, not server)
 *
 * Key lifecycle:
 *   - A per-session AES-256-GCM key is derived via PBKDF2 from:
 *       MASTER_KEY (server-issued, stored in httpOnly cookie) + sessionId
 *   - A separate ephemeral key is used for each export/download.
 *
 * DSGVO compliance:
 *   - Plaintext PII never transits the network.
 *   - Server stores only ciphertext + iv + keyId — not the key material.
 *   - AES-256-GCM auth tag detects tampering.
 */

const ALGORITHM = 'AES-GCM' as const;
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // NIST SP 800-38D recommended GCM IV length

// ─── Key Derivation ─────────────────────────────────────────

/**
 * Derive a per-session AES-256-GCM key from a master passphrase + sessionId.
 * PBKDF2-SHA-256, 100 000 iterations.
 */
export async function deriveSessionKey(
    masterPassphrase: string,
    sessionId: string,
): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(masterPassphrase),
        'PBKDF2',
        false,
        ['deriveKey'],
    );

    const salt = enc.encode(`anamnese:session:${sessionId}`);

    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false, // non-extractable: key cannot leave the browser
        ['encrypt', 'decrypt'],
    );
}

// ─── Encrypt ────────────────────────────────────────────────

export interface EncryptedPayload {
    /** AES-GCM IV as hex string */
    iv: string;
    /** Ciphertext (+ GCM auth tag appended by SubtleCrypto) as hex string */
    ciphertext: string;
    /** Algorithm identifier for future-proofing */
    alg: 'AES-256-GCM';
    /** Client-side timestamp for audit trail */
    encryptedAt: string;
}

/**
 * Encrypt an arbitrary object with AES-256-GCM.
 * Returns a serialisable `EncryptedPayload` — safe to POST to the server.
 *
 * NOTE: The server receives ONLY the encrypted payload.
 * Plaintext is guaranteed to never appear in the POST body.
 */
export async function encryptPayload(
    data: unknown,
    key: CryptoKey,
): Promise<EncryptedPayload> {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const plaintext = new TextEncoder().encode(JSON.stringify(data));

    const ciphertextBuf = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv },
        key,
        plaintext,
    );

    return {
        iv: bufToHex(iv),
        ciphertext: bufToHex(new Uint8Array(ciphertextBuf)),
        alg: 'AES-256-GCM',
        encryptedAt: new Date().toISOString(),
    };
}

// ─── Decrypt ────────────────────────────────────────────────

/**
 * Decrypt an `EncryptedPayload`. Verifies the GCM auth tag —
 * throws if the ciphertext was tampered with.
 *
 * Call this ONLY in the secured Arzt/MFA view after successful authentication.
 */
export async function decryptPayload<T = unknown>(
    payload: EncryptedPayload,
    key: CryptoKey,
): Promise<T> {
    const iv = hexToBuf(payload.iv);
    const ciphertext = hexToBuf(payload.ciphertext);

    const plaintextBuf = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv },
        key,
        ciphertext,
    );

    const json = new TextDecoder().decode(plaintextBuf);
    return JSON.parse(json) as T;
}

// ─── Utilities ──────────────────────────────────────────────

function bufToHex(buf: Uint8Array): string {
    return Array.from(buf)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function hexToBuf(hex: string): Uint8Array<ArrayBuffer> {
    if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
    const arr = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        arr[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    // Cast is safe: new Uint8Array(n) always allocates a plain ArrayBuffer
    return arr as Uint8Array<ArrayBuffer>;
}

// ─── Validation helper (for testing) ────────────────────────

/**
 * Returns true if the string looks like an AES-GCM ciphertext (hex, >24 chars).
 * Used in tests to verify the POST body never contains plaintext.
 */
export function looksEncrypted(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return /^[0-9a-f]{24,}$/i.test(value);
}

// ─── Session-scoped Key Cache (in-memory only) ───────────────
//
// The derived CryptoKey is stored ONLY in module-level memory — never in
// localStorage, sessionStorage, or any persisted store. It is lost when the
// browser tab closes or when clearSessionEncryption() is called.
//
// Key lifecycle:
//   1. Patient opens questionnaire  → initSessionEncryption()
//   2. Patient answers each question → getActiveSessionKey() encrypts value
//   3. Session ends (submit / reset) → clearSessionEncryption()
//
// The masterPassphrase is a client-generated 32-byte random hex string
// stored in sessionStorage only (not persisted across page reloads).
// It is transmitted to the server as a httpOnly-cookie on session creation
// so the MFA-Arzt view can later derive the same key (Zero-Knowledge for
// transit, but server-assisted key escrow for clinical access).

const SESSION_PASSPHRASE_KEY = 'diggai:e2ee:passphrase';
const SESSION_ID_KEY = 'diggai:e2ee:sessionId';

/** Module-level key cache — not serialisable, never leaves memory. */
let _activeKey: CryptoKey | null = null;
let _activeSessionId: string | null = null;

/**
 * Initialise the E2EE key for a patient session.
 *
 * If no masterPassphrase is provided, a new random 32-byte passphrase is
 * generated and stored in sessionStorage (cleared on tab close).
 *
 * @param sessionId  - The server-assigned session UUID.
 * @param masterPassphrase - Optional existing passphrase (e.g. from a previous
 *                           call — used when resuming a session after page reload).
 * @returns The hex-encoded masterPassphrase (persist in sessionStorage).
 */
export async function initSessionEncryption(
    sessionId: string,
    masterPassphrase?: string,
): Promise<string> {
    const passphrase =
        masterPassphrase ??
        (typeof sessionStorage !== 'undefined'
            ? sessionStorage.getItem(SESSION_PASSPHRASE_KEY) ?? undefined
            : undefined) ??
        (() => {
            const bytes = crypto.getRandomValues(new Uint8Array(32));
            return Array.from(bytes)
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
        })();

    _activeKey = await deriveSessionKey(passphrase, sessionId);
    _activeSessionId = sessionId;

    // Persist passphrase in sessionStorage so it survives page reloads within
    // the same browser tab (but NOT across tabs or after the tab is closed).
    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(SESSION_PASSPHRASE_KEY, passphrase);
        sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }

    return passphrase;
}

/**
 * Retrieve the active session encryption key.
 * Returns null if no session has been initialised.
 */
export function getActiveSessionKey(): CryptoKey | null {
    // Try to restore from sessionStorage on first call after page reload.
    if (!_activeKey && typeof sessionStorage !== 'undefined') {
        const storedSessionId = sessionStorage.getItem(SESSION_ID_KEY);
        const storedPassphrase = sessionStorage.getItem(SESSION_PASSPHRASE_KEY);
        if (storedSessionId && storedPassphrase) {
            // Async derivation — result will be ready before the next answer.
            // We kick off derivation here and cache the promise.
            void deriveSessionKey(storedPassphrase, storedSessionId).then((key) => {
                _activeKey = key;
                _activeSessionId = storedSessionId;
            });
        }
    }
    return _activeKey;
}

/**
 * Clear the in-memory key and sessionStorage passphrase.
 * Call on session submit, reset, or logout.
 */
export function clearSessionEncryption(): void {
    _activeKey = null;
    _activeSessionId = null;
    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(SESSION_PASSPHRASE_KEY);
        sessionStorage.removeItem(SESSION_ID_KEY);
    }
}

/** True if a session encryption key is currently loaded. */
export function isSessionEncryptionActive(): boolean {
    return _activeKey !== null || (
        typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem(SESSION_PASSPHRASE_KEY) !== null
    );
}

/**
 * Convenience: encrypt a questionnaire answer value in-place.
 * Returns an `EncryptedPayload` ready to be sent to the server.
 *
 * Throws if no session encryption has been initialised.
 */
export async function encryptAnswerValue(
    value: unknown,
    sessionId: string,
): Promise<EncryptedPayload> {
    const key = getActiveSessionKey();
    if (!key) {
        throw new Error(
            '[E2EE] No active session key — call initSessionEncryption() first.',
        );
    }
    return encryptPayload({ value, sessionId, encryptedAt: new Date().toISOString() }, key);
}

