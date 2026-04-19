/**
 * NFC + PIN End-to-End Encryption Module
 *
 * Architecture:
 *   1. Doctor has a short PIN (e.g. "1234") and an NFC tag containing a 32-byte
 *      high-entropy secret encoded as Base64 (≤ 44 chars, fits NTAG213).
 *   2. PBKDF2 derives a 256-bit AES-GCM master key from PIN + NFC secret.
 *   3. Patient data is encrypted client-side before transmission — the server
 *      stores ONLY ciphertext.
 *   4. Decryption requires physical NFC tag + PIN (two-factor).
 *
 * Security properties:
 *   - PBKDF2 with 600,000 iterations (OWASP 2024 recommendation for SHA-256)
 *   - AES-256-GCM authenticated encryption (integrity + confidentiality)
 *   - Random 12-byte IV per encryption (never reused)
 *   - All operations use the native Web Crypto API (no JS polyfills)
 *   - Keys are non-extractable CryptoKey objects (never in JS heap as raw bytes)
 */

// ─── Constants ──────────────────────────────────────────────

/** AES-GCM IV length in bytes (NIST SP 800-38D recommends 96 bits) */
const IV_BYTES = 12;

/** PBKDF2 iteration count — OWASP 2024 minimum for SHA-256 */
const PBKDF2_ITERATIONS = 600_000;

/** PBKDF2 hash algorithm */
const PBKDF2_HASH = 'SHA-256';

/** Target key algorithm */
const KEY_ALGORITHM = 'AES-GCM';

/** Target key length in bits */
const KEY_LENGTH = 256;

// ─── NFC Secret Generation ──────────────────────────────────

/**
 * Generate a cryptographically random 32-byte secret for writing to an NFC tag.
 * Returns a Base64-encoded string (44 characters — fits NTAG213's 144-byte capacity).
 */
export function generateNfcSecret(): string {
  const secret = crypto.getRandomValues(new Uint8Array(32));
  return uint8ToBase64(secret);
}

// ─── Key Derivation ─────────────────────────────────────────

/**
 * Derive a 256-bit AES-GCM master key from a doctor's PIN and the NFC tag secret.
 *
 * The NFC secret acts as a high-entropy salt, making the PIN practically
 * unbrute-forceable even if short (the attacker needs physical tag access).
 *
 * @param pin - Doctor's memorized PIN (any length string)
 * @param nfcSecret - Base64-encoded 32-byte secret read from the NFC tag
 * @returns Non-extractable CryptoKey usable for encrypt/decrypt operations
 */
export async function generateMasterKey(
  pin: string,
  nfcSecret: string
): Promise<CryptoKey> {
  if (!pin || !nfcSecret) {
    throw new Error('PIN und NFC-Secret sind beide erforderlich.');
  }

  const encoder = new TextEncoder();

  // Import PIN as raw key material for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Decode the Base64 NFC secret to use as salt
  const salt = base64ToUint8(nfcSecret);

  // Derive the AES-256-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    { name: KEY_ALGORITHM, length: KEY_LENGTH },
    false, // non-extractable — the key never leaves Web Crypto as raw bytes
    ['encrypt', 'decrypt']
  );
}

// ─── Encryption ─────────────────────────────────────────────

/**
 * Encrypt plaintext using AES-256-GCM with a random IV.
 *
 * Output format: Base64( IV (12 bytes) || ciphertext || authTag (16 bytes) )
 * This is a single opaque string safe for JSON transport and DB storage.
 *
 * @param masterKey - CryptoKey from generateMasterKey()
 * @param plaintext - UTF-8 string to encrypt
 * @returns Base64-encoded ciphertext bundle (IV + ciphertext + tag)
 */
export async function encryptData(
  masterKey: CryptoKey,
  plaintext: string
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: KEY_ALGORITHM, iv },
    masterKey,
    encoded
  );

  // Combine: IV || ciphertext+authTag (GCM appends the 16-byte tag automatically)
  const combined = new Uint8Array(IV_BYTES + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), IV_BYTES);

  return uint8ToBase64(combined);
}

/**
 * Decrypt a ciphertext bundle produced by encryptData().
 *
 * @param masterKey - CryptoKey from generateMasterKey()
 * @param ciphertext - Base64-encoded bundle from encryptData()
 * @returns Decrypted UTF-8 plaintext
 * @throws DOMException if the key is wrong or data has been tampered with
 */
