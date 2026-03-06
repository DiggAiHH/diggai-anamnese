import { useState } from 'react';
import { FileText, Upload, Share2, Trash2, Loader2, CheckCircle, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import { useTIEpaStatus } from '../../hooks/useApi';

type EpaTab = 'status' | 'documents' | 'share';

interface EpaDocument {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  fileUrl?: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  ANAMNESE: 'Anamnese',
  BEFUND: 'Befund',
  MEDIKATIONSPLAN: 'Medikationsplan',
  LABOR: 'Labor',
  BILD: 'Bildgebung',
  ARZTBRIEF: 'Arztbrief',
  IMPFAUSWEIS: 'Impfausweis',
  SONSTIGES: 'Sonstiges',
};

export function EPAPanel() {
  const [tab, setTab] = useState<EpaTab>('status');
  const [patientId, setPatientId] = useState('');
  const [documents, setDocuments] = useState<EpaDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsLoaded, setDocsLoaded] = useState(false);

  const { data: epaStatus, isLoading, refetch } = useTIEpaStatus();

  async function loadDocuments() {
    if (!patientId) return;
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/epa/${patientId}/documents`, { credentials: 'include' });
      if (res.ok) { const data = await res.json(); setDocuments(data); setDocsLoaded(true); }
    } finally { setLoadingDocs(false); }
  }

  async function deleteDocument(docId: string) {
    await fetch(`/api/epa/document/${docId}`, { method: 'DELETE', credentials: 'include' });
    setDocuments(d => d.filter(doc => doc.id !== docId));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-600" /> ePA – Elektronische Patientenakte
        </h2>
        <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {([
          { id: 'status', label: 'Status', icon: <CheckCircle className="w-4 h-4" /> },
          { id: 'documents', label: 'Dokumente', icon: <FileText className="w-4 h-4" /> },
          { id: 'share', label: 'Freigaben', icon: <Share2 className="w-4 h-4" /> },
        ] as Array<{ id: EpaTab; label: string; icon: React.ReactNode }>).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium flex-1 justify-center transition-all ${tab === t.id ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Status tab */}
      {tab === 'status' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : (
            <>
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${(epaStatus as any)?.enabled ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'}`}>
                {(epaStatus as any)?.enabled ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm">{(epaStatus as any)?.enabled ? 'ePA aktiv (FHIR R4)' : 'ePA nicht konfiguriert'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{(epaStatus as any)?.message ?? 'Kein Status verfügbar'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'FHIR Version', value: (epaStatus as any)?.fhirVersion ?? 'R4' },
                  { label: 'Konnektor', value: (epaStatus as any)?.konnektorConnected ? 'Verbunden' : 'Nicht verbunden' },
                ].map(item => (
                  <div key={item.label} className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                    <p className="font-medium text-sm">{item.value}</p>
                  </div>
                ))}
              </div>

              {!(epaStatus as any)?.enabled && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium mb-1">Konfiguration erforderlich</p>
                  <p>Setzen Sie <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">EPA_ENABLED=true</code> in Ihrer <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">.env</code>-Datei und konfigurieren Sie den TI-Konnektor.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Documents tab */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input type="text" value={patientId} onChange={e => setPatientId(e.target.value)}
              placeholder="Patienten-ID eingeben"
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm" />
            <button onClick={loadDocuments} disabled={!patientId || loadingDocs}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {loadingDocs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Laden
            </button>
          </div>

          {docsLoaded && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {documents.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Keine Dokumente</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {documents.map(doc => (
                    <li key={doc.id} className="flex items-center justify-between px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{doc.title}</p>
                        <p className="text-xs text-gray-400">{DOC_TYPE_LABELS[doc.type] ?? doc.type} · {new Date(doc.createdAt).toLocaleDateString('de-DE')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.fileUrl && (
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                            className="p-1.5 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <Eye className="w-4 h-4" />
                          </a>
                        )}
                        <button onClick={() => deleteDocument(doc.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <EPAUploadForm patientId={patientId} onUploaded={loadDocuments} />
        </div>
      )}

      {/* Share tab */}
      {tab === 'share' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input type="text" value={patientId} onChange={e => setPatientId(e.target.value)}
              placeholder="Patienten-ID eingeben"
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm" />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center text-gray-400 text-sm">
            <Share2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>ePA-Freigaben werden über die Patienten-App verwaltet</p>
          </div>
        </div>
      )}
    </div>
  );
}

function EPAUploadForm({ patientId, onUploaded }: { patientId: string; onUploaded: () => void }) {
  const [docType, setDocType] = useState('BEFUND');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!patientId || !title) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/epa/${patientId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: docType, title, content, createdBy: 'arzt' }),
      });
      if (res.ok) { setTitle(''); setContent(''); onUploaded(); }
    } finally { setUploading(false); }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <p className="text-sm font-medium flex items-center gap-2"><Upload className="w-4 h-4 text-blue-600" /> Dokument hinzufügen</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Typ</label>
          <select value={docType} onChange={e => setDocType(e.target.value)}
            className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm">
            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Titel</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Befundtitel"
            className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Inhalt / Notiz</label>
        <textarea rows={3} value={content} onChange={e => setContent(e.target.value)}
          className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm resize-none" />
      </div>
      <button onClick={handleUpload} disabled={!patientId || !title || uploading}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Hochladen
      </button>
    </div>
  );
}
