import { useState, useCallback, type FormEvent } from 'react';
import {
  FileText,
  Share2,
  Download,
  Plus,
  Trash2,
  Copy,
  Shield,
  Clock,
} from 'lucide-react';

/* ─── Types ─── */

type DocType = 'ANAMNESE' | 'LABOR' | 'BEFUND' | 'BILD' | 'OP_BERICHT';

interface EpaDocument {
  id: string;
  type: DocType;
  title: string;
  content: string;
  fileUrl?: string;
  createdAt: string;
  validUntil?: string;
}

interface EpaShare {
  id: string;
  sharedWith: string;
  accessScope: DocType[];
  createdAt: string;
  expiresAt: string;
  token: string;
}

type ExportType = 'FULL_HISTORY' | 'LAST_VISIT' | 'MEDICATION_PLAN';
type ExportFormat = 'MARKDOWN' | 'JSON';

interface EpaExport {
  id: string;
  type: ExportType;
  format: ExportFormat;
  createdAt: string;
  expiresAt: string;
  hash: string;
  url: string;
}

type Tab = 'dokumente' | 'freigaben' | 'exporte';

/* ─── Constants ─── */

const DOC_ICONS: Record<DocType, string> = {
  ANAMNESE: '📋',
  LABOR: '🔬',
  BEFUND: '📊',
  BILD: '🖼️',
  OP_BERICHT: '📝',
};

const DOC_TYPES: DocType[] = ['ANAMNESE', 'LABOR', 'BEFUND', 'BILD', 'OP_BERICHT'];

const SCOPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: 'ANAMNESE', label: 'Anamnese' },
  { value: 'BEFUND', label: 'Befund' },
  { value: 'LABOR', label: 'Labor' },
  { value: 'OP_BERICHT', label: 'OP-Bericht' },
];

const DURATION_OPTIONS = [
  { value: '24', label: '24 Stunden' },
  { value: '48', label: '48 Stunden' },
  { value: '72', label: '72 Stunden' },
  { value: '168', label: '7 Tage' },
] as const;

/* ─── Mock data ─── */

const MOCK_DOCUMENTS: EpaDocument[] = [
  {
    id: 'd1',
    type: 'ANAMNESE',
    title: 'Erstanamnese – Aufnahme',
    content: 'Patient berichtet über wiederkehrende Kopfschmerzen seit 3 Monaten.',
    createdAt: '2026-02-15T10:30:00Z',
    validUntil: '2027-02-15T10:30:00Z',
  },
  {
    id: 'd2',
    type: 'LABOR',
    title: 'Blutbild 02/2026',
    content: 'Leukozyten: 7.2, Erythrozyten: 4.8, Hb: 14.2',
    createdAt: '2026-02-20T08:00:00Z',
  },
  {
    id: 'd3',
    type: 'BEFUND',
    title: 'MRT Schädel',
    content: 'Kein pathologischer Befund.',
    fileUrl: 'https://example.com/mrt-schaedel.pdf',
    createdAt: '2026-02-22T14:00:00Z',
    validUntil: '2028-02-22T14:00:00Z',
  },
];

const MOCK_SHARES: EpaShare[] = [
  {
    id: 's1',
    sharedWith: 'dr.mueller@praxis.de',
    accessScope: ['ANAMNESE', 'BEFUND'],
    createdAt: '2026-03-01T09:00:00Z',
    expiresAt: '2026-03-08T09:00:00Z',
    token: 'abc-123-def',
  },
];

const MOCK_EXPORTS: EpaExport[] = [
  {
    id: 'e1',
    type: 'FULL_HISTORY',
    format: 'MARKDOWN',
    createdAt: '2026-02-28T12:00:00Z',
    expiresAt: '2026-03-07T12:00:00Z',
    hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    url: '#',
  },
];

