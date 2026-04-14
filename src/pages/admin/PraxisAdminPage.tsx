/**
 * PraxisAdminPage — Praxis-scoped admin view for staff at /:bsnr/admin
 *
 * Features:
 *  1. Kryptografischer Passwort-Generator (crypto.getRandomValues, 16 Byte → Base64url)
 *  2. Session-Viewer — sucht nach Session-ID und lädt MfaDecryptView
 *  3. Nur direkt über BSNR-URL erreichbar; KEINE globale Auth (Praxis-Kiosk-Szenario)
 *
 * DSGVO: Keine persönlichen Patientendaten werden hier persistiert.
 * Passwörter werden ausschließlich im Browser-Speicher (state) erzeugt — niemals abgesendet.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Copy, Eye, EyeOff, KeyRound, RefreshCw, Search, Shield, Stethoscope } from 'lucide-react';
import { MfaDecryptView } from '../../components/mfa/MfaDecryptView';
import { Select } from '../../components/ui/Select';

// ─── Password Generator ──────────────────────────────────────────────────────

const CHARSETS = {
  base64url: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
  memorable: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
} as const;

type CharsetKey = keyof typeof CHARSETS;

function generatePassword(lengthInBytes: number, charset: CharsetKey): string {
  const chars = CHARSETS[charset];
  const arr = new Uint8Array(lengthInBytes);
  crypto.getRandomValues(arr);
  // Map each byte to a character, masking to avoid modulo bias
  const mask = chars.length <= 32 ? 31 : chars.length <= 64 ? 63 : 127;
  let result = '';
  for (let i = 0; i < arr.length; i++) {
    const idx = arr[i] & mask;
    if (idx < chars.length) {
      result += chars[idx];
    } else {
      // skip and continue — slightly less than lengthInBytes chars but no bias
    }
  }
  // Ensure minimum length by padding with additional random bytes if needed
  while (result.length < lengthInBytes) {
    const extra = new Uint8Array(4);
    crypto.getRandomValues(extra);
    for (let i = 0; i < extra.length && result.length < lengthInBytes; i++) {
      const idx = extra[i] & mask;
      if (idx < chars.length) result += chars[idx];
    }
  }
  return result.slice(0, lengthInBytes);
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function PasswordGenerator() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [length, setLength] = useState(20);
  const [charset, setCharset] = useState<CharsetKey>('base64url');

  const generate = useCallback(() => {
    setPassword(generatePassword(length, charset));
    setCopied(false);
    setVisible(true);
  }, [length, charset]);

  const copyToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available in some secure contexts */
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            {t('admin.password_gen.title', 'Passwort-Generator')}
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {t('admin.password_gen.subtitle', 'Kryptografisch sicher · Nur im Browser · Wird nicht übertragen')}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          {t('admin.password_gen.length', 'Länge')}:
          <input
            type="number"
            min={12}
            max={64}
            value={length}
            onChange={(e) => setLength(Math.min(64, Math.max(12, Number(e.target.value))))}
            className="w-16 px-2 py-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          {t('admin.password_gen.charset', 'Zeichensatz')}:
          <Select
            value={charset}
            onChange={(value) => setCharset(value as CharsetKey)}
            options={[
              { value: 'base64url', label: t('admin.password_gen.charset_base64url', 'Base64url (A–Z, a–z, 0–9, -, _)') },
              { value: 'memorable', label: t('admin.password_gen.charset_memorable', 'Klar lesbar (ohne 0/O/I/l)') },
            ]}
            aria-label={t('admin.password_gen.charset', 'Zeichensatz')}
            className="min-w-72"
          />
        </label>

        <button
          type="button"
          onClick={generate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          {t('admin.password_gen.generate', 'Generieren')}
        </button>
      </div>

      {/* Output */}
      {password && (
        <div className="relative flex items-center gap-2 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)]">
          <code
            className="flex-1 text-sm font-mono text-[var(--text-primary)] break-all select-all"
            aria-label={t('admin.password_gen.generated_label', 'Generiertes Passwort')}
          >
            {visible ? password : '•'.repeat(password.length)}
          </code>
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t('admin.password_gen.hide', 'Verbergen') : t('admin.password_gen.show', 'Anzeigen')}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors"
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={copyToClipboard}
            aria-label={t('admin.password_gen.copy', 'Kopieren')}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors"
          >
            <Copy className={`w-4 h-4 ${copied ? 'text-green-500' : ''}`} />
          </button>
          {copied && (
            <span className="absolute right-2 -top-6 text-xs text-green-600 font-medium bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg shadow">
              {t('admin.password_gen.copied', 'Kopiert!')}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Session Viewer ──────────────────────────────────────────────────────────

function SessionViewer() {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleSearch = () => {
    const trimmed = input.trim();
    if (trimmed) setSessionId(trimmed);
  };

  return (
    <section className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Stethoscope className="w-5 h-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            {t('admin.session_viewer.title', 'Patienten-Session entschlüsseln')}
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {t('admin.session_viewer.subtitle', 'Session-ID eingeben · Erfordert Arzt-Authentifizierung')}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t('admin.session_viewer.placeholder', 'Session-ID eingeben…')}
          className="flex-1 px-3 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Search className="w-4 h-4" aria-hidden="true" />
          {t('admin.session_viewer.search', 'Laden')}
        </button>
      </div>

      <input
        type="password"
        value={masterKey}
        onChange={(e) => setMasterKey(e.target.value)}
        placeholder={t('admin.session_viewer.master_key_placeholder', 'Optionaler Entschlüsselungs-Schlüssel')}
        className="w-full px-3 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {sessionId && (
        <MfaDecryptView
          sessionId={sessionId}
          masterKey={masterKey || undefined}
          onClose={() => { setSessionId(null); setInput(''); }}
        />
      )}
    </section>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function PraxisAdminPage() {
  const { t } = useTranslation();
  const { bsnr } = useParams<{ bsnr: string }>();

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <header className="space-y-1">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-500" aria-hidden="true" />
            <h1 className="text-xl font-extrabold text-[var(--text-primary)]">
              {t('admin.page.title', 'Praxis-Administration')}
            </h1>
          </div>
          {bsnr && (
            <p className="text-xs text-[var(--text-secondary)]">
              BSNR: <span className="font-mono font-semibold">{bsnr}</span>
            </p>
          )}
        </header>

        <PasswordGenerator />
        <SessionViewer />
      </div>
    </main>
  );
}
