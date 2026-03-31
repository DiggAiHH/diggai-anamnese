import React, { useMemo, useState } from 'react';
import { FileDown, FileJson, Mail, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useMfaSessions } from '../../hooks/useStaffApi';

interface SessionItem {
  id: string;
  selectedService: string;
}

interface ImportPreview {
  patient: {
    name: string;
    email: string | null;
  };
  service: string;
  answers: Array<unknown>;
}

export function MfaImportVersandPanel() {
  const { t } = useTranslation();
  const { data } = useMfaSessions();
  const sessions = useMemo<SessionItem[]>(
    () => ((data as { sessions?: SessionItem[] } | undefined)?.sessions ?? []),
    [data],
  );
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [mailtoUrl, setMailtoUrl] = useState<string | null>(null);

  async function handleImport() {
    if (!selectedFile) return;

    setIsImporting(true);
    setStatusMessage(null);
    try {
      const result = await api.importEncryptedPackage(selectedFile);
      setSelectedSessionId(result.sessionId);
      setImportPreview(result.preview);
      setStatusMessage(
        result.status === 'already_imported'
          ? 'Das Paket war bereits importiert und wurde referenziert.'
          : 'Das Paket wurde erfolgreich importiert.',
      );
    } finally {
      setIsImporting(false);
    }
  }

  async function handleSendLink() {
    if (!selectedSessionId) return;

    setIsSending(true);
    setStatusMessage(null);
    try {
      const result = await api.sendPackageLink(selectedSessionId);
      setMailtoUrl(result.mailtoUrl || null);
      setStatusMessage(
        result.sent
          ? 'Der Einmal-Link wurde per E-Mail verschickt.'
          : 'SMTP ist nicht aktiv. Nutzen Sie den vorbereiteten mailto-Link als Fallback.',
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/20 flex items-center justify-center">
            <FileJson className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t('mfa.importVersand', 'Import / Versand')}</h2>
            <p className="text-sm text-white/40">{t('mfa.importVersandDesc', 'Verschlüsselte Patientenpakete importieren und sichere Links versenden.')}</p>
          </div>
        </div>

        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
            {t('mfa.importFile', 'Verschlüsselte JSON-Datei')}
          </span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            className="block w-full rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-4 text-sm text-white/60 file:mr-4 file:rounded-xl file:border-0 file:bg-purple-500/20 file:px-4 file:py-2 file:text-sm file:font-bold file:text-purple-100"
          />
        </label>

        <button
          onClick={() => void handleImport()}
          disabled={!selectedFile || isImporting}
          className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 font-bold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          {isImporting ? t('mfa.importing', 'Importiere...') : t('mfa.importNow', 'Paket importieren')}
        </button>

        {statusMessage && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {statusMessage}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/20 flex items-center justify-center">
            <Mail className="w-6 h-6 text-blue-300" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{t('mfa.secureDispatch', 'Sicherer Versand')}</h3>
            <p className="text-sm text-white/40">{t('mfa.secureDispatchDesc', 'TXT/PDF on-demand erzeugen oder Einmal-Link für Patienten vorbereiten.')}</p>
          </div>
        </div>

        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
            {t('mfa.selectSession', 'Sitzung auswählen')}
          </span>
          <select
            value={selectedSessionId}
            onChange={(event) => setSelectedSessionId(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          >
            <option value="">{t('mfa.selectSessionPlaceholder', 'Bitte Sitzung wählen')}</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.selectedService} · {session.id.slice(0, 10)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => selectedSessionId && void api.exportSessionTXT(selectedSessionId)}
            disabled={!selectedSessionId}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            TXT
          </button>
          <button
            onClick={() => selectedSessionId && void api.exportSessionPDF(selectedSessionId)}
            disabled={!selectedSessionId}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => void handleSendLink()}
            disabled={!selectedSessionId || isSending}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            {isSending ? t('mfa.sending', 'Sende...') : t('mfa.sendSecureLink', 'Sicheren Link senden')}
          </button>
        </div>

        {mailtoUrl && (
          <a
            href={mailtoUrl}
            className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-500/20"
          >
            <Mail className="w-4 h-4" />
            {t('mfa.openMailtoFallback', 'mailto-Fallback öffnen')}
          </a>
        )}

        {importPreview && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70 space-y-2">
            <p><strong className="text-white">{t('mfa.previewPatient', 'Patient')}:</strong> {importPreview.patient.name}</p>
            <p><strong className="text-white">{t('mfa.previewService', 'Anliegen')}:</strong> {importPreview.service}</p>
            <p><strong className="text-white">{t('mfa.previewAnswers', 'Antworten')}:</strong> {importPreview.answers.length}</p>
            {importPreview.patient.email && (
              <p><strong className="text-white">{t('mfa.previewEmail', 'E-Mail')}:</strong> {importPreview.patient.email}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default MfaImportVersandPanel;