/* ─── Helpers ─── */

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Abgelaufen';
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours} Std. verbleibend`;
  const days = Math.floor(hours / 24);
  return `${days} Tag${days > 1 ? 'e' : ''} verbleibend`;
}

function isValid(validUntil?: string): boolean {
  if (!validUntil) return true;
  return new Date(validUntil).getTime() > Date.now();
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

/* ─── Sub-components ─── */

function StatusCard() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-100 p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
        <Shield className="w-5 h-5 text-sky-600" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="text-sm font-semibold text-gray-800">Private ePA aktiv</h2>
        <p className="text-xs text-gray-500">Einwilligung erteilt · Max Mustermann</p>
        <p className="text-xs text-gray-400">Erstellt am 15.02.2026</p>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-medium px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Aktiv
      </span>
    </div>
  );
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: 'dokumente', label: 'Dokumente', icon: FileText },
    { key: 'freigaben', label: 'Freigaben', icon: Share2 },
    { key: 'exporte', label: 'Exporte', icon: Download },
  ];

  return (
    <nav className="flex gap-1 rounded-xl bg-gray-100 p-1">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
            active === key
              ? 'bg-white text-sky-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </nav>
  );
}

/* ── Dokumente Tab ── */

function DokumenteTab({
  documents,
  onAdd,
  onDelete,
}: {
  documents: EpaDocument[];
  onAdd: (doc: Omit<EpaDocument, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [type, setType] = useState<DocType>('ANAMNESE');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onAdd({ type, title: title.trim(), content: content.trim(), fileUrl: fileUrl.trim() || undefined });
    setTitle('');
    setContent('');
    setFileUrl('');
    setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Dokumente ({documents.length})</h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Dokument hinzufügen
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-gray-600">Typ</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DocType)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DOC_ICONS[t]} {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-gray-600">Titel</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Dokumenttitel"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">Inhalt</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="Dokumentinhalt…"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm resize-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">Datei-URL (optional)</span>
            <input
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-sky-600 transition-colors"
            >
              Speichern
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {documents.map((doc) => {
          const valid = isValid(doc.validUntil);
          return (
            <li
              key={doc.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
            >
              <span className="text-xl leading-none">{DOC_ICONS[doc.type]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                <p className="text-[11px] text-gray-400">
                  {doc.type} · {formatDate(doc.createdAt)}
                  {doc.validUntil && (
                    <span className={valid ? 'text-emerald-500' : 'text-red-400'}>
                      {' '}
                      · {valid ? 'Gültig' : 'Abgelaufen'}
                    </span>
                  )}
                </p>
              </div>
              {confirmId === doc.id ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(doc.id);
                      setConfirmId(null);
                    }}
                    className="rounded-lg bg-red-500 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-red-600"
                  >
                    Löschen
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="rounded-lg px-2 py-1 text-[11px] text-gray-400 hover:text-gray-600"
                  >
                    Nein
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(doc.id)}
                  className="rounded-lg p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                  aria-label={`${doc.title} löschen`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          );
        })}
        {documents.length === 0 && (
          <li className="text-center text-sm text-gray-400 py-8">Keine Dokumente vorhanden.</li>
        )}
      </ul>
    </div>
  );
}

/* ── Freigaben Tab ── */

function FreigabenTab({
  shares,
  onAdd,
  onRevoke,
}: {
  shares: EpaShare[];
  onAdd: (share: Omit<EpaShare, 'id' | 'createdAt' | 'token'>) => void;
  onRevoke: (id: string) => void;
}) {
  const [sharedWith, setSharedWith] = useState('');
  const [scope, setScope] = useState<Set<DocType>>(new Set());
  const [duration, setDuration] = useState('24');
  const [copied, setCopied] = useState<string | null>(null);

  const toggleScope = (v: DocType) => {
    setScope((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!sharedWith.trim() || scope.size === 0) return;
    const hours = Number(duration);
    const expiresAt = new Date(Date.now() + hours * 3_600_000).toISOString();
    onAdd({ sharedWith: sharedWith.trim(), accessScope: [...scope], expiresAt });
    setSharedWith('');
    setScope(new Set());
  };

  const handleCopy = useCallback((token: string) => {
    const link = `${window.location.origin}/epa/shared/${token}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  return (
    <div className="space-y-4">
      {/* Active shares */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">Aktive Freigaben ({shares.length})</h3>
        {shares.map((s) => (
          <div
            key={s.id}
            className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Share2 className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium text-gray-800">{s.sharedWith}</p>
              <div className="flex flex-wrap gap-1">
                {s.accessScope.map((sc) => (
                  <span
                    key={sc}
                    className="inline-block rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-medium px-2 py-0.5"
                  >
                    {sc}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeRemaining(s.expiresAt)}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleCopy(s.token)}
                className="rounded-lg p-1.5 text-gray-400 hover:text-sky-500 hover:bg-sky-50 transition-colors"
                aria-label="Link kopieren"
              >
                <Copy className="w-4 h-4" />
              </button>
              {copied === s.token && (
                <span className="text-[10px] text-emerald-500 font-medium">Kopiert!</span>
              )}
              <button
                type="button"
                onClick={() => onRevoke(s.id)}
                className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                aria-label="Freigabe widerrufen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {shares.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">Keine aktiven Freigaben.</p>
        )}
      </div>

      {/* New share form */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
        <h4 className="text-xs font-semibold text-indigo-700">Neue Freigabe</h4>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-gray-600">Empfänger (E-Mail / Name)</span>
          <input
            type="text"
            value={sharedWith}
            onChange={(e) => setSharedWith(e.target.value)}
            placeholder="arzt@praxis.de"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
          />
        </label>
        <fieldset className="space-y-1">
          <legend className="text-xs font-medium text-gray-600">Zugriff auf</legend>
          <div className="flex flex-wrap gap-2">
            {SCOPE_OPTIONS.map(({ value, label }) => (
              <label
                key={value}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                  scope.has(value)
                    ? 'border-indigo-400 bg-indigo-100 text-indigo-700 font-medium'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={scope.has(value)}
                  onChange={() => toggleScope(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-gray-600">Gültigkeitsdauer</span>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
          >
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-600 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Freigabe erstellen
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Exporte Tab ── */

function ExporteTab({
  exports: exportList,
  onCreate,
}: {
  exports: EpaExport[];
  onCreate: (type: ExportType, format: ExportFormat) => void;
}) {
  const [exportType, setExportType] = useState<ExportType>('FULL_HISTORY');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('MARKDOWN');

  return (
    <div className="space-y-4">
      {/* Create export */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
        <h4 className="text-xs font-semibold text-emerald-700">Neuen Export erstellen</h4>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">Export-Typ</span>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value as ExportType)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none"
            >
              <option value="FULL_HISTORY">Vollständige Historie</option>
              <option value="LAST_VISIT">Letzter Besuch</option>
              <option value="MEDICATION_PLAN">Medikationsplan</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">Format</span>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none"
            >
              <option value="MARKDOWN">Markdown</option>
              <option value="JSON">JSON</option>
            </select>
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onCreate(exportType, exportFormat)}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export erstellen
          </button>
        </div>
      </div>

      {/* Past exports */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">Bisherige Exporte ({exportList.length})</h3>
        {exportList.map((ex) => (
          <div
            key={ex.id}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Download className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium text-gray-800">
                {ex.type === 'FULL_HISTORY'
                  ? 'Vollständige Historie'
                  : ex.type === 'LAST_VISIT'
                    ? 'Letzter Besuch'
                    : 'Medikationsplan'}
                {' '}
                <span className="text-[11px] text-gray-400 font-normal">({ex.format})</span>
              </p>
              <p className="text-[11px] text-gray-400">
                {formatDateTime(ex.createdAt)} · Hash: {truncateHash(ex.hash)}
              </p>
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Gültig bis {formatDate(ex.expiresAt)}
              </p>
            </div>
            <a
              href={ex.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100 transition-colors"
            >
              Ansehen
            </a>
          </div>
        ))}
        {exportList.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">Noch keine Exporte erstellt.</p>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export function PrivateEpaDashboard() {
  const [tab, setTab] = useState<Tab>('dokumente');
  const [documents, setDocuments] = useState<EpaDocument[]>(MOCK_DOCUMENTS);
  const [shares, setShares] = useState<EpaShare[]>(MOCK_SHARES);
  const [exports, setExports] = useState<EpaExport[]>(MOCK_EXPORTS);

  /* ── Handlers ── */

  const addDocument = useCallback((doc: Omit<EpaDocument, 'id' | 'createdAt'>) => {
    setDocuments((prev) => [
      { ...doc, id: uid(), createdAt: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const addShare = useCallback((share: Omit<EpaShare, 'id' | 'createdAt' | 'token'>) => {
    setShares((prev) => [
      {
        ...share,
        id: uid(),
        createdAt: new Date().toISOString(),
        token: uid(),
      },
      ...prev,
    ]);
  }, []);

  const revokeShare = useCallback((id: string) => {
    setShares((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const createExport = useCallback((type: ExportType, format: ExportFormat) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 3_600_000).toISOString();
    setExports((prev) => [
      {
        id: uid(),
        type,
        format,
        createdAt: now.toISOString(),
        expiresAt,
        hash: Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        url: '#',
      },
      ...prev,
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Private ePA</h1>
            <p className="text-xs text-gray-400">Elektronische Patientenakte verwalten</p>
          </div>
        </div>

        <StatusCard />
        <TabBar active={tab} onChange={setTab} />

        {/* Tab content */}
        {tab === 'dokumente' && (
          <DokumenteTab documents={documents} onAdd={addDocument} onDelete={deleteDocument} />
        )}
        {tab === 'freigaben' && (
          <FreigabenTab shares={shares} onAdd={addShare} onRevoke={revokeShare} />
        )}
        {tab === 'exporte' && (
          <ExporteTab exports={exports} onCreate={createExport} />
        )}
      </div>
    </div>
  );
}
