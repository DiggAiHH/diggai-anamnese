import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, Shield, Clock, AlertTriangle } from 'lucide-react';

/* ─── Types ─── */

type DocType = 'ANAMNESE' | 'LABOR' | 'BEFUND' | 'BILD' | 'OP_BERICHT';

interface SharedDocument {
  id: string;
  type: DocType;
  title: string;
  content: string;
  fileUrl?: string;
  createdAt: string;
}

interface SharedEpaData {
  sharedWith: string;
  expiresAt: string;
  accessScope: DocType[];
  documents: SharedDocument[];
}

/* ─── Constants ─── */

const DOC_ICONS: Record<DocType, string> = {
  ANAMNESE: '📋',
  LABOR: '🔬',
  BEFUND: '📊',
  BILD: '🖼️',
  OP_BERICHT: '📝',
};

/* ─── Demo data ─── */

const DEMO_DATA: SharedEpaData = {
  sharedWith: 'dr.mueller@praxis.de',
  expiresAt: new Date(Date.now() + 5 * 24 * 3_600_000).toISOString(),
  accessScope: ['ANAMNESE', 'BEFUND'],
  documents: [
    {
      id: 'd1',
      type: 'ANAMNESE',
      title: 'Erstanamnese – Aufnahme',
      content:
        'Patient berichtet über wiederkehrende Kopfschmerzen seit 3 Monaten. Keine Vorerkrankungen bekannt. Familienanamnese unauffällig.',
      createdAt: '2026-02-15T10:30:00Z',
    },
    {
      id: 'd3',
      type: 'BEFUND',
      title: 'MRT Schädel',
      content: 'Kein pathologischer Befund. Keine Raumforderung. Ventrikel normwertig.',
      fileUrl: 'https://example.com/mrt-schaedel.pdf',
      createdAt: '2026-02-22T14:00:00Z',
    },
  ],
};

/* ─── Helpers ─── */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ─── Sub-components ─── */

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center animate-pulse">
        <Shield className="w-6 h-6 text-sky-500" />
      </div>
      <p className="text-sm font-medium text-gray-500">Zugriff wird überprüft…</p>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-sky-400 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <h2 className="text-base font-semibold text-gray-800">
        Zugriff abgelaufen oder widerrufen
      </h2>
      <p className="text-sm text-gray-500 max-w-sm">
        Der Freigabe-Link ist nicht mehr gültig. Bitte wenden Sie sich an die Person, die diesen Link erstellt hat.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-white hover:bg-sky-600 transition-colors mt-2"
      >
        Zur Startseite
      </Link>
    </div>
  );
}

function DocumentCard({ doc }: { doc: SharedDocument }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xl leading-none">{DOC_ICONS[doc.type]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800 truncate">{doc.title}</p>
          <p className="text-[11px] text-gray-400">
            {doc.type} · {formatDate(doc.createdAt)}
          </p>
        </div>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{doc.content}</p>
      {doc.fileUrl && (
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700"
        >
          <FileText className="w-3.5 h-3.5" />
          Datei öffnen
        </a>
      )}
    </div>
  );
}

/* ─── Main Component ─── */

export function SharedEpaView() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SharedEpaData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Demo mode: simulate access verification with 1s delay
    const timeout = setTimeout(() => {
      if (!token || token === 'expired') {
        setError(true);
      } else {
        setData(DEMO_DATA);
      }
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <ErrorState />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* Validity banner */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs font-medium text-amber-700">
            Gültig bis: {formatDate(data.expiresAt)}
          </p>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Geteilte ePA</h1>
            <p className="text-xs text-gray-400">Nur-Lesen-Zugriff auf freigegebene Dokumente</p>
          </div>
        </div>

        {/* Shared-by info */}
        <div className="rounded-xl bg-indigo-50/50 border border-indigo-100 px-4 py-3">
          <p className="text-xs text-indigo-600">
            Diese Freigabe wurde erstellt von{' '}
            <span className="font-semibold">{data.sharedWith}</span>
          </p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {data.accessScope.map((sc) => (
              <span
                key={sc}
                className="inline-block rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-medium px-2 py-0.5"
              >
                {sc}
              </span>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Freigegebene Dokumente ({data.documents.length})
          </h2>
          {data.documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
          {data.documents.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              Keine Dokumente in dieser Freigabe enthalten.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
