import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Shield, Wifi, KeyRound, Lock, Unlock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateMasterKey, decryptData, encryptData } from '../../utils/crypto';

// ─── Web NFC Type Declarations ──────────────────────────────
// The Web NFC API is only available in Chrome on Android.
// We declare the minimal types here so TypeScript is happy.

interface NDEFRecord {
  recordType: string;
  data?: DataView;
}

interface NDEFMessage {
  records: NDEFRecord[];
}

interface NDEFReadingEvent extends Event {
  message: NDEFMessage;
}

interface NDEFReader {
  scan(): Promise<void>;
  addEventListener(type: 'reading', listener: (event: NDEFReadingEvent) => void): void;
  addEventListener(type: 'readingerror', listener: (event: Event) => void): void;
}

declare global {
  interface Window {
    NDEFReader?: new () => NDEFReader;
  }
}

// ─── Props ──────────────────────────────────────────────────

interface NfcDecryptionGateProps {
  /**
   * Encrypted data payload (Base64 from server).
   * Use the sentinel value "e2e-session-gate" for session-unlock mode,
   * where the gate only verifies key derivation succeeds.
   */
  encryptedData: string;
  /** Called with the decrypted plaintext when successfully unlocked */
  onDecrypted: (plaintext: string) => void;
  /** Optional: called when the user re-locks the data */
  onLocked?: () => void;
}

/** Sentinel value indicating session-gate mode (no actual decryption needed) */
const SESSION_GATE_SENTINEL = 'e2e-session-gate';

type GateState = 'locked' | 'input' | 'decrypting' | 'unlocked' | 'error';

// ─── Component ──────────────────────────────────────────────

