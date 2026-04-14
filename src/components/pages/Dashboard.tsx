// ─── SessionDashboard ────────────────────────────────────────────────────────
// Übersicht aller abgeschlossenen Patientensessions.
// Bietet Vorschau der Antworten und den "An Tomedo übergeben (GDT Tunnel)" Button.
//
// Route: /verwaltung/sessions  (registered in App.tsx as a ProtectedRoute)
// Auth:  requireRole('arzt', 'admin')

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useArztSessions } from '../../hooks/useStaffApi';
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowRightLeft,
  User,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Search,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface PatientSession {
  id: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  patientName?: string;
  patientId?: string;
  triageLevel?: 'CRITICAL' | 'WARNING' | 'NORMAL';
  answersCount?: number;
}

// ── Tomedo GDT Tunnel payload (anonymised) ───────────────────────────────────

interface GdtPayload {
  sessionId: string;
  completedAt: string;
  triageLevel: string;
  answersCount: number;
  // PHI stripped — only IDs, timestamps, and triage are included
}

function buildGdtPayload(session: PatientSession): GdtPayload {
  return {
    sessionId: session.id,
    completedAt: session.completedAt ?? session.createdAt,
    triageLevel: session.triageLevel ?? 'NORMAL',
    answersCount: session.answersCount ?? 0,
  };
}

// ── Triage colour helpers ────────────────────────────────────────────────────

const TRIAGE_COLOR: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  WARNING:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  NORMAL:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

// ── Sub-components ───────────────────────────────────────────────────────────

function SessionRow({
  session,
  onTransferToTomedo,
}: {
  session: PatientSession;
  onTransferToTomedo: (s: PatientSession) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const completedAt = session.completedAt
    ? new Date(session.completedAt).toLocaleString('de-DE')
    : new Date(session.createdAt).toLocaleString('de-DE');

  const triage = session.triageLevel ?? 'NORMAL';

  return (
    <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] overflow-hidden transition-shadow hover:shadow-md">
      {/* Row header */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Patient icon */}
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {session.patientId
              ? `P-${session.patientId}`
              : t('dashboard.sessions.anonymous', 'Anonym')}
          </p>
          <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {completedAt}
          </p>
        </div>

        {/* Triage badge */}
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${TRIAGE_COLOR[triage] ?? TRIAGE_COLOR.NORMAL}`}
        >
          {triage}
        </span>

        {/* Answers count */}
        <span className="text-xs text-[var(--text-secondary)] hidden sm:block">
          {session.answersCount ?? 0} {t('dashboard.sessions.answers', 'Antworten')}
        </span>

        {/* Tomedo button */}
        <button
          onClick={() => onTransferToTomedo(session)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shrink-0"
          title={t('dashboard.sessions.tomedo_tooltip', 'An Tomedo übergeben (GDT Tunnel)')}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tomedo</span>
        </button>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-colors"
          aria-label={expanded ? t('Zuklappen', 'Zuklappen') : t('Details', 'Details')}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expandable detail */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-[var(--border-primary)] bg-[var(--bg-primary)] space-y-2 text-xs text-[var(--text-secondary)]">
          <p><span className="font-semibold text-[var(--text-primary)]">Session-ID:</span> {session.id}</p>
          {session.patientId && (
            <p><span className="font-semibold text-[var(--text-primary)]">Patienten-ID:</span> {session.patientId}</p>
          )}
          <p><span className="font-semibold text-[var(--text-primary)]">Abgeschlossen:</span> {completedAt}</p>
          <p><span className="font-semibold text-[var(--text-primary)]">Triage:</span> {triage}</p>
          <p>
            <span className="font-semibold text-[var(--text-primary)]">GDT-Payload-Vorschau:</span>{' '}
            <code className="bg-[var(--bg-card)] px-1.5 py-0.5 rounded text-[10px]">
              {JSON.stringify(buildGdtPayload(session))}
            </code>
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function SessionDashboard() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useArztSessions();
  const [search, setSearch] = useState('');
  const [transferLog, setTransferLog] = useState<string[]>([]);

  // The API returns { sessions: PatientSession[] }
  const raw: PatientSession[] = (data as { sessions?: PatientSession[] })?.sessions ?? [];

  // Filter for COMPLETED sessions only
  const completed = raw.filter(s => s.status === 'COMPLETED' || s.status === 'completed');

  const filtered = completed.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.id.toLowerCase().includes(q) ||
      (s.patientId ?? '').toLowerCase().includes(q)
    );
  });

  function handleTransferToTomedo(session: PatientSession) {
    const payload = buildGdtPayload(session);
    // In production: call the GDT Tunnel API endpoint
    // For now: log the anonymised payload (no PHI)
     
    console.info('[GDT Tunnel] Tomedo transfer payload:', payload);
    setTransferLog(prev => [
      `[${new Date().toLocaleTimeString('de-DE')}] Session ${session.id} → Tomedo (${payload.triageLevel})`,
      ...prev.slice(0, 9),
    ]);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {t('dashboard.sessions.title', 'Abgeschlossene Sessions')}
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              {t('dashboard.sessions.subtitle', 'Abgeschlossene Patientenaufnahmen — bereit für Tomedo')}
            </p>
          </div>
        </div>

        <button
          onClick={() => void refetch()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border-primary)] text-sm text-[var(--text-secondary)] hover:border-blue-400 hover:text-[var(--text-primary)] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t('global.refresh', 'Aktualisieren')}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('dashboard.sessions.search_placeholder', 'Session-ID oder Patienten-ID suchen…')}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
        />
      </div>

      {/* State views */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-3 text-[var(--text-secondary)]">
          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm">{t('global.loading', 'Lade Daten…')}</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm">
            {t('dashboard.sessions.error', 'Fehler beim Laden der Sessions. Bitte neu laden.')}
          </p>
        </div>
      )}

      {!isLoading && !isError && completed.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-[var(--text-secondary)] text-sm">
            {t('dashboard.sessions.empty', 'Keine abgeschlossenen Sessions vorhanden.')}
          </p>
        </div>
      )}

      {/* Stats bar */}
      {completed.length > 0 && (
        <div className="flex items-center gap-6 text-sm text-[var(--text-secondary)]">
          <span>
            <strong className="text-[var(--text-primary)]">{completed.length}</strong>{' '}
            {t('dashboard.sessions.total', 'abgeschlossen')}
          </span>
          {filtered.length !== completed.length && (
            <span>
              <strong className="text-[var(--text-primary)]">{filtered.length}</strong>{' '}
              {t('dashboard.sessions.filtered', 'gefiltert')}
            </span>
          )}
        </div>
      )}

      {/* Session list */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(session => (
            <SessionRow
              key={session.id}
              session={session}
              onTransferToTomedo={handleTransferToTomedo}
            />
          ))}
        </div>
      )}

      {/* Transfer log */}
      {transferLog.length > 0 && (
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 space-y-2">
          <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
            {t('dashboard.sessions.transfer_log', 'GDT Übertragungslog')}
          </p>
          <ul className="space-y-1">
            {transferLog.map((entry, i) => (
              <li key={i} className="text-[11px] text-[var(--text-secondary)] font-mono">
                {entry}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