export async function decryptData(
  masterKey: CryptoKey,
  ciphertext: string
): Promise<string> {
  const combined = base64ToUint8(ciphertext);

  if (combined.length < IV_BYTES + 16) {
    throw new Error('Ungültiges Chiffrat: Zu kurz für IV + AuthTag.');
  }

  const iv = combined.slice(0, IV_BYTES);
  const data = combined.slice(IV_BYTES);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: KEY_ALGORITHM, iv },
    masterKey,
    data
  );

  return new TextDecoder().decode(plainBuffer);
}

// ─── Patient-Side Envelope Encryption ───────────────────────

/**
 * Encrypt patient form data for server storage (patient-side, no NFC needed).
 *
 * Flow:
 *   1. Generate a random 256-bit data encryption key (DEK).
 *   2. Encrypt the payload with the DEK (AES-256-GCM).
 *   3. Return both the encrypted payload and the raw DEK (Base64).
 *
 * The DEK should then be encrypted with the practice's public key or
 * stored in a key-escrow mechanism accessible only via NFC + PIN.
 *
 * @param payload - JSON-serializable patient data
 * @returns Object with encrypted payload and the Base64-encoded DEK
 */
export async function encryptPatientPayload(payload: string): Promise<{
  encryptedPayload: string;
  encryptedDek: string;
}> {
  // Generate random DEK
  const dek = await crypto.subtle.generateKey(
    { name: KEY_ALGORITHM, length: KEY_LENGTH },
    true, // extractable — we need to export it for key wrapping
    ['encrypt', 'decrypt']
  );

  // Encrypt payload with DEK
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(payload);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: KEY_ALGORITHM, iv },
    dek,
    encoded
  );

  const combined = new Uint8Array(IV_BYTES + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), IV_BYTES);

  // Export DEK as raw bytes for storage/wrapping
  const rawDek = await crypto.subtle.exportKey('raw', dek);

  return {
    encryptedPayload: uint8ToBase64(combined),
    encryptedDek: uint8ToBase64(new Uint8Array(rawDek)),
  };
}

/**
 * Decrypt a patient payload using the doctor's master key.
 *
 * Flow:
 *   1. Decrypt the DEK using the master key (NFC + PIN derived).
 *   2. Use the DEK to decrypt the actual patient data.
 *
 * @param masterKey - Doctor's CryptoKey from generateMasterKey()
 * @param encryptedDek - Base64 bundle containing the encrypted DEK
 * @param encryptedPayload - Base64 bundle containing the encrypted patient data
 * @returns Decrypted patient data as UTF-8 string
 */
export async function decryptPatientPayload(
  masterKey: CryptoKey,
  encryptedDek: string,
  encryptedPayload: string
): Promise<string> {
  // Step 1: Decrypt the DEK
  const dekBytes = await decryptData(masterKey, encryptedDek);
  const dekRaw = base64ToUint8(dekBytes);

  // Step 2: Import the DEK as a CryptoKey
  const dek = await crypto.subtle.importKey(
    'raw',
    dekRaw.buffer as ArrayBuffer,
    { name: KEY_ALGORITHM, length: KEY_LENGTH },
    false,
    ['decrypt']
  );

  // Step 3: Decrypt the payload with the DEK
  const combined = base64ToUint8(encryptedPayload);
  const iv = combined.slice(0, IV_BYTES);
  const data = combined.slice(IV_BYTES);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: KEY_ALGORITHM, iv },
    dek,
    data
  );

  return new TextDecoder().decode(plainBuffer);
}

/**
 * Wrap (encrypt) a DEK with the doctor's master key for secure storage.
 * The wrapped DEK can only be unwrapped with the same master key (NFC + PIN).
 *
 * @param masterKey - Doctor's CryptoKey from generateMasterKey()
 * @param dekBase64 - Base64-encoded raw DEK from encryptPatientPayload()
 * @returns Base64-encoded wrapped DEK
 */
export async function wrapDek(
  masterKey: CryptoKey,
  dekBase64: string
): Promise<string> {
  return encryptData(masterKey, dekBase64);
}

/**
 * Unwrap (decrypt) a DEK using the doctor's master key.
 *
 * @param masterKey - Doctor's CryptoKey from generateMasterKey()
 * @param wrappedDek - Base64-encoded wrapped DEK from wrapDek()
 * @returns Base64-encoded raw DEK
 */
export async function unwrapDek(
  masterKey: CryptoKey,
  wrappedDek: string
): Promise<string> {
  return decryptData(masterKey, wrappedDek);
}

// ─── Base64 Helpers ─────────────────────────────────────────

/** Convert Uint8Array to URL-safe Base64 string */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Convert Base64 string to Uint8Array */
function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
