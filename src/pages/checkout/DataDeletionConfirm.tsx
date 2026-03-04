// ─── Data Deletion Confirmation ────────────────────────────
// Modul 7/8: DSGVO-compliant data deletion during checkout

import { useState } from 'react';
import { ShieldAlert, Trash2, Download, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

interface DataDeletionConfirmProps {
  sessionId: string;
  onConfirm: (action: 'delete' | 'export_then_delete') => void;
  onCancel: () => void;
}

type DeletionStep = 'info' | 'confirm' | 'processing' | 'done';

export function DataDeletionConfirm({ sessionId, onConfirm, onCancel }: DataDeletionConfirmProps) {
  const [step, setStep] = useState<DeletionStep>('info');
  const [exportFirst, setExportFirst] = useState(true);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    setStep('processing');
    await new Promise(r => setTimeout(r, 2000));
    onConfirm(exportFirst ? 'export_then_delete' : 'delete');
    setStep('done');
  };

  const isConfirmValid = confirmText.toLowerCase() === 'löschen';

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {step === 'info' && (
        <>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Daten löschen</h2>
              <p className="text-sm text-gray-500">DSGVO Art. 17 — Recht auf Löschung</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800">Achtung — Unwiderrufliche Aktion</p>
                <p className="text-sm text-amber-700 mt-1">
                  Folgende Daten werden dauerhaft gelöscht:
                </p>
              </div>
            </div>
            <ul className="ml-8 text-sm text-amber-700 space-y-1 list-disc">
              <li>Anamnese-Antworten und Fragebogendaten</li>
              <li>Chat-Verlauf der aktuellen Sitzung</li>
              <li>Hochgeladene Dokumente</li>
              <li>Sitzungsprotokoll und Wartezeiten</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-700">
              <strong>Nicht betroffen:</strong> Abrechnungsdaten und gesetzlich vorgeschriebene Aufbewahrungspflichten
              (§ 630f BGB, 10 Jahre Aufbewahrungsfrist für medizinische Dokumentation) werden beibehalten.
            </p>
          </div>

          <label className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 transition-all">
            <input
              type="checkbox"
              checked={exportFirst}
              onChange={e => setExportFirst(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600"
            />
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Daten vorher als PDF/JSON exportieren</span>
            </div>
          </label>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" /> Abbrechen
            </button>
            <button
              onClick={() => setStep('confirm')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" /> Weiter zur Bestätigung
            </button>
          </div>
        </>
      )}

      {step === 'confirm' && (
        <>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Endgültige Bestätigung</h2>
            <p className="text-gray-500">
              Sitzung: <code className="px-2 py-0.5 bg-gray-100 rounded text-sm">{sessionId.slice(0, 8)}...</code>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tippen Sie <strong>"LÖSCHEN"</strong> zur Bestätigung:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="LÖSCHEN"
              className="w-full px-4 py-3 text-center text-lg font-mono border-2 border-gray-300 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 outline-none"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setStep('info'); setConfirmText(''); }}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
            >
              Zurück
            </button>
            <button
              onClick={handleDelete}
              disabled={!isConfirmValid}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Endgültig löschen
            </button>
          </div>
        </>
      )}

      {step === 'processing' && (
        <div className="text-center space-y-4 py-8">
          <div className="w-16 h-16 mx-auto border-4 border-red-300/30 border-t-red-500 rounded-full animate-spin" />
          <p className="text-lg text-gray-600">Daten werden gelöscht...</p>
          <p className="text-sm text-gray-400">Dieser Vorgang kann nicht rückgängig gemacht werden.</p>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center space-y-4 py-8">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-green-700">Daten gelöscht</h2>
          <p className="text-gray-500">
            Ihre Sitzungsdaten wurden gemäß DSGVO Art. 17 unwiderruflich entfernt.
            {exportFirst && ' Eine Kopie wurde als Export bereitgestellt.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default DataDeletionConfirm;