export const NfcDecryptionGate: React.FC<NfcDecryptionGateProps> = ({
  encryptedData,
  onDecrypted,
  onLocked,
}) => {
  const { t } = useTranslation();
  const [state, setState] = useState<GateState>('locked');
  const [nfcSecret, setNfcSecret] = useState('');
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);

  // Ref for the hidden USB-NFC keyboard-emulation input
  const usbInputRef = useRef<HTMLInputElement>(null);

  // Check Web NFC API availability on mount
  useEffect(() => {
    setNfcSupported(typeof window !== 'undefined' && 'NDEFReader' in window);
  }, []);

  // ─── Web NFC Scan ───────────────────────────────────────

  const startNfcScan = useCallback(async () => {
    if (!window.NDEFReader) return;

    try {
      setNfcScanning(true);
      setErrorMessage('');
      const reader = new window.NDEFReader();
      await reader.scan();

      reader.addEventListener('reading', (event: NDEFReadingEvent) => {
        const record = event.message.records[0];
        if (record?.data) {
          const decoder = new TextDecoder();
          const secret = decoder.decode(record.data);
          setNfcSecret(secret.trim());
          setNfcScanning(false);
        }
      });

      reader.addEventListener('readingerror', () => {
        setErrorMessage(t('nfcCrypto.scanError'));
        setNfcScanning(false);
      });
    } catch {
      setErrorMessage(t('nfcCrypto.scanError'));
      setNfcScanning(false);
    }
  }, [t]);

  // ─── USB NFC Fallback ─────────────────────────────────────
  // USB NFC readers emulate a keyboard — they "type" the tag content
  // followed by Enter. We capture this in a hidden input.

  const handleUsbInput = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && usbInputRef.current) {
      const value = usbInputRef.current.value.trim();
      if (value) {
        setNfcSecret(value);
        usbInputRef.current.value = '';
      }
    }
  }, []);

  // ─── Decrypt ──────────────────────────────────────────────

  const handleDecrypt = useCallback(async () => {
    if (!nfcSecret || !pin) return;

    setState('decrypting');
    setErrorMessage('');

    try {
      const masterKey = await generateMasterKey(pin, nfcSecret);

      if (encryptedData === SESSION_GATE_SENTINEL) {
        // Session-gate mode: key derivation succeeded → unlock
        // Perform a test encrypt/decrypt cycle to verify the key works
        const testPayload = 'nfc-gate-verify';
        const encrypted = await encryptData(masterKey, testPayload);
        const decrypted = await decryptData(masterKey, encrypted);
        if (decrypted !== testPayload) {
          throw new Error('Key verification failed');
        }
        setState('unlocked');
        onDecrypted(SESSION_GATE_SENTINEL);
      } else {
        // Data decryption mode: decrypt actual patient data
        const plaintext = await decryptData(masterKey, encryptedData);
        setState('unlocked');
        onDecrypted(plaintext);
      }
    } catch {
      setState('error');
      setErrorMessage(t('nfcCrypto.decryptError'));
    }
  }, [nfcSecret, pin, encryptedData, onDecrypted, t]);

  // ─── Lock ─────────────────────────────────────────────────

  const handleLock = useCallback(() => {
    setNfcSecret('');
    setPin('');
    setErrorMessage('');
    setState('locked');
    onLocked?.();
  }, [onLocked]);

  // ─── Render: Locked State ─────────────────────────────────

  if (state === 'locked') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-6 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-amber-600 dark:text-amber-400" />
        <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-1">
          {t('nfcCrypto.title')}
        </h3>
        <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
          {t('nfcCrypto.locked')}
        </p>
        <button
          type="button"
          onClick={() => setState('input')}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
        >
          <Shield className="h-4 w-4" />
          {t('nfcCrypto.decrypt')}
        </button>
      </div>
    );
  }

  // ─── Render: Unlocked State ───────────────────────────────

  if (state === 'unlocked') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <Unlock className="h-5 w-5" />
            <span className="text-sm font-medium">{t('nfcCrypto.decryptSuccess')}</span>
          </div>
          <button
            type="button"
            onClick={handleLock}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            {t('nfcCrypto.lock')}
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: Input / Decrypting / Error States ────────────

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-6">
      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
        {t('nfcCrypto.title')}
      </h3>
      <p className="text-sm text-blue-700 dark:text-blue-300 mb-5">
        {t('nfcCrypto.subtitle')}
      </p>

      {/* Error banner */}
      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-100 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Step 1: NFC Secret */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          1. NFC-Secret
        </label>

        {/* Web NFC Button (Chrome Android only) */}
        {nfcSupported && (
          <button
            type="button"
            onClick={startNfcScan}
            disabled={nfcScanning || !!nfcSecret}
            className="mb-2 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-blue-300 bg-white dark:bg-blue-900/20 dark:border-blue-700 px-4 py-2.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50 transition-colors"
          >
            {nfcScanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('nfcCrypto.scanning')}
              </>
            ) : nfcSecret ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                {t('nfcCrypto.scanSuccess')}
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4" />
                {t('nfcCrypto.scanNfc')}
              </>
            )}
          </button>
        )}

        {/* Non-NFC notice */}
        {!nfcSupported && (
          <p className="mb-2 text-xs text-blue-600 dark:text-blue-400">
            {t('nfcCrypto.nfcNotSupported')}
          </p>
        )}

        {/* Manual / USB fallback input */}
        <div className="relative">
          <input
            type="text"
            value={nfcSecret}
            onChange={(e) => setNfcSecret(e.target.value)}
            placeholder={t('nfcCrypto.manualPlaceholder')}
            className="w-full rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-blue-950/50 px-3 py-2 text-sm text-blue-900 dark:text-blue-100 placeholder:text-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {/* Hidden USB-NFC keyboard-emulation catcher */}
          <input
            ref={usbInputRef}
            type="text"
            onKeyDown={handleUsbInput}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
          />
        </div>
        <p className="mt-1 text-xs text-blue-500 dark:text-blue-400">
          {t('nfcCrypto.usbFallback')}
        </p>
      </div>

      {/* Step 2: PIN */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          2. {t('nfcCrypto.pinLabel')}
        </label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && nfcSecret && pin) {
                void handleDecrypt();
              }
            }}
            placeholder={t('nfcCrypto.pinPlaceholder')}
            className="w-full rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-blue-950/50 pl-10 pr-3 py-2 text-sm text-blue-900 dark:text-blue-100 placeholder:text-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Decrypt button */}
      <button
        type="button"
        onClick={() => void handleDecrypt()}
        disabled={!nfcSecret || !pin || state === 'decrypting'}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {state === 'decrypting' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('nfcCrypto.decrypting')}
          </>
        ) : (
          <>
            <Unlock className="h-4 w-4" />
            {t('nfcCrypto.decrypt')}
          </>
        )}
      </button>
    </div>
  );
};

export default NfcDecryptionGate;
